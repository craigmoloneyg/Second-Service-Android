(()=>{
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(n)||0);
const pct=n=>n==null?'—':Number(n).toFixed(1)+'%';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function wireSortControls(){
  const ps=document.getElementById('purchasingSortBy'),pd=document.getElementById('purchasingSortDir');
  [ps,pd].forEach(el=>{if(el&&!el.dataset.sortReady){el.dataset.sortReady='1';el.addEventListener('change',load);}});
}

async function load(){
  wireSortControls();
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
    let products=(j.supplier_products||[]).slice(),moves=j.supplier_moves||[];
    const sortBy=document.getElementById('purchasingSortBy')?.value||'name';
    const sortDir=document.getElementById('purchasingSortDir')?.value||'asc';
    products.sort((a,b)=>{
      let av=a?.[sortBy],bv=b?.[sortBy];
      if(['name','supplier','last_date'].includes(sortBy)){
        av=String(av||'').toLowerCase();bv=String(bv||'').toLowerCase();
        return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
      }
      av=Number(av);bv=Number(bv);if(!Number.isFinite(av))av=-Infinity;if(!Number.isFinite(bv))bv=-Infinity;
      return sortDir==='asc'?av-bv:bv-av;
    });
    if(pill)pill.textContent=products.length+' extracted items';
    if(tbody){
      tbody.innerHTML=products.slice(0,80).map(x=>{
        const moved=x.invoice_count>1&&x.change_pct!=null;
        return '<tr><td>'+esc(x.name)+'</td><td>'+esc(x.supplier||'—')+'</td><td class="right">'+money(x.first_price)+'</td><td class="right">'+money(x.current_price)+'</td><td class="right">'+(moved?((x.change_pct>0?'+':'')+Number(x.change_pct).toFixed(1)+'%'):'New')+'</td></tr>';
      }).join('')||'<tr><td colspan="5" class="muted">No extracted invoice items are stored in this workspace yet.</td></tr>';
    }
    const head=supplier.querySelector('.card-head .muted');
    if(head)head.textContent=products.length
      ? 'Live extracted invoice products and supplier price movement'
      : 'Invoice-derived purchasing movements';
  }

  const menu=[...document.querySelectorAll('.card')].find(x=>x.querySelector('h2')?.textContent.trim()==='Menu & margin signal');
  if(menu){
    const rows=menu.querySelectorAll('.row>div');
    if(rows[0]){rows[0].querySelector('strong').textContent=pct(j.estimated_food_cost_pct);rows[0].querySelector('.muted').textContent='From Square items mapped to costed recipes';const bar=rows[0].querySelector('.progress span');if(bar)bar.style.width=Math.min(100,Number(j.estimated_food_cost_pct||0)*2)+'%';}
    if(rows[1]){rows[1].querySelector('strong').textContent=pct(j.mapped_sales_share_pct);rows[1].querySelector('.muted').textContent='Square revenue currently mapped to recipes';const bar=rows[1].querySelector('.progress span');if(bar)bar.style.width=Math.min(100,Number(j.mapped_sales_share_pct||0))+'%';}
    if(rows[2]){rows[2].querySelector('strong').textContent=money(j.contribution_30d);}
  }
  const recovery=document.getElementById('recovery-plan');
  if(recovery){
    const pill=recovery.querySelector('.pill');
    if(pill){pill.textContent='AI ready';pill.className='pill green';}
    const plan=recovery.querySelector('.plan');
    if(plan){
      const topMove=(j.supplier_moves||[])[0];
      const topLeak=(j.leaks||[])[0];
      const mapped=Number(j.mapped_sales_share_pct||0);
      const invoiceCount=Number(j.invoice_count_all_time||0);
      const revenue=Number(j.revenue_30d||0);
      const unmapped=Number(j.unmapped_sales_30d||0);

      const day1=invoiceCount
        ? 'Review '+invoiceCount+' captured invoices, verify high-value ingredient units, and check '+((j.supplier_moves||[]).length)+' supplier price movements.'
        : 'Load supplier invoices so Price 2 Plate can establish a purchasing baseline.';

      const day15=topMove
        ? 'Investigate '+topMove.name+' from '+(topMove.supplier||'the supplier')+', now '+money(topMove.to)+' versus '+money(topMove.from)+' ('+(topMove.change_pct>0?'+':'')+Number(topMove.change_pct).toFixed(1)+'%).'
        : 'Build repeat invoice history so supplier price movement can be measured.';

      const day31=topLeak
        ? 'Act on '+topLeak.name+', currently '+pct(topLeak.food_cost_pct)+' food cost with '+money(topLeak.recoverable_to_30pct)+' recoverable to the 30% target.'
        : mapped<100
          ? 'Map the remaining '+money(unmapped)+' of Square sales to costed recipes so dish-level profitability becomes measurable.'
          : 'Review contribution by dish and protect the strongest-margin, highest-volume items.';

      const day61=revenue
        ? 'Track the same KPIs weekly against the current '+money(revenue)+' 30-day revenue baseline, '+pct(j.estimated_food_cost_pct)+' mapped food cost and '+money(j.contribution_30d)+' mapped contribution.'
        : 'Establish a 30-day Square sales baseline, then compare food cost, contribution and supplier movement weekly.';

      const phases=[
        {key:'days-1-14',title:'DAYS 1–14 · CLEAN BASELINE',summary:day1,question:'Deep-dive the DAYS 1–14 phase of my 90-day restaurant recovery plan. Use my actual invoices, suppliers, ingredient costs and Square baseline. Give me the exact checks to perform, records to verify, anomalies to investigate, metrics to capture, and a practical checklist in priority order. Use workspace evidence and do not invent missing figures.'},
        {key:'days-15-30',title:'DAYS 15–30 · PURCHASING',summary:day15,question:'Deep-dive the DAYS 15–30 purchasing phase of my 90-day restaurant recovery plan. Use actual supplier names, invoice line prices, repeated price movements, pack sizes and ingredient costs from my workspace. Identify the highest-value purchasing issues, what to verify with suppliers, what to measure, and a concrete action checklist. Do not invent missing figures.'},
        {key:'days-31-60',title:'DAYS 31–60 · MENU MARGIN',summary:day31,question:'Deep-dive the DAYS 31–60 menu margin phase of my 90-day restaurant recovery plan. Use actual Square sales, mapped recipes, portion costs, food-cost percentages, contribution and invoice-derived ingredient costs. Identify the dishes or mappings that need attention, the commercial reason, the metric to watch, and a concrete checklist. Do not invent missing figures.'},
        {key:'days-61-90',title:'DAYS 61–90 · PROVE RECOVERY',summary:day61,question:'Deep-dive the DAYS 61–90 prove-recovery phase of my 90-day restaurant recovery plan. Use my actual 30-day revenue baseline, invoice history, supplier movements, mapped recipe costs, contribution and recoverable margin. Give me the weekly scorecard, comparison method, thresholds to watch, and a concrete checklist to prove whether recovery actions worked. Do not invent missing figures.'}
      ];
      plan.innerHTML=phases.map(x=>
        '<button type="button" class="plan-step recovery-phase" data-phase="'+x.key+'" style="text-align:left;width:100%;cursor:pointer;color:inherit;font:inherit">'+
        '<strong>'+esc(x.title)+'</strong><p>'+esc(x.summary)+'</p><div class="evidence" style="margin-top:10px">Click to open detailed view</div></button>'
      ).join('');

      let detail=recovery.querySelector('#recoveryPhaseDetail');
      if(!detail){
        detail=document.createElement('div');
        detail.id='recoveryPhaseDetail';
        detail.hidden=true;
        detail.style.cssText='margin-top:14px;padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)';
        plan.after(detail);
      }

      plan.querySelectorAll('.recovery-phase').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const phase=phases.find(x=>x.key===btn.dataset.phase);if(!phase)return;
          detail.hidden=false;
          detail.innerHTML=
            '<div class="card-head"><div><div class="kicker">Recovery phase</div><h3>'+esc(phase.title)+'</h3></div><span class="pill green">Live evidence</span></div>'+
            '<p style="margin-top:0">'+esc(phase.summary)+'</p>'+
            '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0">'+
              '<div class="plan-step"><strong>30-DAY REVENUE</strong><p>'+money(j.revenue_30d)+'</p></div>'+
              '<div class="plan-step"><strong>INVOICES</strong><p>'+Number(j.invoice_count_all_time||0)+'</p></div>'+
              '<div class="plan-step"><strong>MAPPED SALES</strong><p>'+pct(j.mapped_sales_share_pct)+'</p></div>'+
              '<div class="plan-step"><strong>RECOVERABLE</strong><p>'+money(j.recoverable_to_30pct_30d)+'</p></div>'+
            '</div>'+
            '<button type="button" class="btn primary" id="recoveryPhaseAiBtn">AI deep-dive this phase</button>'+
            '<div id="recoveryPhaseAiOutput" class="p2p-ai-result" hidden style="margin-top:14px;white-space:pre-wrap"></div>';
          const aiBtn=detail.querySelector('#recoveryPhaseAiBtn');
          const aiOut=detail.querySelector('#recoveryPhaseAiOutput');
          aiBtn.addEventListener('click',async()=>{
            aiBtn.disabled=true;aiBtn.textContent='Analysing this phase…';aiOut.hidden=false;
            aiOut.textContent='Reading your Square, invoice, supplier, ingredient and menu evidence for '+phase.title+'…';
            try{
              const r=await fetch('/api/ai/advice',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({area:'recovery-plan-phase',question:phase.question})});
              const x=await r.json();if(!r.ok)throw new Error(x.error||'The AI deep-dive could not be generated.');
              aiOut.textContent=x.advice?.summary||'No detailed phase analysis was returned.';
              aiBtn.textContent='Regenerate AI deep-dive';
            }catch(e){aiOut.textContent=e.message;aiBtn.textContent='AI deep-dive this phase';}
            finally{aiBtn.disabled=false;}
          });
          detail.scrollIntoView({behavior:'smooth',block:'nearest'});
        });
      });
    }
    const sub=recovery.querySelector('.card-head .muted');
    if(sub)sub.textContent='Baseline built from '+(j.invoice_count_all_time||0)+' invoices, '+money(j.revenue_30d)+' Square revenue and '+pct(j.mapped_sales_share_pct)+' mapped sales. Use AI to turn this into a venue-specific recovery plan.';

    let controls=recovery.querySelector('#recoveryAiControls');
    if(!controls){
      controls=document.createElement('div');
      controls.id='recoveryAiControls';
      controls.style.cssText='margin-top:16px;padding-top:16px;border-top:1px solid var(--line)';
      controls.innerHTML='<button type="button" class="btn primary" id="generateRecoveryPlanBtn">Generate AI 90-day plan</button><div id="recoveryAiOutput" class="p2p-ai-result" hidden style="margin-top:14px;white-space:pre-wrap"></div>';
      recovery.appendChild(controls);
      const btn=controls.querySelector('#generateRecoveryPlanBtn');
      const out=controls.querySelector('#recoveryAiOutput');
      btn.addEventListener('click',async()=>{
        btn.disabled=true;
        btn.textContent='Building AI recovery plan…';
        out.hidden=false;
        out.textContent='Analysing Square sales, invoices, supplier movements, ingredient costs and menu performance…';
        try{
          const r=await fetch('/api/ai/advice',{
            method:'POST',
            credentials:'same-origin',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              area:'recovery-plan',
              question:'Build a specific 90-day restaurant profit recovery plan using all evidence in this workspace. Structure it as DAYS 1–14, DAYS 15–30, DAYS 31–60 and DAYS 61–90. Use actual invoice suppliers and product prices, Square sales, mapped recipe costs, dish margins and contribution where available. Prioritise the highest-value opportunities first. For every phase give concrete actions, the metric to watch, and what success looks like. Do not give generic advice when workspace evidence exists. Do not invent missing figures.'
            })
          });
          const x=await r.json();
          if(!r.ok)throw new Error(x.error||'The AI recovery plan could not be generated.');
          out.textContent=x.advice?.summary||'No AI recovery plan was returned.';
          btn.textContent='Regenerate AI 90-day plan';
        }catch(e){
          out.textContent=e.message;
          btn.textContent='Generate AI 90-day plan';
        }finally{
          btn.disabled=false;
        }
      });
    }
  }
}
window.addEventListener('p2p-data-changed',load);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,500));else setTimeout(load,500);
setInterval(load,60000);
})();