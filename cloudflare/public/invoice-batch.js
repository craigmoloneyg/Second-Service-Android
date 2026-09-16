(()=>{
'use strict';
const MAX_FILES=75,CONCURRENCY=5;
const types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
const state=window.invoiceBatchState||{running:false,stop:false};
window.invoiceBatchState=state;
const $=id=>document.getElementById(id);
const files=()=>Array.from($('invoiceFile')?.files||[]);
const text=(tag,value,parent)=>{const n=document.createElement(tag);n.textContent=String(value??'—');parent.append(n);return n;};
const money=v=>v==null||v===''?'—':Number.isFinite(Number(v))?new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(Number(v)):String(v);

function setup(){
  const input=$('invoiceFile'),button=$('analyseInvoiceBtn'),status=$('aiStatus');
  if(!input||!button||!status)return;
  input.multiple=true;
  input.setAttribute('aria-label','Select up to 75 supplier invoices');
  button.dataset.batchReady='true';
  let hint=$('invoiceBatchHint');
  if(!hint){
    hint=document.createElement('p');hint.id='invoiceBatchHint';hint.className='muted';
    hint.textContent='Select up to 75 PDF or image invoices. Price 2 Plate processes 5 at once and you can move around the app while they run.';
    input.parentElement?.before(hint);
  }
  update();
}
function update(){
  const button=$('analyseInvoiceBtn'),status=$('aiStatus');if(!button||!status)return;
  const f=files();
  button.disabled=state.running||f.length>MAX_FILES;
  button.textContent=state.running?'Processing invoices…':f.length?('Analyse '+f.length+' invoice'+(f.length===1?'':'s')):'Analyse invoices';
  if(!state.running)status.textContent=f.length>MAX_FILES?'Choose 75 files or fewer':f.length?(f.length+' selected'):'Ready';
}
document.addEventListener('change',e=>{if(e.target?.id==='invoiceFile')update();},true);

function renderResult(parent,data){
  const details=document.createElement('details');parent.append(details);
  text('summary',(data.supplier_or_source||'Unknown supplier')+' · '+money(data.total),details);
  text('p','Invoice: '+(data.document_number||'—')+' · Date: '+(data.document_date||'—'),details);
  const scroll=document.createElement('div');scroll.style.overflowX='auto';details.append(scroll);
  const table=document.createElement('table');table.className='table';scroll.append(table);
  const head=document.createElement('tr');table.append(head);
  ['Item','Qty','Unit','Unit price','Line total'].forEach(x=>text('th',x,head));
  for(const item of Array.isArray(data.line_items)?data.line_items:[]){
    const row=document.createElement('tr');table.append(row);
    [item.description,item.quantity,item.unit,money(item.unit_price),money(item.line_total)].forEach(x=>text('td',x,row));
  }
}
async function runBatch(){
  if(state.running)return;
  const input=$('invoiceFile'),button=$('analyseInvoiceBtn'),status=$('aiStatus'),output=$('invoiceResult');
  const selected=files();
  if(!selected.length){status.textContent='Choose an invoice first';return;}
  if(selected.length>MAX_FILES){status.textContent='Choose 75 files or fewer';return;}
  state.running=true;state.stop=false;input.disabled=true;button.disabled=true;
  output.style.display='block';output.replaceChildren();
  const meter=document.createElement('progress');meter.max=selected.length;meter.value=0;meter.style.width='100%';output.append(meter);
  const summary=text('p','0 of '+selected.length+' processed',output);
  const rows=selected.map(file=>{const row=document.createElement('div');row.style.cssText='padding:12px 0;border-top:1px solid var(--line);overflow-wrap:anywhere';output.append(row);text('strong',file.name,row);const label=text('p','Queued',row);return{row,label};});
  let next=0,completed=0,succeeded=0,failed=0,saved=0;
  const refresh=()=>{meter.value=completed;status.textContent=completed+' of '+selected.length+' complete';button.textContent='Processing '+completed+' of '+selected.length+'…';summary.textContent=completed+' of '+selected.length+' processed · '+succeeded+' extracted · '+saved+' saved · '+failed+' need attention';try{sessionStorage.setItem('p2pInvoiceBatch',JSON.stringify({running:true,total:selected.length,completed,succeeded,failed,saved,updated_at:new Date().toISOString()}));}catch{}};
  async function worker(){
    while(!state.stop){
      const i=next++;if(i>=selected.length)return;
      const file=selected[i],r=rows[i];r.label.textContent='Uploading and analysing…';
      try{
        const ext=file.name.split('.').pop().toLowerCase(),mime=types[ext]||file.type;
        if(!types[ext]||!file.size)throw new Error('File must be a non-empty PDF, PNG, JPEG or WebP.');
        const res=await fetch('/api/invoice/extract',{method:'POST',headers:{'Content-Type':mime,'X-Filename':encodeURIComponent(file.name)},body:file});
        let data={};try{data=await res.json()}catch{}
        if(!res.ok)throw new Error(data.error||('Invoice analysis failed ('+res.status+').'));
        renderResult(r.row,data);succeeded++;if(data.saved)saved++;r.label.textContent=data.saved?'Saved & costed':'Extracted';
      }catch(err){failed++;r.label.textContent='Needs attention: '+err.message;}
      completed++;refresh();
    }
  }
  try{
    refresh();
    await Promise.all(Array.from({length:Math.min(CONCURRENCY,selected.length)},worker));
    status.textContent=failed?'Complete · '+failed+' need attention':succeeded+' invoices complete';
    window.dispatchEvent(new Event('p2p-data-changed'));
  }finally{
    state.running=false;input.disabled=false;button.disabled=false;input.value='';
    button.textContent='Analyse invoices';
    try{sessionStorage.setItem('p2pInvoiceBatch',JSON.stringify({running:false,total:selected.length,completed,succeeded,failed,saved,updated_at:new Date().toISOString()}));}catch{}
  }
}
// Capture-phase delegation makes this survive any later DOM/button replacement.
document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('#analyseInvoiceBtn');
  if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  runBatch();
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
new MutationObserver(()=>{const b=$('analyseInvoiceBtn');if(b&&!b.dataset.batchReady)setup();}).observe(document.documentElement,{childList:true,subtree:true});
})();