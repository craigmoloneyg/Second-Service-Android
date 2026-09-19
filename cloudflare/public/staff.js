(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let invite=new URLSearchParams(location.hash.slice(1)).get('invite'),openShift=null,serverOffset=0,busy=false;
const venue=new URLSearchParams(location.search).get('venue')||'';$('signin').elements.venue.value=venue;
if(invite){history.replaceState({},'',location.pathname+location.search);$('login').hidden=true;$('activate').hidden=false;}
const message=(text,error=false)=>{$('message').textContent=text;$('message').classList.toggle('error',error);};
const duration=seconds=>{const minutes=Math.floor(Math.max(0,seconds)/60);return Math.floor(minutes/60)+'h '+String(minutes%60).padStart(2,'0')+'m';};
const when=stamp=>new Date(stamp).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'});
async function api(path,body){const response=await fetch('/api/staff/'+path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){if(response.status===401)clear();throw new Error(data.error||'Could not complete that action.');}return data;}
function clear(){openShift=null;$('workspace').hidden=true;$('login').hidden=false;$('hours').textContent='';$('profile').reset();$('welcome').textContent='';}
function render(data){$('login').hidden=true;$('activate').hidden=true;$('workspace').hidden=false;$('welcome').textContent=data.profile.name;for(const [key,value]of Object.entries(data.profile))if($('profile').elements[key])$('profile').elements[key].value=value||'';serverOffset=Date.parse(data.server_time)-Date.now();openShift=data.shifts.find(s=>!s.end_at)||null;
 $('clock-status').textContent=openShift?'You are clocked in':'You are clocked out';$('clock-since').textContent=openShift?'Started '+when(openShift.start_at):'Ready for your next shift?';$('clock').textContent=openShift?'Clock out':'Clock in';$('clock').classList.toggle('out',Boolean(openShift));tick();
 $('hours').innerHTML=data.shifts.length?data.shifts.map(s=>`<tr><td>${esc(when(s.start_at))}</td><td>${s.end_at?esc(when(s.end_at))+(s.end_source==='manager'?' (manager)':''):'In progress'}</td><td>${esc(duration(s.seconds))}</td></tr>`).join(''):'<tr><td colspan="3">No hours logged yet.</td></tr>';
 $('total').textContent='Completed time shown: '+duration(data.shifts.filter(s=>s.end_at).reduce((sum,s)=>sum+s.seconds,0));
}
async function refresh(){render(await api('me'));}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){message(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
function tick(){$('elapsed').textContent=openShift?duration((Date.now()+serverOffset-Date.parse(openShift.start_at))/1000):'—';}
$('signin').onsubmit=e=>{e.preventDefault();action(async()=>{await api('signin',Object.fromEntries(new FormData(e.target)));e.target.elements.password.value='';await refresh();message('Signed in.');});};
$('activation').onsubmit=e=>{e.preventDefault();action(async()=>{const values=Object.fromEntries(new FormData(e.target));if(values.password!==values.confirm)throw new Error('The passwords do not match.');await api('activate',{invite,password:values.password});invite=null;e.target.reset();await refresh();message('Your staff sign-in is ready.');});};
$('clock').onclick=()=>action(async()=>{const closing=Boolean(openShift);await api(closing?'clock-out':'clock-in',{});await refresh();message(closing?'Clocked out. Your hours have been saved.':'Clocked in. Have a good shift.');});
$('profile').onsubmit=e=>{e.preventDefault();action(async()=>{await api('profile',Object.fromEntries(new FormData(e.target)));await refresh();message('Your details have been saved.');});};
$('signout').onclick=()=>action(async()=>{await api('signout',{});clear();message('Signed out.');});
$('refresh').onclick=()=>action(async()=>{await refresh();message('Hours refreshed.');});
setInterval(tick,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('workspace').hidden)action(refresh);});
if(!invite)refresh().catch(()=>{});
})();
