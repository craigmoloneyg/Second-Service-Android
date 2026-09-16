const VERSION='2026-08-19';
const enc=new TextEncoder(),dec=new TextDecoder();
const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}});
const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
async function tables(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_subscriptions (account_id TEXT PRIMARY KEY,plan TEXT NOT NULL DEFAULT \'trial\',status TEXT NOT NULL DEFAULT \'trial\',trial_ends_at TEXT,square_customer_id TEXT,square_subscription_id TEXT,square_plan_variation_id TEXT,current_period_end TEXT,updated_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_consultant_requests (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,workspace_id TEXT NOT NULL,subject TEXT,question TEXT NOT NULL,status TEXT NOT NULL DEFAULT \'open\',answer TEXT,created_at TEXT NOT NULL,answered_at TEXT)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_consultant_messages (id TEXT PRIMARY KEY,request_id TEXT NOT NULL,account_id TEXT NOT NULL,sender TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_ai_usage (account_id TEXT NOT NULL,period TEXT NOT NULL,requests INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account_id,period))').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_billing_events (event_id TEXT PRIMARY KEY,created_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_myob_states (state TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_myob_connections (account_id TEXT PRIMARY KEY,business_id TEXT NOT NULL,access_token TEXT NOT NULL,refresh_token TEXT,expires_at TEXT,last_sync_at TEXT,snapshot TEXT,cf_token TEXT,updated_at TEXT NOT NULL)').run();
 try{await env.DB.prepare('ALTER TABLE p2p_myob_connections ADD COLUMN cf_token TEXT').run();}catch{}
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_myob_imports (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,kind TEXT NOT NULL,filename TEXT NOT NULL,imported_at TEXT NOT NULL,snapshot TEXT NOT NULL)').run();
}
async function user(request,env){const c=request.headers.get('cookie')||'',t=c.match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];if(!t)return null;return env.DB.prepare('SELECT a.id,a.email,a.workspace_id FROM p2p_sessions s JOIN p2p_accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?').bind(t,new Date().toISOString()).first();}
async function sub(env,u){let r=await env.DB.prepare('SELECT * FROM p2p_subscriptions WHERE account_id=?').bind(u.id).first();if(!r){const end=new Date(Date.now()+14*86400000).toISOString(),now=new Date().toISOString();await env.DB.prepare('INSERT INTO p2p_subscriptions(account_id,plan,status,trial_ends_at,updated_at) VALUES (?,\'trial\',\'trial\',?,?)').bind(u.id,end,now).run();r=await env.DB.prepare('SELECT * FROM p2p_subscriptions WHERE account_id=?').bind(u.id).first();}if(r.status==='trial'&&Date.parse(r.trial_ends_at)<=Date.now()){await env.DB.prepare('UPDATE p2p_subscriptions SET status=\'expired\',updated_at=? WHERE account_id=?').bind(new Date().toISOString(),u.id).run();r.status='expired';}return r;}
function ent(r){const trial=r.status==='trial'&&Date.parse(r.trial_ends_at)>Date.now(),active=r.status==='active'||trial,gold=active&&r.plan==='gold';return{active,gold,plan:trial?'trial':r.plan,status:r.status,trial_ends_at:r.trial_ends_at,features:{square:active,myob:active,invoice_ai:active,standard_ai:active,enhanced_ai:gold,consultant:gold||trial}};}
async function cryptKey(env){const secret=env.P2P_TOKEN_ENCRYPTION_KEY||env.MYOB_CLIENT_SECRET;if(!secret)throw new Error('Token encryption secret is not configured.');const b=await crypto.subtle.digest('SHA-256',enc.encode('p2p-integrations:'+secret));return crypto.subtle.importKey('raw',b,{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function seal(env,v){if(!v)return null;const iv=crypto.getRandomValues(new Uint8Array(12)),out=await crypto.subtle.encrypt({name:'AES-GCM',iv},await cryptKey(env),enc.encode(v)),b=new Uint8Array(12+out.byteLength);b.set(iv);b.set(new Uint8Array(out),12);return btoa(String.fromCharCode(...b));}
async function open(env,v){if(!v)return null;const b=Uint8Array.from(atob(v),c=>c.charCodeAt(0)),iv=b.slice(0,12);return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},await cryptKey(env),b.slice(12)));}
function parseCsvText(text){
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i],next=text[i+1];
  if(ch==='"'){if(q&&next==='"'){cell+='"';i++;}else q=!q;}
  else if(ch===','&&!q){row.push(cell.trim());cell='';}
  else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&next==='\n')i++;row.push(cell.trim());cell='';if(row.some(x=>x!==''))rows.push(row);row=[];}
  else cell+=ch;
 }
 row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);
 if(!rows.length)return {headers:[],rows:[]};
 const headers=rows[0].map((h,i)=>h||('Column '+(i+1)));
 return {headers,rows:rows.slice(1,1000).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])))};
}
async function myobToken(env,body){const r=await fetch('https://secure.myob.com/oauth2/v1/authorize',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:env.MYOB_CLIENT_ID,client_secret:env.MYOB_CLIENT_SECRET})});const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||'MYOB token exchange failed.');return j;}
async function myobAccess(env,row){if(row.expires_at&&Date.parse(row.expires_at)-Date.now()<120000&&row.refresh_token){const t=await myobToken(env,{grant_type:'refresh_token',refresh_token:await open(env,row.refresh_token)}),exp=new Date(Date.now()+Number(t.expires_in||1200)*1000).toISOString();await env.DB.prepare('UPDATE p2p_myob_connections SET access_token=?,refresh_token=?,expires_at=?,updated_at=? WHERE account_id=?').bind(await seal(env,t.access_token),await seal(env,t.refresh_token||await open(env,row.refresh_token)),exp,new Date().toISOString(),row.account_id).run();row=await env.DB.prepare('SELECT * FROM p2p_myob_connections WHERE account_id=?').bind(row.account_id).first();}return open(env,row.access_token);}
async function myobGet(env,row,path){
 const t=await myobAccess(env,row),headers={Authorization:'Bearer '+t,'x-myobapi-key':env.MYOB_CLIENT_ID,'x-myobapi-version':'v2','Accept':'application/json'};
 if(row.cf_token)headers['x-myobapi-cftoken']=await open(env,row.cf_token);
 const r=await fetch('https://api.myob.com/accountright/'+row.business_id+path,{headers});
 let j={};try{j=await r.json();}catch{}
 if(!r.ok){
  if((r.status===401||r.status===403)&&!row.cf_token)throw new Error('MYOB OAuth is connected, but this company file also needs its MYOB company-file username and password.');
  throw new Error(j.Message||j.error_description||j.error||('MYOB request failed ('+r.status+').'));
 }
 return j;
}
export async function handleCommercial(request,env){const url=new URL(request.url);if(!url.pathname.startsWith('/api/billing/')&&!url.pathname.startsWith('/api/consultant/')&&!url.pathname.startsWith('/api/myob/'))return null;if(!env.DB)return json({error:'Storage unavailable.'},503);await tables(env);try{
 if(url.pathname==='/api/myob/callback'){const state=url.searchParams.get('state'),code=url.searchParams.get('code'),business=url.searchParams.get('businessId'),s=state&&await env.DB.prepare('SELECT * FROM p2p_myob_states WHERE state=?').bind(state).first();if(!s||Date.parse(s.expires_at)<Date.now()||!code||!business)return Response.redirect(url.origin+'/?myob=failed#/workspace',302);const redirect=url.origin+'/api/myob/callback',t=await myobToken(env,{grant_type:'authorization_code',code,redirect_uri:redirect,scope:'sme-general-ledger sme-purchases sme-inventory sme-company-settings sme-company-file'}),exp=new Date(Date.now()+Number(t.expires_in||1200)*1000).toISOString();await env.DB.prepare('INSERT INTO p2p_myob_connections(account_id,business_id,access_token,refresh_token,expires_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET business_id=excluded.business_id,access_token=excluded.access_token,refresh_token=excluded.refresh_token,expires_at=excluded.expires_at,updated_at=excluded.updated_at').bind(s.account_id,business,await seal(env,t.access_token),await seal(env,t.refresh_token),exp,new Date().toISOString()).run();await env.DB.prepare('DELETE FROM p2p_myob_states WHERE state=?').bind(state).run();return Response.redirect(url.origin+'/?myob=connected#/workspace',302);}
 const u=await user(request,env);if(!u)return json({error:'Sign in to your Price 2 Plate account first.'},401);const sr=await sub(env,u),e=ent(sr);
 if(url.pathname==='/api/billing/status'&&request.method==='GET')return json({subscription:e,prices:{regular:{aud_month:99},gold:{aud_month:249}},trial_days:14});
 if(url.pathname==='/api/billing/checkout'&&request.method==='POST'){const b=await request.json(),plan=b.plan==='gold'?'gold':'regular',variation=plan==='gold'?env.SQUARE_GOLD_PLAN_VARIATION_ID:env.SQUARE_REGULAR_PLAN_VARIATION_ID,amount=plan==='gold'?24900:9900;if(!env.SQUARE_BILLING_ACCESS_TOKEN||!variation)return json({error:'Subscription billing is awaiting its Square billing configuration.'},503);const r=await fetch('https://connect.squareup.com/v2/online-checkout/payment-links',{method:'POST',headers:{Authorization:'Bearer '+env.SQUARE_BILLING_ACCESS_TOKEN,'Square-Version':VERSION,'Content-Type':'application/json'},body:JSON.stringify({idempotency_key:crypto.randomUUID(),quick_pay:{name:'Price 2 Plate '+(plan==='gold'?'Gold':'Regular'),price_money:{amount,currency:'AUD'},location_id:env.SQUARE_BILLING_LOCATION_ID},checkout_options:{subscription_plan_id:variation,redirect_url:url.origin+'/#/workspace'}})}),j=await r.json();if(!r.ok)return json({error:j.errors?.[0]?.detail||'Could not open Square subscription checkout.'},502);return json({url:j.payment_link?.url,plan});}
 if(url.pathname==='/api/consultant/questions'&&request.method==='GET'){if(!e.features.consultant)return json({error:'Live consultant messaging is available on Gold.'},403);const {results=[]}=await env.DB.prepare('SELECT id,subject,question,status,answer,created_at,answered_at FROM p2p_consultant_requests WHERE account_id=? ORDER BY created_at DESC LIMIT 50').bind(u.id).all();return json({requests:results,monthly_limit:4});}
 if(url.pathname==='/api/consultant/questions'&&request.method==='POST'){if(!e.features.consultant)return json({error:'Live consultant messaging is available on Gold.'},403);const b=await request.json(),q=String(b.question||'').trim(),subject=String(b.subject||'Operational question').trim().slice(0,120),month=new Date().toISOString().slice(0,7),count=await env.DB.prepare("SELECT COUNT(*) n FROM p2p_consultant_requests WHERE account_id=? AND substr(created_at,1,7)=?").bind(u.id,month).first();if(Number(count?.n||0)>=4)return json({error:'Gold includes up to 4 new consultant cases per month.'},429);if(!q||q.length>6000)return json({error:'Enter a question up to 6,000 characters.'},400);const id=crypto.randomUUID(),now=new Date().toISOString();await env.DB.prepare('INSERT INTO p2p_consultant_requests(id,account_id,workspace_id,subject,question,status,created_at) VALUES(?,?,?,?,?,\'open\',?)').bind(id,u.id,u.workspace_id,subject,q,now).run();await env.DB.prepare('INSERT INTO p2p_consultant_messages(id,request_id,account_id,sender,body,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,u.id,'client',q,now).run();return json({ok:true,id,status:'open'},201);}
 if(url.pathname==='/api/consultant/messages'&&request.method==='GET'){
  if(!e.features.consultant)return json({error:'Live consultant messaging is available on Gold.'},403);
  const requestId=url.searchParams.get('request_id');
  if(!requestId)return json({error:'Choose a consultant conversation.'},400);
  const thread=await env.DB.prepare('SELECT id,subject,status,answer,created_at,answered_at FROM p2p_consultant_requests WHERE id=? AND account_id=?').bind(requestId,u.id).first();
  if(!thread)return json({error:'Conversation not found.'},404);
  const {results=[]}=await env.DB.prepare('SELECT id,sender,body,created_at FROM p2p_consultant_messages WHERE request_id=? AND account_id=? ORDER BY created_at ASC').bind(requestId,u.id).all();
  if(!results.length&&thread.answer)results.push({id:'legacy-answer',sender:'consultant',body:thread.answer,created_at:thread.answered_at||thread.created_at});
  return json({thread,messages:results});
 }
 if(url.pathname==='/api/consultant/messages'&&request.method==='POST'){
  if(!e.features.consultant)return json({error:'Live consultant messaging is available on Gold.'},403);
  const b=await request.json(),requestId=String(b.request_id||''),body=String(b.body||'').trim();
  if(!body||body.length>6000)return json({error:'Enter a message up to 6,000 characters.'},400);
  const thread=await env.DB.prepare('SELECT id FROM p2p_consultant_requests WHERE id=? AND account_id=?').bind(requestId,u.id).first();
  if(!thread)return json({error:'Conversation not found.'},404);
  const now=new Date().toISOString(),id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO p2p_consultant_messages(id,request_id,account_id,sender,body,created_at) VALUES(?,?,?,?,?,?)').bind(id,requestId,u.id,'client',body,now).run();
  await env.DB.prepare("UPDATE p2p_consultant_requests SET status='open' WHERE id=? AND account_id=?").bind(requestId,u.id).run();
  return json({ok:true,id,created_at:now},201);
 }
 if(url.pathname==='/api/myob/import'&&request.method==='POST'){
  if(!e.active)return json({error:'Your Price 2 Plate subscription is inactive.'},403);
  const filename=decodeURIComponent(request.headers.get('x-filename')||'MYOB-export.csv').slice(0,160);
  const kind=String(request.headers.get('x-myob-kind')||'general').toLowerCase().slice(0,40);
  const type=(request.headers.get('content-type')||'').split(';')[0].toLowerCase();
  const raw=await request.text();
  if(!raw||raw.length>1500000)return json({error:'MYOB export must be a text, CSV or JSON file under 1.5 MB.'},413);
  let parsed;
  try{parsed=type.includes('json')||filename.toLowerCase().endsWith('.json')?JSON.parse(raw):parseCsvText(raw);}catch{return json({error:'The MYOB export could not be read. Export it as CSV or JSON and try again.'},400);}
  const id=crypto.randomUUID(),now=new Date().toISOString(),snapshot={kind,filename,imported_at:now,data:parsed};
  await env.DB.prepare('INSERT INTO p2p_myob_imports(id,account_id,kind,filename,imported_at,snapshot) VALUES(?,?,?,?,?,?)').bind(id,u.id,kind,filename,now,JSON.stringify(parsed)).run();
  return json({ok:true,id,kind,filename,imported_at:now,rows:Array.isArray(parsed?.rows)?parsed.rows.length:null},201);
 }
 if(url.pathname==='/api/myob/imports'&&request.method==='GET'){
  const {results=[]}=await env.DB.prepare('SELECT id,kind,filename,imported_at FROM p2p_myob_imports WHERE account_id=? ORDER BY imported_at DESC LIMIT 20').bind(u.id).all();
  return json({imports:results});
 }
 if(url.pathname==='/api/myob/status'&&request.method==='GET'){const r=await env.DB.prepare('SELECT business_id,last_sync_at,snapshot FROM p2p_myob_connections WHERE account_id=?').bind(u.id).first();return json({connected:!!r,business_id:r?.business_id||null,last_sync_at:r?.last_sync_at||null,snapshot:r?.snapshot?JSON.parse(r.snapshot):null,company_login_saved:Boolean(r?.cf_token),configured:Boolean(env.MYOB_CLIENT_ID&&env.MYOB_CLIENT_SECRET)});}
 if(url.pathname==='/api/myob/connect'&&request.method==='POST'){if(!env.MYOB_CLIENT_ID||!env.MYOB_CLIENT_SECRET)return json({error:'MYOB app credentials are not configured yet.'},503);const state=hex(24);await env.DB.prepare('INSERT INTO p2p_myob_states(state,account_id,expires_at) VALUES(?,?,?)').bind(state,u.id,new Date(Date.now()+600000).toISOString()).run();const q=new URLSearchParams({client_id:env.MYOB_CLIENT_ID,redirect_uri:url.origin+'/api/myob/callback',response_type:'code',scope:'sme-general-ledger sme-purchases sme-inventory sme-company-settings sme-company-file',state,prompt:'consent'});return json({url:'https://secure.myob.com/oauth2/account/authorize?'+q});}
 if(url.pathname==='/api/myob/company-login'&&request.method==='POST'){
  const r=await env.DB.prepare('SELECT * FROM p2p_myob_connections WHERE account_id=?').bind(u.id).first();
  if(!r)return json({error:'Connect MYOB first.'},409);
  const b=await request.json(),username=String(b.username||'').trim(),password=String(b.password||'');
  if(!username)return json({error:'Enter the MYOB company-file username.'},400);
  const cf=btoa(unescape(encodeURIComponent(username+':'+password)));
  const test={...r,cf_token:await seal(env,cf)};
  await myobGet(env,test,'/CurrentUser');
  await env.DB.prepare('UPDATE p2p_myob_connections SET cf_token=?,updated_at=? WHERE account_id=?').bind(test.cf_token,new Date().toISOString(),u.id).run();
  return json({ok:true});
 }
 if(url.pathname==='/api/myob/sync'&&request.method==='POST'){const r=await env.DB.prepare('SELECT * FROM p2p_myob_connections WHERE account_id=?').bind(u.id).first();if(!r)return json({error:'Connect MYOB first.'},409);const end=new Date(),start=new Date(end);start.setMonth(start.getMonth()-1);const fmt=d=>d.toISOString().slice(0,10),p=await myobGet(env,r,'/Report/ProfitAndLossSummary?'+new URLSearchParams({StartDate:fmt(start),EndDate:fmt(end),ReportingBasis:'Accrual',YearEndAdjust:'false'})),snap={period:{start:fmt(start),end:fmt(end)},profit_and_loss:p};await env.DB.prepare('UPDATE p2p_myob_connections SET snapshot=?,last_sync_at=?,updated_at=? WHERE account_id=?').bind(JSON.stringify(snap),new Date().toISOString(),new Date().toISOString(),u.id).run();return json({ok:true,snapshot:snap});}
 if(url.pathname==='/api/myob/disconnect'&&request.method==='POST'){await env.DB.prepare('DELETE FROM p2p_myob_connections WHERE account_id=?').bind(u.id).run();return json({ok:true});}
 return json({error:'Unknown commercial route.'},404);
 }catch(err){return json({error:err?.message||'Request failed.'},500);}}
