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
const map={
  overview:'overview','profit-recovery':'profit-recovery',
  'invoice-processing':'purchasing','supplier-intelligence':'purchasing',purchasing:'purchasing',
  labour:'labour','menu-costing':'menu-costing',bar:'bar',analyst:'analyst',
  square:'square','square-pos':'square','workspace-info':'workspace','account-panel':'workspace','commercial-settings':'workspace'
};
let views={};

function routeFor(el){
  if(el.id&&map[el.id])return map[el.id];
  for(const n of el.querySelectorAll?.('[id]')||[]){if(map[n.id])return map[n.id];}
  const h=(el.querySelector?.('h2')?.textContent||'').toLowerCase();
  if(h.includes('supplier')||h.includes('invoice')||h.includes('purchas'))return 'purchasing';
  if(h.includes('labour'))return 'labour';
  if(h.includes('menu')||h.includes('recipe')||h.includes('margin signal'))return 'menu-costing';
  if(h.includes('bar'))return 'bar';
  if(h.includes('analyst'))return 'analyst';
  if(h.includes('profit'))return 'profit-recovery';
  if(h.includes('workspace')||h.includes('account'))return 'workspace';
  return 'overview';
}
function moveKnown(){
  const places={
    'invoice-processing':'purchasing','supplier-intelligence':'purchasing',
    'menu-costing':'menu-costing','square-pos':'square','account-panel':'workspace','commercial-settings':'workspace'
  };
  for(const [id,r] of Object.entries(places)){
    const el=document.getElementById(id);
    if(el&&views[r]&&el.parentElement!==views[r])views[r].appendChild(el);
  }
}
function go(route,push=true){
  if(!routes[route])route='overview';
  moveKnown();
  for(const v of document.querySelectorAll('.p2p-page'))v.classList.toggle('active',v.dataset.page===route);
  for(const a of document.querySelectorAll('.nav a')){
    const id=(a.getAttribute('href')||'').replace(/^#/,'');
    a.classList.toggle('active',(map[id]||id)===route);
  }
  const sel=document.querySelector('.p2p-mobile-nav select');if(sel)sel.value=route;
  if(push)history.pushState({route},'', '#'+route);
  window.scrollTo(0,0);
}
window.P2P_ROUTE_GO=go;

function build(){
  const main=document.querySelector('main.main');
  if(!main)return;
  let host=document.getElementById('p2p-page-host');
  if(!host){
    const style=document.createElement('style');
    style.textContent='#p2p-page-host{margin-top:26px}.p2p-page{display:none}.p2p-page.active{display:block}.p2p-page>.card,.p2p-page>section.card{margin:0 0 16px}.p2p-page>.kpis{margin-top:0}.p2p-page-head{margin:0 0 18px}.p2p-page-head h2{font-size:25px;margin:4px 0}.p2p-page-head p{margin:0;color:var(--muted)}.p2p-mobile-nav{display:none;margin:14px 0 0}.p2p-mobile-nav select{width:100%;background:#0c1827;color:#fff;border:1px solid var(--line);border-radius:10px;padding:11px}@media(max-width:980px){.p2p-mobile-nav{display:block}.topbar{margin-bottom:0}}';
    document.head.appendChild(style);
    host=document.createElement('div');host.id='p2p-page-host';
    for(const [key,meta] of Object.entries(routes)){
      const v=document.createElement('div');v.className='p2p-page';v.dataset.page=key;
      v.innerHTML='<div class="p2p-page-head"><div class="kicker">Price 2 Plate</div><h2>'+meta.title+'</h2><p>'+meta.subtitle+'</p></div>';
      views[key]=v;host.appendChild(v);
    }
    const header=main.querySelector(':scope > header');
    const candidates=[...main.children].filter(n=>n!==header);
    for(const node of candidates){
      if(node===host)continue;
      if(node.classList?.contains('grid-2')){
        const cards=[...node.children].filter(x=>x.classList?.contains('card'));
        if(cards.length>1){for(const card of cards)views[routeFor(card)].appendChild(card);node.remove();continue;}
      }
      views[routeFor(node)].appendChild(node);
    }
    main.appendChild(host);
    const mobile=document.createElement('div');mobile.className='p2p-mobile-nav';
    mobile.innerHTML='<select aria-label="Price 2 Plate section">'+Object.entries(routes).map(([k,v])=>'<option value="'+k+'">'+v.title+'</option>').join('')+'</select>';
    header?.after(mobile);
    mobile.querySelector('select').addEventListener('change',e=>go(e.target.value,true));
  }else{
    for(const v of host.querySelectorAll('.p2p-page'))views[v.dataset.page]=v;
  }

  // Ensure Square link exists.
  const nav=document.querySelector('.nav');
  if(nav&&!nav.querySelector('a[href="#square"]')){
    const a=document.createElement('a');a.href='#square';a.innerHTML='<span class="icon">▣</span>Square';
    nav.insertBefore(a,nav.querySelector('a[href="#workspace-info"]')||null);
  }

  moveKnown();
  let initial=(location.hash||'#overview').slice(1);
  initial=map[initial]||initial;if(!routes[initial])initial='overview';
  go(initial,false);
}

// One delegated click handler owns all sidebar navigation.
document.addEventListener('click',e=>{
  const a=e.target.closest?.('.nav a[href^="#"]');if(!a)return;
  const id=(a.getAttribute('href')||'').slice(1),route=map[id]||id;
  if(!routes[route])return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  go(route,true);
},true);

window.addEventListener('popstate',()=>{let r=(location.hash||'#overview').slice(1);go(map[r]||r,false);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();

// Only relocate dynamic cards. No nav rewiring.
new MutationObserver(()=>moveKnown()).observe(document.body,{childList:true,subtree:true});
})();