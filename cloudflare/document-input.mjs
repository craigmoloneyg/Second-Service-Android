// Preserve accounting exports exactly; never silently drop the first transaction.
export function parseTable(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field. Export the file again.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length)throw new Error('The CSV contains no rows.');
  if(rows.length>10001)throw new Error('Split this CSV into files of at most 10,000 rows. No rows have been imported.');
  const ledger=rows[0].length>=17&&/^\d+$/.test(rows[0][0])&&/^\d+-\d+$/.test(rows[0][1])&&/^\d{2}\/\d{2}\/\d{2,4}$/.test(rows[0][4]);
  const width=Math.max(...rows.map(r=>r.length));
  const names=['Transaction ID','Account code','Account class','Source field 4','Date (DD/MM/YY)','Source field 6','Reference','Description','Amount as printed','Debit/Credit','Source field 11','Source field 12','Source field 13','Signed gross amount','Signed net amount','Signed tax amount','Tax code'];
  let headers=ledger?Array.from({length:width},(_,i)=>names[i]||`Source field ${i+1}`):rows.shift().map((h,i)=>h.trim()||`Column ${i+1}`);
  headers=Array.from({length:width},(_,i)=>headers[i]||`Column ${i+1}`);
  const seen=new Set();headers=headers.map((h,i)=>{const label=seen.has(h)?`${h} (column ${i+1})`:h;seen.add(label);return label;});
  return {headers,rows:rows.map(r=>Array.from({length:width},(_,i)=>r[i]??'')),ledger};
}
export function documentName(header) {
  let name;try{name=decodeURIComponent(header||'document');}catch{throw new Error('The filename could not be read. Rename the file and try again.');}
  return name.replace(/[\u0000-\u001f/\\]/g,'_').slice(-160)||'document';
}
export function csvDocument(text,filename) {
  const table=parseTable(text);
  return {document_type:table.ledger?'General ledger':'Spreadsheet',title:filename,summary:`${table.rows.length} rows imported with all original values preserved.`,key_facts:[`${table.headers.length} columns`,...(table.ledger?['Headerless ledger recognised; the first transaction is retained.']:[])],financial_data:[],tables:[{name:filename,headers:table.headers,rows:table.rows}],warnings:['Ledger entries include both debit and credit postings. Do not sum every row as revenue or expenses. Review account classes and dates before analysis.']};
}
