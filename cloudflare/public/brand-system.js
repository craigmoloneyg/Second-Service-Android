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
.p2p-art{background:#E7EED8!important;border:1px solid #D0DBC3!important;border-radius:28px!important;min-height:430px!important}
.p2p-plate{background:#A8D92F!important;box-shadow:inset 0 0 0 13px #BCE74C,inset 0 0 0 15px #D9EF98!important}
.p2p-receipt{background:#F7F8E9!important;color:#0B4B3A!important;border:1px solid #C7D5B8!important}.p2p-paper-small{color:#557262!important}
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
.garnish-sales-underlay:after{content:'';position:absolute;right:24px;bottom:18px;width:170px;height:170px;background:url('/garnish-mark.svg?v=1') center/contain no-repeat;opacity:.92}
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
@media(max-width:640px){
  html,body{overflow-x:hidden!important}
  body{padding-top:104px!important}
  .p2p-bar{height:auto!important;min-height:104px!important;padding:12px 16px!important;gap:8px!important;align-items:flex-start!important}
  .p2p-brand{width:100%!important;min-width:0!important}
  .p2p-brand img{width:176px!important;max-width:70vw!important}
  .p2p-menu{width:100%!important;gap:4px!important;overflow-x:auto!important;padding-bottom:2px!important;justify-content:flex-start!important}
  .p2p-menu button{flex:0 0 auto!important;padding:8px 10px!important;font-size:11px!important}
  .p2p-home{padding:26px 16px 32px!important;width:100%!important}
  .p2p-hero{grid-template-columns:1fr!important;gap:24px!important}
  .p2p-home h1{font-size:46px!important;line-height:1!important;margin-bottom:18px!important}
  .p2p-intro{font-size:16px!important;line-height:1.65!important;margin-bottom:22px!important}
  .p2p-actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important}
  .p2p-actions button{width:100%!important}
  .p2p-art{min-height:300px!important;margin-top:4px!important}
  .p2p-section-title{margin:34px 0 16px!important;padding-top:20px!important;display:block!important}
  .p2p-section-title h2{font-size:26px!important;line-height:1.08!important;margin:0!important}
  .p2p-section-title span{display:block!important;margin-top:8px!important}
  .p2p-tiles{grid-template-columns:1fr!important;gap:12px!important}
  .p2p-tile{padding:18px!important}
  .p2p-number{margin-bottom:10px!important}
  .p2p-bottom{padding-top:20px!important;gap:6px!important}
  .main{padding:16px!important}
  .topbar{padding:14px!important;gap:12px!important;align-items:flex-start!important}
  .top-actions{width:100%!important;display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
  .top-actions .btn{width:100%!important}
  .p2p-mobile-nav{margin-top:10px!important}
  #p2p-page-host{margin-top:16px!important}
  .p2p-page-head{padding:20px!important;border-radius:18px!important;margin-bottom:12px!important}
  .p2p-page-head:after{width:130px!important;height:130px!important;right:-40px!important;top:-35px!important}
  .p2p-page-head h2{font-size:30px!important;line-height:1.05!important;margin:5px 0 8px!important;max-width:78%!important}
  .p2p-page-head p{font-size:14px!important;line-height:1.5!important;max-width:82%!important}
  .garnish-section-story{margin:0 0 14px!important;padding:12px 14px!important;font-size:14px!important}
  .card{padding:15px!important;border-radius:15px!important}
  .card-head{align-items:flex-start!important;gap:10px!important;margin-bottom:12px!important}
  .card-head>div:last-child{max-width:100%!important}
  .kpis,.grid-2,.grid-2.equal,.plan,#estimateResults{grid-template-columns:1fr!important;gap:10px!important}
  .garnish-sales-grid{grid-template-columns:1fr!important;gap:10px!important}
  .garnish-sales-underlay{padding:22px 18px!important;border-radius:18px!important;margin-top:18px!important}
  .garnish-sales-underlay h3{font-size:31px!important;line-height:1.05!important;margin-bottom:12px!important}
  .garnish-sales-underlay p{font-size:14px!important;line-height:1.6!important}
  .garnish-home-pitch{padding:22px 18px!important;border-radius:18px!important;margin-top:24px!important}
  .garnish-home-pitch h2{font-size:32px!important;line-height:1.05!important}
  .garnish-home-pitch p{font-size:14px!important;line-height:1.6!important}
  .garnish-sales-point{padding:14px!important}
  .table{display:block!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
  .recipe-head-fields{grid-template-columns:1fr!important}
  .recipe-ingredient-row{grid-template-columns:1fr!important}
  .recipe-ingredient-row .ingredientSelect,.recipe-ingredient-row .ingredientQty,.recipe-ingredient-row .ingredientUnit,.recipe-ingredient-row .removeRow{grid-column:1!important;width:100%!important}
  #menu-costing .grid-2.equal{gap:16px!important}
  #menu-costing [style*="display:flex"]{flex-wrap:wrap!important}
  #menu-costing #addIngredientBtn,#menu-costing #saveRecipeBtn{flex:1 1 100%!important;width:100%!important}
  #account-panel{margin:12px 0!important;max-width:none!important}
  #commercial-settings [style*="grid-template-columns"],#live-consultant [style*="grid-template-columns"],#consultant-admin-panel [style*="grid-template-columns"]{grid-template-columns:1fr!important}
  #myobImportBridge [style*="grid-template-columns"]{grid-template-columns:1fr!important}
  .pill{white-space:nowrap!important}
}

#square-pos #sqSub,
#square-pos #sqMsg,
#square-pos #sqStats .muted{color:#315D4C!important;font-weight:700!important}
#square-pos #sqStats strong{color:#083D30!important;font-size:22px!important;font-weight:900!important}
#square-pos #sqStats>div{background:#EDF2E3!important;border:1px solid #C5D4B5!important;border-radius:12px!important;padding:14px!important}
`;
document.head.appendChild(style);

const sideLogo=document.querySelector('.sidebar .logo img');if(sideLogo)sideLogo.src='/garnish-logo-inverse.svg';
const homeLogo=document.querySelector('.p2p-brand img');if(homeLogo)homeLogo.src='/garnish-logo.svg';

const stories={
 overview:'The dining room can be full and the margin can still be disappearing. Garnish turns the venue into a commercial control room so the numbers stop arriving after the opportunity to act has passed.',
 'profit-recovery':'Profit rarely vanishes in one obvious hit. It bleeds through supplier drift, labour creep, poor contribution and outdated costing. Garnish makes those leaks visible while there is still time to do something about them.',
 purchasing:'Every unchallenged supplier increase becomes part of your new normal. Garnish turns invoices into live ingredient intelligence so cost creep has somewhere to hide only if you let it.',
 labour:'A strong service can still be overstaffed. A quiet service can still be carrying yesterday\'s roster. Garnish puts labour beside trading reality so wage spend cannot hide behind overall turnover.',
 'menu-costing':'The menu is where margin is won or surrendered one plate at a time. Cost it against live supplier pricing and stop popular dishes from looking successful simply because they sell.',
 bar:'The bar can print money or quietly pour it away. Bring beverage purchasing, pour cost and stock variance into the same commercial picture as the kitchen.',
 analyst:'You do not need another report sitting unread. Ask the venue a commercial question in plain English and let Garnish interpret the evidence while the calculations stay deterministic.',
 consultant:'When software is not enough, keep the numbers and the human conversation in one place.',
 square:'Sales tell you what moved. Garnish helps show what those sales were actually worth. Connect Square so volume, price and contribution can be read together instead of celebrated separately.',
 workspace:'The operators moving fastest are the ones connecting the data instead of reconciling five systems by hand. Bring Square, MYOB, invoices, recipes and account data into one Garnish workspace.',
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
   box.innerHTML='<div class="eyebrow">Built by hospitality, not around it</div><h3>If you are still running the venue from disconnected reports, you are already behind.</h3><p>Garnish is informed by hospitality experience spanning Powerscourt\'s Gordon Ramsay operation, Marco Pierre White\'s Steakhouse and executive-level kitchen leadership. It was built around the pressure points operators actually live with: supplier prices moving without warning, labour climbing faster than sales, recipes costed once and forgotten, accounting arriving after the damage is done. Garnish pulls purchasing, recipes, sales, labour and accounting into one commercial command centre so you can see the leak while it is still a leak, not after it has become the month-end result. Code calculates the numbers. AI interprets the evidence. You stay in control of the decisions.</p><div class="garnish-sales-grid"><div class="garnish-sales-point"><strong>Cost every plate</strong><span>Supplier pricing changes? Garnish pushes that reality straight into ingredient and recipe cost so yesterday\'s margin does not masquerade as today\'s.</span></div><div class="garnish-sales-point"><strong>See the leak early</strong><span>High-volume dishes, supplier drift, labour pressure and weak contribution surface before they get buried in turnover.</span></div><div class="garnish-sales-point"><strong>One commercial picture</strong><span>Square, MYOB, invoices and recipes stop contradicting each other because Garnish brings them into the same operating view.</span></div><div class="garnish-sales-point"><strong>Move before everyone else</strong><span>The operator who sees the problem first gets the chance to fix it first. That is the edge Garnish is built to create.</span></div></div>';
   v.appendChild(box);
 });
}
function addHomePitch(){
 const home=document.querySelector('.p2p-home');if(!home||home.querySelector('.garnish-home-pitch'))return;
 const pitch=document.createElement('section');pitch.className='garnish-home-pitch';
 pitch.innerHTML='<div class="kicker">Why Garnish exists</div><h2>Busy is not the same as profitable. Turnover is not the same as control.</h2><p>Hospitality is brutal on anyone who sees the numbers too late. A venue can be full, the docket printer can be screaming, the bar can be three deep and the business can still be giving margin away service after service. Supplier invoices tell one story. Square tells another. MYOB tells another. Recipes sit in a folder. Labour lives in the roster. By the time someone stitches it together, the month is already gone. Garnish closes that gap. Built from experience inside serious hospitality operations, including Powerscourt\'s Gordon Ramsay operation and Marco Pierre White\'s Steakhouse, it brings the commercial picture forward into the working week. The point is not another dashboard. The point is seeing what is slipping before it becomes normal.</p><div class="garnish-sales-grid"><div class="garnish-sales-point"><strong>Invoices → live costs</strong><span>Supplier changes become commercial signals, not surprises discovered weeks later.</span></div><div class="garnish-sales-point"><strong>Recipes → real margins</strong><span>Know what each dish earns now, not what the spreadsheet said three months ago.</span></div><div class="garnish-sales-point"><strong>Sales → truth</strong><span>A best seller can still be a margin problem. Garnish shows the difference between volume and value.</span></div><div class="garnish-sales-point"><strong>Accounts → operating context</strong><span>Bring MYOB into the same view so financial reporting and day-to-day operation stop living in different worlds.</span></div></div>';
 const footer=home.querySelector('.p2p-bottom');home.insertBefore(pitch,footer||null);
}
function apply(){addStories();addUnderlay();addHomePitch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,80));else setTimeout(apply,80);
new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true});
})();