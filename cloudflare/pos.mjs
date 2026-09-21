const json=(x,s=200,h={})=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}});
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
const cookie=(r,n)=>(r.headers.get('cookie')||'').match(new RegExp('(?:^|;\\s*)'+n+'=([a-f0-9]{64})(?:;|$)'))?.[1];
export const hasKitchenCookie=r=>!!cookie(r,'garnish_kitchen');
const check=(x,m)=>{if(!x)throw Error(m);};
const text=(x,max=160)=>{check(typeof x==='string'&&x.trim().length<=max,'Check text length.');return x.trim();};
const empty=()=>({products:[],orders:[],requests:[]});
const publicOrder=o=>({id:o.id,number:o.number,table:o.table,notes:o.notes,orderType:o.orderType,status:o.status,createdAt:o.createdAt,statusAt:o.statusAt,version:o.version,items:o.items.map(i=>({name:i.name,qty:i.qty})),imported:!!o.imported});
export function orderInput(b,products){
 check(Array.isArray(b.items)&&b.items.length>0&&b.items.length<=100,'Add 1–100 items.');
 const items=b.items.map(i=>{const p=products.find(p=>p.id===i.id&&p.active);check(p,'An item is no longer available.');check(Number.isInteger(i.qty)&&i.qty>0&&i.qty<=999,'Check quantities.');return {id:p.id,name:p.name,price:p.price,qty:i.qty};});
 return {items,table:text(b.table||''),notes:text(b.notes||'',1000),orderType:['Dine in','Takeaway','Delivery'].includes(b.orderType)?b.orderType:'Dine in'};
}
export async function handlePOS(request,env){
 const db=env.DB,path=new URL(request.url).pathname,now=new Date().toISOString();
 if(!db)return json({error:'Order storage unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Use the Garnish form.'},403);
 try{
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_pos_books (owner_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS garnish_kitchen_devices (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,pair_hash TEXT,pair_expires TEXT,token_hash TEXT,expires TEXT,active INTEGER NOT NULL DEFAULT 1)').run();
 let b={};if(request.method==='POST'){const raw=await request.text();check(raw.length<=1500000,'Request too large.');b=JSON.parse(raw);}
 if(path==='/api/pos/pair'&&request.method==='POST'){
 check(/^[a-f0-9]{64}$/.test(b.token),'Invalid pairing link.');const token=hex(),hash=await digest(b.token);
 const row=await db.prepare('SELECT * FROM garnish_kitchen_devices WHERE pair_hash=? AND pair_expires>? AND active=1').bind(hash,now).first();
 if(!row)return json({error:'Pairing link expired or already used. Ask the owner for a new link.'},401);
 const result=await db.prepare('UPDATE garnish_kitchen_devices SET pair_hash=NULL,token_hash=?,expires=? WHERE id=? AND pair_hash=? AND active=1').bind(await digest(token),new Date(Date.now()+30*86400000).toISOString(),row.id,hash).run();
 if(result.meta.changes!==1)return json({error:'Link already used.'},409);
 const r=json({ok:true});for(const value of [`garnish_kitchen=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,'p2p_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0','p2p_workspace=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'])r.headers.append('Set-Cookie',value);return r;
 }
 let u=null,kitchen=false;const kt=cookie(request,'garnish_kitchen');
 if(kt){const d=await db.prepare('SELECT * FROM garnish_kitchen_devices WHERE token_hash=? AND expires>? AND active=1').bind(await digest(kt),now).first();if(d){u={id:d.owner_id};kitchen=true;}}
 else {const t=cookie(request,'p2p_auth');if(t)u=await db.prepare('SELECT a.id FROM garnish_sessions_v2 s JOIN garnish_accounts_v2 a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?').bind(t,now).first();}
 if(path==='/api/pos/logout'&&request.method==='POST'){if(kt)await db.prepare('UPDATE garnish_kitchen_devices SET active=0 WHERE token_hash=?').bind(await digest(kt)).run();return json({ok:true},200,{'Set-Cookie':'garnish_kitchen=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});}
 if(!u)return json({error:kt?'Kitchen access expired or revoked. Ask the owner to pair again.':'Sign in to your Garnish account first.'},401);
 if(kitchen&&!['/api/pos/state','/api/pos/status'].includes(path))return json({error:'Kitchen access only.'},403);
 if(path==='/api/pos/devices'&&request.method==='GET')return json({devices:(await db.prepare('SELECT id,name,active,expires FROM garnish_kitchen_devices WHERE owner_id=? ORDER BY rowid DESC LIMIT 100').bind(u.id).all()).results});
 if(path==='/api/pos/device'&&request.method==='POST'){
 const id=hex(),token=hex();await db.prepare('INSERT INTO garnish_kitchen_devices(id,owner_id,name,pair_hash,pair_expires) VALUES(?,?,?,?,?)').bind(id,u.id,text(b.name||'Kitchen screen'),await digest(token),new Date(Date.now()+900000).toISOString()).run();return json({url:new URL(request.url).origin+'/kitchen#pair='+token},201);
 }
 if(path==='/api/pos/revoke'&&request.method==='POST'){await db.prepare('UPDATE garnish_kitchen_devices SET active=0,pair_hash=NULL WHERE id=? AND owner_id=?').bind(String(b.id),u.id).run();return json({ok:true});}
 const row=await db.prepare('SELECT revision,data FROM garnish_pos_books WHERE owner_id=?').bind(u.id).first(),book=row?JSON.parse(row.data):empty(),revision=row?.revision||0;
 if(path==='/api/pos/state'&&request.method==='GET')return json({revision,kitchen,book:kitchen?{orders:book.orders.filter(o=>o.status!=='completed'&&o.status!=='cancelled').map(publicOrder)}:book});
 check(request.method==='POST','Unknown order route.');check(typeof b.request_id==='string'&&/^[\w-]{16,80}$/.test(b.request_id),'Request ID required.');
 if(book.requests.includes(b.request_id))return json({ok:true,duplicate:true});
 if(b.revision!==revision)return json({error:'Orders changed on another screen. Refresh and try again.'},409);
 if(path==='/api/pos/product'){
 const name=text(b.name);check(name.length>0,'Enter an item name.');check(Number.isSafeInteger(b.price)&&b.price>=0&&b.price<=10000000,'Enter a valid price.');check(book.products.length<1000,'Product limit reached.');book.products.push({id:crypto.randomUUID(),name,price:b.price,active:true});
 }else if(path==='/api/pos/hide-product'){const p=book.products.find(p=>p.id===b.id);check(p,'Item not found.');p.active=false;
 }else if(path==='/api/pos/order'){
 check(book.orders.length<5000,'Order storage limit reached. Export your orders and contact support.');book.orders.push({...orderInput(b,book.products),id:crypto.randomUUID(),number:String(book.orders.length+1001),status:'new',createdAt:now,statusAt:now,version:1,payment:'not_processed'});
 }else if(path==='/api/pos/status'){
 const o=book.orders.find(o=>o.id===b.id);check(o,'Order not found.');check(o.version===b.version,'This order changed. Refresh first.');
 const next={new:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['completed','preparing','cancelled'],completed:['new'],cancelled:[]};
 check(next[o.status]?.includes(b.status)&&(!kitchen||!['cancelled','new'].includes(b.status)),'This status change is not allowed.');o.status=b.status;o.statusAt=now;o.version++;
 }else if(path==='/api/pos/import'){
 check(book.orders.length===0&&book.products.length===0,'Import is only available into an empty shared POS. Your local data is unchanged.');
 const source=b.data;check(source?.version===1&&Array.isArray(source.products)&&Array.isArray(source.orders),'Choose the recovered POS export.');check(source.products.length<=1000&&source.orders.length<=5000,'Import is too large.');
 const price=x=>{check(typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100000,'Invalid imported price.');return Math.round(x*100);};
 const ids=new Set();book.products=source.products.map(p=>{const id=text(p.id);check(id&&!ids.has(id),'Duplicate product ID.');ids.add(id);return {id,name:text(p.name),price:price(p.price),active:p.active!==false};});
 ids.clear();book.orders=source.orders.map(o=>{const id=text(o.id);check(id&&!ids.has(id),'Duplicate order ID.');ids.add(id);check(Array.isArray(o.items)&&o.items.length>0&&o.items.length<=100,'Invalid imported order.');check(['new','preparing','ready','completed'].includes(o.status),'Invalid imported status.');check(Number.isFinite(Date.parse(o.createdAt)),'Invalid order date.');return {id,number:text(String(o.number)),table:text(o.table||''),notes:text(o.notes||'',1000),orderType:text(o.orderType||'Dine in'),createdAt:new Date(o.createdAt).toISOString(),statusAt:now,status:o.status,version:1,imported:true,payment:'legacy_unverified',items:o.items.map(i=>{check(Number.isInteger(i.qty)&&i.qty>0&&i.qty<=999,'Invalid quantity.');return {id:text(i.id||''),name:text(i.name),price:price(i.price),qty:i.qty};})};});
 }else return json({error:'Unknown order route.'},404);
 book.requests.push(b.request_id);check(book.requests.length<=20000,'Record limit reached.');const data=JSON.stringify(book);check(data.length<=2000000,'Order storage limit reached.');
 const result=revision?await db.prepare('UPDATE garnish_pos_books SET data=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(data,u.id,revision).run():await db.prepare('INSERT OR IGNORE INTO garnish_pos_books(owner_id,revision,data) VALUES(?,1,?)').bind(u.id,data).run();
 return result.meta.changes===1?json({ok:true,revision:revision+1}):json({error:'Another save arrived first. Refresh and try again.'},409);
 }catch(e){return json({error:/SQLITE|D1_|no such table/i.test(e.message)?'Order storage unavailable.':e instanceof SyntaxError?'Invalid form data.':e.message},400);}
}
