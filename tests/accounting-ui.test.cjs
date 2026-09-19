const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Accounting route loads, submits settings and clears private figures after signout',async()=>{
 const dom=new JSDOM('<nav class="nav"></nav><main class="main"><header></header></main>',{url:'https://garnish.test/#accounting',runScripts:'outside-only'});
 const w=dom.window;w.scrollTo=()=>{};let settings=null,saved;
 const observers=[];const OriginalObserver=w.MutationObserver;w.MutationObserver=class extends OriginalObserver{constructor(cb){super(cb);observers.push(this);}};
 w.fetch=async(url,options)=>{
  if(String(url).includes('/api/auth/'))return new Response('{}');
  if(options?.method==='POST'){saved=JSON.parse(options.body);settings={...saved.input,reserve_bps:1500};return new Response(JSON.stringify({ok:true,revision:1}));}
  if(String(url).includes('/report?'))return new Response(JSON.stringify({start:'2026-09-01',end:'2026-09-30',revenue:11000,expenses:0,profit:11000,tax_reserve:1650,bas:{G1:12100,'1A':1100,'1B':0,gst_net:1100,W1:0,W2:0},accounts:[],journal:[],limitations:[],trial_balance_difference:0,receivables:0,payables:0}));
  return new Response(JSON.stringify({revision:settings?1:0,book:{settings,transactions:[],payroll:[],audit:[]}}));
 };
 w.eval(readFileSync('cloudflare/public/page-router.js','utf8'));
 w.eval(readFileSync('cloudflare/public/accounting-ui.js','utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(let i=0;i<8;i++)await tick();
 assert.ok(w.document.querySelector('[data-page=accounting].active #accounting-panel'));
 assert.equal(w.document.getElementById('acc-settings').hidden,false);
 assert.equal(w.document.getElementById('acc-getting-started').hidden,false);
 w.document.querySelector('[data-tab=settings]').click();
 const f=w.document.getElementById('acc-settings-form');f.elements.business_name.value='Test Venue';f.elements.gst_registered.value='true';f.elements.reserve_percent.value='15';
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<8;i++)await tick();
 assert.equal(saved.action,'settings');assert.equal(saved.input.gst_registered,true);assert.equal(saved.input.reserve_percent,'15');assert.ok(saved.request_id);
 assert.equal(w.document.getElementById('acc-transactions').hidden,false);
 assert.equal(w.document.getElementById('acc-getting-started').hidden,true);
 assert.match(w.document.getElementById('acc-report').textContent,/110\.00/);
 await w.fetch('/api/auth/signout',{method:'POST'});
 assert.equal(w.document.getElementById('acc-report').textContent,'');assert.match(w.document.getElementById('acc-status').textContent,/Sign in/);observers.forEach(o=>o.disconnect());dom.window.close();
});
