import legacy from './worker.js';
import {handleSquare} from './square.mjs';
import {handleCommercial} from './commercial.mjs';

const diagnostic=(env,url)=>{
  const secret=String(env.SQUARE_APPLICATION_SECRET||'').trim();
  const environment=(env.SQUARE_ENVIRONMENT||'sandbox')!=='production'?'sandbox':'production';
  const secretType=secret.startsWith('sandbox-sq0cs')?'sandbox-application-secret':secret.startsWith('sq0cs')?'production-application-secret':secret?'unknown-secret-format':'missing';
  return new Response(JSON.stringify({
    ok:true,
    environment,
    application_id:environment==='sandbox'?'sandbox-sq0idb-EnUpCW6_2pJQKHmw9b2TCw':String(env.SQUARE_APPLICATION_ID||'').trim(),
    application_secret_configured:Boolean(secret),
    application_secret_type:secretType,
    redirect_uri:url.origin+'/api/square/callback',
    diagnostic_version:'p2p-square-2026-09-15-1'
  }),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
};

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/square/config-check'&&request.method==='GET') return diagnostic(env,url);
    if(url.pathname.startsWith('/api/square/')) return handleSquare(request,env);
    if(url.pathname.startsWith('/api/billing/')||url.pathname.startsWith('/api/consultant/')||url.pathname.startsWith('/api/myob/')) return handleCommercial(request,env);
    const response=await legacy.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&type.includes('text/html')){
      return new HTMLRewriter().on('body',{element(e){e.append('<script src="/square-ui.js" defer></script><script src="/page-router.js" defer></script><script src="/commercial-ui.js" defer></script>',{html:true});}}).transform(response);
    }
    return response;
  }
};
