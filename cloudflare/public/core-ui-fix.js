(()=>{
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){
  const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  let j={}; try{j=await r.json()}catch{}
  if(!r.ok) throw new Error(j.error||('Request failed ('+r.status+')'));
  return j;
}
const targetToRoute={overview:'overview','profit-recovery':'profit-recovery','invoice-processing':'purchasing',purchasing:'purchasing',labour:'labour','menu-costing':'menu-costing',bar:'bar',analyst:'analyst','workspace-info':'workspace','square-pos':'square','account-panel':'workspace','commercial-settings':'workspace'};
function go(route){
  if(typeof window.P2P_ROUTE_GO==='function'){window.P2P_ROUTE_GO(route,true);return;}
  const views=[...document.querySelectorAll('.p2p-page')];
  if(views.length){
    views.forEach(v=>v.classList.toggle('active',v.dataset.page===route));
    document.querySelectorAll('.nav a').forEach(a=>{
      const id=(a.getAttribute('href')||'').replace('#','');
      const r=targetToRoute[id]||id;
      a.classList.toggle('active',r===route);
    });
    const sel=document.querySelector('.p2p-mobile-nav select');if(sel)sel.value=route;
    history.replaceState({route},'', '#'+route);
    window.scrollTo({top:0,behavior:'auto'});
    return;
  }
  const id=Object.keys(targetToRoute).find(k=>targetToRoute[k]===route)||route;
  const el=$(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
function wireNav(){}
function moveDynamicWorkspaceCards(){
  const workspace=document.querySelector('.p2p-page[data-page="workspace"]');
  if(!workspace)return;
  ['commercial-settings'].forEach(id=>{const el=$(id);if(el&&el.parentElement!==workspace)workspace.appendChild(el);});
}
function replaceButton(id){
  const old=$(id); if(!old)return null;
  const n=old.cloneNode(true); old.replaceWith(n); return n;
}
function wireAccount(){
  const panel=$('account-panel'),btn=$('accountBtn'),form=$('account-form'),toggle=$('account-toggle'),title=$('account-title'),submit=$('account-submit'),msg=$('account-message');
  if(!panel||!btn||!form)return;
  btn.onclick=e=>{e.preventDefault();go('workspace');panel.hidden=false;setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),30);};
  let mode='signup';
  if(submit) submit.textContent='Create account & start 14-day trial';
  if(toggle) toggle.onclick=()=>{mode=mode==='signup'?'signin':'signup';if(title)title.textContent=mode==='signup'?'Create your account':'Sign in';if(submit)submit.textContent=mode==='signup'?'Create account & start 14-day trial':'Sign in';toggle.textContent=mode==='signup'?'Already have an account? Sign in':'Need an account? Start free trial';if(msg)msg.textContent='';};
  form.onsubmit=async e=>{
    e.preventDefault();
    const email=$('account-email')?.value.trim(),password=$('account-password')?.value||'';
    if(msg)msg.textContent=mode==='signup'?'Creating account…':'Signing in…';
    if(submit)submit.disabled=true;
    try{
      await api('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      let trial='';
      try{const b=await api('/api/billing/status');if(b.subscription?.status==='trial')trial=' Your 14-day trial is active.';}catch{}
      if(msg)msg.textContent=(mode==='signup'?'Account created.':'Signed in.')+trial;
      btn.textContent='Account';
      setTimeout(()=>location.reload(),700);
    }catch(err){if(msg)msg.textContent=err.message;}
    finally{if(submit)submit.disabled=false;}
  };
}
function wireInvoice(){
  const existing=$('analyseInvoiceBtn'); if(existing?.dataset?.batchReady)return;
  const btn=replaceButton('analyseInvoiceBtn'); if(!btn)return;
  btn.type='button';
  btn.onclick=async()=>{
    const input=$('invoiceFile'),file=input?.files?.[0],status=$('aiStatus'),out=$('invoiceResult');
    if(!file){if(out){out.style.display='block';out.innerHTML='<div class="muted">Choose an invoice file first.</div>';}return;}
    btn.disabled=true;btn.textContent='Analysing…';if(status)status.textContent='Reading invoice';
    if(out){out.style.display='block';out.innerHTML='<div class="muted">Uploading securely and extracting invoice data…</div>';}
    try{
      const r=await fetch('/api/invoice/extract',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:file});
      let data={};try{data=await r.json()}catch{}
      if(!r.ok)throw new Error(data.error||('Invoice analysis failed ('+r.status+')'));
      if(status)status.textContent=data.saved?'Saved & costed':'Complete';
      const rows=(data.line_items||[]).slice(0,30).map(i=>'<tr><td>'+esc(i.description)+'</td><td>'+esc(i.quantity)+'</td><td>'+esc(i.unit)+'</td><td class="right">'+esc(i.unit_price)+'</td><td class="right">'+esc(i.line_total)+'</td></tr>').join('');
      if(out)out.innerHTML='<div class="kicker">'+(data.saved?'Saved to purchasing history':'Extraction complete')+'</div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:10px 0 14px"><div><div class="muted">Supplier</div><strong>'+esc(data.supplier_or_source||'Unknown')+'</strong></div><div><div class="muted">Date</div><strong>'+esc(data.document_date||'—')+'</strong></div><div><div class="muted">Invoice</div><strong>'+esc(data.document_number||data.document_num||'—')+'</strong></div><div><div class="muted">Total</div><strong>'+esc(data.total??'—')+'</strong></div></div>'+(rows?'<table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th class="right">Unit price</th><th class="right">Total</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="muted">No line items returned.</div>');
      if(typeof window.loadIngredients==='function')window.loadIngredients();
      if(typeof window.loadRecipes==='function')window.loadRecipes();
    }catch(err){if(status)status.textContent='Error';if(out)out.innerHTML='<div style="color:#ff8e99">'+esc(err.message)+'</div>';}
    finally{btn.disabled=false;btn.textContent='Analyse invoice';}
  };
}
function wireAnalyst(){
  const box=$('analyst');if(!box)return;
  const ask=box.querySelector('.ai-box button'),input=box.querySelector('.ai-box input');if(!ask||!input)return;
  const n=ask.cloneNode(true);ask.replaceWith(n);
  n.onclick=async()=>{
    const q=input.value.trim();if(!q)return;
    const result=box.querySelector('.ai-box')?.nextElementSibling;
    n.disabled=true;n.textContent='Thinking…';if(result)result.textContent='Analysing your workspace records…';
    try{const x=await api('/api/ai/advice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,area:'profit'})});if(result)result.textContent=x.advice?.summary||'No answer returned.';}
    catch(e){if(result)result.textContent=e.message;}
    finally{n.disabled=false;n.textContent='Ask';}
  };
}
function wireUtilityButtons(){
  const exp=replaceButton('exportReportBtn');if(exp)exp.onclick=()=>{location.href='/api/report';};
  const top=[...document.querySelectorAll('.top-actions .btn')].find(b=>/create action plan/i.test(b.textContent||''));
  if(top){const n=top.cloneNode(true);top.replaceWith(n);n.onclick=async()=>{n.disabled=true;n.textContent='Creating…';try{await api('/api/action-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'90-day profit recovery plan',steps:['Confirm baseline food cost, labour, sales and waste','Review purchasing and supplier movements','Align labour to demand','Cost highest-volume menu items','Measure weekly results']})});n.textContent='Plan created';go('profit-recovery');}catch(e){alert(e.message);n.textContent='Create action plan';}finally{n.disabled=false;}};}
  const bar=replaceButton('barAnalystBtn');if(bar)bar.onclick=async()=>{const out=$('barResult');if(out){out.hidden=false;out.textContent='Analysing bar operations…';}try{const x=await api('/api/ai/advice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Review my bar costs, pour margins, stock variance and labour opportunities using only the records in this workspace.',area:'bar'})});if(out)out.textContent=x.advice?.summary||'No answer returned.';}catch(e){if(out)out.textContent=e.message;}};
  const stock=replaceButton('barStockBtn');if(stock)stock.onclick=()=>{const out=$('barResult');if(out){out.hidden=false;out.textContent='Bar stocktake workflow is not yet configured. Use invoice uploads for beverage costs while this module is completed.';}};
}
function wireCommercial(){
  moveDynamicWorkspaceCards();
  const panel=$('commercial-settings');if(!panel)return;
  const badge=$('planBadge');
  if(badge&&badge.textContent==='Sign in')badge.title='Create an account to start the 14-day trial.';
}
function init(){wireNav();moveDynamicWorkspaceCards();wireAccount();wireInvoice();wireAnalyst();wireUtilityButtons();wireCommercial();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
new MutationObserver(()=>{moveDynamicWorkspaceCards();wireCommercial();}).observe(document.documentElement,{childList:true,subtree:true});
})();