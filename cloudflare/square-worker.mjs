import legacy from './worker.js';
import {handleSquare} from './square.mjs';
import {handleCommercial} from './commercial.mjs';

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
    if(action==='signout')return authJson({ok:true},200,{'Set-Cookie':'p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
    let body={};try{body=await request.json();}catch{}
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return authJson({error:'Enter a valid email address.'},400);
    if(password.length<10||password.length>200)return authJson({error:'Use a password between 10 and 200 characters.'},400);

    let account=await env.DB.prepare("SELECT * FROM garnish_accounts_v2 WHERE lower(email)=?").bind(email).first();

    if(action==='signup'){
      if(account){
        const valid=account.password_hash&&account.password_salt&&(await pwHash(password,account.password_salt))===account.password_hash;
        if(valid)return issueSession(env,account,email);
        const s=await env.DB.prepare("SELECT COUNT(*) n FROM garnish_sessions_v2 WHERE account_id=? AND expires_at>?").bind(account.id,new Date().toISOString()).first();
        if(Number(s?.n||0)>0)return authJson({error:'That email already has a Garnish account. Use Sign in.'},409);
        const salt=hex(32),hash=await pwHash(password,salt),workspace=account.workspace_id||hex(32);
        await env.DB.prepare("UPDATE garnish_accounts_v2 SET password_hash=?,password_salt=?,workspace_id=? WHERE id=?").bind(hash,salt,workspace,account.id).run();
        account={...account,password_hash:hash,password_salt:salt,workspace_id:workspace};
        return issueSession(env,account,email);
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

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/auth/signup') return directAuth(request,env,'signup');
    if(url.pathname==='/api/auth/signin') return directAuth(request,env,'signin');
    if(url.pathname==='/api/auth/signout') return directAuth(request,env,'signout');
    if(url.pathname==='/api/session') return directSession(request,env);
    if(url.pathname.startsWith('/api/square/')) return handleSquare(request,env);
    if(url.pathname.startsWith('/api/billing/')||url.pathname.startsWith('/api/consultant/')||url.pathname.startsWith('/api/myob/')) return handleCommercial(request,env);
    const response=await legacy.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&type.includes('text/html')){
      return new HTMLRewriter().on('body',{element(e){e.append('<script src="/square-ui-production.js?v=4" defer></script><script src="/page-router.js?v=11" defer></script><script src="/commercial-ui.js?v=8" defer></script><script src="/core-ui-fix.js?v=9" defer></script><script src="/profit-intelligence.js?v=8" defer></script><script src="/brand-system.js?v=3" defer></script>',{html:true});}}).transform(response);
    }
    return response;
  }
};