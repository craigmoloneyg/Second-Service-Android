import {emptyBook,settings,transaction,payroll,report,date,requireValue} from './accounting-core.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function user(request,env){
  const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)p2p_auth=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)return null;
  return env.DB.prepare('SELECT a.id,a.workspace_id FROM garnish_sessions_v2 s JOIN garnish_accounts_v2 a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>?').bind(token,new Date().toISOString()).first();
}
export async function handleAccounting(request,env){
  const url=new URL(request.url);
  if(!env.DB)return json({error:'Accounting storage is unavailable.'},503);
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json')))
    return json({error:'Use the accounting form in Garnish to save records.'},403);
  let u;
  try{u=await user(request,env);}catch{return json({error:'Sign in to your Garnish account before opening Accounting.'},401);}
  if(!u)return json({error:'Sign in to your Garnish account before opening Accounting.'},401);
  try{
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS garnish_accounting_v1 (account_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL)').run();
    const row=await env.DB.prepare('SELECT revision,data FROM garnish_accounting_v1 WHERE account_id=?').bind(u.id).first();
    const book=row?JSON.parse(row.data):emptyBook(), revision=row?.revision||0;
    if(url.pathname==='/api/accounting/state'&&request.method==='GET')return json({book,revision});
    if(url.pathname==='/api/accounting/report'&&request.method==='GET')return json(report(book,url.searchParams.get('start'),url.searchParams.get('end')));
    if(url.pathname==='/api/accounting/invoices'&&request.method==='GET'){
      const source=await env.DB.prepare('SELECT data FROM p2p_private_workspaces WHERE id=?').bind(u.workspace_id).first();
      const invoices=source?JSON.parse(source.data).invoices||[]:[];
      return json({invoices:invoices.map(i=>({id:i.id,contact:i.supplier_or_source,reference:i.document_number,date:i.document_date,total:i.total,tax:i.tax}))});
    }
    if(url.pathname==='/api/accounting/payroll-preview'&&request.method==='POST'){
      const raw=await request.text();if(raw.length>50000)return json({error:'Pay record is too large.'},413);
      return json({preview:payroll(JSON.parse(raw))});
    }
    if(url.pathname!=='/api/accounting/state'||request.method!=='POST')return json({error:'Accounting route not found.'},404);
    const raw=await request.text();if(raw.length>100000)return json({error:'Save one record at a time.'},413);
    const body=JSON.parse(raw);
    requireValue(typeof body.request_id==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(body.request_id),'A request reference is required. Refresh the page.');
    if(book.audit.some(a=>a.request_id===body.request_id))return json({ok:true,revision,duplicate:true});
    if(body.revision!==revision)return json({error:'Accounting changed in another tab. Refresh before saving again.'},409);
    requireValue(book.audit.length<10000,'This accounting book has reached its first-release record limit. Export it before continuing.');
    const now=new Date().toISOString(), id=crypto.randomUUID(), input=body.input||{};
    let recordId=null;
    if(body.action==='settings'){
      const next=settings(input);
      requireValue(!book.transactions.length || next.gst_registered===book.settings.gst_registered,'GST registration cannot be changed after posting transactions in this release.');
      book.settings=next;
    }else if(body.action==='transaction'){
      const t=transaction(input,book.settings);
      requireValue(!book.transactions.some(x=>!x.reversal_of&&x.kind===t.kind&&x.contact.toLowerCase()===t.contact.toLowerCase()&&x.reference.toLowerCase()===t.reference.toLowerCase()),'That document reference already exists for this contact.');
      book.transactions.push({...t,id,created_at:now});recordId=id;
    }else if(body.action==='settle'){
      const t=book.transactions.find(t=>t.id===input.id);
      requireValue(t&&!t.paid_date&&!t.reversed_by&&!t.reversal_of,'Choose an unpaid, active transaction.');
      t.paid_date=date(input.paid_date);requireValue(t.paid_date>=t.date,'Payment date must not precede the document date.');recordId=t.id;
    }else if(body.action==='payroll'){
      requireValue(book.settings,'Save accounting settings first.');
      const p=payroll(input);requireValue(p.verified,'Confirm you checked rates, PAYG, super and the actual payment before saving.');
      requireValue(p.reference,'Enter a pay reference.');
      requireValue(!book.payroll.some(x=>!x.reversal_of&&x.employee.toLowerCase()===p.employee.toLowerCase()&&x.reference.toLowerCase()===p.reference.toLowerCase()),'This pay reference already exists for the employee.');
      book.payroll.push({...p,id,created_at:now});recordId=id;
    }else if(body.action==='reverse'){
      const collection=input.collection==='transactions'?book.transactions:input.collection==='payroll'?book.payroll:null;
      const item=collection?.find(x=>x.id===input.id);
      requireValue(item&&!item.reversed_by&&!item.reversal_of,'Choose an active original record.');
      const when=date(input.date);requireValue(when>=(item.paid_date||item.date),'Reversal date must not precede the original posting/payment.');
      const reason=String(input.reason||'').trim();requireValue(reason.length>=5&&reason.length<=160,'Enter a reversal reason (5–160 characters).');
      const reversed={...item,id,reversal_of:item.id,created_at:now,reference:'Reversal: '+item.reference,reason};
      if(input.collection==='transactions'){
        reversed.kind={sale:'sale_refund',sale_refund:'sale',purchase:'purchase_refund',purchase_refund:'purchase'}[item.kind];
        reversed.date=when;reversed.paid_date=item.paid_date?when:null;
      }else reversed.paid_date=when;
      item.reversed_by=id;collection.push(reversed);recordId=id;
    }else throw new Error('Choose a supported accounting action.');
    book.audit.push({id,request_id:body.request_id,action:body.action,record_id:recordId,at:now,
      ...(body.action==='settings'?{settings:book.settings}:{})});
    const data=JSON.stringify(book);if(data.length>2000000)return json({error:'The book has reached its first-release storage limit. Export it before continuing.'},413);
    const result=revision?
      await env.DB.prepare('UPDATE garnish_accounting_v1 SET data=?,revision=revision+1 WHERE account_id=? AND revision=?').bind(data,u.id,revision).run():
      await env.DB.prepare('INSERT OR IGNORE INTO garnish_accounting_v1 (account_id,revision,data) VALUES (?,1,?)').bind(u.id,data).run();
    if(result.meta?.changes!==1)return json({error:'Another save arrived first. Refresh before trying again.'},409);
    return json({ok:true,revision:revision+1,record_id:recordId},201);
  }catch(error){
    if(error instanceof SyntaxError)return json({error:'The accounting data was not valid JSON.'},400);
    if(/D1_|SQLITE|no such table/i.test(error.message)){console.error('Accounting storage error');return json({error:'Accounting storage is temporarily unavailable.'},503);}
    return json({error:error.message||'Accounting action failed.'},400);
  }
}
