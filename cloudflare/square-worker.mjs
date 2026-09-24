import {handlePOS,hasKitchenCookie} from './pos.mjs';
import legacy from './worker.js';
import {handleSquare} from './square.mjs';
import {handleCommercial} from './commercial.mjs';
import {handleAccounting} from './accounting.mjs';
import {handleStaff,hasStaffCookie} from './staff.mjs';

const authJson=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...h}});
const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function authTables(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS garnish_accounts_v2 (email TEXT PRIMARY KEY,id TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,workspace_id TEXT NOT NULL,created_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS garnish_sessions_v2 (token TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires_at TEXT NOT NULL)").run();
}
async function pwHash(password,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:15000,hash:'SHA-256'},key,256));
}
async function issueSession(env,account,email){
  const token=hex(32),expires=new Date(Date.now()+2592000000).toISOString();
  await env.DB.prepare("INSERT INTO garnish_sessions_v2(token,account_id,expires_at) VALUES(?,?,?)").bind(token,account.id,expires).run();
  return authJson({ok:true,email,workspace_id:account.workspace_id},200,{'Set-Cookie':'p2p_auth='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'});
}
async function directAuth(request,env,action){
  try{
    if(!env.DB)return authJson({error:'Account storage is unavailable.'},503);
    await authTables(env);
    if(action==='signout'){
      const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
      if(token)await env.DB.prepare('DELETE FROM garnish_sessions_v2 WHERE token=?').bind(token).run();
      return authJson({ok:true},200,{'Set-Cookie':'p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
    }
    let body={};try{body=await request.json();}catch{}
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return authJson({error:'Enter a valid email address.'},400);
    if(password.length<10||password.length>200)return authJson({error:'Use a password between 10 and 200 characters.'},400);

    let account=await env.DB.prepare("SELECT * FROM garnish_accounts_v2 WHERE lower(email)=?").bind(email).first();

    if(action==='signup'){
      if(account){
        const valid=account.password_hash&&account.password_salt&&(await pwHash(password,account.password_salt))===account.password_hash;
        if(valid)return issueSession(env,account,email);
        return authJson({error:'That email already has a Garnish account. Use Sign in.'},409);
      }
      const id=hex(32),salt=hex(32),workspace=hex(32),hash=await pwHash(password,salt),created=new Date().toISOString();
      await env.DB.prepare("INSERT INTO garnish_accounts_v2(id,email,password_hash,password_salt,workspace_id,created_at) VALUES(?,?,?,?,?,?)").bind(id,email,hash,salt,workspace,created).run();
      account={id,email,password_hash:hash,password_salt:salt,workspace_id:workspace,created_at:created};
      return issueSession(env,account,email);
    }

    if(!account||!account.password_hash||!account.password_salt)return authJson({error:'Email or password is incorrect.'},401);
    if((await pwHash(password,account.password_salt))!==account.password_hash)return authJson({error:'Email or password is incorrect.'},401);
    return issueSession(env,account,email);
  }catch(err){
    console.error('Direct Garnish auth error',err?.stack||err?.message||err);
    return authJson({error:'Garnish account setup failed: '+String(err?.message||'unknown error').slice(0,160)},503);
  }
}
async function directSession(request,env){
  try{
    await authTables(env);
    const cookie=request.headers.get('cookie')||'';
    const token=cookie.match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
    let auth=null;
    if(token)auth=await env.DB.prepare("SELECT a.email,a.workspace_id FROM garnish_sessions_v2 s JOIN garnish_accounts_v2 a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?").bind(token,new Date().toISOString()).first();
    let workspace=auth?.workspace_id||cookie.match(/(?:^|;\s*)p2p_workspace=([a-f0-9]{64})(?:;|$)/)?.[1]||hex(32);
    return authJson({ok:true,authenticated:Boolean(auth),email:auth?.email||null,workspace_id:workspace},200,{'Set-Cookie':'p2p_workspace='+workspace+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000'});
  }catch(err){
    return authJson({ok:false,authenticated:false,error:'Session setup failed.'},503);
  }
}

async function recoveryAccount(request,env){
 const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
 return token?env.DB.prepare('SELECT a.id,a.email FROM garnish_sessions_v2 s JOIN garnish_accounts_v2 a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?').bind(token,new Date().toISOString()).first():null;
}
async function recoveryHash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('')}
async function recoverPassword(request,env,action){
 try{
  await authTables(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS garnish_password_resets(hash TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires INTEGER NOT NULL,used TEXT)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS garnish_recovery_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)').run();
  if(action==='status'){const a=await recoveryAccount(request,env);return authJson({signedIn:!!a,email:a?.email||null,emailReady:!!(env.RESEND_API_KEY&&env.PASSWORD_RESET_FROM)})}
  const now=Date.now(),bucket=Math.floor(now/900000),ip=request.headers.get('cf-connecting-ip')||'unknown';
  await env.DB.prepare('DELETE FROM garnish_recovery_limits WHERE expires<?').bind(now).run();
  await env.DB.prepare('DELETE FROM garnish_password_resets WHERE expires<?').bind(now).run();
  const allow=async key=>env.DB.prepare('INSERT INTO garnish_recovery_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<5 RETURNING count').bind(await recoveryHash(key+bucket),(bucket+1)*900000).first();
  if(!await allow(ip))return authJson({error:'Too many attempts. Please try again in 15 minutes.'},429);
  const b=await request.json();
  if(action==='forgot'){
   if(!env.RESEND_API_KEY||!env.PASSWORD_RESET_FROM)return authJson({error:'Reset emails are not enabled yet. If you are already signed in to the original Garnish on this browser, reload this page to change your password. Otherwise the site owner must configure reset-email delivery.'},503);
   const email=String(b.email||'').trim().toLowerCase();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return authJson({error:'Enter a valid email address.'},400);
   const generic={ok:true,message:'If this email has a Garnish account, a reset link will arrive shortly. Check your spam folder. The link expires in 30 minutes.'};
   if(!await allow('email:'+email))return authJson(generic);
   const account=await env.DB.prepare('SELECT id FROM garnish_accounts_v2 WHERE lower(email)=?').bind(email).first();if(!account)return authJson(generic);
   const token=hex(32),hash=await recoveryHash(token);await env.DB.prepare('INSERT INTO garnish_password_resets(hash,account_id,expires) VALUES(?,?,?)').bind(hash,account.id,now+1800000).run();
   const url='https://second-service-profit-intelligence.craig-moloneyg.workers.dev/recover-password#token='+token;
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:env.PASSWORD_RESET_FROM,to:[email],subject:'Reset your Garnish password',text:'Use this single-use link within 30 minutes to set a new Garnish password:\n\n'+url+'\n\nIf you did not request this, ignore this email. Your password has not changed.'})});
   if(!sent.ok){await env.DB.prepare('DELETE FROM garnish_password_resets WHERE hash=?').bind(hash).run();return authJson({error:'Reset-email delivery failed. Please try again later or ask the site owner to check email delivery.'},503)}
   return authJson(generic);
  }
  const password=String(b.password||'');if(password.length<10||password.length>200)return authJson({error:'Use a new password between 10 and 200 characters.'},400);
  let hash=String(b.token||'');
  if(action==='change'){
   const account=await recoveryAccount(request,env);if(!account)return authJson({error:'Your original Garnish sign-in has expired. Request a reset email.'},401);
   hash=await recoveryHash(hex(32));await env.DB.prepare('INSERT INTO garnish_password_resets(hash,account_id,expires) VALUES(?,?,?)').bind(hash,account.id,now+60000).run();
  }else{if(!/^[a-f0-9]{64}$/.test(hash))return authJson({error:'This reset link is invalid. Request a new one.'},400);hash=await recoveryHash(hash)}
  const salt=hex(32),passwordHash=await pwHash(password,salt),claim=hex(32);
  const result=await env.DB.batch([
   env.DB.prepare('UPDATE garnish_password_resets SET used=? WHERE hash=? AND used IS NULL AND expires>?').bind(claim,hash,now),
   env.DB.prepare('UPDATE garnish_accounts_v2 SET password_hash=?,password_salt=? WHERE id=(SELECT account_id FROM garnish_password_resets WHERE hash=? AND used=?)').bind(passwordHash,salt,hash,claim),
   env.DB.prepare('DELETE FROM garnish_sessions_v2 WHERE account_id=(SELECT account_id FROM garnish_password_resets WHERE hash=? AND used=?)').bind(hash,claim),
   env.DB.prepare('DELETE FROM garnish_password_resets WHERE account_id=(SELECT account_id FROM garnish_password_resets WHERE hash=? AND used=?)').bind(hash,claim)
  ]);
  if(!result[0].meta.changes)return authJson({error:'This reset link expired or was already used. Request a new one.'},400);
  return authJson({ok:true,message:'Password changed. Return to Garnish Connections and sign in with your new password.'},200,{'Set-Cookie':'p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
 }catch{return authJson({error:'Password recovery could not finish. Please try again.'},503)}
}
function recoveryPage(){
 const nonce=hex(16);
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Garnish · Recover password</title><style nonce="${nonce}">body{background:#082d24;color:#f4f5e9;font:18px system-ui;margin:0;padding:30px}main{max-width:520px;margin:8vh auto}h1{font-family:Georgia}label,input,button{display:block}input{box-sizing:border-box;width:100%;padding:14px;margin:10px 0 22px;border-radius:9px;border:1px solid #bcc6b5;font:inherit}button{background:#afd52a;color:#082d24;padding:14px 20px;border:0;border-radius:9px;font:inherit;cursor:pointer}button:disabled{opacity:.6}a{color:#c7e963}p{line-height:1.5}[hidden]{display:none!important}</style><main><h1>Garnish</h1><h2>Recover your password</h2><p id="status" role="status">Checking recovery options…</p><form id="form" hidden><label id="emailLabel">Garnish account email<input id="email" type="email" autocomplete="username"></label><div id="newPassword" hidden><label>New password<input id="password" type="password" minlength="10" maxlength="200" autocomplete="new-password"></label><label>Confirm new password<input id="confirm" type="password" autocomplete="new-password"></label></div><button id="submit">Send reset link</button></form><p><a href="https://garnish-craig.craig-moloneyg.chatgpt.site/workspace">Return to Garnish</a></p></main><script nonce="${nonce}">
const form=document.getElementById('form'),status=document.getElementById('status'),button=document.getElementById('submit'),email=document.getElementById('email'),password=document.getElementById('password'),confirm=document.getElementById('confirm');let token=new URLSearchParams(location.hash.slice(1)).get('token')||'',mode=token?'reset':'forgot';history.replaceState(null,'',location.pathname);
async function init(){try{const r=await fetch('/recovery-status',{cache:'no-store'}),s=await r.json();if(!r.ok)throw Error(s.error);if(!token&&s.signedIn){mode='change';status.textContent='You are signed in as '+s.email+'. Set a new password below.'}else status.textContent=token?'Choose a new password. This link can be used once.':s.emailReady?'Enter the email used for your original Garnish account.':'Reset emails still need to be enabled by the site owner. If another browser is signed in to the original Garnish, open this recovery page there.';form.hidden=false;const changing=mode!=='forgot';document.getElementById('emailLabel').hidden=changing;document.getElementById('newPassword').hidden=!changing;email.required=!changing;password.required=changing;confirm.required=changing;button.textContent=changing?'Save new password':'Send reset link';button.disabled=!changing&&!s.emailReady;}catch(e){status.textContent=e.message||'Recovery options could not load. Please reload.'}}
form.addEventListener('submit',async e=>{e.preventDefault();if(mode!=='forgot'&&password.value!==confirm.value){status.textContent='The new passwords do not match.';return}button.disabled=true;status.textContent='Working…';try{const r=await fetch('/api/auth/'+({forgot:'forgot-password',reset:'reset-password',change:'change-password'}[mode]),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.value,password:password.value,token})}),x=await r.json();if(!r.ok)throw Error(x.error||'Recovery failed');status.textContent=x.message;if(mode!=='forgot'){form.hidden=true;token='';password.value='';confirm.value=''}}catch(e){status.textContent=e.message}finally{button.disabled=false}});init();
</script></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(hasKitchenCookie(request)&&!['/kitchen','/kitchen/','/kitchen.html','/pos.css','/pos-ui.js'].includes(url.pathname)&&!url.pathname.startsWith('/api/pos/')){
      if(url.pathname.startsWith('/api/'))return authJson({error:'Kitchen access only.'},403);
      return Response.redirect(url.origin+'/kitchen',303);
    }
    if(url.pathname.startsWith('/api/pos/')){
      if(hasStaffCookie(request))return authJson({error:'Staff accounts cannot access the POS.'},403);
      return handlePOS(request,env);
    }
    if(['/kitchen','/kitchen/','/kitchen.html'].includes(url.pathname)){
      url.pathname='/kitchen';const asset=await env.ASSETS.fetch(new Request(url,request));const r=new Response(asset.body,asset);
      r.headers.set('Cache-Control','no-store');r.headers.set('Referrer-Policy','no-referrer');
      r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return r;
    }
    if(url.pathname.startsWith('/api/staff/')||url.pathname.startsWith('/api/team/'))return handleStaff(request,env);
    if(['/staff','/staff/','/staff.html'].includes(url.pathname)){
      url.pathname='/staff.html';const asset=await env.ASSETS.fetch(new Request(url,request));const response=new Response(asset.body,asset);
      response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
      response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return response;
    }
    if(hasStaffCookie(request)&&!['/staff.js','/staff.css','/garnish-logo.svg'].includes(url.pathname)){
      if(url.pathname.startsWith('/api/'))return authJson({error:'Staff accounts can only access the staff portal.'},403);
      return Response.redirect(url.origin+'/staff',303);
    }
    if(url.pathname==='/recover-password'&&request.method==='GET')return recoveryPage();
    if(url.pathname==='/recovery-status'&&request.method==='GET')return recoverPassword(request,env,'status');
    if(url.pathname.startsWith('/api/auth/') && request.method!=='POST')return authJson({error:'Method not allowed.'},405);
    if(url.pathname.startsWith('/api/auth/') && request.headers.get('origin')!==url.origin)return authJson({error:'Request origin is not allowed.'},403);
    if(url.pathname.startsWith('/api/accounting/'))return handleAccounting(request,env);
    if(url.pathname==='/api/auth/forgot-password')return recoverPassword(request,env,'forgot');
    if(url.pathname==='/api/auth/reset-password')return recoverPassword(request,env,'reset');
    if(url.pathname==='/api/auth/change-password')return recoverPassword(request,env,'change');
    if(url.pathname==='/api/auth/signup') return directAuth(request,env,'signup');
    if(url.pathname==='/api/auth/signin') return directAuth(request,env,'signin');
    if(url.pathname==='/api/auth/signout') return directAuth(request,env,'signout');
    if(url.pathname==='/api/session') return directSession(request,env);
    if(url.pathname.startsWith('/api/square/')) return handleSquare(request,env);
    if(url.pathname.startsWith('/api/billing/')||url.pathname.startsWith('/api/consultant/')||url.pathname.startsWith('/api/myob/')||url.pathname.startsWith('/api/documents/')) return handleCommercial(request,env);
    const response=await legacy.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&type.includes('text/html')){
      return new HTMLRewriter().on('body',{element(e){e.append('<script src="/square-ui-production.js?v=4" defer></script><script src="/page-router.js?v=14" defer></script><script src="/commercial-ui.js?v=10" defer></script><script src="/core-ui-fix.js?v=9" defer></script><script src="/profit-intelligence.js?v=8" defer></script><script src="/brand-system.js?v=8" defer></script><script src="/premium-brand.js?v=5" defer></script><script src="/accounting-ui.js?v=4" defer></script><script src="/team-ui.js?v=1" defer></script><link rel="stylesheet" href="/pos.css?v=1"><script src="/pos-ui.js?v=1" defer></script>',{html:true});}}).transform(response);
    }
    return response;
  }
};

