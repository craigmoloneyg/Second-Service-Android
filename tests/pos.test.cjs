const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
function storage(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE garnish_accounts_v2(id TEXT);CREATE TABLE garnish_sessions_v2(token TEXT,account_id TEXT,expires_at TEXT);');for(const id of ['a','b']){db.prepare('INSERT INTO garnish_accounts_v2 VALUES(?)').run(id);db.prepare('INSERT INTO garnish_sessions_v2 VALUES(?,?,?)').run(id.repeat(64),id,'2099-01-01');}return {db,DB:{prepare(sql){const s=db.prepare(sql);let a=[];return {bind(...v){a=v;return this;},async first(){return s.get(...a)||null;},async all(){return {results:s.all(...a)};},async run(){return {meta:{changes:Number(s.run(...a).changes)}};}};}}};}
function req(path,body,cookie='p2p_auth='+ 'a'.repeat(64),origin='https://garnish.test'){return new Request('https://garnish.test/api/pos/'+path,{method:body?'POST':'GET',headers:{cookie,...(body?{origin,'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
test('shared POS enforces accounts, idempotency, concurrency and kitchen capability',async()=>{
 const {handlePOS:h}=await import('../cloudflare/pos.mjs'),env=storage();let n=0;
 const call=async(p,b,c)=>{const r=await h(req(p,b,c),env);return {status:r.status,data:await r.json(),headers:r.headers};};
 const mutate=(p,b,revision,c)=>call(p,{...b,revision,request_id:'request-identifier-'+(++n)},c);
 assert.equal((await call('state',null,'')).status,401);
 assert.equal((await h(req('order',{},undefined,'https://evil.test'),env)).status,403);
 assert.equal((await mutate('product',{name:'Pasta',price:2200},0)).status,200);
 const product=(await call('state')).data.book.products[0];
 const body={revision:1,request_id:'unique-order-request',items:[{id:product.id,qty:2}],table:'12',notes:'No nuts'};
 assert.equal((await call('order',body)).status,200);assert.equal((await call('order',body)).data.duplicate,true);
 let s=(await call('state')).data;assert.equal(s.book.orders.length,1);assert.equal(s.book.orders[0].payment,'not_processed');
 assert.equal((await call('state',null,'p2p_auth='+'b'.repeat(64))).data.book.orders.length,0);
 assert.equal((await mutate('product',{name:'Stale',price:1},0)).status,409);
 const device=await call('device',{name:'Kitchen tablet'}),token=device.data.url.split('#pair=')[1];
 const pair=await call('pair',{token},'');assert.equal(pair.status,200);
 assert.equal((await call('pair',{token},'')).status,401);
 const kitchen=pair.headers.get('set-cookie').match(/garnish_kitchen=[a-f0-9]+/)[0];
 const ks=(await call('state',null,kitchen)).data;assert.equal(ks.kitchen,true);assert.equal(ks.book.products,undefined);assert.equal(ks.book.orders[0].items[0].price,undefined);assert.equal(ks.book.orders[0].notes,'No nuts');
 assert.equal((await call('device',{name:'Escalate'},kitchen)).status,403);
 assert.equal((await mutate('order',body,2,kitchen)).status,403);
 const o=s.book.orders[0];
 assert.equal((await mutate('status',{id:o.id,version:1,status:'preparing'},2,kitchen)).status,200);
 assert.equal((await mutate('status',{id:o.id,version:1,status:'ready'},3,kitchen)).status,400);
 assert.equal((await mutate('status',{id:o.id,version:2,status:'ready'},3,kitchen)).status,200);
 assert.equal((await mutate('status',{id:o.id,version:3,status:'completed'},4,kitchen)).status,200);
 assert.equal((await call('state',null,kitchen)).data.book.orders.length,0);
 const devices=(await call('devices')).data.devices;await call('revoke',{id:devices[0].id});assert.equal((await call('state',null,kitchen)).status,401);
 // A kitchen cookie must not fall back to an owner session, including after revocation.
 assert.equal((await call('state',null,kitchen+'; p2p_auth='+'a'.repeat(64))).status,401);
 const worker=(await import('../cloudflare/square-worker.mjs')).default;
 for(const path of ['/api/accounting/state','/api/session','/api/team/members','/api/square/status'])assert.equal((await worker.fetch(new Request('https://garnish.test'+path,{headers:{cookie:kitchen}}),env,{})).status,403);
});
test('recovered POS import preserves tickets, converts money and rejects duplicate import',async()=>{
 const {handlePOS:h}=await import('../cloudflare/pos.mjs'),env=storage();
 const data={version:1,products:[{id:'p1',name:'Coffee',price:4.5}],orders:[{id:'o1',number:'1001',status:'ready',createdAt:'2026-09-20T12:00:00Z',table:'2',items:[{id:'p1',name:'Coffee',price:4.5,qty:2}]}]};
 const b={data,revision:0,request_id:'import-identifier-1'};assert.equal((await h(req('import',b),env)).status,200);
 const state=await (await h(req('state'),env)).json();assert.equal(state.book.products[0].price,450);assert.equal(state.book.orders[0].status,'ready');assert.equal(state.book.orders[0].payment,'legacy_unverified');
 assert.equal((await h(req('import',{...b,revision:1,request_id:'import-identifier-2'}),env)).status,400);
 const d=await (await h(req('device',{name:'Expired'}),env)).json();env.db.prepare("UPDATE garnish_kitchen_devices SET pair_expires='2000-01-01'").run();assert.equal((await h(req('pair',{token:d.url.split('#pair=')[1]},''),env)).status,401);
});

test('kitchen page uses canonical asset URL without redirect loops',async()=>{
 const worker=(await import('../cloudflare/square-worker.mjs')).default;
 const env={ASSETS:{async fetch(request){assert.equal(new URL(request.url).pathname,'/kitchen');return new Response('<main>Kitchen</main>',{headers:{'Content-Type':'text/html'}});}}};
 for(const path of ['/kitchen','/kitchen/','/kitchen.html']){
  const response=await worker.fetch(new Request('https://garnish.test'+path),env,{});
  assert.equal(response.status,200);assert.equal(await response.text(),'<main>Kitchen</main>');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
});
