const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{readFileSync}=require('node:fs');
const tick=()=>new Promise(r=>setImmediate(r));
test('recovered local data stays intact; shared orders render safely and form posts no paid claim',async(t)=>{
 const dom=new JSDOM('<main><div data-page="orders" class="p2p-page active"></div></main>',{url:'https://garnish.test/',runScripts:'outside-only'}),w=dom.window;t.after(()=>dom.window.close());
 const original='{"version":1,"products":[],"orders":[]}';w.localStorage.setItem('garnish.pos.v1',original);
 let saved;const book={products:[{id:'p1',name:'Pasta',price:2200,active:true}],orders:[{id:'o1',number:'1001',table:'<img src=x onerror=alert(1)>',notes:'No nuts',items:[{name:'Pasta',qty:1}],status:'new',createdAt:new Date().toISOString(),version:1}]};
 w.fetch=async(url,opt)=>{if(String(url).includes('/api/auth/'))return new Response('{}');if(opt?.method==='POST'){saved=JSON.parse(opt.body);return new Response('{"ok":true}');}return new Response(JSON.stringify({book,revision:1,kitchen:false}));};
 w.eval(readFileSync('cloudflare/public/pos-ui.js','utf8'));for(let i=0;i<4;i++)await tick();
 assert.ok(w.document.getElementById('pos-board').textContent.includes('<img src=x'));assert.equal(w.document.querySelector('#pos-board img'),null);
 assert.equal(w.document.getElementById('pos-owner').hidden,false);
 w.document.querySelector('[data-add]').click();w.document.getElementById('pos-order').dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<4;i++)await tick();
 assert.deepEqual(saved.items,[{id:'p1',qty:1}]);assert.equal(saved.payment,undefined);assert.equal(w.localStorage.getItem('garnish.pos.v1'),original);
 await w.fetch('/api/auth/signout',{method:'POST'});assert.equal(w.document.getElementById('pos-board').textContent,'');assert.equal(w.document.getElementById('pos-owner').hidden,true);
 dom.window.close();
});
test('kitchen pairing requires explicit action and removes token from address',async(t)=>{
 const dom=new JSDOM('<main></main>',{url:'https://garnish.test/kitchen#pair='+'a'.repeat(64),runScripts:'outside-only'}),w=dom.window;t.after(()=>dom.window.close());let paired=false;
 w.fetch=async(url,opt)=>{if(String(url).endsWith('/pair')){paired=true;return new Response('{"ok":true}');}return new Response(JSON.stringify({book:{orders:[]},revision:0,kitchen:true}));};
 w.eval(readFileSync('cloudflare/public/pos-ui.js','utf8'));assert.equal(paired,false);assert.equal(w.location.hash,'');
 w.document.getElementById('pos-confirm-pair').click();for(let i=0;i<4;i++)await tick();assert.equal(paired,true);assert.equal(w.document.getElementById('pos-owner').hidden,true);assert.match(w.document.getElementById('pos-board').textContent,/Cooking/);dom.window.close();
});
