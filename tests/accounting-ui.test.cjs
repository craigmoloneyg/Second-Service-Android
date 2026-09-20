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
 const row=w.document.querySelector('#acc-transaction-lines .acc-line');
 const gross=row.querySelector('[name=gross]'),code=row.querySelector('[name=tax_code]'),gst=row.querySelector('[name=gst]'),mode=row.querySelector('[name=gst_mode]');
 assert.equal(code.value,'');gross.value='110';code.value='taxable';code.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(gst.value,'10.00');assert.equal(gst.readOnly,true);
 mode.value='invoice';mode.dispatchEvent(new w.Event('change',{bubbles:true}));gst.value='9.99';gross.value='111';gross.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(gst.value,'9.99');assert.equal(gst.readOnly,false);
 mode.value='auto';mode.dispatchEvent(new w.Event('change',{bubbles:true}));code.value='gst_free';code.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(gst.value,'0.00');
 assert.match(w.document.getElementById('acc-report').textContent,/ATO lodgement: not connected/);
 await w.fetch('/api/auth/signout',{method:'POST'});
 assert.equal(w.document.getElementById('acc-report').textContent,'');assert.match(w.document.getElementById('acc-status').textContent,/Sign in/);observers.forEach(o=>o.disconnect());dom.window.close();
});

test('automatic payroll form sends declaration choices and clears outdated previews',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://garnish.test/#accounting',runScripts:'outside-only'}),w=dom.window;let submitted;
 w.fetch=async(url,options)=>{
  if(String(url).endsWith('/payroll-preview')){submitted=JSON.parse(options.body);return new Response(JSON.stringify({preview:{gross:100000,payg:20000,net:80000,super:12000,withholding:{study_loan_withholding:5000}}}));}
  if(String(url).includes('/report?'))return new Response(JSON.stringify({bas:{},accounts:[],journal:[],limitations:[]}));
  return new Response(JSON.stringify({revision:1,book:{settings:{business_name:'Test',gst_registered:true},transactions:[],payroll:[],audit:[]}}));
 };
 w.eval(readFileSync('cloudflare/public/accounting-ui.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));for(let i=0;i<5;i++)await tick();
 const f=w.document.getElementById('acc-payroll-form');assert.equal(f.elements.payg.disabled,true);
 f.elements.pay_frequency.value='weekly';f.elements.tax_scale.value='2';f.elements.study_loan.value='true';f.elements.declaration_confirmed.checked=true;
 w.document.getElementById('acc-pay-preview').click();for(let i=0;i<5;i++)await tick();
 assert.equal(submitted.study_loan,true);assert.equal(submitted.declaration_confirmed,true);assert.equal(submitted.withholding_mode,'automatic');assert.equal(submitted.payg,undefined);
 assert.match(w.document.getElementById('acc-pay-result').textContent,/200\.00/);
 f.elements.pay_frequency.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.getElementById('acc-pay-result').textContent,'');
 f.elements.withholding_mode.value='manual';f.elements.withholding_mode.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(f.elements.payg.disabled,false);assert.equal(f.elements.tax_scale.disabled,true);assert.equal(w.document.getElementById('acc-auto-tax').hidden,true);
 dom.window.close();
});

test('payroll review download uses selected report and labels export as not lodged',async()=>{
 const c=await import('../cloudflare/accounting-core.mjs');const b=c.emptyBook();
 b.settings={business_name:'Review venue'};
 const dom=new JSDOM('<main></main>',{url:'https://garnish.test/',runScripts:'outside-only'}),w=dom.window;
 let blob,filename;w.URL.createObjectURL=value=>{blob=value;return 'blob:review';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 w.fetch=async url=>new Response(JSON.stringify(String(url).includes('/report?')?c.report(b,'2026-09-01','2026-09-30'):{book:b,revision:0}));
 w.eval(readFileSync('cloudflare/public/accounting-ui.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(let i=0;i<8;i++)await tick();
 assert.match(w.document.getElementById('acc-report').textContent,/Payroll review · not lodged/);
 w.document.getElementById('acc-payroll-export').click();
 assert.match(filename,/Garnish-payroll-review-/);
 const text=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
 assert.match(text,/NOT LODGED — NOT AN STP UPLOAD/);assert.match(text,/Review venue/);assert.match(text,/TOTAL/);
 dom.window.close();
});
