(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>c==null?'Not configured':new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(c/100);
const decimal=c=>(c/100).toFixed(2);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Brisbane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let book=null,revision=0,busy=false,root,currentReport=null;
// Do not retain a previous account's book after an account switch or sign-out.
const previousFetch=window.fetch.bind(window);
window.fetch=async(input,options)=>{
 const response=await previousFetch(input,options);
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(response.ok&&url.origin===location.origin&&url.pathname.startsWith('/api/auth/')&&root){
  book=null;currentReport=null;revision=0;
  ['acc-report','acc-transactions-list','acc-payroll-list','acc-invoice-list','acc-pay-result'].forEach(id=>$(id).textContent='');
  root.querySelectorAll('form').forEach(f=>{if(f.id!=='acc-report-form')f.reset();});
  if(url.pathname.endsWith('/signout'))message('Sign in to open your accounting book.');else setTimeout(load,0);
 }
 return response;
};
const $=id=>root.querySelector('#'+id);
async function api(path,body){
 const response=await fetch('/api/accounting/'+path,{credentials:'same-origin',...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Accounting could not complete this request.');return data;
}
function message(text,error=false){$('acc-status').textContent=text;$('acc-status').classList.toggle('acc-error',error);}
function fields(form){return Object.fromEntries(new FormData(form));}
function setBusy(value){busy=value;root.querySelectorAll('button[type="submit"],button[data-mutate]').forEach(b=>b.disabled=value);}
async function save(action,input){
 if(busy)return;setBusy(true);message('Saving…');
 try{await api('state',{action,input,revision,request_id:crypto.randomUUID()});await load();message('Saved in your Garnish account.');return true;}
 catch(error){message(error.message,true);return false;}finally{setBusy(false);}
}
const field=(label,name,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
const amount=(label,name,extra='')=>field(label,name,'number',`min="0" step="0.01" required ${extra}`);
function transactionLine(){return `<div class="acc-line">${field('Description','description','text','required maxlength="160"')}${amount('Total including GST ($)','gross')}${amount('Actual GST ($)','gst','value="0"')}<label>Tax code<select name="tax_code"><option value="gst_free">GST-free</option><option value="taxable">Taxable</option><option value="input_taxed">Input-taxed</option><option value="out_of_scope">Out of scope</option><option value="unregistered">Not GST registered</option></select></label><button type="button" data-remove>Remove line</button></div>`;}
function earningsLine(){return `<div class="acc-line">${field('Earnings description','description','text','required placeholder="Ordinary hours / overtime / penalty hours"')}${amount('Hours','hours')}${amount('Actual hourly rate ($)','rate')}<button type="button" data-remove>Remove line</button></div>`;}
function build(){
 if(document.getElementById('accounting-panel'))return;
 root=document.createElement('section');root.id='accounting-panel';root.className='card';
 const style=document.createElement('style');style.textContent=`
 #accounting-panel{font-size:16px;line-height:1.5}#accounting-panel *{box-sizing:border-box}
 #accounting-panel [hidden]{display:none!important}.acc-tabs,.acc-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
 #accounting-panel button{font:inherit;cursor:pointer;padding:10px 15px;border-radius:8px;border:1px solid var(--line,#b5cbbd);background:var(--card,#fff);color:inherit}
 #accounting-panel button[aria-selected=true],#accounting-panel button[type=submit]{background:#0b4b3a;color:#fff;border-color:#0b4b3a}
 #accounting-panel button:disabled{opacity:.55;cursor:wait}#accounting-panel label{display:grid;gap:5px;font-size:14px}
 #accounting-panel input,#accounting-panel select{width:100%;min-width:0;font:inherit;font-size:16px;padding:10px;border:1px solid #91ad9d;border-radius:7px;background:#fff;color:#163e30}
 .acc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:15px 0}
 .acc-line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;align-items:end;margin:12px 0;padding:12px;border:1px solid var(--line,#b5cbbd);border-radius:8px}
 .acc-check{display:flex!important;align-items:flex-start;gap:10px!important;margin:16px 0}#accounting-panel input[type=checkbox]{width:auto;margin-top:4px}
 .acc-note{padding:12px 16px;border-left:3px solid #bd952e;background:rgba(189,149,46,.09);font-size:14px;margin:14px 0}
 .acc-error{color:#a82929!important}.acc-table{overflow:auto;max-height:480px}#accounting-panel table{width:100%;border-collapse:collapse;font-size:14px}
 #accounting-panel th,#accounting-panel td{text-align:left;padding:10px;border-bottom:1px solid var(--line,#b5cbbd);white-space:nowrap}
 .acc-metric{border:1px solid var(--line,#b5cbbd);border-radius:10px;padding:16px}.acc-metric strong{display:block;font-size:25px;margin-top:6px}
 #acc-status{min-height:24px;font-size:14px}#accounting-panel details{margin:16px 0}#accounting-panel summary{cursor:pointer}
 #accounting-panel h3{margin-top:20px}#accounting-panel :focus-visible{outline:3px solid #bd952e;outline-offset:3px}
 @media(max-width:900px){.acc-line{grid-template-columns:1fr 1fr}.acc-line>label:first-child{grid-column:1/-1}}@media(max-width:480px){.acc-line,.acc-grid{grid-template-columns:1fr}.acc-tabs button{flex:1 1 40%}}
 `;document.head.appendChild(style);
 root.innerHTML=`<div class="kicker">Built into Garnish · AUD</div><h2>Your accounting book</h2>
 <p>Record sales, purchases and wage payments. Review your figures before reporting.</p>
 <div class="acc-actions"><button type="button" id="acc-reload">Refresh account</button><button type="button" id="acc-export">Export complete book</button></div>
 <p id="acc-status" role="status" aria-live="polite"></p>
 <div class="acc-note">First release: cash-basis GST working papers and recorded wage payments. Automatic PAYG, award interpretation, leave accrual, tax returns, BAS/STP submission and payments are not enabled.</div>
 <div id="acc-getting-started" class="acc-note" hidden><strong>Start here</strong><ol><li>Save your business details below.</li><li>Add a sale or purchase, or review an invoice already in Garnish.</li><li>Open Reports & BAS to see the totals.</li></ol></div>
 <div class="acc-tabs" role="tablist" aria-label="Accounting views">${[['summary','Reports & BAS'],['transactions','Sales & purchases'],['payroll','Wages'],['settings','Business settings']].map(([id,label])=>`<button type="button" role="tab" id="acc-tab-${id}" aria-controls="acc-${id}" aria-selected="${id==='summary'}" data-tab="${id}">${label}</button>`).join('')}</div>
 <div id="acc-summary" role="tabpanel" aria-labelledby="acc-tab-summary">
 <form id="acc-report-form"><div class="acc-grid">${field('From','start','date','required')}${field('To','end','date','required')}</div><button type="submit">Update reports</button></form><div id="acc-report"></div></div>
 <div id="acc-transactions" role="tabpanel" aria-labelledby="acc-tab-transactions" hidden>
 <details><summary>Review an existing Garnish supplier invoice</summary><p>Choose an invoice to prefill the form. Check its tax treatment and payment date before posting.</p><button type="button" id="acc-invoices">Load invoice list</button><div id="acc-invoice-list"></div></details>
 <form id="acc-transaction-form"><div class="acc-grid">
 <label>Type<select name="kind"><option value="purchase">Supplier purchase</option><option value="sale">Customer sale</option><option value="purchase_refund">Supplier refund</option><option value="sale_refund">Customer refund</option></select></label>
 ${field('Supplier / customer','contact','text','required maxlength="160"')}${field('Unique document reference','reference','text','required maxlength="160"')}${field('Document date','date','date','required')}${field('Paid in full on (leave blank if unpaid)','paid_date','date')}
 <label>Purchase category<select name="category"><option value="food">Food & beverage purchases</option><option value="rent">Rent</option><option value="utilities">Utilities</option><option value="fees">Fees</option><option value="other">Other expenses</option><option value="equipment">Equipment asset</option></select></label></div>
 <p>Amounts are for the business portion only. Split mixed GST treatments into separate lines. Partial payments and deposits are not supported yet.</p>
 <div id="acc-transaction-lines">${transactionLine()}</div><button type="button" id="acc-add-transaction-line">Add line</button>
 <label class="acc-check"><input type="checkbox" name="credit_confirmed">For any GST credit entered, I have checked business use, eligibility and the supporting tax invoice.</label>
 <button type="submit">Post transaction</button></form><h3>Transaction history</h3><div id="acc-transactions-list"></div></div>
 <div id="acc-payroll" role="tabpanel" aria-labelledby="acc-tab-payroll" hidden>
 <p>Calculate earnings and record an ordinary wage payment you have already made. Enter verified PAYG withholding and the applicable super earnings base/rate. This does not run or lodge payroll.</p>
 <form id="acc-payroll-form"><div class="acc-grid">${field('Employee name / reference','employee','text','required maxlength="160"')}${field('Unique pay reference','reference','text','required maxlength="160"')}${field('Period starts','period_start','date','required')}${field('Period ends','period_end','date','required')}${field('Payment date','paid_date','date','required')}</div>
 <div id="acc-payroll-lines">${earningsLine()}</div><button type="button" id="acc-add-pay-line">Add earnings line</button>
 <div class="acc-grid">${amount('Verified PAYG withholding ($)','payg')}${amount('After-tax deductions ($)','deductions','value="0"')}${amount('Eligible super earnings base ($)','super_base')}${amount('Verified super rate (%)','super_rate','max="100"')}</div>
 <button type="button" id="acc-pay-preview">Calculate payment</button><div id="acc-pay-result" aria-live="polite"></div>
 <label class="acc-check"><input type="checkbox" name="verified" required>I checked the employee’s applicable rates, PAYG and super treatment, and this payment has been made. This is an ordinary wage payment, with no salary sacrifice, termination payment or special withholding treatment.</label>
 <button type="submit">Record wage payment</button></form><h3>Recorded payments</h3><div id="acc-payroll-list"></div></div>
 <div id="acc-settings" role="tabpanel" aria-labelledby="acc-tab-settings" hidden>
 <form id="acc-settings-form"><div class="acc-grid">${field('Business name','business_name','text','required maxlength="160"')}
 <label>Business structure<select name="entity"><option value="sole_trader">Sole trader</option><option value="company">Company</option><option value="partnership">Partnership</option><option value="trust">Trust</option></select></label>
 <label>GST registration<select name="gst_registered"><option value="">Choose…</option><option value="true">Registered for GST</option><option value="false">Not registered for GST</option></select></label>
 <label>GST reporting basis<select name="gst_basis"><option value="cash">Cash (payments received / made)</option></select></label>
 ${field('Optional profit reserve (%)','reserve_percent','number','min="0" max="100" step="0.01"')}</div>
 <p>The reserve is a budgeting percentage you choose. It is not an income tax assessment. If your business uses non-cash GST accounting, this release’s BAS working papers are not suitable.</p>
 <button type="submit">Save business settings</button></form></div>`;
 const host=document.querySelector('[data-page="accounting"]')||document.querySelector('main');if(!host)return;host.appendChild(root);
 const d=today();const reportForm=$('acc-report-form');reportForm.elements.end.value=d;reportForm.elements.start.value=d.slice(0,8)+'01';
 $('acc-transaction-form').elements.date.value=d;
 root.addEventListener('click',async e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.tab){root.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));['summary','transactions','payroll','settings'].forEach(id=>$('acc-'+id).hidden=id!==b.dataset.tab);}
   if(b.hasAttribute('data-remove')){const parent=b.parentElement;if(parent.parentElement.children.length>1)parent.remove();else message('Keep at least one line.',true);}
   if(b.dataset.settle){const paid=prompt('Date paid in full (YYYY-MM-DD)',today());if(paid)await save('settle',{id:b.dataset.settle,paid_date:paid});}
   if(b.dataset.reverse){const reason=prompt('Reason for reversal (the original stays in your history)');if(!reason)return;const when=prompt('Reversal date (YYYY-MM-DD)',today());if(when)await save('reverse',{collection:b.dataset.collection,id:b.dataset.reverse,date:when,reason});}
 });
 root.querySelector('.acc-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...root.querySelectorAll('[data-tab]')];const index=tabs.indexOf(document.activeElement);if(index<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();tabs[next].click();});
 $('acc-reload').onclick=load;$('acc-add-transaction-line').onclick=()=>$('acc-transaction-lines').insertAdjacentHTML('beforeend',transactionLine());
 $('acc-add-pay-line').onclick=()=>$('acc-payroll-lines').insertAdjacentHTML('beforeend',earningsLine());
 $('acc-settings-form').onsubmit=async e=>{e.preventDefault();const firstSetup=!book?.settings;const input=fields(e.target);if(!['true','false'].includes(input.gst_registered))return message('Choose GST registration status.',true);input.gst_registered=input.gst_registered==='true';if(await save('settings',input)){if(firstSetup){root.querySelector('[data-tab="transactions"]').click();message('Business details saved. Add your first sale or purchase below, or choose an existing invoice.');}}};
 const lines=id=>[...$(id).children].map(row=>Object.fromEntries([...row.querySelectorAll('input,select')].map(x=>[x.name,x.value])));
 $('acc-transaction-form').onsubmit=async e=>{e.preventDefault();const input={...fields(e.target),lines:lines('acc-transaction-lines'),credit_confirmed:e.target.elements.credit_confirmed.checked};if(await save('transaction',input)){e.target.reset();$('acc-transaction-lines').innerHTML=transactionLine();e.target.elements.date.value=today();}};
 const payInput=()=>({...fields($('acc-payroll-form')),lines:lines('acc-payroll-lines'),verified:$('acc-payroll-form').elements.verified.checked});
 $('acc-payroll-form').onsubmit=async e=>{e.preventDefault();if(await save('payroll',payInput())){e.target.reset();$('acc-pay-result').textContent='';}};
 $('acc-pay-preview').onclick=async()=>{try{const {preview:p}=await api('payroll-preview',payInput());$('acc-pay-result').innerHTML=`<div class="acc-grid">${metric('Gross',p.gross)}${metric('Net payment',p.net)}${metric('Employer super',p.super)}${metric('Employer cost',p.gross+p.super)}</div>`;}catch(e){message(e.message,true);}};
 $('acc-report-form').onsubmit=async e=>{e.preventDefault();await refreshReport();};
 $('acc-export').onclick=()=>{if(!book)return message('Sign in and refresh your accounting book first.',true);download('Garnish-accounting-'+today()+'.json',JSON.stringify({schema_version:1,exported_at:new Date().toISOString(),revision,book},null,2),'application/json');};
 $('acc-invoices').onclick=async()=>{try{const {invoices}=await api('invoices');$('acc-invoice-list').innerHTML='';if(!invoices.length)$('acc-invoice-list').textContent='No supplier invoices in this account workspace.';for(const invoice of invoices){const button=document.createElement('button');button.type='button';button.textContent=[invoice.contact,invoice.reference,invoice.total==null?'No total':money(Math.round(invoice.total*100))].filter(Boolean).join(' · ');button.onclick=()=>{const f=$('acc-transaction-form');f.elements.kind.value='purchase';f.elements.contact.value=invoice.contact||'';f.elements.reference.value=invoice.reference||'';f.elements.date.value=invoice.date||'';f.elements.paid_date.value='';f.elements.credit_confirmed.checked=false;$('acc-transaction-lines').innerHTML=transactionLine();const row=$('acc-transaction-lines');row.querySelector('[name=description]').value='Invoice total — review GST split';row.querySelector('[name=gross]').value=invoice.total??'';row.querySelector('[name=gst]').value=invoice.tax??'';row.querySelector('[name=tax_code]').value=Number(invoice.tax)>0?'taxable':'gst_free';message('Invoice copied for review. Check tax treatment and payment date before posting.');};$('acc-invoice-list').appendChild(button);}}catch(e){message(e.message,true);}};
 load();
}
function metric(label,value){return `<div class="acc-metric">${label}<strong>${money(value)}</strong></div>`;}
function table(headers,rows){return `<div class="acc-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">No records yet.</td></tr>`}</tbody></table></div>`;}
async function load(){
 try{const data=await api('state');book=data.book;revision=data.revision;const f=$('acc-settings-form');if(book.settings){for(const [key,value] of Object.entries(book.settings))if(f.elements[key])f.elements[key].value=String(value);f.elements.reserve_percent.value=book.settings.reserve_bps==null?'':decimal(book.settings.reserve_bps);}
 $('acc-transactions-list').innerHTML=table(['Date','Reference','Contact','Type','Total','GST','Payment','Correction'],book.transactions.map(t=>[esc(t.date),esc(t.reference),esc(t.contact),esc(t.kind.replaceAll('_',' ')),money(t.gross),money(t.gst),t.paid_date?esc(t.paid_date):t.reversed_by||t.reversal_of?'Reversed':`<button type="button" data-mutate data-settle="${esc(t.id)}">Mark paid</button>`,t.reversed_by?'Reversed':t.reversal_of?'Reversal':`<button type="button" data-mutate data-collection="transactions" data-reverse="${esc(t.id)}">Reverse</button>`]));
 $('acc-payroll-list').innerHTML=table(['Paid','Employee','Reference','Gross','PAYG','Net','Super','Correction'],book.payroll.map(p=>[esc(p.paid_date),esc(p.employee),esc(p.reference),money(p.gross),money(p.payg),money(p.net),money(p.super),p.reversed_by?'Reversed':p.reversal_of?'Reversal':`<button type="button" data-mutate data-collection="payroll" data-reverse="${esc(p.id)}">Reverse</button>`]));
 $('acc-getting-started').hidden=Boolean(book.settings);
 if(!book.settings)root.querySelector('[data-tab="settings"]').click();
 await refreshReport();message(book.settings?'Accounting book loaded.':'Step 1: save your business details below.');
 }catch(e){book=null;currentReport=null;$('acc-report').textContent='';$('acc-transactions-list').textContent='';$('acc-payroll-list').textContent='';message(e.message,true);}
}
async function refreshReport(){
 if(!book)return;try{const {start,end}=fields($('acc-report-form'));const r=await api('report?'+new URLSearchParams({start,end}));currentReport=r;
 $('acc-report').innerHTML=`<h3>Recorded activity</h3><div class="acc-grid">${metric('Sales excluding GST',r.revenue)}${metric('Recorded expenses',r.expenses)}${metric('Book profit before adjustments',r.profit)}${metric('Chosen profit reserve',r.tax_reserve)}${metric('Customers owe',r.receivables)}${metric('Unpaid purchases',r.payables)}</div>
 <h3>Cash-basis BAS working figures</h3><p>${book.settings?.gst_registered?'GST figures include recorded business transactions paid in this period.':'GST registration is not enabled. These figures are not a BAS.'} Wage figures include recorded payments only.</p>
 ${table(['Label','Description','Amount'],[['G1','Sales including GST',money(r.bas.G1)],['1A','GST collected',money(r.bas['1A'])],['1B','Eligible GST credits recorded',money(r.bas['1B'])],['','GST collected less credits',money(r.bas.gst_net)],['W1','Ordinary wage payments recorded',money(r.bas.W1)],['W2','PAYG withholding recorded',money(r.bas.W2)]])}
 <div class="acc-note">These are working figures, not a completed or lodged BAS. Review adjustments and other applicable BAS labels before reporting.</div>
 <details><summary>Report coverage</summary><ul>${r.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
 <details><summary>Detailed accounts and trial balance</summary><h3>Trial balance at ${esc(end)}</h3><p>${r.trial_balance_difference===0?'Debits and credits balance. This checks arithmetic, not completeness.':'Ledger difference: '+money(r.trial_balance_difference)}</p>
 ${table(['Account','Debit','Credit'],r.accounts.filter(a=>a.balance).map(a=>[esc(a.name),money(Math.max(0,a.balance)),money(Math.max(0,-a.balance))]))}
 <div class="acc-actions"><button type="button" id="acc-ledger-export">Export period journal CSV</button></div></details>`;
 $('acc-ledger-export').onclick=()=>{const rows=[['Date','Reference','Account','Debit AUD','Credit AUD'],...r.journal.map(x=>[x.date,x.description,x.account,decimal(x.debit),decimal(x.credit)])];download('Garnish-journal-'+start+'-'+end+'.csv',rows.map(row=>row.map(csv).join(',')).join('\r\n'),'text/csv');};
 }catch(e){currentReport=null;$('acc-report').textContent='';message(e.message,true);}
}
function csv(v){let s=String(v);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
