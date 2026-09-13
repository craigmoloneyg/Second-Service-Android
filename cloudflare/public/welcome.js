(() => {
  'use strict';
  if (location.origin !== 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev' || document.getElementById('p2p-style')) return;
  const shell = document.querySelector('.shell');
  if (!shell || !document.querySelector('#invoice-processing')) return;
  document.title = 'Price 2 Plate · Restaurant Profit Intelligence';
  const legacyLogo = document.querySelector('.sidebar .logo');
  if (legacyLogo) legacyLogo.innerHTML = 'PRICE 2 PLATE<small>PROFIT INTELLIGENCE</small>';
  const style = document.createElement('style');
  style.id = 'p2p-style';
  style.textContent = `
    :root{--bg:#f5f3ec;--panel:#fffefa;--panel2:#eeeee5;--line:#d9dfd2;--text:#20382f;--muted:#606f65;--gold:#35634d;--green:#35634d;--red:#ab403b;--orange:#906022;--blue:#345e83;--nav:#eef0e7;color-scheme:light}
    html,body{background:var(--bg)!important;color:var(--text);font-family:Arial,Helvetica,sans-serif}
    body{padding-top:84px}.p2p-bar *,.p2p-home *{box-sizing:border-box}
    .p2p-bar{height:84px;position:fixed;top:0;left:0;right:0;z-index:1000;background:#f5f3ecf5;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 6%;gap:20px}
    .p2p-brand{display:flex;align-items:center;gap:12px;font-size:21px;font-weight:700;letter-spacing:-.7px;white-space:nowrap}
    .p2p-mark{width:38px;height:38px;flex:none}.p2p-menu{display:flex;gap:6px}.p2p-menu button{border:0;background:transparent;padding:12px 16px;color:#526358;border-radius:24px;font-weight:600;cursor:pointer}.p2p-menu button[aria-current=page]{background:#e4eadc;color:#234e3b}
    .p2p-home{max-width:1250px;margin:auto;padding:70px 6% 42px}.p2p-hero{display:grid;grid-template-columns:1.18fr 1fr;gap:64px;align-items:center}
    .p2p-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#56734f;margin:0 0 24px;display:flex;align-items:center;gap:10px}.p2p-eyebrow:before{content:'';width:24px;height:1px;background:#56734f}
    .p2p-home h1{font:normal clamp(44px,5.4vw,72px)/1.05 Georgia,serif;letter-spacing:-2.5px;margin:0 0 24px;color:#243c31}.p2p-home h1 em{font-weight:normal;color:#637d50}.p2p-intro{font-size:16px;line-height:1.8;max-width:460px;color:#617065;margin:0 0 30px}
    .p2p-actions{display:flex;gap:12px;flex-wrap:wrap}.p2p-home button{font:600 14px Arial,sans-serif;cursor:pointer}.p2p-primary,.p2p-secondary{border-radius:9px;padding:16px 22px;min-height:50px}.p2p-primary{color:#fff!important;background:#28523e!important;border:1px solid #28523e!important}.p2p-secondary{background:transparent;border:1px solid #bcc8b7;color:#284634}.p2p-helper{color:#697466;font-size:12px;margin-top:16px;line-height:1.6}
    .p2p-art{min-height:370px;position:relative;display:grid;place-items:center;background:#e8eddd;border-radius:110px 110px 20px 20px;overflow:hidden}.p2p-plate{position:absolute;width:255px;height:255px;border-radius:50%;background:#f9f8ef;box-shadow:inset 0 0 0 13px #fffdf5,inset 0 0 0 15px #e5e7d9,0 20px 35px #3d54301a;transform:translate(48px,25px)}
    .p2p-receipt{position:relative;background:#fffefa;width:218px;transform:rotate(-8deg) translate(-22px,-8px);padding:26px 24px 30px;box-shadow:0 12px 28px #29412815;border-radius:6px;color:#37513e}.p2p-receipt .p2p-paper-title{font:italic 25px Georgia,serif;margin-bottom:7px}.p2p-paper-small{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#7a8774}.p2p-paper-row{padding:17px 0;border-bottom:1px dashed #d1d9c8;font-size:12px;display:flex;justify-content:space-between;gap:10px}.p2p-paper-row span:last-child{color:#62804d}.p2p-seal{position:absolute;right:24px;bottom:24px;display:flex;align-items:center;gap:10px;background:#2c513b;color:#fffdf3;padding:13px 17px;border-radius:9px;font-size:12px;box-shadow:0 6px 14px #29412814}.p2p-seal span{font-size:23px;color:#d6e5bb}
    .p2p-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:58px 0 20px;padding-top:26px;border-top:1px solid #d9dfd2}.p2p-section-title h2{font:normal 25px Georgia,serif}.p2p-section-title span{font-size:12px;color:#6e796b}
    .p2p-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.p2p-tile{background:#fffefa;border:1px solid #dce2d5;border-radius:12px;text-align:left;padding:24px!important;color:#243c31;transition:transform .15s,border-color .15s}.p2p-tile:hover{transform:translateY(-3px);border-color:#648456}.p2p-number{display:block;font-size:11px;letter-spacing:1px;color:#7a8b70;margin-bottom:22px}.p2p-tile strong{font:normal 22px Georgia,serif;display:block;margin-bottom:10px}.p2p-tile p{font-size:13px;line-height:1.6;color:#697466;font-weight:normal;margin:0}.p2p-bottom{display:flex;justify-content:space-between;gap:20px;color:#7a8474;font-size:11px;padding:28px 0 0}.p2p-note{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#264732;color:white;border-radius:8px;padding:12px 18px;z-index:1002;max-width:90%;font-size:13px}.p2p-note:empty{display:none}
    .p2p-home[hidden],.shell[hidden]{display:none!important}
    .sidebar{background:#eef0e7!important;border-color:#d9dfd2;top:84px;height:calc(100vh - 84px)}.nav a.active,.nav a:hover{background:#dfe7d7;color:#284634}.card{background:#fffefa!important;box-shadow:none;border-color:#d9dfd2;border-radius:12px}.btn{background:#e9eee2;color:#2e503b}.btn.primary{background:#2e573f;color:#fffefa;border-color:#2e573f}.btn.ghost{color:#2e503b}.impact{color:#20382f}.pill.green{background:#e6efdf;color:#365c2c}.pill.red{background:#f9e6df;color:#9d3d37}.pill.orange{background:#f6ecd9;color:#815421}.pill.blue{background:#e6edf1;color:#365e7a}.plan-step{background:#f1f3e9}.bar{background:linear-gradient(#87a671,#3d684d)}.chart-line{background:#b28342;box-shadow:none}.progress{background:#e1e7d7}.progress>span{background:#6c9156}.ai-box input,input,textarea,select{background:#fffefa!important;color:#243c31!important;border-color:#c4cebb!important}#invoiceResult{background:#f1f4e9!important}.bars{border-color:#cbd5c1}.table td{border-color:#d9dfd2}
    button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #a77727!important;outline-offset:4px}button:disabled{opacity:.6;cursor:wait}.p2p-home button:disabled{cursor:not-allowed}
    @media(max-width:980px){.p2p-home{padding-top:42px}.p2p-hero{gap:28px}.p2p-art{min-height:330px}.p2p-home h1{font-size:54px}.p2p-menu button{padding:10px}.p2p-tiles{gap:10px}.p2p-tile{padding:18px!important}}
    @media(max-width:640px){body{padding-top:118px}.p2p-bar{height:118px;padding:15px 5%;flex-direction:column;align-items:flex-start;gap:9px}.p2p-brand{font-size:20px}.p2p-mark{width:31px;height:31px}.p2p-menu{width:100%;justify-content:space-between}.p2p-menu button{font-size:12px;padding:9px 12px}.p2p-home{padding:32px 6%}.p2p-hero{grid-template-columns:1fr}.p2p-home h1{font-size:49px;letter-spacing:-1.8px}.p2p-intro{font-size:15px}.p2p-art{min-height:280px;margin-top:5px;border-radius:70px 70px 16px 16px}.p2p-receipt{width:190px;padding:21px}.p2p-paper-row{padding:12px 0}.p2p-plate{width:210px;height:210px}.p2p-seal{right:16px;bottom:16px;font-size:11px}.p2p-section-title{margin-top:32px}.p2p-section-title span{display:none}.p2p-tiles{grid-template-columns:1fr}.p2p-number{margin-bottom:12px}.p2p-bottom{flex-direction:column;gap:8px}.main{padding:20px 5%}.top-actions{flex-wrap:wrap}.card-head{flex-wrap:wrap}.ai-box{grid-template-columns:1fr}.p2p-actions{gap:10px}.p2p-actions button{flex:1;white-space:nowrap}.table{display:block;overflow-x:auto}.sidebar{top:118px}}
    @media(prefers-reduced-motion:reduce){.p2p-tile{transition:none}}
  `;
  document.head.append(style);
  const bar = document.createElement('header');
  bar.className = 'p2p-bar';
  bar.innerHTML = `<div class="p2p-brand"><svg class="p2p-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#355c41" stroke-width="2"/><circle cx="24" cy="24" r="13" fill="none" stroke="#8ca474" stroke-width="1.5"/><path d="M17 29l7-10 7 10M20 26h8" fill="none" stroke="#355c41" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Price 2 Plate</div><nav class="p2p-menu" aria-label="Workspace"><button data-view="home">Home</button><button data-view="invoices">Invoices</button><button data-view="menu">Menu costing</button><button data-view="dashboard">Dashboard</button></nav>`;
  const home = document.createElement('main');
  home.className = 'p2p-home';
  home.id = 'p2p-home';
  home.innerHTML = `<section class="p2p-hero"><div><p class="p2p-eyebrow">Your kitchen. Your numbers.</p><h1 tabindex="-1">Good food.<br><em>Better margins.</em></h1><p class="p2p-intro">A little clarity goes a long way. Turn supplier invoices into ingredient costs, cost your menu, and see where your money goes.</p><div class="p2p-actions"><button class="p2p-primary" data-view="invoices">Upload invoices <span aria-hidden="true">↗</span></button><button class="p2p-secondary" data-view="dashboard">Open dashboard</button></div><p class="p2p-helper">PDFs and images · Up to 50 invoices per batch</p></div><div class="p2p-art" aria-hidden="true"><div class="p2p-plate"></div><div class="p2p-receipt"><div class="p2p-paper-title">From price to plate.</div><div class="p2p-paper-small">Make every ingredient count</div><div class="p2p-paper-row"><span>Supplier invoices</span><span>01</span></div><div class="p2p-paper-row"><span>Ingredient costs</span><span>02</span></div><div class="p2p-paper-row"><span>Menu margins</span><span>03</span></div></div><div class="p2p-seal"><span>↗</span>Clarity for your next service</div></div></section><div class="p2p-section-title"><h2>Where would you like to start?</h2><span>One workspace. A clearer picture.</span></div><section class="p2p-tiles" aria-label="Quick actions"><button class="p2p-tile" data-view="invoices"><span class="p2p-number">01 / PURCHASING</span><strong>Bring your invoices.</strong><p>Upload supplier documents and review the costs extracted from each one.</p></button><button class="p2p-tile" data-view="menu"><span class="p2p-number">02 / MENU COSTING</span><strong>Know every plate.</strong><p>Build recipes from ingredient prices and calculate your portion costs.</p></button><button class="p2p-tile" data-view="dashboard"><span class="p2p-number">03 / THE BIG PICTURE</span><strong>See how it adds up.</strong><p>Open your workspace to review the figures and explore your next steps.</p></button></section><footer class="p2p-bottom"><span>Price 2 Plate · Made for the business of good food.</span><span>Costs in focus. Food at heart.</span></footer>`;
  const note = document.createElement('div');
  note.className = 'p2p-note';
  note.setAttribute('role', 'status');
  document.body.prepend(bar, home);
  document.body.append(note);
  let noticeTimer;
  function show(view, focus = true) {
    if (window.invoiceBatchState?.running) {
      note.textContent = 'Your invoices are processing. Finish the batch or stop after the current invoice first.';
      clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { note.textContent = ''; }, 6000);
      return;
    }
    const isHome = view === 'home';
    home.hidden = !isHome; shell.hidden = isHome;
    bar.querySelectorAll('[data-view]').forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    const target = isHome ? home.querySelector('h1') : document.querySelector(view === 'invoices' ? '#invoice-processing' : view === 'menu' ? '#menu-costing' : '.main');
    if (target && focus) {
      target.setAttribute('tabindex', '-1');
      target.focus({preventScroll:true});
      target.style.scrollMarginTop = '140px';
      target.scrollIntoView({block:'start'});
    }
  }
  [home, bar].forEach(root => root.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (button) show(button.dataset.view);
  }));
  show(location.hash ? 'dashboard' : 'home', false);
})();

// Turn the existing analysis controls into working, evidence-led actions.
(() => {
  'use strict';
  if (location.origin !== 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev' || document.getElementById('p2p-ai-actions')) return;
  const style = document.createElement('style'); style.id = 'p2p-ai-actions';
  style.textContent = '.p2p-ai-result{margin-top:14px;padding:16px;border-radius:12px;background:#eef3eb;border:1px solid #c9dacb;color:#234434;white-space:pre-wrap;line-height:1.5}.p2p-ai-result strong{display:block;margin-bottom:6px}.p2p-ai-busy{opacity:.65;pointer-events:none}'; document.head.append(style);
  const result = document.createElement('div'); result.className = 'p2p-ai-result'; result.hidden = true;
  function text(value) { return String(value ?? '').replace(/[<>]/g, ''); }
  function addResult(host, heading, data) {
    const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
    const lines = opportunities.slice(0, 8).map((item, index) => `${index + 1}. ${item.title || 'Opportunity'}\n${(item.why || '').trim()}\nActions: ${(Array.isArray(item.steps) ? item.steps : []).join('; ')}${item.estimated_saving != null ? `\nEstimated saving: ${item.estimated_saving}` : ''}`).join('\n\n');
    result.innerHTML = `<strong>${text(heading)}</strong>${text(data?.summary || 'No recommendation was returned.')}\n\n${text(lines)}\n\nFollow-up: ${text(data?.measurement || 'Measure the change against the same period next week.')}`;
    result.hidden = false; host.append(result.cloneNode(true));
  }
  async function ask(host, area, question, evidence) {
    const button = host.querySelector('button'); button?.classList.add('p2p-ai-busy'); if (button) button.textContent = 'Thinking…';
    try { const response = await fetch('/api/ai/advice', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area,question,evidence:[{id:area+'-dashboard',text:evidence} ]})}); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'AI request failed'); addResult(host, area === 'labour' ? 'Labour saving opportunities' : 'Recommended next actions', data.advice || data); }
    catch (error) { const message = document.createElement('div'); message.className='p2p-ai-result'; message.textContent = error.message; host.append(message); }
    finally { if (button) { button.classList.remove('p2p-ai-busy'); button.textContent = area === 'labour' ? 'Find labour savings' : 'Ask'; } }
  }
  const aiBox = document.querySelector('.ai-box');
  if (aiBox) { const input = aiBox.querySelector('input'); const button = aiBox.querySelector('button'); if (input && button) { button.addEventListener('click', () => ask(aiBox, 'profit', input.value, document.querySelector('.main')?.innerText.slice(0, 7000) || input.value)); } }
  const labourHeading = [...document.querySelectorAll('h2')].find(node => /Labour by service/i.test(node.textContent || ''));
  const labourHost = labourHeading?.closest('.card') || labourHeading?.parentElement;
  if (labourHost) { const button = document.createElement('button'); button.className='btn primary'; button.type='button'; button.textContent='Find labour savings'; button.addEventListener('click', () => ask(labourHost, 'labour', 'Identify labour-saving methods while maintaining service, safety and Australian employment obligations.', labourHost.innerText.slice(0, 7000))); labourHost.querySelector('.card-head')?.append(button) || labourHost.prepend(button); }
})();
