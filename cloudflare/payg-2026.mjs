// Source: Taxation Administration (Withholding Schedules) Instrument 2026,
// F2026L00716, Schedules 1 and 8. Effective 1 July 2026.
// Integer coefficients store four decimal places; no intermediate cent rounding.
export const PAYG_VERSION='AU-PAYG-2026.1';
const scales={
  '1':[[188,1500,1500],[371,2084,110185],[515,1790,1066],[932,3227,741674],[2246,3200,716508],[3303,3900,2288816],[Infinity,4700,4931893]],
  '2':[[362,0,0],[538,1500,543462],[673,2500,1082135],[721,1700,543473],[865,1790,608377],[1282,3227,1851935],[2596,3200,1817319],[3653,3900,3634627],[Infinity,4700,6557704]],
  '3':[[2596,3000,3000],[3653,3700,1817308],[Infinity,4500,4740385]],
  '5':[[362,0,0],[721,1500,543462],[865,1590,608365],[1282,3027,1851923],[2596,3000,1817308],[3653,3700,3634615],[Infinity,4500,6557692]],
  '6':[[362,0,0],[721,1500,543462],[865,1590,608365],[908,3027,1851923],[1135,3527,2306135],[1282,3127,1851923],[2596,3100,1817308],[3653,3800,3634615],[Infinity,4600,6557692]]
};
const loans={
  standard:[[1337,0,0],[2494,1500,2005615],[3577,1700,2504527],[Infinity,1000,0]],
  no_threshold:[[987,0,0],[2144,1500,1480615],[2727,1700,1909527],[Infinity,1000,0]]
};
function check(ok,message){if(!ok)throw new Error(message);}
const round=(n,d)=>(n+d/2n)/d;
function periodAmount(weekly,frequency){
 if(frequency==='weekly')return weekly;
 if(frequency==='fortnightly')return weekly*2n;
 if(frequency==='monthly')return round(weekly*13n,3n);
 return weekly*13n;
}
function weeklyTax(x,table){const [,a,b]=table.find(([limit])=>Number(x)<limit*100);const numerator=BigInt(a)*x-BigInt(b)*100n;return numerator<=0n?0n:round(numerator,1000000n);}
export function calculatePAYG(gross,paid,options={}){
 check(Number.isSafeInteger(gross)&&gross>=0&&gross<=10000000000,'Enter supported gross earnings.');
 check(/^\d{4}-\d{2}-\d{2}$/.test(paid)&&paid>='2026-07-01'&&paid<='2027-06-30','Automatic PAYG supports payment dates from 1 July 2026 to 30 June 2027 only. Use verified manual withholding outside this period.');
 const frequency=options.frequency,scale=String(options.scale);
 check(['weekly','fortnightly','monthly','quarterly'].includes(frequency),'Choose the pay frequency.');
 check(Object.hasOwn(scales,scale),'Choose a supported employee tax treatment.');
 check(typeof options.study_loan==='boolean','Confirm whether the employee has a study or training loan.');
 check(options.declaration_confirmed===true,'Check the employee declaration and confirm this is a supported regular payment.');
 check(!options.special_treatment,'Special tax treatments require verified manual withholding.');
 const offset=options.annual_offset_cents??0;
 check(Number.isSafeInteger(offset)&&offset>=0&&offset<=100000000,'Enter a valid annual tax offset from the withholding declaration.');
 check(offset===0||['2','5','6'].includes(scale),'Tax offsets require a tax-free-threshold scale.');
 let amount=BigInt(gross),weekly;
 if(frequency==='monthly'){if(amount%100n===33n)amount+=1n;weekly=amount*3n/1300n;}
 else weekly=amount/({weekly:100n,fortnightly:200n,quarterly:1300n}[frequency]);
 const x=weekly*100n+99n;
 const beforeOffset=gross===0?0n:periodAmount(weeklyTax(x,scales[scale]),frequency);
 const offsetBps={weekly:190,fortnightly:380,monthly:830,quarterly:2500}[frequency];
 const reduction=round(BigInt(offset)*BigInt(offsetBps),1000000n);
 const base=beforeOffset>reduction?beforeOffset-reduction:0n;
 const loan=options.study_loan&&gross>0?periodAmount(weeklyTax(x,loans[scale==='1'?'no_threshold':'standard']),frequency):0n;
 const total=Number(base+loan)*100;
 check(total<=gross,'Calculated withholding exceeds gross earnings. Review this payment manually.');
 return {version:PAYG_VERSION,method:'separate_schedule_1_and_8',frequency,scale,study_loan:options.study_loan,
   declaration_confirmed:true,annual_offset_cents:offset,base_payg:Number(base)*100,study_loan_withholding:Number(loan)*100,
   applied_offset:Number(beforeOffset-base)*100,total};
}
