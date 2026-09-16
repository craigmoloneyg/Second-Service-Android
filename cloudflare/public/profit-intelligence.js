(()=>{
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(n)||0);
const pct=n=>n==null?'—':Number(n).toFixed(1)+'%';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){
  let r,j;try{r=await fetch('/api/profit-recovery',{credentials:'same-origin',cache:'no-store'});j=await r.json();if(!r.ok)throw new Error(j.error||'Could not load profit data.');}catch(e){return;}
  const pr=document.getElementById('profit-recovery');
  if(pr){
    const body=j.leaks?.length
      ? j.leaks.map(x=>'<div class="leak"><div><div class="leak-title">'+esc(x.name)+'</div><div class="evidence">'+Number(x.quantity||0).toFixed(0)+' sold · '+money(x.revenue)+' sales · '+pct(x.food_cost_pct)+' food cost</div></div><div class="impact">'+money(x.recoverable_to_30pct)+'<div class="muted" style="font-size:10px">above 30% target</div></div></div>').join('')
      : '<div class="muted">'+(j.mapped_sales_30d>0?'No mapped dishes are above the 30% food-cost target.':'Square sales are live, but recipe mappings are still needed before dish-level margin leaks can be calculated.')+'</div>';
    pr.innerHTML='<div class="card-head"><div><h2>Priority profit leaks</h2><div class="muted">Square sales joined to current invoice-derived recipe costs</div></div><span class="pill '+(j.square_connected?'green':'orange')+'">'+(j.square_connected?'Live data':'Square not synced')+'</span></div>'+body+
      '<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px"><div><div class="muted">Mapped sales</div><strong>'+money(j.mapped_sales_30d)+'</strong><div class="evidence">'+pct(j.mapped_sales_share_pct)+' of Square revenue</div></div><div><div class="muted">Estimated food cost</div><strong>'+pct(j.estimated_food_cost_pct)+'</strong><div class="evidence">'+money(j.estimated_food_cost_30d)+' on mapped dishes</div></div><div><div class="muted">Recoverable to 30%</div><strong>'+money(j.recoverable_to_30pct_30d)+'</strong><div class="evidence">Mapped dishes only</div></div></div>';
  }
  const kpis=[...document.querySelectorAll('.kpis .kpi')];
  if(kpis[0]){kpis[0].querySelector('.label').textContent='30-day Square revenue';kpis[0].querySelector('.value').textContent=money(j.revenue_30d);kpis[0].querySelector('.delta').textContent=(j.orders_30d||0)+' orders · '+(j.average_order_value==null?'—':money(j.average_order_value))+' avg';}
  if(kpis[1]){kpis[1].querySelector('.label').textContent='Recoverable profit / 30 days';kpis[1].querySelector('.value').textContent=money(j.recoverable_to_30pct_30d);kpis[1].querySelector('.delta').textContent='Based on mapped dishes above 30% food cost';}
  if(kpis[2]){kpis[2].querySelector('.label').textContent='Mapped contribution';kpis[2].querySelector('.value').textContent=money(j.contribution_30d);kpis[2].querySelector('.delta').textContent=pct(j.mapped_sales_share_pct)+' of sales mapped';}
  if(kpis[3]){kpis[3].querySelector('.label').textContent='Invoice spend captured / 30 days';kpis[3].querySelector('.value').textContent=money(j.invoice_spend_30d);kpis[3].querySelector('.delta').textContent=(j.invoice_count_30d||0)+' invoices in period';}

  const trend=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h2')?.textContent.trim()==='Profit recovery trend');
  if(trend){
    const chart=trend.querySelector('.chart');
    const pill=trend.querySelector('.pill');
    if(pill)pill.textContent=j.square_last_sync_at?'Synced '+new Date(j.square_last_sync_at).toLocaleString():'No Square sync yet';
    if(chart)chart.innerHTML='<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px"><div class="plan-step"><strong>REVENUE</strong><p>'+money(j.revenue_30d)+'</p></div><div class="plan-step"><strong>AVG ORDER</strong><p>'+(j.average_order_value==null?'—':money(j.average_order_value))+'</p></div><div class="plan-step"><strong>INVOICES CAPTURED</strong><p>'+money(j.invoice_spend_30d)+'</p></div><div class="plan-step"><strong>UNMAPPED SALES</strong><p>'+money(j.unmapped_sales_30d)+'</p></div></div>';
  }

  const supplier=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h2')?.textContent.trim()==='Supplier intelligence');
  if(supplier){
    const tbody=supplier.querySelector('tbody'),pill=supplier.querySelector('.pill');
    if(pill)pill.textContent=(j.supplier_moves||[]).length+' movements';
    if(tbody)tbody.innerHTML=(j.supplier_moves||[]).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.supplier||'—')+'</td><td class="right">'+money(x.from)+'</td><td class="right">'+money(x.to)+'</td><td class="right">'+(x.change_pct>0?'+':'')+Number(x.change_pct).toFixed(1)+'%</td></tr>').join('')||'<tr><td colspan="5" class="muted">Upload repeat invoices to measure supplier price movement.</td></tr>';
  }

  const menu=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h2')?.textContent.trim()==='Menu & margin signal');
  if(menu){
    const rows=menu.querySelectorAll('.row>div');
    if(rows[0]){rows[0].querySelector('strong').textContent=pct(j.estimated_food_cost_pct);rows[0].querySelector('.muted').textContent='From Square items mapped to costed recipes';const bar=rows[0].querySelector('.progress span');if(bar)bar.style.width=Math.min(100,Number(j.estimated_food_cost_pct||0)*2)+'%';}
    if(rows[1]){rows[1].querySelector('strong').textContent=pct(j.mapped_sales_share_pct);rows[1].querySelector('.muted').textContent='Square revenue currently mapped to recipes';const bar=rows[1].querySelector('.progress span');if(bar)bar.style.width=Math.min(100,Number(j.mapped_sales_share_pct||0))+'%';}
    if(rows[2]){rows[2].querySelector('strong').textContent=money(j.contribution_30d);}
  }
}
window.addEventListener('p2p-data-changed',load);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,500));else setTimeout(load,500);
setInterval(load,60000);
})();