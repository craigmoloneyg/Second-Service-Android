(()=>{
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

    /* Square area readability */
    #square-pos .muted,#square-pos .label,#square-pos small,#square-pos p{color:#c7d4cc!important}
    #square-pos strong,#square-pos h2,#square-pos .value{color:var(--g-cream)!important}

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
