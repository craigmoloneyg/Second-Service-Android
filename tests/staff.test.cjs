const {test}=require('node:test');const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');
function setup(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE garnish_accounts_v2 (id TEXT,workspace_id TEXT,email TEXT);CREATE TABLE garnish_sessions_v2(token TEXT,account_id TEXT,expires_at TEXT);');for(const id of ['a','b']){db.prepare('INSERT INTO garnish_accounts_v2 VALUES (?,?,?)').run(id,id+'-workspace',id+'@example.test');db.prepare('INSERT INTO garnish_sessions_v2 VALUES (?,?,?)').run(id.repeat(64),id,'2099-01-01');}return {db,DB:{prepare(sql){const statement=db.prepare(sql);let values=[];return {bind(...v){values=v;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return {meta:{changes:Number(statement.run(...values).changes)}};}};}}};}
function request(path,body,cookie=''){return new Request('https://garnish.test'+path,{method:body?'POST':'GET',headers:{cookie,...(body?{origin:'https://garnish.test','content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
const ownerCookie=id=>'p2p_auth='+id.repeat(64);
async function call(env,path,body,cookie){const {handleStaff}=await import('../cloudflare/staff.mjs');const response=await handleStaff(request(path,body,cookie),env);return {response,status:response.status,data:await response.json()};}
async function invite(env,email='one@example.test',owner='a'){return call(env,'/api/team/invite',{name:'Staff One',email},ownerCookie(owner));}
async function activate(env,link){const url=new URL(link);const result=await call(env,'/api/staff/activate',{invite:new URLSearchParams(url.hash.slice(1)).get('invite'),password:'staff-password-123'});const cookie=result.response.headers.get('set-cookie')?.match(/garnish_staff=([a-f0-9]+)/)?.[0];return {...result,cookie,venue:url.searchParams.get('venue')};}
test('private invitations are single use; staff sessions never grant owner privileges',async()=>{
 const env=setup();const invited=await invite(env);assert.equal(invited.status,201);const member=await activate(env,invited.data.invite_url);assert.equal(member.status,200);assert.match(member.response.headers.get('set-cookie'),/p2p_auth=;.*Max-Age=0/);
 const duplicate=await call(env,'/api/staff/activate',{invite:new URL(invited.data.invite_url).hash.slice(8),password:'another-password'});assert.equal(duplicate.status,400);
 const me=await call(env,'/api/staff/me',null,member.cookie);assert.equal(me.data.profile.email,'one@example.test');assert.equal(me.data.profile.password_hash,undefined);assert.equal(me.data.profile.owner_id,undefined);
 const {default:worker}=await import('../cloudflare/square-worker.mjs');for(const path of ['/api/accounting/state','/api/invoices','/api/square/status','/api/session','/api/auth/signup']){const r=await worker.fetch(request(path,null,member.cookie),env,{});assert.equal(r.status,403,path);}
 assert.equal((await call(env,'/api/team/list',null,member.cookie+'; '+ownerCookie('a'))).status,403);
 const redirect=await worker.fetch(request('/',null,member.cookie),env,{});assert.equal(redirect.status,303);assert.equal(redirect.headers.get('location'),'https://garnish.test/staff');env.db.close();
});
test('staff clock only themselves; duplicate clicks and forged identity cannot change another record',async()=>{
 const env=setup();const one=await activate(env,(await invite(env)).data.invite_url);const two=await activate(env,(await invite(env,'two@example.test')).data.invite_url);
 const twoId=(await call(env,'/api/staff/me',null,two.cookie)).data.profile.id;
 await call(env,'/api/staff/clock-in',{staff_id:twoId,start_at:'2000-01-01'},one.cookie);await call(env,'/api/staff/clock-in',{},one.cookie);
 assert.equal(env.db.prepare('SELECT COUNT(*) n FROM garnish_staff_shifts').get().n,1);const s=env.db.prepare('SELECT * FROM garnish_staff_shifts').get();assert.notEqual(s.staff_id,twoId);assert.notEqual(s.start_at,'2000-01-01');
 env.db.prepare('UPDATE garnish_staff_shifts SET start_at=?').run(new Date(Date.now()-3600000).toISOString());
 await call(env,'/api/staff/clock-in',{},two.cookie);await call(env,'/api/staff/clock-out',{staff_id:twoId},one.cookie);
 const own=(await call(env,'/api/staff/me?id='+twoId,null,one.cookie)).data;assert.equal(own.shifts.length,1);assert.ok(own.shifts[0].end_at);assert.ok(own.shifts[0].seconds>=3600);
 const other=(await call(env,'/api/staff/me',null,two.cookie)).data;assert.equal(other.shifts.length,1);assert.equal(other.shifts[0].end_at,null);
 await call(env,'/api/staff/profile',{name:'Updated',phone:'123',id:twoId,owner_id:'b',email:'hacked@example.test',active:0},one.cookie);
 const profile=(await call(env,'/api/staff/me',null,one.cookie)).data.profile;assert.equal(profile.name,'Updated');assert.equal(profile.email,'one@example.test');assert.equal((await call(env,'/api/staff/me',null,two.cookie)).data.profile.name,'Staff One');env.db.close();
});
test('owner management cannot cross tenants; disable, reset, logout and expiry revoke access',async()=>{
 const env=setup();const member=await activate(env,(await invite(env)).data.invite_url);const id=(await call(env,'/api/staff/me',null,member.cookie)).data.profile.id;
 assert.equal((await call(env,'/api/team/hours?id='+id,null,ownerCookie('b'))).status,404);
 for(const action of ['reset','disable','enable','end-shift'])assert.equal((await call(env,'/api/team/'+action,{id},ownerCookie('b'))).status,404);
 await call(env,'/api/staff/clock-in',{},member.cookie);await call(env,'/api/team/disable',{id},ownerCookie('a'));assert.equal((await call(env,'/api/staff/me',null,member.cookie)).status,401);
 await call(env,'/api/team/end-shift',{id},ownerCookie('a'));assert.equal(env.db.prepare('SELECT end_source FROM garnish_staff_shifts').get().end_source,'manager');
 await call(env,'/api/team/enable',{id},ownerCookie('a'));assert.equal((await call(env,'/api/staff/me',null,member.cookie)).status,401);
 const reset=await call(env,'/api/team/reset',{id},ownerCookie('a'));const renewed=await activate(env,reset.data.invite_url);assert.equal(renewed.status,200);
 await call(env,'/api/staff/signout',{},renewed.cookie);assert.equal((await call(env,'/api/staff/me',null,renewed.cookie)).status,401);
 const login=await call(env,'/api/staff/signin',{venue:member.venue,email:'one@example.test',password:'staff-password-123'});assert.equal(login.status,200);const token=login.response.headers.get('set-cookie')?.match(/garnish_staff=[a-f0-9]+/)[0];env.db.exec("UPDATE garnish_staff_sessions SET expires_at='2000-01-01'");assert.equal((await call(env,'/api/staff/me',null,token)).status,401);env.db.close();
});
test('expired invitations, anonymous access, cross-origin writes and excess login attempts fail closed',async()=>{
 const env=setup();const {handleStaff}=await import('../cloudflare/staff.mjs');const invited=await invite(env);env.db.exec("UPDATE garnish_staff SET invite_expires='2000-01-01'");assert.equal((await activate(env,invited.data.invite_url)).status,400);
 assert.equal((await call(env,'/api/team/list')).status,401);assert.equal((await call(env,'/api/staff/me')).status,401);
 const cross=request('/api/team/invite',{name:'Bad',email:'bad@example.test'},ownerCookie('a'));cross.headers.set('origin','https://other.test');assert.equal((await handleStaff(cross,env)).status,403);
 let last;for(let i=0;i<11;i++)last=await call(env,'/api/staff/signin',{venue:'nope',email:'nope@example.test',password:'test-password-123'});assert.equal(last.status,429);env.db.close();
});
