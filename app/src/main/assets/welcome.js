undefined


(()=>{
 if(location.origin!=="https://second-service-profit-intelligence.craig-moloneyg.workers.dev")return;
 const b=document.getElementById("accountBtn"),p=document.getElementById("account-panel"),f=document.getElementById("account-form"); if(!b||!p||!f)return;
 let signup=true; const title=document.getElementById("account-title"),submit=document.getElementById("account-submit"),toggle=document.getElementById("account-toggle"),msg=document.getElementById("account-message");
 const setMode=()=>{title.textContent=signup?"Create your account":"Sign in";submit.textContent=signup?"Create account":"Sign in";toggle.textContent=signup?"Already have an account? Sign in":"Need an account? Create one";document.getElementById("account-password").autocomplete=signup?"new-password":"current-password";};
 async function refresh(){try{const r=await fetch("/api/session",{credentials:"same-origin"}),d=await r.json();if(d.authenticated){b.textContent="Sign out · "+d.email;b.dataset.authenticated="1";}else{b.textContent="Sign in";delete b.dataset.authenticated;}}catch{}}
 b.addEventListener("click",async()=>{if(b.dataset.authenticated){await fetch("/api/auth/signout",{method:"POST",credentials:"same-origin"});location.reload();}else p.hidden=!p.hidden;});
 toggle.addEventListener("click",()=>{signup=!signup;setMode();msg.textContent="";});
 f.addEventListener("submit",async e=>{e.preventDefault();msg.textContent="Working…";const body={email:document.getElementById("account-email").value,password:document.getElementById("account-password").value};try{const r=await fetch(signup?"/api/auth/signup":"/api/auth/signin",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok){msg.textContent=d.error||"Could not complete that request.";return;}location.reload();}catch{msg.textContent="Could not reach the account service. Please try again.";}});
 setMode();refresh();
})();