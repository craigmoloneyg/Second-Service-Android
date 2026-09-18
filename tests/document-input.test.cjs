const {test}=require('node:test');
const assert=require('node:assert/strict');
test('filename preserves Word/Excel extension and Australian names',async()=>{
 const {documentName}=await import('../cloudflare/document-input.mjs');
 assert.equal(documentName(encodeURIComponent('Craig Moloney - Accounts.xlsx')),'Craig Moloney - Accounts.xlsx');
 assert.equal(documentName('..%2Freport.docx'),'.._report.docx');
});
test('CSV preserves quoted newlines, commas, duplicate headings and all rows',async()=>{
 const {parseTable}=await import('../cloudflare/document-input.mjs');
 const p=parseTable('\uFEFFName,Amount,Amount\r\n"A, B",0,-12.40\r\n"two\nlines",,3');
 assert.deepEqual(p.headers,['Name','Amount','Amount (column 3)']);
 assert.deepEqual(p.rows,[['A, B','0','-12.40'],['two\nlines','','3']]);
 assert.throws(()=>parseTable('Name\n"unfinished'),/unclosed/);
});
test('headerless ledger retains first debit and matching credit',async()=>{
 const {csvDocument}=await import('../cloudflare/document-input.mjs');
 const line='1,1-1121,Asset,R,17/06/26,,CR1,Square,100.00,D,Y,0,0,100.00,100.00,0,N-T,';
 const result=csvDocument(line+'\n'+line.replace('Asset','Income').replace(',D,',',C,'),'ledger.csv');
 assert.equal(result.tables[0].rows.length,2);
 assert.equal(result.tables[0].rows[0][0],'1');
 assert.equal(result.tables[0].headers[0],'Transaction ID');
});
test('excessive CSV fails explicitly without truncation',async()=>{
 const {parseTable}=await import('../cloudflare/document-input.mjs');
 assert.throws(()=>parseTable('Name\n'+'line\n'.repeat(10001)),/No rows/);
});
