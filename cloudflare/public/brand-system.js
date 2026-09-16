(()=>{
'use strict';
if(document.getElementById('garnish-brand-system'))return;
const style=document.createElement('style');style.id='garnish-brand-system';
style.textContent=`
:root{
 --bg:#F2F3DF;--panel:#F7F8E9;--panel2:#E8EFD7;--line:#C7D5B8;
 --text:#0B4B3A;--muted:#557262;--gold:#A8D92F;--green:#A8D92F;
 --red:#B24A3A;--orange:#B87925;--blue:#3E6D66;--nav:#0B4B3A;
 --lime:#A8D92F;--forest:#0B4B3A;--cream:#F2F3DF;--ink:#123F34;
 color-scheme:light
}
html,body{background:#F2F3DF!important;color:#0B4B3A!important;font-family:Arial,Helvetica,sans-serif!important}
body{background-image:radial-gradient(circle at 88% 8%,rgba(168,217,47,.14),transparent 28%),linear-gradient(180deg,#F7F8E9 0%,#F2F3DF 100%)!important}
h1,h2,h3,.p2p-page-head h2,.p2p-tile strong,.kpi .value{font-family:Georgia,'Palatino Linotype','Book Antiqua',serif!important;color:#0B4B3A!important;letter-spacing:-.025em}
.shell,.main,#p2p-page-host,.p2p-page{background:transparent!important}
.sidebar{background:#0B4B3A!important;border-right:0!important;box-shadow:10px 0 36px rgba(11,75,58,.08)!important;padding:24px 16px!important}
.sidebar .logo img{width:188px!important}
.nav{gap:5px!important}.nav a{color:#DCE7CE!important;border-radius:11px!important;font-weight:700!important;padding:12px!important}
.nav a:hover,.nav a.active{background:#A8D92F!important;color:#0B4B3A!important}
.nav .icon{color:inherit!important}.sidebar-foot{color:#BFD0B3!important;border-color:rgba(242,243,223,.18)!important}
.main{padding:30px 38px 70px!important}
.topbar{background:#F7F8E9!important;border:1px solid #D0DBC3!important;border-radius:18px!important;padding:16px 18px!important;box-shadow:0 12px 34px rgba(11,75,58,.06)!important}
.kicker{color:#6B8F19!important;font-weight:900!important;letter-spacing:.16em!important}
.muted,.evidence,.kpi .label,.table th,.delta,.p2p-page-head p{color:#557262!important}
.card{background:#F7F8E9!important;border:1px solid #D0DBC3!important;border-radius:18px!important;box-shadow:0 14px 34px rgba(11,75,58,.055)!important;color:#0B4B3A!important}
.card:hover{border-color:#B8CB9E!important}
.btn{background:#E7EED8!important;color:#0B4B3A!important;border:1px solid #C5D4B5!important;border-radius:11px!important;font-weight:800!important}
.btn:hover{background:#DCE8C8!important}
.btn.primary,.p2p-primary{background:#A8D92F!important;color:#0B4B3A!important;border-color:#A8D92F!important}
.btn.primary:hover,.p2p-primary:hover{background:#B7E83A!important}
.btn.ghost{background:transparent!important;color:#0B4B3A!important}
input,textarea,select,.ai-box input{background:#FFFFFF!important;color:#0B4B3A!important;border:1px solid #C5D4B5!important;border-radius:11px!important}
input::placeholder,textarea::placeholder{color:#799082!important}
.table td{color:#0B4B3A!important;border-color:#D8E2CD!important}
.table th{border-color:#D8E2CD!important}
.progress{background:#DDE6D2!important}.progress>span{background:#A8D92F!important}
.plan-step{background:#EDF2E3!important;border-color:#D0DBC3!important}
.pill.green,.pill.blue{background:#E3F4AF!important;color:#315112!important}
.pill.orange{background:#F5E4C6!important;color:#80581B!important}.pill.red{background:#F4D8D3!important;color:#8E3E34!important}
#invoiceResult,.p2p-ai-result{background:#EDF2E3!important;color:#0B4B3A!important;border-color:#C5D4B5!important}
.bar{background:linear-gradient(180deg,#C4EF5B,#6D9F1E)!important}.chart-line{background:#0B4B3A!important;box-shadow:none!important}
.p2p-bar{background:rgba(242,243,223,.97)!important;border-bottom:1px solid #D0DBC3!important;backdrop-filter:blur(14px)}
.p2p-brand img{width:225px!important}.p2p-menu button{color:#557262!important}.p2p-menu button[aria-current=page]{background:#A8D92F!important;color:#0B4B3A!important}
.p2p-home{max-width:1320px!important;padding-top:58px!important}
.p2p-home h1{font-family:Georgia,'Palatino Linotype','Book Antiqua',serif!important;font-size:clamp(54px,7vw,96px)!important;color:#0B4B3A!important;line-height:.98!important;letter-spacing:-.055em!important}
.p2p-home h1 em{color:#0B4B3A!important}.p2p-eyebrow{color:#6B8F19!important}.p2p-eyebrow:before{background:#A8D92F!important}
.p2p-intro{color:#557262!important;font-size:18px!important;max-width:580px!important}
.p2p-art{background:#0B4B3A!important;border-radius:28px!important;min-height:430px!important}
.p2p-plate{background:#A8D92F!important;box-shadow:inset 0 0 0 13px #BCE74C,inset 0 0 0 15px #D9EF98!important}
.p2p-receipt{background:#F2F3DF!important;color:#0B4B3A!important}.p2p-paper-small{color:#557262!important}
.p2p-paper-row{border-color:#C5D4B5!important}.p2p-paper-row span:last-child{color:#6B8F19!important}
.p2p-seal{background:#A8D92F!important;color:#0B4B3A!important}
.p2p-section-title{border-color:#D0DBC3!important}.p2p-section-title h2{font-family:Georgia,'Palatino Linotype','Book Antiqua',serif!important}
.p2p-tile{background:#F7F8E9!important;border-color:#D0DBC3!important;color:#0B4B3A!important;border-radius:18px!important}
.p2p-tile:hover{border-color:#A8D92F!important;transform:translateY(-5px)!important}
.p2p-number{color:#6B8F19!important}.p2p-tile p{color:#557262!important}.p2p-bottom{color:#6B7D72!important}
.p2p-page-head{padding:30px 32px!important;background:#0B4B3A!important;border-radius:22px!important;margin:0 0 18px!important;position:relative!important;overflow:hidden!important}
.p2p-page-head:after{content:'';position:absolute;right:-40px;top:-50px;width:190px;height:190px;border-radius:50%;background:#A8D92F!important;opacity:.95}
.p2p-page-head .kicker,.p2p-page-head h2,.p2p-page-head p{position:relative;z-index:1}.p2p-page-head .kicker{color:#A8D92F!important}.p2p-page-head h2{color:#F2F3DF!important;font-size:38px!important}.p2p-page-head p{color:#DCE7CE!important;max-width:680px!important;font-size:15px!important;line-height:1.6!important}
.garnish-sales-underlay{margin:24px 0 0;background:#0B4B3A;color:#F2F3DF;border-radius:24px;padding:42px;position:relative;overflow:hidden}
.garnish-sales-underlay:after{content:'';position:absolute;right:-70px;bottom:-90px;width:280px;height:280px;border-radius:50%;background:#A8D92F}
.garnish-sales-underlay>*{position:relative;z-index:1}.garnish-sales-underlay .eyebrow{color:#A8D92F;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.garnish-sales-underlay h3{color:#F2F3DF!important;font-size:42px!important;max-width:820px;margin:10px 0 14px;line-height:1.04}
.garnish-sales-underlay p{max-width:780px;color:#DCE7CE;font-size:16px;line-height:1.7}
.garnish-sales-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}
.garnish-sales-point{background:rgba(242,243,223,.08);border:1px solid rgba(242,243,223,.14);border-radius:14px;padding:16px}
.garnish-sales-point strong{display:block;color:#A8D92F!important;font-family:Arial,Helvetica,sans-serif!important;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.garnish-sales-point span{color:#F2F3DF;font-size:13px;line-height:1.45}
.garnish-section-story{margin:-2px 0 18px;padding:14px 18px;background:#E7EED8;border-left:5px solid #A8D92F;border-radius:0 14px 14px 0;color:#315D4C;line-height:1.55}
.garnish-home-pitch{margin:34px 0 0;background:#0B4B3A;border-radius:24px;padding:34px;color:#F2F3DF}
.garnish-home-pitch h2{color:#F2F3DF!important;font-size:44px!important;max-width:860px}.garnish-home-pitch p{color:#DCE7CE;max-width:820px;line-height:1.7}
@media(max-width:980px){.main{padding:22px!important}.garnish-sales-grid{grid-template-columns:1fr 1fr}.p2p-page-head h2{font-size:32px!important}}
@media(max-width:640px){.garnish-sales-grid{grid-template-columns:1fr}.garnish-sales-underlay{padding:26px}.garnish-sales-underlay h3{font-size:34px!important}.p2p-page-head{padding:24px!important}.p2p-home h1{font-size:52px!important}}
`;
document.head.appendChild(style);

const sideLogo=document.querySelector('.sidebar .logo img');if(sideLogo)sideLogo.src='/garnish-logo-inverse.svg';
const homeLogo=document.querySelector('.p2p-brand img');if(homeLogo)homeLogo.src='/garnish-logo.svg';

const stories={
 overview:'Your venue in one commercial snapshot: sales, costs, margin and the biggest signals demanding attention.',
 'profit-recovery':'Turn scattered numbers into a recovery plan. Garnish exposes where profit is leaking and gives you evidence to act on.',
 purchasing:'Every supplier invoice becomes usable intelligence: live ingredient costs, price movement and purchasing history.',
 labour:'Put wage spend beside trading reality. See where labour and revenue stop moving together.',
 'menu-costing':'Cost the plate, not the guess. Every recipe connects back to real supplier pricing and actual portion economics.',
 bar:'Bring beverage purchasing, pour cost and stock variance into the same commercial picture as the kitchen.',
 analyst:'Ask the numbers a question in plain English. Garnish interprets the evidence while the calculations stay deterministic.',
 consultant:'When software is not enough, keep the numbers and the human conversation in one place.',
 square:'Bring live sales into the cost picture so a popular dish can no longer hide a weak margin.',
 workspace:'Connect the systems behind the venue: account, Square, MYOB, billing and the data that powers Garnish.',
 'consultant-admin':'One place to review cases, reply with context and keep the commercial conversation attached to the evidence.'
};
function addStories(){
 document.querySelectorAll('.p2p-page').forEach(v=>{
   const head=v.querySelector('.p2p-page-head');if(!head||v.querySelector('.garnish-section-story'))return;
   const story=document.createElement('div');story.className='garnish-section-story';
   story.textContent=stories[v.dataset.page]||'One connected commercial picture for the business behind hospitality.';
   head.after(story);
 });
}
function addUnderlay(){
 const host=document.querySelector('#p2p-page-host');if(!host)return;
 document.querySelectorAll('.p2p-page').forEach(v=>{
   if(v.querySelector('.garnish-sales-underlay'))return;
   const box=document.createElement('section');box.className='garnish-sales-underlay';
   box.innerHTML='<div class="eyebrow">The business behind hospitality</div><h3>Know where the money goes before service takes it with it.</h3><p>Garnish connects purchasing, recipes, sales, labour and accounting into one commercial view. Code calculates the numbers. AI interprets the evidence. You stay in control of the decisions.</p><div class="garnish-sales-grid"><div class="garnish-sales-point"><strong>Cost every plate</strong><span>Invoice prices flow into ingredient and recipe costs.</span></div><div class="garnish-sales-point"><strong>See margin leaks</strong><span>Find high-volume dishes, supplier moves and cost drift.</span></div><div class="garnish-sales-point"><strong>Connect the venue</strong><span>Square, MYOB, invoices and recipes in one workspace.</span></div><div class="garnish-sales-point"><strong>Act with evidence</strong><span>Commercial insight without handing decisions to the software.</span></div></div>';
   v.appendChild(box);
 });
}
function addHomePitch(){
 const home=document.querySelector('.p2p-home');if(!home||home.querySelector('.garnish-home-pitch'))return;
 const pitch=document.createElement('section');pitch.className='garnish-home-pitch';
 pitch.innerHTML='<div class="kicker">Why Garnish exists</div><h2>Restaurants do not need more dashboards. They need to know what is actually making money.</h2><p>Supplier invoices tell one story. Square tells another. MYOB tells another. Recipes live somewhere else again. Garnish pulls those threads together so an operator can see the cost of the plate, the sales behind it, the labour around it and the profit left after service.</p><div class="garnish-sales-grid"><div class="garnish-sales-point"><strong>Invoices → costs</strong><span>Turn supplier documents into live ingredient intelligence.</span></div><div class="garnish-sales-point"><strong>Recipes → margins</strong><span>Know portion cost, food cost percentage and contribution.</span></div><div class="garnish-sales-point"><strong>Sales → reality</strong><span>Use Square activity to see what actually sells.</span></div><div class="garnish-sales-point"><strong>Accounts → context</strong><span>Bring MYOB into the same commercial picture.</span></div></div>';
 const footer=home.querySelector('.p2p-bottom');home.insertBefore(pitch,footer||null);
}
function apply(){addStories();addUnderlay();addHomePitch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,80));else setTimeout(apply,80);
new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true});
})();