const {test}=require('node:test');const assert=require('node:assert/strict');
test('document CSV import is account-scoped and saved without an AI call',async()=>{
 const {handleCommercial}=await import('../cloudflare/commercial.mjs');const writes=[];
 const DB={prepare(sql){let params=[];return {bind(...v){params=v;return this;},async run(){if(sql.startsWith('INSERT INTO garnish_document_imports'))writes.push(params);return {};},async first(){if(sql.includes('garnish_sessions_v2'))return {id:'account-a',email:'test@example.com',workspace_id:'workspace-a'};if(sql.includes('p2p_subscriptions'))return {status:'active',plan:'regular'};return null;}};}};
 const request=new Request('https://example.com/api/documents/import',{method:'POST',headers:{cookie:'p2p_auth='+'a'.repeat(64),'x-filename':'Accounts%20September.csv','content-type':'text/csv'},body:'Account,Amount\nSales,12.34\nWages,-5.00'});
 const response=await handleCommercial(request,{DB});assert.equal(response.status,201);
 const result=await response.json();assert.equal(result.extracted.tables[0].rows.length,2);assert.equal(result.filename,'Accounts September.csv');assert.equal(writes[0][1],'account-a');
});
test('document import rejects unauthenticated requests',async()=>{
 const {handleCommercial}=await import('../cloudflare/commercial.mjs');
 const DB={prepare(){return {async run(){return {};}};}};
 const result=await handleCommercial(new Request('https://example.com/api/documents/import',{method:'POST',body:'x'}),{DB});assert.equal(result.status,401);
});
