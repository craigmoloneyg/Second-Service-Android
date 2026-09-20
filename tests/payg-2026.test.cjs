const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=import('../cloudflare/payg-2026.mjs');
const opt={frequency:'weekly',scale:'2',study_loan:false,declaration_confirmed:true};
// Independent published sample data: F2026L00716 Schedule 1, weekly amounts.
// Columns: earnings, scales 1, 2, 3, 5, 6. Values in whole AUD.
const weekly=[
[116,17,0,35,0,0],[117,18,0,35,0,0],[187,28,0,56,0,0],[188,28,0,56,0,0],
[249,41,0,75,0,0],[250,41,0,75,0,0],[361,64,0,108,0,0],[362,65,0,109,0,0],
[370,66,1,111,1,1],[371,66,1,111,1,1],[514,92,23,154,23,23],[515,92,23,154,23,23],
[537,99,26,161,26,26],[538,100,27,161,27,27],[672,143,60,202,47,47],[673,143,60,202,47,47],
[720,158,68,216,54,54],[721,159,68,216,54,54],[864,205,94,259,77,77],[865,205,94,259,77,77],
[907,219,108,272,90,90],[908,219,108,272,90,90],[931,227,116,279,97,98],[932,227,116,280,97,98],
[1134,292,181,340,158,170],[1135,292,181,340,159,170],[1281,339,229,384,203,216],[1282,339,229,385,203,216],
[1844,519,409,553,372,390],[1845,519,409,553,372,391],[2119,607,497,636,454,475],[2120,607,497,636,455,476],
[2245,647,537,673,492,515],[2246,647,537,674,492,515],[2490,743,615,747,566,590],[2491,743,616,747,566,591],
[2595,784,649,778,597,623],[2596,784,649,779,597,623],[2652,806,671,800,618,645],[2653,806,672,800,619,645],
[2736,839,704,831,649,677],[2737,839,704,831,650,677],[2898,902,767,891,709,738],[2899,902,768,891,710,739],
[3302,1059,925,1040,859,892],[3303,1060,925,1041,859,892],[3652,1224,1061,1170,988,1025],[3653,1224,1062,1170,989,1025]
];
const monthly=[
[50267,74,0,152,0,0],[50700,78,0,152,0,0],[81033,121,0,243,0,0],[81467,121,0,243,0,0],
[156433,277,0,468,0,0],[156867,282,0,472,0,0],[160333,286,4,481,4,4],
[233133,433,117,698,117,117],[291633,620,260,875,204,204],[312433,689,295,936,234,234],
[555533,1469,992,1668,880,936],[918233,2630,2154,2756,1967,2058],[1079433,3220,2669,3237,2453,2561],
[1431300,4593,4008,4511,3722,3865],[1582533,5304,4598,5070,4281,4442],[1582967,5304,4602,5070,4286,4442]
];
test('all published weekly/fortnightly sample rows and selected monthly rows across five scales',async()=>{
 const {calculatePAYG:c}=await engine;const scales=['1','2','3','5','6'];
 for(const [gross,...expected] of weekly)for(let i=0;i<5;i++){
  assert.equal(c(gross*100,'2026-07-01',{...opt,scale:scales[i]}).total,expected[i]*100,`weekly ${gross} scale ${scales[i]}`);
  assert.equal(c(gross*200,'2026-07-01',{...opt,frequency:'fortnightly',scale:scales[i]}).total,expected[i]*200,`fortnight ${gross*2} scale ${scales[i]}`);
 }
 for(const [gross,...expected] of monthly)for(let i=0;i<5;i++)assert.equal(c(gross,'2027-06-30',{...opt,frequency:'monthly',scale:scales[i]}).total,expected[i]*100,`monthly ${gross} scale ${scales[i]}`);
});
test('Schedule 8 worked examples and Schedule 1 tax offsets',async()=>{
 const {calculatePAYG:c}=await engine;
 assert.equal(c(260836,'2026-09-20',{...opt,study_loan:true}).study_loan_withholding,19300);
 assert.equal(c(440975,'2026-09-20',{...opt,frequency:'fortnightly',study_loan:true}).study_loan_withholding,26000);
 assert.equal(c(1062788,'2026-09-20',{...opt,frequency:'monthly',scale:'1',study_loan:true}).study_loan_withholding,97900);
 assert.equal(c(129930,'2026-09-20',{...opt,frequency:'fortnightly',scale:'5',annual_offset_cents:164500}).total,2300);
 assert.equal(c(540033,'2026-09-20',{...opt,frequency:'monthly',annual_offset_cents:136500}).total,82700);
 assert.equal(c(0,'2026-09-20',opt).total,0);
 assert.equal(c(1738100,'2026-09-20',{...opt,frequency:'quarterly',study_loan:true}).study_loan_withholding,0);
});
test('unsupported dates, missing declarations and special treatments fail closed',async()=>{
 const {calculatePAYG:c}=await engine;
 for(const date of ['2026-06-30','2027-07-01','garbage'])assert.throws(()=>c(100000,date,opt));
 for(const changes of [{frequency:'daily'},{scale:'4'},{scale:'15'},{study_loan:null},{declaration_confirmed:false},{special_treatment:true},{scale:'1',annual_offset_cents:10000}])assert.throws(()=>c(100000,'2026-09-20',{...opt,...changes}));
});
