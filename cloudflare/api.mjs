// Public workspaces never query the legacy owner tables.
const reply = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const blank = () => ({ingredients:[],recipes:[],invoices:[],plans:[]});
async function workspace(env, id) {
  if (!env.DB) throw new Error('Workspace storage is unavailable. Please try again later.');
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS p2p_private_workspaces (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL)').run();
  const row = await env.DB.prepare('SELECT revision,data FROM p2p_private_workspaces WHERE id=?').bind(id).first();
  if (!row) return {data:blank(),revision:0};
  return {data:JSON.parse(row.data),revision:row.revision};
}
async function save(env,id,record) {
  const data=JSON.stringify(record.data);
  if(data.length>900000) throw new Error('This workspace is full. Export your records before adding more.');
  let result;
  if(!record.revision) result=await env.DB.prepare('INSERT OR IGNORE INTO p2p_private_workspaces (id,revision,data) VALUES (?,1,?)').bind(id,data).run();
  else result=await env.DB.prepare('UPDATE p2p_private_workspaces SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(data,id,record.revision).run();
  if(result.meta?.changes!==1) throw new Error('Another update arrived. Please try this action again.');
}
function costRecipe(recipe,ingredients) {
  const items=recipe.items.map(item=>{
    const ingredient=ingredients.find(i=>i.id===item.ingredient_id);
    if(!ingredient) throw new Error('Choose an ingredient from this workspace.');
    const scale={kg:['g',1000],g:['g',1],l:['ml',1000],ml:['ml',1],each:['each',1]};
    const conversion=item.unit===ingredient.base_unit?1:scale[item.unit]?.[0]===ingredient.base_unit?scale[item.unit][1]:null;
    return {...ingredient,...item,cost:conversion===null?null:item.quantity*conversion*ingredient.base_unit_cost,conversion_ok:conversion!==null};
  });
  const complete=items.every(i=>i.cost!==null);
  const batch=complete?items.reduce((sum,i)=>sum+i.cost,0):null;
  const portion=batch===null?null:batch/recipe.yield_portions;
  return {...recipe,items,batch_cost:batch,portion_cost:portion,food_cost_pct:portion!==null&&recipe.selling_price>0?portion/recipe.selling_price*100:null,gross_profit:portion===null?null:recipe.selling_price-portion,target_price_28:portion===null?null:portion/.28,target_price_30:portion===null?null:portion/.30};
}

async function ensureAuthTables(env){
  if(!env.DB) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS p2p_accounts (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,workspace_id TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS p2p_sessions (token TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires_at TEXT NOT NULL)").run();
}
const tokenHex = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2,"0")).join("");
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
async function hashPassword(password,salt){ const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]); const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:120000,hash:"SHA-256"},key,256); return b64(bits); }
async function authUser(env,cookie){
  const token=cookie.match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token||!env.DB) return null;
  const row=await env.DB.prepare("SELECT a.id,a.email,a.workspace_id,s.expires_at FROM p2p_sessions s JOIN p2p_accounts a ON a.id=s.account_id WHERE s.token=?").bind(token).first();
  if(!row||Date.parse(row.expires_at)<=Date.now()) return null;
  return row;
}
async function authApi(request,env,action){
  if(!env.DB) return reply({error:"Account storage is not configured yet."},503);
  if(action==="signout") return reply({ok:true},200,{"Set-Cookie":"p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"});
  let body={}; try{body=await request.json();}catch{}
  const email=String(body.email||"").trim().toLowerCase(), password=String(body.password||"");
  if(!/^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email)) return reply({error:"Enter a valid email address."},400);
  if(password.length<10||password.length>200) return reply({error:"Use a password between 10 and 200 characters."},400);
  if(action==="signup"){
    const existing=await env.DB.prepare("SELECT id FROM p2p_accounts WHERE email=?").bind(email).first();
    if(existing) return reply({error:"An account with that email already exists. Sign in instead."},409);
    const id=tokenHex(), salt=tokenHex(), workspaceId=tokenHex(), hash=await hashPassword(password,salt), now=new Date().toISOString();
    await env.DB.prepare("INSERT INTO p2p_accounts (id,email,password_hash,password_salt,workspace_id,created_at) VALUES (?,?,?,?,?,?)").bind(id,email,hash,salt,workspaceId,now).run();
    const token=tokenHex(), expires=new Date(Date.now()+2592000000).toISOString();
    await env.DB.prepare("INSERT INTO p2p_sessions (token,account_id,expires_at) VALUES (?,?,?)").bind(token,id,expires).run();
    return reply({ok:true,email},200,{"Set-Cookie":"p2p_auth="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000"});
  }
  const account=await env.DB.prepare("SELECT * FROM p2p_accounts WHERE email=?").bind(email).first();
  if(!account||!(await hashPassword(password,account.password_salt)===account.password_hash)) return reply({error:"Email or password is incorrect."},401);
  const token=tokenHex(), expires=new Date(Date.now()+2592000000).toISOString();
  await env.DB.prepare("INSERT INTO p2p_sessions (token,account_id,expires_at) VALUES (?,?,?)").bind(token,account.id,expires).run();
  return reply({ok:true,email},200,{"Set-Cookie":"p2p_auth="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000"});
}
export async function api(request,env,extractInvoice,deriveBaseCost,outputText) {
  const url=new URL(request.url);
  await ensureAuthTables(env);
  if(url.pathname==='/api/auth/signup') return authApi(request,env,'signup');
  if(url.pathname==='/api/auth/signin') return authApi(request,env,'signin');
  if(url.pathname==='/api/auth/signout') return authApi(request,env,'signout');
  const origin=url.origin;
  if(request.method!=='GET'&&request.headers.get('origin')&&request.headers.get('origin')!==origin) return reply({error:'Request origin is not allowed.'},403);
  const cookie=request.headers.get('cookie')||'';
  let id=cookie.match(/(?:^|;\s*)p2p_workspace=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(url.pathname==='/api/session') {
    if(!id) id=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
    return reply({ok:true},200,{'Set-Cookie':`p2p_workspace=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`});
  }
  if(url.pathname==='/api/health') return reply({ok:true,version:'private-workspaces-1'});
  if(!id) return reply({error:'Please reopen the app to start your private workspace.'},401);
  try {
    const record=await workspace(env,id), data=record.data;
    if(url.pathname==='/api/profit-recovery'&&request.method==='GET') {
      let square=null;
      try {
        const row=await env.DB.prepare('SELECT snapshot,last_sync_at,environment FROM p2p_square_connections WHERE workspace_id=?').bind(id).first();
        if(row?.snapshot) square={...JSON.parse(row.snapshot),last_sync_at:row.last_sync_at,environment:row.environment};
      } catch {}
      const now=Date.now(), cutoff=now-30*86400000;
      const invoices=(data.invoices||[]);
      const invoice30=invoices.filter(inv=>{const t=Date.parse(inv.document_date||'');return Number.isFinite(t)&&t>=cutoff;});
      const invoiceSpend30=invoice30.reduce((s,inv)=>s+(Number(inv.total)||0),0);
      const allInvoiceSpend=invoices.reduce((s,inv)=>s+(Number(inv.total)||0),0);

      const priceSeries=new Map();
      for(const inv of invoices){
        const ts=Date.parse(inv.document_date||'')||0;
        for(const item of inv.line_items||[]){
          if(!item.description||item.unit_price==null) continue;
          const key=String(item.description).trim().toLowerCase();
          if(!priceSeries.has(key)) priceSeries.set(key,[]);
          priceSeries.get(key).push({name:item.description,supplier:inv.supplier_or_source||'',price:Number(item.unit_price),date:inv.document_date||'',ts});
        }
      }
      const supplierMoves=[];
      for(const points of priceSeries.values()){
        const clean=points.filter(p=>Number.isFinite(p.price)).sort((a,b)=>a.ts-b.ts);
        if(clean.length<2) continue;
        const first=clean[0],last=clean[clean.length-1];
        if(first.price===0) continue;
        const pct=(last.price-first.price)*100/first.price;
        if(Math.abs(pct)<0.01) continue;
        supplierMoves.push({name:last.name,supplier:last.supplier,from:first.price,to:last.price,change_pct:pct,first_date:first.date,last_date:last.date});
      }
      supplierMoves.sort((a,b)=>Math.abs(b.change_pct)-Math.abs(a.change_pct));

      const sales=square?.top_items||[];
      const mapped=sales.filter(x=>x.recipe_id&&x.total_food_cost!=null);
      const mappedSales=mapped.reduce((s,x)=>s+(Number(x.net_sales_cents)||0)/100,0);
      const mappedCost=mapped.reduce((s,x)=>s+(Number(x.total_food_cost)||0),0);
      const mappedContribution=mappedSales-mappedCost;
      const mappedFoodCostPct=mappedSales>0?mappedCost*100/mappedSales:null;
      const targetPct=30;
      const leaks=mapped.map(x=>{
        const revenue=(Number(x.net_sales_cents)||0)/100,cost=Number(x.total_food_cost)||0;
        const excess=Math.max(0,cost-revenue*targetPct/100);
        return {
          name:x.name,recipe_name:x.recipe_name,quantity:Number(x.quantity)||0,revenue,food_cost:cost,
          food_cost_pct:revenue>0?cost*100/revenue:null,contribution:revenue-cost,recoverable_to_30pct:excess
        };
      }).filter(x=>x.recoverable_to_30pct>0).sort((a,b)=>b.recoverable_to_30pct-a.recoverable_to_30pct);
      const recoverable=leaks.reduce((s,x)=>s+x.recoverable_to_30pct,0);
      const totalSales=(Number(square?.net_sales_30d_cents)||0)/100;
      const mappedShare=totalSales>0?mappedSales*100/totalSales:0;
      const unmappedSales=Math.max(0,totalSales-mappedSales);
      const orders=Number(square?.orders_30d)||0;
      return reply({
        period_days:30,
        square_connected:Boolean(square),
        square_last_sync_at:square?.last_sync_at||null,
        revenue_30d:totalSales,
        orders_30d:orders,
        average_order_value:orders?totalSales/orders:null,
        invoice_spend_30d:invoiceSpend30,
        invoice_count_30d:invoice30.length,
        invoice_spend_all_time:allInvoiceSpend,
        invoice_count_all_time:invoices.length,
        mapped_sales_30d:mappedSales,
        mapped_sales_share_pct:mappedShare,
        unmapped_sales_30d:unmappedSales,
        estimated_food_cost_30d:mappedCost,
        estimated_food_cost_pct:mappedFoodCostPct,
        contribution_30d:mappedContribution,
        recoverable_to_30pct_30d:recoverable,
        target_food_cost_pct:targetPct,
        leaks:leaks.slice(0,12),
        supplier_moves:supplierMoves.slice(0,12),
        top_items:sales.slice(0,12).map(x=>({name:x.name,quantity:x.quantity,net_sales:(Number(x.net_sales_cents)||0)/100,food_cost_pct:x.actual_food_cost_pct,contribution:x.contribution,recipe_name:x.recipe_name||null}))
      });
    }
    if(url.pathname==='/api/ingredients'&&request.method==='GET') return reply({ingredients:data.ingredients});
    if(url.pathname==='/api/recipes'&&request.method==='GET') return reply({recipes:data.recipes.map(r=>costRecipe(r,data.ingredients))});
    if(url.pathname==='/api/purchasing/alerts') return reply({alerts:[]});
    if(url.pathname==='/api/report'&&request.method==='GET') {
      const lines=['Price 2 Plate report',new Date().toISOString(),'Only this workspace is included. Sales and labour have not been imported.',`Invoices: ${data.invoices.length}`,`Ingredients: ${data.ingredients.length}`,`Recipes: ${data.recipes.length}`,'', 'INGREDIENTS',...data.ingredients.map(i=>`${i.display_name}: ${i.base_unit_cost} AUD/${i.base_unit}`),'','RECIPES',...data.recipes.map(r=>{const c=costRecipe(r,data.ingredients);return `${r.name}: portion ${c.portion_cost??'Unknown'} AUD; selling ${r.selling_price} AUD`; }),'','ACTION PLANS',...data.plans.map(p=>JSON.stringify(p))];
      return new Response(lines.join('\r\n'),{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="Price-2-Plate-report.txt"','Cache-Control':'no-store'}});
    }
    if(url.pathname==='/api/invoice/extract'&&request.method==='POST') {
      const response=await extractInvoice(request,{...env,DB:null});
      const result=await response.json();
      if(!response.ok) return reply(result,response.status);

      const fingerprint=[
        String(result.supplier_or_source||'').trim().toLowerCase(),
        String(result.document_number||'').trim().toLowerCase(),
        String(result.document_date||'').trim(),
        String(result.total??'')
      ].join('|');

      let invoiceId=null, saved=false;
      for(let attempt=0;attempt<8&&!saved;attempt++){
        const fresh=await workspace(env,id);
        const d=fresh.data;
        const duplicate=(d.invoices||[]).find(inv=>[
          String(inv.supplier_or_source||'').trim().toLowerCase(),
          String(inv.document_number||'').trim().toLowerCase(),
          String(inv.document_date||'').trim(),
          String(inv.total??'')
        ].join('|')===fingerprint && fingerprint!=='|||');

        if(duplicate){
          invoiceId=duplicate.id;
          saved=true;
          break;
        }

        invoiceId=crypto.randomUUID();
        d.invoices.push({id:invoiceId,...result});

        for(const item of result.line_items||[]) {
          if(!item.description||item.unit_price==null) continue;
          const calc=deriveBaseCost(item.description,item.unit,item.unit_price);
          const key=item.description.trim().toLowerCase();
          let ingredient=d.ingredients.find(i=>i.normalized_key===key);
          if(!ingredient) {
            ingredient={id:Math.max(0,...d.ingredients.map(i=>i.id))+1,normalized_key:key};
            d.ingredients.push(ingredient);
          }
          Object.assign(ingredient,{
            display_name:item.description,
            supplier:result.supplier_or_source,
            invoice_unit:item.unit,
            base_unit:calc.baseUnit,
            base_unit_cost:calc.baseCost,
            current_unit_price:item.unit_price,
            last_invoice_date:result.document_date||null
          });
        }

        try{
          await save(env,id,fresh);
          saved=true;
        }catch(error){
          if(attempt===7) throw error;
          await new Promise(r=>setTimeout(r,40+attempt*50));
        }
      }

      return reply({...result,saved:true,invoice_id:invoiceId});
    }
    if(url.pathname==='/api/recipes'&&request.method==='POST') {
      const body=await request.json();
      const recipe={id:Math.max(0,...data.recipes.map(r=>r.id))+1,name:String(body.name||'').trim(),selling_price:Number(body.selling_price),yield_portions:Number(body.yield_portions),items:body.items};
      if(!recipe.name||!Number.isFinite(recipe.selling_price)||recipe.selling_price<0||!Number.isFinite(recipe.yield_portions)||recipe.yield_portions<=0||!Array.isArray(recipe.items)||!recipe.items.length||recipe.items.some(i=>!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0)) return reply({error:'Check the dish name, price, yield and ingredient quantities.'},400);
      recipe.items=recipe.items.map(i=>({...i,ingredient_id:Number(i.ingredient_id),quantity:Number(i.quantity)}));
      const costed=costRecipe(recipe,data.ingredients);data.recipes.push(recipe);await save(env,id,record);return reply({recipe:costed},201);
    }
    if(/^\/api\/recipes\/\d+$/.test(url.pathname)&&request.method==='DELETE') {data.recipes=data.recipes.filter(r=>r.id!==Number(url.pathname.split('/').pop()));await save(env,id,record);return reply({ok:true});}
    if(url.pathname==='/api/action-plans'&&request.method==='GET') return reply({plans:data.plans});
    if(url.pathname==='/api/action-plans'&&request.method==='POST') {const body=await request.json();const plan={id:crypto.randomUUID(),title:String(body.title||'Recovery checklist').slice(0,160),created_at:new Date().toISOString(),status:'draft',steps:Array.isArray(body.steps)?body.steps.slice(0,20):[],note:'General checklist; validate against your own records.'};data.plans.push(plan);await save(env,id,record);return reply({plan,saved:true},201);}
    if(url.pathname==='/api/ai/advice'&&request.method==='POST') {
      const body=await request.json(); const question=String(body.question||'').trim();
      if(!question||question.length>3000) return reply({error:'Enter a question of up to 3,000 characters.'},400);
      if(!env.OPENAI_API_KEY) return reply({error:'The analyst service needs its API key configured.'},503);

      let square=null;
      try{
        const row=await env.DB.prepare('SELECT snapshot,last_sync_at,environment FROM p2p_square_connections WHERE workspace_id=?').bind(id).first();
        if(row?.snapshot) square={...JSON.parse(row.snapshot),last_sync_at:row.last_sync_at,environment:row.environment};
      }catch{}

      const recentInvoices=(data.invoices||[])
        .slice()
        .sort((a,b)=>(Date.parse(b.document_date||'')||0)-(Date.parse(a.document_date||'')||0))
        .slice(0,75)
        .map(inv=>({
          supplier:inv.supplier_or_source||null,
          invoice_number:inv.document_number||null,
          invoice_date:inv.document_date||null,
          subtotal:inv.subtotal??null,
          tax:inv.tax??null,
          total:inv.total??null,
          line_items:(inv.line_items||[]).slice(0,120).map(x=>({
            description:x.description||null,
            quantity:x.quantity??null,
            unit:x.unit||null,
            unit_price:x.unit_price??null,
            line_total:x.line_total??null,
            category:x.category||null
          }))
        }));

      const analystContext={
        question,
        area:String(body.area||'profit'),
        invoice_count:(data.invoices||[]).length,
        invoices:recentInvoices,
        ingredients:(data.ingredients||[]).slice(0,300),
        recipes:(data.recipes||[]).slice(0,100).map(r=>costRecipe(r,data.ingredients||[])),
        square:square?{
          environment:square.environment,
          last_sync_at:square.last_sync_at,
          orders_30d:square.orders_30d,
          net_sales_30d_cents:square.net_sales_30d_cents,
          locations:square.locations,
          profitability:square.profitability,
          top_items:(square.top_items||[]).slice(0,100)
        }:null
      };

      const response=await fetch('https://api.openai.com/v1/responses',{
        method:'POST',
        signal:AbortSignal.timeout(55000),
        headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:env.OPENAI_MODEL||'gpt-5.6-luna',
          instructions:'You are the Price 2 Plate restaurant operations analyst. The supplied JSON is the source of truth and now includes invoice headers, invoice line items, ingredient costs, recipes and Square sales when available. Use the actual invoice and Square evidence in your answer. Cite concrete supplier names, products, prices, quantities, sales and margins from the supplied data when relevant. Distinguish measured facts from interpretation. Code calculates financial metrics; you interpret them. Never invent missing figures. If a requested figure is unavailable, say exactly which record is missing. Return concise plain text.',
          input:JSON.stringify(analystContext),
          max_output_tokens:2600
        })
      });
      let result; try {result=await response.json();}catch{return reply({error:'The analyst service returned an unreadable response. Please retry.'},502);}
      if(!response.ok) return reply({error:response.status===429?'The analyst service is at its usage limit. Please retry later.':'The analyst provider could not process this request. Check its model and API configuration.'},502);
      const answer=outputText(result);if(!answer) return reply({error:'The analyst returned no answer. Please try a shorter question.'},502);
      return reply({advice:{summary:answer,opportunities:[],measurement:'Compare the same service period after each operational change.'},context:{invoice_count:(data.invoices||[]).length,square_connected:Boolean(square)}});
    }
    return reply({error:'This feature is not available yet.'},404);
  }catch(error){return reply({error:error instanceof SyntaxError?'The request could not be read. Please refresh and try again.':error.name==='TimeoutError'?'The analyst took too long. Please retry.':'The action could not be completed. Please retry; your existing records are unchanged.'},500);}
}

