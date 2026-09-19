(()=>{
  if(document.getElementById('garnish-premium-brand'))return;
  const MARK='/garnish-mark.svg';
  const INVERSE='/garnish-mark-inverse-premium.svg';

  const style=document.createElement('style');
  style.id='garnish-premium-brand';
  style.textContent=`
    :root{
      --g-ink:#071d18;
      --g-deep:#082820;
      --g-panel:#0b3027;
      --g-panel-2:#0d392e;
      --g-line:rgba(215,232,203,.14);
      --g-cream:#f4f0e6;
      --g-soft:#c5d0c7;
      --g-lime:#a8d92f;
      --g-lime-soft:#c6ef60;
      --g-shadow:0 22px 60px rgba(0,0,0,.24);
    }

    html,body{
      background:
        radial-gradient(circle at 8% 6%,rgba(168,217,47,.08),transparent 28%),
        linear-gradient(180deg,#071d18 0%,#061711 100%)!important;
      color:var(--g-cream)!important;
    }
    .sidebar{
      background:linear-gradient(180deg,#09271f 0%,#061c17 100%)!important;
      border-right:1px solid var(--g-line)!important;
      box-shadow:16px 0 60px rgba(0,0,0,.18)!important;
    }
    .card,.plan-step,#invoiceResult,.p2p-ai-result{
      color:var(--g-cream)!important;
      background:linear-gradient(180deg,rgba(13,57,46,.94),rgba(8,37,30,.98))!important;
      border-color:var(--g-line)!important;
      box-shadow:var(--g-shadow)!important;
    }
    .card{border-radius:18px!important}
    h1,h2,h3,.kpi .value,.impact,strong,label{color:var(--g-cream)!important}
    h1,h2,h3{font-family:Georgia,'Times New Roman',serif!important;font-weight:600!important;letter-spacing:-.015em}
    .muted,.evidence,.kpi .label,.table th,.delta{color:var(--g-soft)!important}
    .kicker{color:var(--g-lime-soft)!important;letter-spacing:.2em!important}
    .nav a{color:#c2cbc4!important}
    .nav a.active,.nav a:hover{
      background:linear-gradient(90deg,rgba(168,217,47,.16),rgba(168,217,47,.04))!important;
      color:var(--g-cream)!important;
      box-shadow:inset 2px 0 0 var(--g-lime)!important;
    }
    .nav .icon{color:var(--g-lime-soft)!important}
    .btn{background:#103e32!important;border-color:rgba(220,236,209,.16)!important;color:var(--g-cream)!important}
    .btn:hover{background:#155140!important}
    .btn.primary{background:var(--g-lime)!important;border-color:var(--g-lime)!important;color:#092219!important;box-shadow:0 8px 28px rgba(168,217,47,.16)!important}
    .btn.primary:hover{background:var(--g-lime-soft)!important;color:#092219!important}
    input,textarea,select,.ai-box input{background:#061f19!important;color:var(--g-cream)!important;border-color:rgba(220,236,209,.18)!important}
    input::placeholder,textarea::placeholder{color:#8fa49a!important}
    .table td{border-color:rgba(220,236,209,.10)!important;color:var(--g-cream)!important}
    .progress{background:#123e32!important}.progress>span{background:linear-gradient(90deg,var(--g-lime),#65b78c)!important}
    .pill.green{background:rgba(168,217,47,.12)!important;color:#c8f05c!important;border:1px solid rgba(168,217,47,.18)}
    .pill.blue{background:rgba(118,168,148,.13)!important;color:#b9d9c9!important}
    .pill.orange{background:rgba(213,167,99,.13)!important;color:#e8c592!important}
    .pill.red{background:rgba(213,111,111,.13)!important;color:#efaaa5!important}

    .p2p-home,.p2p-bar{background:#082820!important;color:#f4f0e6!important}
    .p2p-home h1,.p2p-home h2,.p2p-tile strong{color:#f4f0e6!important}
    .p2p-home h1 em,.p2p-eyebrow,.p2p-number{color:#c6ef60!important}
    .p2p-intro,.p2p-helper,.p2p-bottom,.p2p-tile p{color:#c5d0c7!important}
    .p2p-art,.p2p-tile,.p2p-receipt{background:#0d392e!important;color:#f4f0e6!important;border-color:#527262!important}
    .p2p-plate{background:transparent url('/garnish-mark.svg') center/contain no-repeat!important;box-shadow:none!important;border-radius:0!important;opacity:1!important}
    .p2p-paper-row span:last-child,.p2p-paper-small{color:#c6ef60!important}
    .p2p-primary,.p2p-seal{background:#a8d92f!important;color:#082820!important;border-color:#a8d92f!important}
    .p2p-secondary{background:#103e32!important;color:#f4f0e6!important;border-color:#527262!important}
    .p2p-menu button{color:#f4f0e6!important}
    .p2p-menu button[aria-current=page]{background:#a8d92f!important;color:#082820!important}
    .document-table-scroll{overflow:auto;max-height:420px;max-width:100%}
    .document-warning{color:#e8c592!important;font-size:14px}
    .garnish-kpi-wrap{flex-wrap:wrap;min-width:0}
    .garnish-kpi-wrap .value{flex-basis:100%;overflow-wrap:anywhere}
    .main,.p2p-page,.card{min-width:0}
    @media(max-width:700px){
      .main{padding:20px 16px 40px!important}
      .p2p-home{padding-inline:18px!important}
      .p2p-home h1{font-size:clamp(36px,10vw,56px)!important;line-height:1.08!important}
      .p2p-hero,.p2p-tiles,.garnish-sales-grid{grid-template-columns:1fr!important}
      #sqStats,#planBox{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #documentIntelligence>div[style*="grid"],#myobImportBridge>div[style*="grid"]{grid-template-columns:minmax(0,1fr)!important}
      input[type=file]{width:100%;min-width:0}
      .card-head,.topbar,.top-actions{flex-wrap:wrap;gap:12px}
      .p2p-menu{flex-wrap:wrap}.p2p-art{min-width:0;overflow:hidden}
      .p2p-actions{flex-wrap:wrap}.p2p-actions button{white-space:normal!important}
    }
    @media(max-width:380px){#sqStats,#planBox{grid-template-columns:1fr!important}}
    /* Square area readability */
    #square-pos{background:#0b3027!important;color:#f4f0e6!important}
    #square-pos #sqSub,#square-pos #sqMsg,#square-pos #sqStats .muted{color:#c7d4cc!important}
    #square-pos #sqStats strong{color:#f4f0e6!important}
    #square-pos #sqStats>div{background:#103e32!important;border-color:#527262!important}
    #sqStats>div{min-width:0;overflow-wrap:anywhere}
    #square-pos .muted,#square-pos .label,#square-pos small,#square-pos p{color:#c7d4cc!important}
    #square-pos strong,#square-pos h2,#square-pos .value{color:var(--g-cream)!important}

    /* Reading surfaces: dark ink, explicit matching backgrounds, no faded labels. */
    .main .card{color:#142d23!important;--text:#142d23;--muted:#344c40;--card:#f7f9f3;--line:#a9bbae}
    .main .card,.main .plan-step,.main #invoiceResult,.main .p2p-ai-result{
      background:#f7f9f3!important;color:#142d23!important;border-color:#a9bbae!important;
    }
    .main .card :is(h1,h2,h3,h4,strong,label,legend,summary,td,th,.value,.impact),
    .main .card :is(p,small,.muted,.evidence,.label,.delta,.kicker){color:#142d23!important}
    .main .card :is(.muted,.evidence,.label,.delta,small){color:#344c40!important;opacity:1!important}
    .main .card :is(label,th,summary){font-weight:700!important}
    .main .card :is(input,textarea,select){background:#fff!important;color:#142d23!important;border-color:#718b7a!important;color-scheme:light}
    .main .card :is(input,textarea)::placeholder{color:#465e50!important;opacity:1!important}
    .main .card :is(input,textarea,select):disabled{opacity:1!important;color:#465e50!important;background:#e7eee7!important;-webkit-text-fill-color:#465e50!important}
    .main .card :is(.btn,button){background:#e3ebdf!important;color:#142d23!important;border-color:#718b7a!important}
    .main .card :is(.btn.primary,button[type=submit],button[aria-selected=true]){background:#164633!important;color:#fff!important;border-color:#164633!important}
    .main .card button :is(span,strong){color:inherit!important}
    .main .card a{color:#174e37!important;text-decoration:underline}
    .main .card :is(.acc-error,.error){color:#9b2020!important}
    .main .card :is(.pill.green,.pill.blue){background:#e0eedb!important;color:#20452d!important}
    .main .card .pill.orange{background:#f6e6cb!important;color:#68420a!important}
    .main .card .pill.red{background:#f7dfdc!important;color:#8c2626!important}
    .main .card div[style*="max-width:82%"]{background:#e3ebdf!important;color:#142d23!important}
    .main #square-pos,.main #square-pos #sqStats>div{background:#f7f9f3!important;color:#142d23!important}
    .main #square-pos :is(#sqSub,#sqMsg,#sqStats .muted,#sqStats strong,.muted,.label,small,p,strong,h2,.value){color:#142d23!important}
    .main .garnish-section-story{background:#e3ebdf!important;color:#142d23!important}
    .p2p-intro,.p2p-helper,.p2p-bottom,.p2p-tile p,.p2p-section-title span{color:#e3ebe4!important;opacity:1!important}
    .sidebar-foot{color:#e3ebe4!important;opacity:1!important}
    .kpi.garnish-enhanced .label{font-size:12px!important;font-weight:700!important}
    .p2p-brand img{background:#f7f9f3;border-radius:8px;padding:6px}

    /* Garnish mark used wherever a decorative circle used to be */
    .garnish-mini-mark{width:18px;height:18px;display:inline-block;vertical-align:-3px;object-fit:contain;filter:drop-shadow(0 3px 8px rgba(0,0,0,.18))}
    .nav .icon.garnish-iconised{width:26px;height:20px;display:inline-flex;align-items:center;justify-content:flex-start}
    .nav .icon.garnish-iconised img{width:17px;height:17px;display:block}

    /* Pie-chart interpretation of the sliced mark */
    .garnish-kpi-wrap{display:flex;align-items:center;gap:14px;margin-bottom:4px}
    .garnish-pie{
      --p:100;
      width:48px;height:48px;min-width:48px;border-radius:50%;position:relative;display:grid;place-items:center;
      background:conic-gradient(var(--g-lime) calc(var(--p)*1%),rgba(244,240,230,.09) 0);
      box-shadow:inset 0 0 0 1px rgba(244,240,230,.10),0 10px 28px rgba(0,0,0,.20);
    }
    .garnish-pie:before{content:'';position:absolute;inset:5px;border-radius:50%;background:#0a2b23}
    .garnish-pie img{position:relative;z-index:1;width:29px;height:29px;object-fit:contain}
    .garnish-brand-disc{
      width:44px;height:44px;min-width:44px;border-radius:50%;display:grid;place-items:center;
      background:rgba(244,240,230,.06);border:1px solid rgba(244,240,230,.10);
      box-shadow:0 10px 28px rgba(0,0,0,.18)
    }
    .garnish-brand-disc img{width:27px;height:27px;display:block}
    .kpi.garnish-enhanced .label{letter-spacing:.08em;text-transform:uppercase;font-size:10px!important}
    .kpi.garnish-enhanced .value{font-family:Georgia,'Times New Roman',serif!important;font-weight:500!important}

    /* do not replace functional status indicators */
    .status-dot{background:var(--g-lime)!important;box-shadow:0 0 0 3px rgba(168,217,47,.08)}
  `;
  document.head.appendChild(style);

  function numericPercent(text){
    const s=String(text||'').trim();
    let m=s.match(/(-?\d+(?:\.\d+)?)\s*%/);
    if(m)return Math.max(0,Math.min(100,Number(m[1])));
    m=s.match(/(-?\d+(?:\.\d+)?)\s*\/\s*100/);
    if(m)return Math.max(0,Math.min(100,Number(m[1])));
    return null;
  }

  function enhanceKpis(){
    document.querySelectorAll('.kpis .kpi').forEach(card=>{
      if(!card.classList.contains('garnish-enhanced')){
        card.classList.add('garnish-enhanced');
        const value=card.querySelector('.value');
        const label=card.querySelector('.label');
        if(value&&label){
          const wrap=document.createElement('div');
          wrap.className='garnish-kpi-wrap';
          const holder=document.createElement('div');
          holder.className='garnish-brand-disc';
          holder.innerHTML=`<img src="${INVERSE}" alt="" aria-hidden="true">`;
          value.parentNode.insertBefore(wrap,label);
          wrap.append(holder,label,value);
        }
      }
      updateKpi(card);
    });
  }

  function updateKpi(card){
    const value=card.querySelector('.value');
    const holder=card.querySelector('.garnish-brand-disc,.garnish-pie');
    if(!value||!holder)return;
    const pct=numericPercent(value.textContent);
    if(pct!==null){
      holder.className='garnish-pie';
      holder.style.setProperty('--p',pct);
    }else{
      holder.className='garnish-brand-disc';
      holder.style.removeProperty('--p');
    }
  }

  function replaceCircularGlyphs(){
    const circular=/[◉◒◴●○◐◑◓◔]/;
    document.querySelectorAll('.nav .icon').forEach(icon=>{
      if(icon.classList.contains('garnish-iconised'))return;
      if(circular.test(icon.textContent||'')){
        icon.classList.add('garnish-iconised');
        icon.innerHTML=`<img src="${INVERSE}" alt="" aria-hidden="true">`;
      }
    });
  }

  function replaceDecorativeCircles(root=document){
    root.querySelectorAll?.('[data-garnish-circle],.brand-circle,.logo-circle,.avatar-placeholder,.decorative-circle').forEach(el=>{
      if(el.dataset.garnishDone)return;
      el.dataset.garnishDone='1';
      el.innerHTML=`<img class="garnish-mini-mark" src="${INVERSE}" alt="Garnish">`;
    });
  }

  function run(){enhanceKpis();replaceCircularGlyphs();replaceDecorativeCircles();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();

  const observer=new MutationObserver(()=>run());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();
