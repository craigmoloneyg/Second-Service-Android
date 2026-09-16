(()=>{
const routes={
  overview:{title:'Overview',subtitle:'The headline numbers and venue health at a glance.'},
  'profit-recovery':{title:'Profit recovery',subtitle:'Prioritise the leaks with the biggest financial impact.'},
  purchasing:{title:'Purchasing',subtitle:'Invoices, suppliers, ingredient costs and price movement.'},
  labour:{title:'Labour',subtitle:'Match wage spend to real trading demand.'},
  'menu-costing':{title:'Menu performance',subtitle:'Recipe costs, selling prices and contribution by dish.'},
  bar:{title:'Bar',subtitle:'Beverage cost, pour margin and stock variance.'},
  analyst:{title:'Ask the Analyst',subtitle:'Interrogate your venue evidence in plain English.'},
  square:{title:'Square',subtitle:'Live POS connection, sales sync and menu activity.'},
  workspace:{title:'Workspace',subtitle:'Account, integrations, billing and venue settings.'}
};
const targetToRoute={overview:'overview','profit-recovery':'profit-recovery','invoice-processing':'purchasing','supplier-intelligence':'purchasing',purchasing:'purchasing',labour:'labour','menu-costing':'menu-costing',bar:'bar',analyst:'analyst','workspace-info':'workspace','square-pos':'square','account-panel':'workspace'};
function routeFor(el){
  const ids=[el.id,...[...el.querySelectorAll('[id]')].map(x=>x.id)];
  for(const id of ids){if(targetToRoute[id])return targetToRoute[id];}
  const h=(el.querySelector('h2')?.textContent||'').toLowerCase();
  if(h.includes('supplier')||h.includes('invoice')||h.includes('purchas'))return 'purchasing';
  if(h.includes('labour'))return 'labour';
  if(h.includes('menu')||h.includes('recipe')||h.includes('margin signal'))return 'menu-costing';
  if(h.includes('bar'))return 'bar';
  if(h.includes('analyst'))return 'analyst';
  if(h.includes('workspace')||h.includes('account')||h.includes('square'))return 'workspace';
  if(h.includes('profit'))return 'profit-recovery';
  return 'overview';
}
function splitGrid(node,views){
  const cards=[...node.children].filter(x=>x.classList?.contains('card'));
  if(cards.length<2)return false;
  cards.forEach(card=>views[routeFor(card)].appendChild(card));
  node.remove();
  return true;
}
function enforceKnownRoutes(views){
  const purchasing=['invoice-processing','supplier-intelligence'];
  const menu=['menu-costing'];
  for(const id of purchasing){const el=document.getElementById(id);if(el&&el.parentElement!==views.purchasing)views.purchasing.appendChild(el);}
  for(const id of menu){const el=document.getElementById(id);if(el&&el.parentElement!==views['menu-costing'])views['menu-costing'].appendChild(el);}
}
function build(){
  const main=document.querySelector('main.main'); if(!main||document.getElementById('p2p-page-host'))return;
  const style=document.createElement('style');style.textContent=`
    #p2p-page-host{margin-top:26px}.p2p-page{display:none}.p2p-page.active{display:block}.p2p-page>.card,.p2p-page>section.card{margin:0 0 16px}.p2p-page>.kpis{margin-top:0}.p2p-page-head{margin:0 0 18px}.p2p-page-head h2{font-size:25px;margin:4px 0}.p2p-page-head p{margin:0;color:var(--muted)}
    .p2p-mobile-nav{display:none;margin:14px 0 0}.p2p-mobile-nav select{width:100%;background:#0c1827;color:#fff;border:1px solid var(--line);border-radius:10px;padding:11px}
    @media(max-width:980px){.p2p-mobile-nav{display:block}.topbar{margin-bottom:0}}
  `;document.head.appendChild(style);
  const host=document.createElement('div');host.id='p2p-page-host';
  const views={};
  Object.entries(routes).forEach(([key,meta])=>{const v=document.createElement('div');v.className='p2p-page';v.dataset.page=key;v.innerHTML=`<div class="p2p-page-head"><div class="kicker">Price 2 Plate</div><h2>${meta.title}</h2><p>${meta.subtitle}</p></div>`;views[key]=v;host.appendChild(v);});
  const header=main.querySelector(':scope > header');
  const candidates=[...main.children].filter(x=>x!==header);
  candidates.forEach(node=>{
    if(node.id==='p2p-page-host')return;
    if(node.classList.contains('grid-2')&&splitGrid(node,views))return;
    views[routeFor(node)].appendChild(node);
  });
  enforceKnownRoutes(views);
  main.appendChild(host);
  const mobile=document.createElement('div');mobile.className='p2p-mobile-nav';mobile.innerHTML=`<select aria-label="Price 2 Plate section">${Object.entries(routes).map(([k,v])=>`<option value="${k}">${v.title}</option>`).join('')}</select>`;header?.after(mobile);mobile.querySelector('select').onchange=e=>go(e.target.value,true);
  document.querySelectorAll('.nav a').forEach(a=>{const id=(a.getAttribute('href')||'').replace('#','');const r=targetToRoute[id]||id;if(routes[r]){a.dataset.route=r;a.onclick=e=>{e.preventDefault();go(r,true);};}});
  const observer=new MutationObserver(()=>{const sq=document.getElementById('square-pos');if(sq&&sq.parentElement!==views.square)views.square.appendChild(sq);});observer.observe(main,{childList:true,subtree:true});
  let initial=targetToRoute[location.hash.slice(1)]||location.hash.slice(1)||'overview';if(!routes[initial])initial='overview';go(initial,false);
}
function go(route,push){
  if(!routes[route])route='overview';
  document.querySelectorAll('.p2p-page').forEach(v=>v.classList.toggle('active',v.dataset.page===route));
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===route));
  const sel=document.querySelector('.p2p-mobile-nav select');if(sel)sel.value=route;
  if(push)history.pushState({route},'',`#${route}`);
  window.scrollTo({top:0,behavior:'smooth'});
}
window.addEventListener('popstate',()=>{const r=targetToRoute[location.hash.slice(1)]||location.hash.slice(1)||'overview';go(r,false);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
