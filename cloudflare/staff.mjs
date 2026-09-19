const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const enc=new TextEncoder();
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
async function hashPassword(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256)),x=>x.toString(16).padStart(2,'0')).join('');}
const clean=(v,max=160)=>String(v??'').trim().slice(0,max);
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const cookieToken=request=>(request.headers.get('cookie')||'').match(/(?:^|;\s*)garnish_staff=([a-f0-9]{64})(?:;|$)/)?.[1];
export const hasStaffCookie=request=>Boolean(cookieToken(request));
async function tables(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_teams (owner_id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_staff (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,profile TEXT NOT NULL DEFAULT \'{}\',active INTEGER NOT NULL DEFAULT 1,password_hash TEXT,password_salt TEXT,invite_hash TEXT,invite_expires TEXT,created_at TEXT NOT NULL,UNIQUE(owner_id,email))').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_staff_sessions (token_hash TEXT PRIMARY KEY,staff_id TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_staff_shifts (id TEXT PRIMARY KEY,staff_id TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT,end_source TEXT)').run();
 await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS garnish_one_open_shift ON garnish_staff_shifts(staff_id) WHERE end_at IS NULL').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_staff_attempts (key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,attempts INTEGER NOT NULL)').run();
}
async function owner(request,db){
 const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;
 return db.prepare('SELECT a.id FROM garnish_sessions_v2 s JOIN garnish_accounts_v2 a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?').bind(token,new Date().toISOString()).first();
}
async function staff(request,db){const token=cookieToken(request);if(!token)return null;return db.prepare('SELECT e.* FROM garnish_staff_sessions s JOIN garnish_staff e ON e.id=s.staff_id WHERE s.token_hash=? AND s.expires_at>? AND e.active=1').bind(await digest(token),new Date().toISOString()).first();}
const publicProfile=e=>({id:e.id,name:e.name,email:e.email,...JSON.parse(e.profile)});
async function limited(request,db,identity){
 const key=await digest((request.headers.get('cf-connecting-ip')||'unknown')+'|'+identity),now=Date.now(),window=15*60*1000;
 await db.prepare('INSERT INTO garnish_staff_attempts(key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END').bind(key,now,now-window,now-window).run();
 const row=await db.prepare('SELECT attempts FROM garnish_staff_attempts WHERE key=?').bind(key).first();return row.attempts>10;
}
async function session(db,id){const token=hex(32);await db.prepare('INSERT INTO garnish_staff_sessions(token_hash,staff_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,new Date(Date.now()+12*60*60*1000).toISOString()).run();const response=json({ok:true});response.headers.append('Set-Cookie',`garnish_staff=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);response.headers.append('Set-Cookie','p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');response.headers.append('Set-Cookie','p2p_workspace=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');return response;}
async function bodyOf(request){const raw=await request.text();requireValue(raw.length<=10000,'This request is too large.');try{return JSON.parse(raw);}catch{throw new Error('Enter valid form details.');}}
async function shifts(db,id){const result=await db.prepare('SELECT id,start_at,end_at,end_source FROM garnish_staff_shifts WHERE staff_id=? ORDER BY start_at DESC LIMIT 366').bind(id).all();const now=Date.now();return result.results.map(s=>({...s,seconds:Math.max(0,Math.floor(((s.end_at?Date.parse(s.end_at):now)-Date.parse(s.start_at))/1000))}));}
export async function handleStaff(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 if(!db)return json({error:'Staff storage is unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Use the staff form in Garnish.'},403);
 try{
  await tables(db);
  if(path.startsWith('/api/team/')){
   if(hasStaffCookie(request))return json({error:'Owner access required. Sign out of the staff portal first.'},403);
   const u=await owner(request,db);if(!u)return json({error:'Sign in to your owner account.'},401);
   await db.prepare('INSERT OR IGNORE INTO garnish_teams(owner_id,code) VALUES (?,?)').bind(u.id,hex(5)).run();
   const team=await db.prepare('SELECT code FROM garnish_teams WHERE owner_id=?').bind(u.id).first();
   if(path==='/api/team/list'&&request.method==='GET'){
    const result=await db.prepare('SELECT id,name,email,active,password_hash IS NOT NULL AS activated FROM garnish_staff WHERE owner_id=? ORDER BY name').bind(u.id).all();
    return json({code:team.code,portal_url:url.origin+'/staff?venue='+team.code,staff:result.results});
   }
   if(path==='/api/team/hours'&&request.method==='GET'){
    const id=url.searchParams.get('id');const employee=await db.prepare('SELECT id,name FROM garnish_staff WHERE id=? AND owner_id=?').bind(id,u.id).first();
    if(!employee)return json({error:'Staff member not found.'},404);return json({employee,shifts:await shifts(db,id)});
   }
   if(path==='/api/team/invite'&&request.method==='POST'){
    const body=await bodyOf(request),email=clean(body.email).toLowerCase(),name=clean(body.name);requireValue(name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter the staff member’s name and email.');
    let e=await db.prepare('SELECT id,password_hash,active FROM garnish_staff WHERE owner_id=? AND email=?').bind(u.id,email).first();
    requireValue(!e?.password_hash,'This staff member already has a sign-in.');requireValue(!e||e.active===1,'This staff member’s access has been disabled.');
    const token=hex(32),expires=new Date(Date.now()+7*86400000).toISOString(),hash=await digest(token);
    if(e)await db.prepare('UPDATE garnish_staff SET invite_hash=?,invite_expires=? WHERE id=? AND owner_id=?').bind(hash,expires,e.id,u.id).run();
    else {const id=hex(16);await db.prepare('INSERT INTO garnish_staff(id,owner_id,email,name,invite_hash,invite_expires,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,u.id,email,name,hash,expires,new Date().toISOString()).run();}
    return json({invite_url:url.origin+'/staff?venue='+team.code+'#invite='+token,expires_at:expires},201);
   }
   if(path==='/api/team/disable'&&request.method==='POST'){
    const body=await bodyOf(request);const result=await db.prepare('UPDATE garnish_staff SET active=0,invite_hash=NULL WHERE id=? AND owner_id=?').bind(body.id,u.id).run();
    if(result.meta?.changes!==1)return json({error:'Staff member not found.'},404);
    await db.prepare('DELETE FROM garnish_staff_sessions WHERE staff_id=?').bind(body.id).run();return json({ok:true});
   }
   if(path==='/api/team/end-shift'&&request.method==='POST'){
    const body=await bodyOf(request);const member=await db.prepare('SELECT id FROM garnish_staff WHERE id=? AND owner_id=?').bind(body.id,u.id).first();
    if(!member)return json({error:'Staff member not found.'},404);
    await db.prepare("UPDATE garnish_staff_shifts SET end_at=?,end_source='manager' WHERE staff_id=? AND end_at IS NULL").bind(new Date().toISOString(),member.id).run();return json({ok:true});
   }
   if(path==='/api/team/enable'&&request.method==='POST'){
    const body=await bodyOf(request);const result=await db.prepare('UPDATE garnish_staff SET active=1 WHERE id=? AND owner_id=?').bind(body.id,u.id).run();
    return result.meta?.changes===1?json({ok:true}):json({error:'Staff member not found.'},404);
   }
   if(path==='/api/team/reset'&&request.method==='POST'){
    const body=await bodyOf(request),token=hex(32),expires=new Date(Date.now()+7*86400000).toISOString();
    const result=await db.prepare('UPDATE garnish_staff SET password_hash=NULL,password_salt=NULL,invite_hash=?,invite_expires=? WHERE id=? AND owner_id=? AND active=1').bind(await digest(token),expires,body.id,u.id).run();
    if(result.meta?.changes!==1)return json({error:'Active staff member not found.'},404);
    await db.prepare('DELETE FROM garnish_staff_sessions WHERE staff_id=?').bind(body.id).run();
    return json({invite_url:url.origin+'/staff?venue='+team.code+'#invite='+token,expires_at:expires});
   }
   return json({error:'Team action not found.'},404);
  }
  if(path==='/api/staff/signout'&&request.method==='POST'){
   const token=cookieToken(request);if(token)await db.prepare('DELETE FROM garnish_staff_sessions WHERE token_hash=?').bind(await digest(token)).run();
   return json({ok:true},200,{'Set-Cookie':'garnish_staff=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
  }
  if(['/api/staff/activate','/api/staff/signin'].includes(path)&&request.method==='POST'){
   const body=await bodyOf(request),email=clean(body.email).toLowerCase(),venue=clean(body.venue,10).toLowerCase();
   if(await limited(request,db,path.endsWith('activate')?'activation':venue+'|'+email))return json({error:'Too many attempts. Wait 15 minutes before trying again.'},429);
   requireValue(typeof body.password==='string'&&body.password.length>=12&&body.password.length<=200,'Use a password with 12–200 characters.');
   if(path.endsWith('activate')){
    requireValue(/^[a-f0-9]{64}$/.test(body.invite||''),'This invitation is invalid or expired. Ask your manager for a new link.');
    const hash=await digest(body.invite),now=new Date().toISOString();
    const e=await db.prepare('SELECT id FROM garnish_staff WHERE invite_hash=? AND invite_expires>? AND active=1 AND password_hash IS NULL').bind(hash,now).first();
    if(!e)return json({error:'This invitation is invalid or expired. Ask your manager for a new link.'},400);
    const salt=hex(16),pw=await hashPassword(body.password,salt);
    const result=await db.prepare('UPDATE garnish_staff SET password_hash=?,password_salt=?,invite_hash=NULL,invite_expires=NULL WHERE id=? AND invite_hash=? AND password_hash IS NULL AND active=1').bind(pw,salt,e.id,hash).run();
    if(result.meta?.changes!==1)return json({error:'This invitation has already been used.'},409);return session(db,e.id);
   }
   const e=await db.prepare('SELECT e.* FROM garnish_staff e JOIN garnish_teams t ON t.owner_id=e.owner_id WHERE t.code=? AND e.email=? AND e.active=1').bind(venue,email).first();
   const computed=await hashPassword(body.password,e?.password_salt||'invalid-account-padding');
   if(!e?.password_hash||computed!==e.password_hash)return json({error:'Check your venue code, email and password.'},401);return session(db,e.id);
  }
  const e=await staff(request,db);if(!e)return json({error:'Sign in to your staff account.'},401);
  if(path==='/api/staff/me'&&request.method==='GET')return json({profile:publicProfile(e),shifts:await shifts(db,e.id),server_time:new Date().toISOString()});
  if(path==='/api/staff/profile'&&request.method==='POST'){
   const body=await bodyOf(request),name=clean(body.name);requireValue(name,'Enter your name.');
   const profile={phone:clean(body.phone,40),address:clean(body.address,400),emergency_contact:clean(body.emergency_contact,200)};
   await db.prepare('UPDATE garnish_staff SET name=?,profile=? WHERE id=? AND active=1').bind(name,JSON.stringify(profile),e.id).run();return json({ok:true});
  }
  if(path==='/api/staff/clock-in'&&request.method==='POST'){
   const now=new Date().toISOString();
   const result=await db.prepare('INSERT OR IGNORE INTO garnish_staff_shifts(id,staff_id,start_at) VALUES (?,?,?)').bind(hex(16),e.id,now).run();
   return json({ok:true,already_clocked_in:result.meta?.changes!==1});
  }
  if(path==='/api/staff/clock-out'&&request.method==='POST'){
   const result=await db.prepare("UPDATE garnish_staff_shifts SET end_at=?,end_source='staff' WHERE staff_id=? AND end_at IS NULL").bind(new Date().toISOString(),e.id).run();
   return json({ok:true,already_clocked_out:result.meta?.changes!==1});
  }
  return json({error:'Staff action not found.'},404);
 }catch(error){if(/D1_|SQLITE|constraint|no such table/i.test(error.message)){console.error('Staff storage failure');return json({error:'Staff storage is unavailable. Please retry.'},503);}return json({error:error.message||'Staff action failed.'},400);}
}
