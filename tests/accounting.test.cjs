const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=import('../cloudflare/accounting-core.mjs');
const config={business_name:'Test venue',entity:'sole_trader',gst_registered:true,gst_basis:'cash',reserve_bps:2000};
const purchase={kind:'purchase',category:'food',contact:'Supplier',reference:'INV-1',date:'2026-09-01',paid_date:'2026-10-01',credit_confirmed:true,lines:[{description:'Goods',gross:'110.00',gst:'10.00',tax_code:'taxable'}]};
test('money uses exact cents and rejects malformed values',async()=>{const c=await core;assert.equal(c.cents('0.29'),29);for(const v of ['-1','NaN','1.001','1e3','',Infinity])assert.throws(()=>c.cents(v));assert.throws(()=>c.date('2026-02-30'));});
test('cash BAS and accrual books recognise unpaid purchase in different periods',async()=>{
 const c=await core,book=c.emptyBook();book.settings=config;book.transactions.push({...c.transaction(purchase,config),id:'one'});
 const sept=c.report(book,'2026-09-01','2026-09-30');assert.equal(sept.profit,-10000);assert.equal(sept.payables,11000);assert.equal(sept.bas['1B'],0);
 const oct=c.report(book,'2026-10-01','2026-10-31');assert.equal(oct.profit,0);assert.equal(oct.payables,0);assert.equal(oct.bas['1B'],1000);assert.equal(oct.trial_balance_difference,0);
});
test('mixed tax sales, refunds, equipment, unpaid balances and reserve',async()=>{
 const c=await core,b=c.emptyBook();b.settings=config;
 b.transactions.push({...c.transaction({...purchase,kind:'sale',paid_date:'2026-09-01',lines:[...purchase.lines,{description:'GST-free',gross:'30',gst:'0',tax_code:'gst_free'},{description:'Outside BAS',gross:'20',gst:'0',tax_code:'out_of_scope'}]},config),id:'sale'});
 b.transactions.push({...c.transaction({...purchase,kind:'sale_refund',paid_date:'2026-09-02'},config),id:'refund'});
 b.transactions.push({...c.transaction({...purchase,category:'equipment',paid_date:'2026-09-03'},config),id:'asset'});
 const r=c.report(b,'2026-09-01','2026-09-30');assert.equal(r.bas.G1,3000);assert.equal(r.bas['1A'],0);assert.equal(r.bas['1B'],1000);assert.equal(r.profit,5000);assert.equal(r.tax_reserve,1000);assert.equal(r.trial_balance_difference,0);
});
test('GST registration and eligibility cannot be bypassed',async()=>{const c=await core;assert.throws(()=>c.transaction(purchase,null));assert.throws(()=>c.transaction(purchase,{...config,gst_registered:false}));assert.throws(()=>c.transaction({...purchase,credit_confirmed:false},config));assert.throws(()=>c.transaction({...purchase,lines:[{description:'x',gross:'110',gst:'10',tax_code:'gst_free'}]},config));});
const pay={employee:'Employee A',reference:'P1',period_start:'2026-09-01',period_end:'2026-09-07',paid_date:'2026-09-08',lines:[{description:'Ordinary',hours:'38',rate:'30'},{description:'Overtime',hours:'2',rate:'45'}],payg:'200',deductions:'30',super_base:'1140',super_rate:'12',verified:true};
test('wage arithmetic, employer cost and gross W1 do not count net twice',async()=>{
 const c=await core,p=c.payroll(pay);assert.equal(p.gross,123000);assert.equal(p.net,100000);assert.equal(p.super,13680);
 const b=c.emptyBook();b.settings=config;b.payroll.push({...p,id:'p1'});const r=c.report(b,'2026-09-01','2026-09-30');assert.equal(r.bas.W1,123000);assert.equal(r.bas.W2,20000);assert.equal(r.expenses,136680);assert.equal(r.trial_balance_difference,0);
 b.payroll.push({...p,id:'p2',reversal_of:'p1'});const reversed=c.report(b,'2026-09-01','2026-09-30');assert.equal(reversed.expenses,0);assert.equal(reversed.bas.W1,0);assert.equal(reversed.bas.W2,0);
 assert.throws(()=>c.payroll({...pay,payg:'5000'}));assert.throws(()=>c.payroll({...pay,super_base:'5000'}));assert.throws(()=>c.payroll({...pay,period_end:'2026-10-01'}));
});

// SQLite-backed D1 stand-in: exercises real prepared statements and CAS writes.
const {DatabaseSync}=require('node:sqlite');
function storage(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE garnish_accounts_v2 (id TEXT,email TEXT,workspace_id TEXT,password_hash TEXT,password_salt TEXT);CREATE TABLE garnish_sessions_v2(token TEXT,account_id TEXT,expires_at TEXT);');
 for(const id of ['a','b']){db.prepare('INSERT INTO garnish_accounts_v2 VALUES (?,?,?,?,?)').run(id,id+'@example.test',id+'-workspace','hash','salt');db.prepare('INSERT INTO garnish_sessions_v2 VALUES (?,?,?)').run(id.repeat(64),id,'2099-01-01');}
 return {db,DB:{prepare(sql){let args=[];const st=db.prepare(sql);return {bind(...v){args=v;return this;},async first(){return st.get(...args)||null;},async run(){const result=st.run(...args);return {meta:{changes:Number(result.changes)}};}};}}};}
function req(path='state',body,token='a'){return new Request('https://garnish.test/api/accounting/'+path,{method:body?'POST':'GET',headers:{cookie:'p2p_auth='+token.repeat(64),...(body?{origin:'https://garnish.test','content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
test('account isolation, idempotency, concurrency, posting, settlement and reversal',async()=>{
 const {handleAccounting:h}=await import('../cloudflare/accounting.mjs');const env=storage();
 const send=async(action,input,revision,key)=>{const r=await h(req('state',{action,input,revision,request_id:key}),env);return {status:r.status,data:await r.json()};};
 const key='settings-123456789';assert.equal((await send('settings',{...config,reserve_percent:'20'},0,key)).status,201);
 assert.equal((await send('settings',{},0,key)).data.duplicate,true);
 assert.equal((await send('transaction',purchase,0,'stale-12345678901')).status,409);
 const posted=await send('transaction',{...purchase,paid_date:null},1,'transaction-1234567');assert.equal(posted.status,201);
 const other=await (await h(req('state',null,'b'),env)).json();assert.equal(other.book.transactions.length,0);
 assert.equal((await send('settle',{id:posted.data.record_id,paid_date:'2026-09-02'},2,'settle-12345678901')).status,201);
 assert.equal((await send('reverse',{collection:'transactions',id:posted.data.record_id,date:'2026-09-03',reason:'Correction required'},3,'reverse-1234567890')).status,201);
 assert.equal((await send('reverse',{collection:'transactions',id:posted.data.record_id,date:'2026-09-03',reason:'Correction required'},4,'reverse-again-12345')).status,400);
 const r=await (await h(req('report?start=2026-09-01&end=2026-09-30'),env)).json();assert.equal(r.profit,0);assert.equal(r.bas['1B'],0);assert.equal(r.trial_balance_difference,0);
 env.db.close();
});
test('unauthenticated, expired, cross-origin, and anonymous workspace access are rejected',async()=>{
 const {handleAccounting:h}=await import('../cloudflare/accounting.mjs');const env=storage();
 assert.equal((await h(new Request('https://garnish.test/api/accounting/state',{headers:{cookie:'p2p_workspace='+'a'.repeat(64)}}),env)).status,401);
 const cross=req('state',{action:'settings'});cross.headers.set('origin','https://other.test');assert.equal((await h(cross,env)).status,403);
 env.db.exec("UPDATE garnish_sessions_v2 SET expires_at='2000-01-01'");assert.equal((await h(req(),env)).status,401);env.db.close();
});
test('existing accounts cannot be claimed through signup after sessions expire',async()=>{
 const env=storage();env.db.exec("DELETE FROM garnish_sessions_v2");
 const {default:worker}=await import('../cloudflare/square-worker.mjs');
 const request=new Request('https://garnish.test/api/auth/signup',{method:'POST',headers:{origin:'https://garnish.test','content-type':'application/json'},body:JSON.stringify({email:'a@example.test',password:'different-password'})});
 const response=await worker.fetch(request,env,{});assert.equal(response.status,409);assert.equal(env.db.prepare("SELECT password_hash FROM garnish_accounts_v2 WHERE id='a'").get().password_hash,'hash');env.db.close();
});
test('signout revokes the stored session, not just the browser cookie',async()=>{
 const env=storage();const {default:worker}=await import('../cloudflare/square-worker.mjs');const response=await worker.fetch(new Request('https://garnish.test/api/auth/signout',{method:'POST',headers:{origin:'https://garnish.test',cookie:'p2p_auth='+'a'.repeat(64)}}),env,{});assert.equal(response.status,200);assert.equal(env.db.prepare('SELECT COUNT(*) n FROM garnish_sessions_v2 WHERE account_id=?').get('a').n,0);env.db.close();
});

test('automatic standard GST is recomputed server-side with exact cents and explicit classification',async()=>{
 const c=await core;
 const make=(gross,tax_code='taxable',extra={})=>c.transaction({...purchase,lines:[{description:'Goods',gross,gst:'999',gst_mode:'auto',tax_code,...extra}]},config);
 assert.equal(make('110').gst,1000);assert.equal(make('0.05').gst,0);assert.equal(make('0.06').gst,1);
 assert.equal(make('19.99').gst,182);assert.equal(make('110','gst_free').gst,0);
 assert.throws(()=>make('110',''));assert.throws(()=>make('110','taxable',{gst_mode:'guess'}));
 assert.equal(make('110','taxable',{gst_mode:'invoice',gst:'9.99'}).gst,999);
 assert.throws(()=>c.transaction({...purchase,credit_confirmed:false,lines:[{description:'Goods',gross:'110',tax_code:'taxable',gst_mode:'auto'}]},config));
 assert.throws(()=>c.transaction({...purchase,lines:[{description:'Goods',gross:'110',tax_code:'taxable',gst_mode:'auto'}]},{...config,gst_registered:false}));
 const book=c.emptyBook();book.settings=config;book.transactions.push({...make('110'),id:'auto'});
 assert.equal(c.report(book,'2026-10-01','2026-10-31').bas['1B'],1000);
});

test('automatic PAYG is recomputed at preview and posting, audited and included in W2',async()=>{
 const {handleAccounting:h}=await import('../cloudflare/accounting.mjs'),env=storage();
 const input={...pay,lines:[{description:'Ordinary',hours:'1',rate:'2608.36'}],super_base:'2608.36',payg:'0',withholding_mode:'automatic',pay_frequency:'weekly',tax_scale:'2',study_loan:true,declaration_confirmed:true,annual_tax_offset:'0'};
 const preview=await (await h(req('payroll-preview',input),env)).json();
 assert.equal(preview.preview.withholding.study_loan_withholding,19300);assert.ok(preview.preview.payg>19300);
 await h(req('state',{action:'settings',input:{...config,reserve_percent:'20'},revision:0,request_id:'automatic-settings-01'}),env);
 const posted=await h(req('state',{action:'payroll',input,revision:1,request_id:'automatic-payroll-001'}),env);assert.equal(posted.status,201);
 const state=await (await h(req(),env)).json();assert.equal(state.book.payroll[0].payg,preview.preview.payg);assert.equal(state.book.payroll[0].withholding.version,'AU-PAYG-2026.1');
 const report=await (await h(req('report?start=2026-09-01&end=2026-09-30'),env)).json();assert.equal(report.bas.W2,preview.preview.payg);assert.equal(report.trial_balance_difference,0);
 const rejected=await h(req('payroll-preview',{...input,declaration_confirmed:false}),env);assert.equal(rejected.status,400);env.db.close();
});
