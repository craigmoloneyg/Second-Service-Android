import legacy from './worker.js';
import {handleSquare} from './square.mjs';
import {handleCommercial} from './commercial.mjs';
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/square/')) return handleSquare(request,env);
    if(url.pathname.startsWith('/api/billing/')||url.pathname.startsWith('/api/consultant/')||url.pathname.startsWith('/api/myob/')) return handleCommercial(request,env);
    const response=await legacy.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&type.includes('text/html')){
      return new HTMLRewriter().on('body',{element(e){e.append('<script src="/square-ui-production.js?v=4" defer></script><script src="/page-router.js?v=6" defer></script><script src="/commercial-ui.js?v=2" defer></script><script src="/core-ui-fix.js?v=4" defer></script><script src="/profit-intelligence.js?v=5" defer></script>',{html:true});}}).transform(response);
    }
    return response;
  }
};
