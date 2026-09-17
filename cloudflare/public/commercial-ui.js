(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){
  const r=await fetch(path,{credentials:'same-origin',...options});
  let j={};try{j=await r.json();}catch{}
  if(!r.ok)throw new Error(j.error||'Request failed');
  return j;
}
function fieldStyle(){return 'width:100%;background:#071321;border:1px solid var(--line);color:#fff;border-radius:10px;padding:11px';}

let consultantEnabled=false,currentThread=null,pollTimer=null;

function add(){
  if(!$('commercial-settings')){
    const host=document.querySelector('main')||document.body,s=document.createElement('section');
    s.id='commercial-settings';s.className='card';s.dataset.p2pPage='workspace';s.style.marginTop='14px';
    s.innerHTML=`
      <div class="card-head"><div><div class="kicker">Membership & integrations</div><h2>Garnish account</h2><div class="muted">14-day free trial. No card required. Cancel anytime.</div></div><button class="pill blue" id="planBadge" type="button" style="border:0;cursor:pointer">Sign in to start trial</button></div>
      <div id="planBox" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
        <div class="card"><h3>Regular</h3><div style="font-size:28px;font-weight:900;margin:8px 0">A$99<span class="muted" style="font-size:12px"> / month</span></div><div class="muted">Invoice AI, live ingredient and recipe costing, Square, profit dashboard, purchasing alerts and AI Analyst.</div><button class="btn primary" id="regularBtn" style="margin-top:12px">Choose Regular</button></div>
        <div class="card"><h3>Gold</h3><div style="font-size:28px;font-weight:900;margin:8px 0">A$249<span class="muted" style="font-size:12px"> / month</span></div><div class="muted">Everything in Regular plus enhanced AI and live consultant messaging with up to 4 new cases each month.</div><button class="btn primary" id="goldBtn" style="margin-top:12px">Choose Gold</button></div>
      </div>

      <div id="documentIntelligence" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
        <div class="card-head"><div><div class="kicker">Document intelligence</div><h2>Drop in the file. Garnish reads it.</h2><div class="muted">Word, Excel, CSV, PDF, text and exported Google Docs or Sheets. Garnish uses AI to extract the useful business data and keeps the result with your account.</div></div><span class="pill green">AI extraction</span></div>
        <div style="display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:8px">
          <input id="documentImportFile" type="file" multiple accept=".doc,.docx,.xls,.xlsx,.csv,.pdf,.txt,.json,.rtf,.ods,.odt,application/pdf,text/csv,application/json,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="${fieldStyle()}">
          <button class="btn primary" id="documentImportBtn" type="button">Read with Garnish AI</button>
        </div>
        <div class="muted" style="margin-top:8px">Google Docs and Google Sheets work when downloaded from Google as Word, Excel, PDF or CSV.</div>
        <div id="documentImportMsg" class="muted" style="margin-top:10px"></div>
        <div id="documentImportResults" style="margin-top:12px"></div>
      </div>

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
        <div class="card-head"><div><h2>MYOB</h2><div class="muted">Connect live when MYOB approves the app, or import your MYOB accounting exports now so Garnish can use them with Square, invoices and recipes.</div></div><span class="pill blue" id="myobBadge">Checking…</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="myobConnect">Connect MYOB</button><button class="btn" id="myobSync" hidden>Sync P&L</button><button class="btn ghost" id="myobDisconnect" hidden>Disconnect</button></div>
        <div class="muted" id="myobMsg" style="margin-top:10px"></div>

        <div id="myobImportBridge" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
          <div class="kicker">MYOB accounting import</div>
          <h3 style="margin:5px 0 8px">Import all MYOB exports</h3>
          <div class="muted" style="margin-bottom:10px">Load up to 50 MYOB CSV, JSON or text exports at once. Garnish stores them with your account and uses them alongside Square, invoices and recipes.</div>
          <div style="display:grid;grid-template-columns:minmax(150px,.6fr) minmax(220px,1fr) auto;gap:8px">
            <select id="myobImportKind" style="${fieldStyle()}"><option value="profit_and_loss">Profit & Loss</option><option value="purchases">Purchases</option><option value="inventory">Inventory</option><option value="general_ledger">General Ledger</option><option value="other">Other MYOB export</option></select>
            <input id="myobImportFile" type="file" multiple accept=".csv,.json,.txt,text/csv,application/json,text/plain" style="${fieldStyle()}">
            <button class="btn primary" id="myobImportBtn" type="button">Import MYOB data</button>
          </div>
          <div id="myobImportMsg" class="muted" style="margin-top:10px"></div>
          <div id="myobImportList" style="margin-top:10px"></div>
        </div>

        <div id="myobCompanyLogin" hidden style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
          <div class="muted" style="margin-bottom:8px">MYOB company-file login</div>
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px">
            <input id="myobCfUser" autocomplete="username" placeholder="Company-file username" style="${fieldStyle()}">
            <input id="myobCfPass" type="password" autocomplete="current-password" placeholder="Company-file password" style="${fieldStyle()}">
            <button class="btn" id="myobCfSave" type="button">Save & verify</button>
          </div>
        </div>
      </div>
    `;
    host.appendChild(s);
  }

  if(!$('live-consultant')){
    const host=document.querySelector('main')||document.body,s=document.createElement('section');
    s.id='live-consultant';s.className='card';s.dataset.p2pPage='consultant';s.style.marginTop='14px';
    s.innerHTML=`
      <div class="card-head"><div><div class="kicker">Human support</div><h2>Live consultant</h2><div class="muted">A persistent message thread with a real hospitality consultant. This is separate from the AI Analyst.</div></div><span class="pill blue" id="consultantBadge">Checking access…</span></div>
      <div id="consultantLocked" class="muted">Sign in to your Garnish account to open consultant messaging.</div>
      <div id="consultantApp" hidden>
        <div style="display:grid;grid-template-columns:minmax(220px,.35fr) minmax(0,1fr);gap:14px">
          <div>
            <div style="display:grid;gap:8px">
              <input id="consultantSubject" placeholder="New case subject" style="${fieldStyle()}">
              <textarea id="consultantQuestion" placeholder="Describe what you want reviewed…" style="${fieldStyle()};min-height:110px"></textarea>
              <button class="btn primary" id="consultantNewCase" type="button">Start new case</button>
              <div class="muted" id="consultantMsg"></div>
            </div>
            <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px"><div class="kicker">Conversations</div><div id="consultantThreads" style="display:grid;gap:7px;margin-top:8px"></div></div>
          </div>
          <div style="border:1px solid var(--line);border-radius:12px;min-height:420px;display:flex;flex-direction:column;overflow:hidden">
            <div id="consultantThreadHead" style="padding:14px;border-bottom:1px solid var(--line)"><strong>Select a conversation</strong></div>
            <div id="consultantMessages" style="flex:1;padding:14px;overflow:auto;display:grid;gap:10px;align-content:start"><div class="muted">Your message history will appear here.</div></div>
            <div style="padding:12px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr auto;gap:8px">
              <textarea id="consultantReply" placeholder="Message your consultant…" style="${fieldStyle()};min-height:70px" disabled></textarea>
              <button class="btn primary" id="consultantReplyBtn" type="button" disabled>Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    host.appendChild(s);
  }

  bind();
  status();
}

async function loadImports(){
  const box=$('myobImportList');if(!box)return;
  try{
    const x=await api('/api/myob/imports');
    const items=x.imports||[];
    box.innerHTML=items.length?items.map(i=>'<div class="evidence">'+esc(i.kind.replaceAll('_',' '))+' · '+esc(i.filename)+' · '+new Date(i.imported_at).toLocaleString()+'</div>').join(''):'<div class="muted">No MYOB test imports yet.</div>';
  }catch(e){box.innerHTML='<div class="muted">'+esc(e.message)+'</div>';}
}

async function loadThreads(selectId){
  const box=$('consultantThreads');if(!box||!consultantEnabled)return;
  try{
    const x=await api('/api/consultant/questions'),items=x.requests||[];
    box.innerHTML=items.length?items.map(t=>'<button type="button" class="btn consultant-thread" data-id="'+esc(t.id)+'" style="text-align:left"><strong>'+esc(t.subject||'Consultant case')+'</strong><div class="evidence">'+esc(t.status||'open')+' · '+new Date(t.created_at).toLocaleDateString()+'</div></button>').join(''):'<div class="muted">No consultant conversations yet.</div>';
    box.querySelectorAll('.consultant-thread').forEach(b=>b.onclick=()=>openThread(b.dataset.id));
    if(selectId)await openThread(selectId);
    else if(currentThread&&items.some(x=>x.id===currentThread))await openThread(currentThread,false);
  }catch(e){box.innerHTML='<div class="muted">'+esc(e.message)+'</div>';}
}

async function openThread(id,scroll=true){
  if(!id)return;currentThread=id;
  try{
    const x=await api('/api/consultant/messages?request_id='+encodeURIComponent(id));
    $('consultantThreadHead').innerHTML='<strong>'+esc(x.thread.subject||'Consultant case')+'</strong><div class="evidence">'+esc(x.thread.status||'open')+'</div>';
    const msgs=x.messages||[];
    $('consultantMessages').innerHTML=msgs.length?msgs.map(m=>{
      const mine=m.sender==='client';
      return '<div style="max-width:82%;'+(mine?'margin-left:auto;background:#13243a':'margin-right:auto;background:#0a1726')+';border:1px solid var(--line);border-radius:12px;padding:10px 12px"><div class="kicker">'+(mine?'YOU':'CONSULTANT')+'</div><div style="white-space:pre-wrap;margin-top:4px">'+esc(m.body)+'</div><div class="evidence">'+new Date(m.created_at).toLocaleString()+'</div></div>';
    }).join(''):'<div class="muted">No messages yet.</div>';
    $('consultantReply').disabled=false;$('consultantReplyBtn').disabled=false;
    if(scroll)$('consultantMessages').scrollTop=$('consultantMessages').scrollHeight;
  }catch(e){$('consultantMessages').innerHTML='<div class="muted">'+esc(e.message)+'</div>';}
}

async function status(){
  try{
    const x=await api('/api/billing/status'),e=x.subscription;
    $('planBadge').textContent=e.plan==='gold'?'Gold':e.plan==='regular'?'Regular':e.status==='trial'?'Free trial':e.status;
    $('planBadge').className='pill '+(e.active?'green':'orange');
    consultantEnabled=Boolean(e.features?.consultant);
    $('consultantBadge').textContent=consultantEnabled?(e.status==='trial'?'Trial access':'Gold access'):'Gold feature';
    $('consultantBadge').className='pill '+(consultantEnabled?'green':'orange');
    $('consultantLocked').hidden=consultantEnabled;
    $('consultantApp').hidden=!consultantEnabled;
    if(consultantEnabled)loadThreads();
  }catch(e){
    $('planBadge').textContent='Sign in to start trial';
    consultantEnabled=false;
    $('consultantBadge').textContent='Sign in';
    $('consultantLocked').hidden=false;$('consultantApp').hidden=true;
  }

  try{
    const x=await api('/api/myob/status'),connected=x.connected;
    $('myobBadge').textContent=connected?'Connected':x.configured?'Ready to connect':'Developer approval pending';
    $('myobBadge').className='pill '+(connected?'green':'blue');
    $('myobConnect').hidden=connected;
    $('myobSync').hidden=!connected;
    $('myobDisconnect').hidden=!connected;
    if(connected){
      $('myobMsg').textContent='MYOB connected'+(x.last_sync_at?' · last sync '+new Date(x.last_sync_at).toLocaleString():'');
      $('myobCompanyLogin').hidden=Boolean(x.company_login_saved);
    }else{
      $('myobCompanyLogin').hidden=true;
      $('myobMsg').textContent=x.configured?'Live MYOB connection is ready.':'Use the import bridge below while MYOB developer approval is pending.';
    }
  }catch(e){$('myobMsg').textContent=e.message;}
  loadImports();
}

function bind(){
  if($('documentImportBtn')&&!$('documentImportBtn').dataset.ready){
    $('documentImportBtn').dataset.ready='1';
    $('documentImportBtn').onclick=async()=>{
      const files=[...($('documentImportFile').files||[])],msg=$('documentImportMsg'),out=$('documentImportResults');
      if(!files.length){msg.textContent='Choose one or more files first.';return;}
      if(files.length>20){msg.textContent='Choose up to 20 files at a time.';return;}
      $('documentImportBtn').disabled=true;out.innerHTML='';
      let ok=0,failed=0;
      try{
        for(let i=0;i<files.length;i++){
          const file=files[i];
          msg.textContent='Reading '+(i+1)+' of '+files.length+' · '+file.name+'…';
          try{
            const rr=await fetch('/api/documents/import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type||'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:file});
            const x=await rr.json();if(!rr.ok)throw new Error(x.error||'Document extraction failed.');
            ok++;
            const e=x.extracted||{};
            const facts=(e.key_facts||[]).slice(0,8).map(v=>'<li>'+esc(v)+'</li>').join('');
            const money=(e.financial_data||[]).slice(0,10).map(v=>'<div class="evidence"><strong>'+esc(v.label)+'</strong> · '+esc(v.value)+(v.period?' · '+esc(v.period):'')+'</div>').join('');
            out.innerHTML+='<div class="card" style="margin-top:10px"><div class="kicker">'+esc(e.document_type||'Document')+'</div><h3>'+esc(e.title||x.filename)+'</h3><p class="muted">'+esc(e.summary||'Extracted successfully.')+'</p>'+(facts?'<ul>'+facts+'</ul>':'')+money+'</div>';
          }catch(err){
            failed++;out.innerHTML+='<div class="evidence" style="margin-top:8px">'+esc(file.name)+' · '+esc(err.message)+'</div>';
          }
        }
        msg.textContent='Document extraction complete · '+ok+' read'+(failed?' · '+failed+' failed':'')+'.';
        $('documentImportFile').value='';
        window.dispatchEvent(new Event('p2p-data-changed'));
      }finally{$('documentImportBtn').disabled=false;}
    };
  }
if($('planBadge'))$('planBadge').onclick=()=>{if(typeof window.GARNISH_OPEN_ACCOUNT==='function')window.GARNISH_OPEN_ACCOUNT('signin');else{const p=$('account-panel');if(p){p.hidden=false;p.scrollIntoView({behavior:'smooth',block:'start'});}}};
  if($('regularBtn')&&!$('regularBtn').dataset.ready){
    for(const [id,plan] of [['regularBtn','regular'],['goldBtn','gold']]){
      const b=$(id);b.dataset.ready='1';b.onclick=async()=>{try{const x=await api('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})});location.href=x.url}catch(e){alert(e.message)}};
    }
  }

  if($('myobConnect')&&!$('myobConnect').dataset.ready){
    $('myobConnect').dataset.ready='1';
    $('myobConnect').onclick=async()=>{try{const x=await api('/api/myob/connect',{method:'POST'});location.href=x.url}catch(e){$('myobMsg').textContent=e.message}};
    $('myobSync').onclick=async()=>{try{$('myobMsg').textContent='Syncing MYOB…';await api('/api/myob/sync',{method:'POST'});$('myobMsg').textContent='MYOB P&L synced.';status()}catch(e){$('myobMsg').textContent=e.message}};
    $('myobDisconnect').onclick=async()=>{try{await api('/api/myob/disconnect',{method:'POST'});status()}catch(e){$('myobMsg').textContent=e.message}};
    $('myobCfSave').onclick=async()=>{try{$('myobMsg').textContent='Verifying MYOB company file…';await api('/api/myob/company-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('myobCfUser').value,password:$('myobCfPass').value})});$('myobCfPass').value='';$('myobMsg').textContent='MYOB company file verified.';status()}catch(e){$('myobMsg').textContent=e.message}};
    $('myobImportBtn').onclick=async()=>{
      const files=[...($('myobImportFile').files||[])],msg=$('myobImportMsg');
      if(!files.length){msg.textContent='Choose one or more MYOB CSV, JSON or text exports first.';return;}
      if(files.length>50){msg.textContent='Choose up to 50 MYOB exports at a time.';return;}
      const fallback=$('myobImportKind').value;
      const detectKind=name=>{
        const n=String(name||'').toLowerCase();
        if(/profit|p&l|pnl|income/.test(n))return 'profit_and_loss';
        if(/purchase|bill|supplier|payable/.test(n))return 'purchases';
        if(/inventory|stock|item/.test(n))return 'inventory';
        if(/ledger|journal|general.?ledger|gl\b/.test(n))return 'general_ledger';
        return fallback;
      };
      $('myobImportBtn').disabled=true;
      let ok=0,failed=0,totalRows=0;
      try{
        for(let i=0;i<files.length;i++){
          const file=files[i],kind=detectKind(file.name);
          msg.textContent='Importing '+(i+1)+' of '+files.length+' · '+file.name+'…';
          try{
            const r=await fetch('/api/myob/import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type||'text/csv','X-Filename':encodeURIComponent(file.name),'X-MYOB-Kind':kind},body:file});
            const x=await r.json();if(!r.ok)throw new Error(x.error||'MYOB import failed.');
            ok++;if(x.rows!=null)totalRows+=Number(x.rows)||0;
          }catch(e){failed++;}
        }
        msg.textContent='MYOB import complete · '+ok+' file'+(ok===1?'':'s')+' imported'+(totalRows?' · '+totalRows+' rows':'')+(failed?' · '+failed+' failed':'')+'.';
        $('myobImportFile').value='';loadImports();
        window.dispatchEvent(new Event('p2p-data-changed'));
      }finally{$('myobImportBtn').disabled=false;}
    };
  }

  if($('consultantNewCase')&&!$('consultantNewCase').dataset.ready){
    $('consultantNewCase').dataset.ready='1';
    $('consultantNewCase').onclick=async()=>{
      const msg=$('consultantMsg');msg.textContent='Opening case…';
      try{
        const x=await api('/api/consultant/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:$('consultantSubject').value,question:$('consultantQuestion').value})});
        $('consultantSubject').value='';$('consultantQuestion').value='';msg.textContent='Case opened.';
        await loadThreads(x.id);
      }catch(e){msg.textContent=e.message;}
    };
    $('consultantReplyBtn').onclick=async()=>{
      const body=$('consultantReply').value.trim();if(!body||!currentThread)return;
      $('consultantReplyBtn').disabled=true;
      try{
        await api('/api/consultant/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:currentThread,body})});
        $('consultantReply').value='';await openThread(currentThread);
      }catch(e){$('consultantMsg').textContent=e.message;}finally{$('consultantReplyBtn').disabled=false;}
    };
  }
  clearInterval(pollTimer);
  pollTimer=setInterval(()=>{if(consultantEnabled&&currentThread)openThread(currentThread,false)},20000);
}


async function addConsultantAdmin(){
  let st;try{st=await api('/api/consultant/admin/status')}catch{return}
  const mobile=document.querySelector('.p2p-mobile-nav select option[value="consultant-admin"]');
  if(!st.admin){if(mobile)mobile.remove();return;}
  const nav=document.querySelector('.nav');
  if(nav&&!nav.querySelector('a[href="#consultant-admin"]')){
    const a=document.createElement('a');a.href='#consultant-admin';a.innerHTML='<span class="icon">▤</span>Consultant inbox';
    nav.insertBefore(a,nav.querySelector('a[href="#workspace-info"]')||null);
  }
  if(!$('consultant-admin-panel')){
    const host=document.querySelector('main')||document.body,s=document.createElement('section');
    s.id='consultant-admin-panel';s.className='card';s.style.marginTop='14px';
    s.innerHTML=`
      <div class="card-head"><div><div class="kicker">Consultant console</div><h2>Consultant inbox</h2><div class="muted">Open customer cases, read the full thread, reply and close conversations.</div></div><span class="pill green">Admin</span></div>
      <div style="display:grid;grid-template-columns:minmax(240px,.38fr) minmax(0,1fr);gap:14px">
        <div>
          <div style="display:flex;gap:8px;margin-bottom:10px"><select id="adminConsultantFilter" style="${fieldStyle()}"><option value="all">All cases</option><option value="open">Open</option><option value="answered">Answered</option><option value="closed">Closed</option></select><button class="btn" id="adminConsultantRefresh" type="button">Refresh</button></div>
          <div id="adminConsultantThreads" style="display:grid;gap:7px"></div>
        </div>
        <div style="border:1px solid var(--line);border-radius:12px;min-height:500px;display:flex;flex-direction:column;overflow:hidden">
          <div id="adminConsultantHead" style="padding:14px;border-bottom:1px solid var(--line)"><strong>Select a case</strong></div>
          <div id="adminConsultantMessages" style="flex:1;padding:14px;overflow:auto;display:grid;gap:10px;align-content:start"><div class="muted">Customer messages will appear here.</div></div>
          <div style="padding:12px;border-top:1px solid var(--line)">
            <textarea id="adminConsultantReply" placeholder="Reply as consultant…" style="${fieldStyle()};min-height:90px" disabled></textarea>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <button class="btn primary" id="adminConsultantSend" type="button" disabled>Send reply</button>
              <button class="btn" id="adminConsultantOpen" type="button" disabled>Mark open</button>
              <button class="btn ghost" id="adminConsultantClose" type="button" disabled>Close case</button>
            </div>
            <div id="adminConsultantMsg" class="muted" style="margin-top:8px"></div>
          </div>
        </div>
      </div>`;
    host.appendChild(s);
  }
  let active=null;
  const threads=$('adminConsultantThreads'),msgs=$('adminConsultantMessages'),head=$('adminConsultantHead'),reply=$('adminConsultantReply'),send=$('adminConsultantSend'),openBtn=$('adminConsultantOpen'),closeBtn=$('adminConsultantClose'),note=$('adminConsultantMsg');
  async function loadAdminThreads(){
    try{
      const x=await api('/api/consultant/admin/threads?status='+encodeURIComponent($('adminConsultantFilter').value));
      const rows=x.threads||[];
      threads.innerHTML=rows.length?rows.map(t=>'<button type="button" class="btn admin-case" data-id="'+esc(t.id)+'" style="text-align:left"><strong>'+esc(t.subject||'Consultant case')+'</strong><div class="evidence">'+esc(t.email||'Unknown account')+' · '+esc(t.status||'open')+'</div><div class="evidence">'+esc(t.last_message||'No messages yet')+'</div></button>').join(''):'<div class="muted">No consultant cases in this view.</div>';
      threads.querySelectorAll('.admin-case').forEach(b=>b.onclick=()=>openAdminThread(b.dataset.id));
    }catch(e){threads.innerHTML='<div class="muted">'+esc(e.message)+'</div>';}
  }
  async function openAdminThread(id){
    active=id;note.textContent='';
    try{
      const x=await api('/api/consultant/admin/messages?request_id='+encodeURIComponent(id));
      head.innerHTML='<strong>'+esc(x.thread.subject||'Consultant case')+'</strong><div class="evidence">'+esc(x.thread.email||'Unknown account')+' · '+esc(x.thread.status||'open')+'</div>';
      msgs.innerHTML=(x.messages||[]).map(m=>{
        const consultant=m.sender==='consultant';
        return '<div style="max-width:82%;'+(consultant?'margin-left:auto;background:#13243a':'margin-right:auto;background:#0a1726')+';border:1px solid var(--line);border-radius:12px;padding:10px 12px"><div class="kicker">'+(consultant?'CONSULTANT':'CUSTOMER')+'</div><div style="white-space:pre-wrap;margin-top:4px">'+esc(m.body)+'</div><div class="evidence">'+new Date(m.created_at).toLocaleString()+'</div></div>';
      }).join('')||'<div class="muted">No messages yet.</div>';
      reply.disabled=false;send.disabled=false;openBtn.disabled=false;closeBtn.disabled=false;msgs.scrollTop=msgs.scrollHeight;
    }catch(e){msgs.innerHTML='<div class="muted">'+esc(e.message)+'</div>';}
  }
  $('adminConsultantRefresh').onclick=loadAdminThreads;
  $('adminConsultantFilter').onchange=loadAdminThreads;
  send.onclick=async()=>{const body=reply.value.trim();if(!body||!active)return;send.disabled=true;note.textContent='Sending…';try{await api('/api/consultant/admin/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:active,body})});reply.value='';note.textContent='Reply sent.';await openAdminThread(active);await loadAdminThreads();}catch(e){note.textContent=e.message}finally{send.disabled=false}};
  async function mark(status){if(!active)return;try{await api('/api/consultant/admin/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:active,status})});note.textContent='Case '+status+'.';await openAdminThread(active);await loadAdminThreads();}catch(e){note.textContent=e.message}}
  openBtn.onclick=()=>mark('open');closeBtn.onclick=()=>mark('closed');
  await loadAdminThreads();
  setInterval(()=>{if(active)openAdminThread(active);loadAdminThreads()},20000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{add();setTimeout(addConsultantAdmin,500)});else{add();setTimeout(addConsultantAdmin,500)};
})();