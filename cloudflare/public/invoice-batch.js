(() => {
  'use strict';
  if (location.origin !== 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev') return;
  document.title = document.title.replace(/Second Service/gi, 'Price 2 Plate').replace(/Venue Margin/gi, 'Price 2 Plate');
  document.querySelectorAll('.logo').forEach(logo => {
    for (const node of logo.childNodes) {
      if (node.nodeType === 3) node.textContent = node.textContent.replace(/SECOND SERVICE/gi, 'PRICE 2 PLATE').replace(/VENUE MARGIN/gi, 'PRICE 2 PLATE');
    }
  });
  const input = document.getElementById('invoiceFile');
  const original = document.getElementById('analyseInvoiceBtn');
  const output = document.getElementById('invoiceResult');
  const status = document.getElementById('aiStatus');
  if (!input || !original || !output || !status || original.dataset.batchReady) return;

  const MAX_FILES = 75;
  const button = original.cloneNode(true);
  button.dataset.batchReady = 'true';
  original.replaceWith(button); // Replace the site's single-file click listener.
  input.multiple = true;
  input.setAttribute('aria-label', 'Select up to 50 supplier invoices');
  input.style.minWidth = '0';
  input.parentElement.style.gridTemplateColumns = 'minmax(0, 1fr)';
  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Select up to 75 PDF or image invoices. Price 2 Plate processes several at once. You can move around the app while the batch runs.';
  input.parentElement.before(hint);
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Stop after current invoice';
  cancel.hidden = true;
  button.after(cancel);
  const state = { running: false, stop: false };
  window.invoiceBatchState = state;
  const types = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  function selection() { return Array.from(input.files || []); }
  function updateSelection() {
    const files = selection();
    button.textContent = files.length ? `Analyse ${files.length} invoice${files.length === 1 ? '' : 's'}` : 'Analyse invoices';
    button.disabled = state.running || files.length > MAX_FILES;
    if (files.length > MAX_FILES) status.textContent = 'Choose 75 files or fewer';
    else status.textContent = files.length ? `${files.length} selected` : 'Ready';
  }
  input.addEventListener('change', updateSelection);
  cancel.addEventListener('click', () => {
    state.stop = true;
    cancel.disabled = true;
    cancel.textContent = 'Stopping after current invoice…';
  });
  const text = (tag, value, parent) => {
    const node = document.createElement(tag);
    node.textContent = String(value ?? '—');
    parent.append(node);
    return node;
  };
  const money = value => value === null || value === undefined || value === '' ? '—'
    : Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-AU', {style: 'currency', currency: 'AUD'}).format(Number(value)) : String(value);
  function renderResult(parent, data) {
    const details = document.createElement('details');
    parent.append(details);
    text('summary', `${data.supplier_or_source || 'Unknown supplier'} · ${money(data.total)}`, details);
    text('p', `Invoice: ${data.document_number || '—'} · Date: ${data.document_date || '—'}`, details);
    const scroll = document.createElement('div');
    scroll.style.overflowX = 'auto';
    details.append(scroll);
    const table = document.createElement('table');
    table.className = 'table';
    scroll.append(table);
    const heading = document.createElement('tr');
    table.append(heading);
    ['Item', 'Qty', 'Unit', 'Unit price', 'Line total'].forEach(label => text('th', label, heading));
    for (const item of Array.isArray(data.line_items) ? data.line_items : []) {
      const row = document.createElement('tr');
      table.append(row);
      [item.description, item.quantity, item.unit, money(item.unit_price), money(item.line_total)].forEach(value => text('td', value, row));
    }
    if (Array.isArray(data.missing_or_ambiguous) && data.missing_or_ambiguous.length) text('p', `Needs review: ${data.missing_or_ambiguous.join(' · ')}`, details);
  }
  button.addEventListener('click', async () => {
    if (state.running) return;
    const files = selection();
    if (!files.length || files.length > MAX_FILES) {
      status.textContent = files.length ? 'Choose 75 files or fewer' : 'Choose an invoice first';
      return;
    }
    state.running = true;
    state.stop = false;
    input.disabled = button.disabled = true;
    cancel.hidden = false;
    cancel.disabled = false;
    cancel.textContent = 'Stop after current invoice';
    output.style.display = 'block';
    output.replaceChildren();
    const meter = document.createElement('progress');
    meter.max = files.length;
    meter.value = 0;
    meter.style.width = '100%';
    meter.setAttribute('aria-label', 'Invoices processed');
    output.append(meter);
    const summary = text('p', `0 of ${files.length} processed`, output);
    summary.setAttribute('role', 'status');
    const rows = files.map(file => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:12px 0;border-top:1px solid var(--line);overflow-wrap:anywhere';
      output.append(row);
      text('strong', file.name, row);
      const label = text('p', 'Queued', row);
      return { row, label };
    });
    let completed = 0, succeeded = 0, failed = 0, saved = 0;
    const concurrency = Math.min(5, files.length);
    let nextIndex = 0;
    const persist = () => { try { sessionStorage.setItem('p2pInvoiceBatch', JSON.stringify({running:state.running,total:files.length,completed,succeeded,failed,saved,updated_at:new Date().toISOString()})); } catch(_){} };
    const refresh = () => { meter.value = completed; button.textContent = `Processing ${completed} of ${files.length}…`; status.textContent = `${completed} of ${files.length} complete`; summary.textContent = `${completed} of ${files.length} processed · ${succeeded} extracted · ${saved} saved · ${failed} need attention`; persist(); };
    async function worker(){
      while(!state.stop){
        const i=nextIndex++; if(i>=files.length)return;
        const file=files[i],{row,label}=rows[i];
        label.textContent='Uploading and analysing…';
        try{
          const mime=types[file.name.split('.').pop().toLowerCase()];
          if(!mime||file.size===0)throw new Error('Choose a non-empty PDF, PNG, JPEG or WebP file.');
          const response=await fetch('/api/invoice/extract',{method:'POST',headers:{'Content-Type':mime,'X-Filename':encodeURIComponent(file.name)},body:file});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||`Invoice analysis failed (${response.status}).`);
          if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The server returned an unexpected result.');
          renderResult(row,data);succeeded++;if(data.saved)saved++;label.textContent=data.saved?'Saved & costed':'Extracted — not confirmed saved';
        }catch(error){failed++;label.textContent=`Needs attention: ${error.message}. Check purchasing history before retrying to avoid duplicates.`;}
        completed++;refresh();
      }
    }
    try {
      persist();
      await Promise.all(Array.from({length:concurrency},()=>worker()));
      for(let i=nextIndex;i<rows.length;i++)rows[i].label.textContent='Not uploaded — batch stopped';
      if (saved) {
        try {
          if (typeof loadIngredients === 'function') await loadIngredients();
          if (typeof loadRecipes === 'function') await loadRecipes();
        } catch (_) { text('p', 'Invoices were saved. Refresh the menu view to see updated costs.', output); }
      }
      status.textContent = completed < files.length ? `Stopped · ${completed} of ${files.length} processed`
        : failed ? `Complete · ${failed} need attention` : `${succeeded} invoices complete`;
    } finally {
      state.running = false;
      try { sessionStorage.setItem('p2pInvoiceBatch', JSON.stringify({running:false,total:files.length,completed,succeeded,failed,saved,updated_at:new Date().toISOString()})); } catch(_){}
      input.disabled = false;
      button.disabled = false;
      input.value = ''; // A second click must not resubmit the completed batch.
      button.textContent = 'Analyse invoices';
      cancel.hidden = true;
    }
  });
  updateSelection();
})();
