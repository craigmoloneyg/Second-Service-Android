// All monetary values are integer AUD cents. No AI-generated tax classifications.
export const accounts = {
  bank: ['Bank / cash', 'asset'], receivables: ['Accounts receivable', 'asset'],
  equipment: ['Equipment at cost', 'asset'], gst_credit: ['GST credits', 'asset'],
  payables: ['Accounts payable', 'liability'], gst_collected: ['GST collected', 'liability'],
  payg: ['PAYG withholding payable', 'liability'], super_payable: ['Super payable', 'liability'],
  deductions: ['Payroll deductions payable', 'liability'], sales: ['Sales', 'income'],
  food: ['Food and beverage purchases', 'expense'], rent: ['Rent', 'expense'],
  utilities: ['Utilities', 'expense'], fees: ['Fees', 'expense'], other: ['Other expenses', 'expense'],
  wages: ['Gross wages', 'expense'], super_expense: ['Employer super', 'expense']
};
export function requireValue(ok, message) { if (!ok) throw new Error(message); }
export function cents(value) {
  const s = String(value ?? '');
  requireValue(/^\d{1,9}(\.\d{1,2})?$/.test(s), 'Enter a non-negative amount with no more than two decimal places.');
  const [whole, fraction = ''] = s.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function date(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value, 'Enter a valid date.');
  return value;
}
const text = (s, max = 160) => String(s ?? '').trim().slice(0, max);
const roundedProduct = (value, multiplier, divisor) => Number((BigInt(value)*BigInt(multiplier)+BigInt(divisor/2))/BigInt(divisor));
export const emptyBook = () => ({settings:null, transactions:[], payroll:[], audit:[]});
export function settings(input) {
  requireValue(['sole_trader','company','partnership','trust'].includes(input.entity), 'Choose the business structure.');
  requireValue(typeof input.gst_registered === 'boolean', 'Choose GST registration status.');
  requireValue(input.gst_basis === 'cash', 'This release supports cash-basis GST working papers only.');
  const reserve = input.reserve_percent === '' || input.reserve_percent == null ? null : cents(input.reserve_percent);
  requireValue(reserve === null || reserve <= 10000, 'Reserve percentage must be between 0 and 100.');
  requireValue(text(input.business_name).length > 0, 'Enter your business name.');
  return {business_name:text(input.business_name), entity:input.entity, gst_registered:input.gst_registered,
    gst_basis:'cash', reserve_bps:reserve, currency:'AUD'};
}
export function transaction(input, config) {
  requireValue(config, 'Save accounting settings first.');
  requireValue(['sale','purchase','sale_refund','purchase_refund'].includes(input.kind), 'Choose a transaction type.');
  const sale = input.kind.startsWith('sale');
  requireValue(sale || ['food','rent','utilities','fees','other','equipment'].includes(input.category), 'Choose a purchase category.');
  requireValue(text(input.reference) && text(input.contact), 'Enter a reference and customer or supplier.');
  requireValue(Array.isArray(input.lines) && input.lines.length > 0 && input.lines.length <= 100, 'Add 1–100 transaction lines.');
  const lines = input.lines.map(line => {
    const gross = cents(line.gross);
    const gstMode = line.gst_mode ?? 'invoice';
    requireValue(['auto','invoice'].includes(gstMode), 'Choose automatic GST or the invoice GST amount.');
    // Standard 10% GST on a GST-inclusive amount: one eleventh, rounded per line.
    // Preserve invoice amounts and existing records; never infer the tax classification.
    const gst = gstMode === 'auto' ? (line.tax_code === 'taxable' ? Math.floor((gross+5)/11) : 0) : cents(line.gst);
    requireValue(gross > 0 && gst <= gross, 'Line total must be positive and GST cannot exceed it.');
    requireValue(['taxable','gst_free','input_taxed','out_of_scope','unregistered'].includes(line.tax_code), 'Choose a tax code for each line.');
    requireValue(line.tax_code === 'taxable' || gst === 0, 'Only taxable lines can have GST.');
    requireValue(config.gst_registered || gst === 0, 'A non-GST-registered business must record purchases at gross cost and cannot claim GST.');
    requireValue(config.gst_registered || !['taxable','gst_free','input_taxed'].includes(line.tax_code), 'Use unregistered or out-of-scope for a business not registered for GST.');
    requireValue(line.tax_code !== 'taxable' || gst > 0 || gross <= 5, 'Enter the actual GST from the tax invoice.');
    requireValue(sale || gst === 0 || input.credit_confirmed === true, 'Confirm the GST credit is eligible and supported by a tax invoice.');
    requireValue(text(line.description), 'Enter a line description.');
    return {description:text(line.description), gross, gst, tax_code:line.tax_code, gst_mode:gstMode};
  });
  const issued = date(input.date), paid = input.paid_date ? date(input.paid_date) : null;
  requireValue(!paid || paid >= issued, 'Payment date must not precede the document date. Record deposits separately.');
  const gross = lines.reduce((n,l)=>n+l.gross,0), gst = lines.reduce((n,l)=>n+l.gst,0);
  requireValue(gross<=10000000000, 'Transactions above $100 million are not supported.');
  return {kind:input.kind, category:sale?'sales':input.category, contact:text(input.contact), reference:text(input.reference),
    date:issued, paid_date:paid, lines, gross, gst, net:gross-gst, credit_confirmed:!sale && input.credit_confirmed===true};
}
export function payroll(input) {
  requireValue(text(input.employee), 'Enter an employee name or reference.');
  const start=date(input.period_start), end=date(input.period_end), paid=date(input.paid_date);
  requireValue(start <= end && paid >= end, 'Check the pay period and payment date.');
  requireValue(Array.isArray(input.lines) && input.lines.length > 0 && input.lines.length <= 30, 'Add 1–30 earnings lines.');
  const lines=input.lines.map(line=>{
    const hours=cents(line.hours), rate=cents(line.rate);
    requireValue(hours>0 && hours<=100000 && text(line.description), 'Enter a description and valid hours for each earnings line.');
    return {description:text(line.description), hours_hundredths:hours, rate, amount:roundedProduct(hours,rate,100)};
  });
  const gross=lines.reduce((n,l)=>n+l.amount,0), payg=cents(input.payg), deductions=cents(input.deductions);
  requireValue(gross<=10000000000, 'Wage records above $100 million are not supported.');
  const superBase=cents(input.super_base), superRate=cents(input.super_rate);
  requireValue(superBase<=gross && superRate<=10000, 'Check the super earnings base and percentage.');
  requireValue(payg+deductions<=gross, 'Withholding and deductions cannot exceed gross pay.');
  return {employee:text(input.employee), reference:text(input.reference), period_start:start, period_end:end, paid_date:paid,
    lines,gross,payg,deductions,net:gross-payg-deductions,super_base:superBase,super_bps:superRate,
    super:roundedProduct(superBase,superRate,10000), status:'recorded_payment',
    verified:input.verified===true};
}
export function journal(book) {
  const rows=[];
  function pair(id,when,description,debit,credit,amount) {
    if(!amount)return;
    rows.push({id,date:when,description,account:debit,debit:amount,credit:0},
      {id,date:when,description,account:credit,debit:0,credit:amount});
  }
  for(const t of book.transactions){
    const sale=t.kind.startsWith('sale'), refund=t.kind.endsWith('refund'), sign=refund?-1:1;
    const control=sale?'receivables':'payables';
    pair(t.id,t.date,t.reference,sale?control:t.category,sale?'sales':control,sign*t.net);
    pair(t.id,t.date,t.reference,sale?control:'gst_credit',sale?'gst_collected':control,sign*t.gst);
    if(t.paid_date)pair(t.id,t.paid_date,t.reference,sale?'bank':control,sale?control:'bank',sign*t.gross);
  }
  for(const p of book.payroll){
    const sign=p.reversal_of?-1:1;
    pair(p.id,p.paid_date,p.employee,'wages','bank',sign*p.net);
    pair(p.id,p.paid_date,p.employee,'wages','payg',sign*p.payg);
    pair(p.id,p.paid_date,p.employee,'wages','deductions',sign*p.deductions);
    pair(p.id,p.paid_date,p.employee,'super_expense','super_payable',sign*p.super);
  }
  // Reversal lines remain visible, but use positive debit / credit presentation.
  return rows.map(r=>r.debit<0?{...r,debit:0,credit:-r.debit}:r.credit<0?{...r,credit:0,debit:-r.credit}:r);
}
export function report(book,start,end) {
  date(start);date(end);requireValue(start<=end,'Start date must precede end date.');
  const within=d=>d>=start&&d<=end, ledger=journal(book), period=ledger.filter(r=>within(r.date));
  const totals=Object.entries(accounts).map(([code,[name,type]])=>{
    const rows=ledger.filter(r=>r.account===code&&r.date<=end);
    const balance=rows.reduce((n,r)=>n+r.debit-r.credit,0);
    const movement=period.filter(r=>r.account===code).reduce((n,r)=>n+r.debit-r.credit,0);
    return {code,name,type,balance,movement};
  });
  const revenue=0-totals.filter(a=>a.type==='income').reduce((n,a)=>n+a.movement,0);
  const expenses=totals.filter(a=>a.type==='expense').reduce((n,a)=>n+a.movement,0);
  const profit=revenue-expenses;
  const bas={G1:0,'1A':0,'1B':0,W1:0,W2:0,gst_net:0};
  for(const t of book.transactions.filter(t=>t.paid_date&&within(t.paid_date))){
    const sign=t.kind.endsWith('refund')?-1:1;
    if(t.kind.startsWith('sale')){
      bas.G1+=sign*t.lines.filter(l=>l.tax_code!=='out_of_scope').reduce((n,l)=>n+l.gross,0);
      bas['1A']+=sign*t.gst;
    }else bas['1B']+=sign*t.gst;
  }
  for(const p of book.payroll.filter(p=>within(p.paid_date))){const sign=p.reversal_of?-1:1;bas.W1+=sign*p.gross;bas.W2+=sign*p.payg;}
  bas.gst_net=bas['1A']-bas['1B'];
  const reserve=book.settings?.reserve_bps==null?null:roundedProduct(Math.max(0,profit),book.settings.reserve_bps,10000);
  return {start,end,revenue,expenses,profit,tax_reserve:reserve,bas,accounts:totals,journal:period,
    trial_balance_difference:totals.reduce((n,a)=>n+a.balance,0),
    receivables:totals.find(a=>a.code==='receivables').balance,
    payables:0-totals.find(a=>a.code==='payables').balance,
    limitations:['Cash-basis GST working figures only; not a lodged BAS.',
      'W1/W2 include recorded ordinary wage payments only. Other withholding, PAYG instalments, FBT and GST adjustments are not included.',
      'P&L treats stock purchases as expense; stock movements, depreciation, opening balances and tax adjustments are not included.',
      'Tax reserve is your chosen percentage of recorded profit, not a calculation of income tax payable.',
      'Payroll records use your verified PAYG amount, earnings rates and super base/rate. No automatic award interpretation, leave accrual, STP, super remittance or bank payments.']};
}
