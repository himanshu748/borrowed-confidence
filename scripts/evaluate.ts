import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {makePlan, type Event, type Item, type Outfit, type Plan, type PlannerInput} from '../shared/planner.ts';
import {DEMO_EVENTS, DEMO_ITEMS} from '../shared/demo.ts';

// This evaluation never contacts YouCam. Keep the original demo fixtures intact.
const baseline = ():PlannerInput => ({items:structuredClone(DEMO_ITEMS), events:structuredClone(DEMO_EVENTS), budget:1500, size:'M', maxBorrow:1});
const scenarios:{id:string; name:string; changes:string[]; input:()=>PlannerInput}[] = [
 {id:'baseline',name:'Three events using a borrowed blazer',changes:[],input:baseline},
 {id:'unavailable',name:'Borrowed blazer becomes unavailable',changes:['navy-blazer.unavailable = true'],input:()=>{const p=baseline();p.items.find(i=>i.id==='navy-blazer')!.unavailable=true;return p;}},
 {id:'replacement-affordable',name:'Budget permits the replacement purchase',changes:['navy-blazer.unavailable = true','budget = 850 (exact replacement price)'],input:()=>{const p=baseline();p.items.find(i=>i.id==='navy-blazer')!.unavailable=true;p.budget=850;return p;}},
 {id:'replacement-unaffordable',name:'Budget does not permit the replacement',changes:['navy-blazer.unavailable = true','budget = 500'],input:()=>{const p=baseline();p.items.find(i=>i.id==='navy-blazer')!.unavailable=true;p.budget=500;return p;}},
 {id:'loan-conflict',name:'Borrowing dates conflict',changes:['navy-blazer.loanDays = 1 (events are three days apart)'],input:()=>{const p=baseline();p.items.find(i=>i.id==='navy-blazer')!.loanDays=1;return p;}},
 {id:'rejected',name:'User rejects the shortlisted navy blazer',changes:['rejectedIds = [navy-blazer]'],input:()=>({...baseline(),rejectedIds:['navy-blazer']})},
 {id:'no-complete-wardrobe',name:'No valid complete wardrobe exists',changes:['All layer items unavailable (other inventory and budget unchanged)'],input:()=>{const p=baseline();p.items=p.items.map(i=>i.category==='layer'?{...i,unavailable:true}:i);return p;}},
];

const day=(date:string)=>Date.parse(`${date}T00:00:00Z`)/86400000;
const key=(outfits:Outfit[])=>outfits.map(o=>`${o.event.id}:${o.items.map(i=>i.id).sort().join(',')}`).sort().join('|');

/** Separate final-state checker. It does not call planner helpers or trust its summary fields. */
function violations(p:PlannerInput,outfits:Outfit[],plan?:Plan):string[]{
 const errors:string[]=[];
 const used=new Map<string,{item:Item;dates:string[]}>();
 const eventIds=new Set<string>();
 for(const outfit of outfits){
  const event=p.events.find(e=>e.id===outfit.event.id);
  if(!event){errors.push('Unknown event');continue;}
  if(eventIds.has(event.id))errors.push('Duplicate covered event');eventIds.add(event.id);
  if(outfit.event.date!==event.date||outfit.event.formality!==event.formality)errors.push('Changed event constraints');
  for(const category of ['top','bottom','shoes'])if(outfit.items.filter(i=>i.category===category).length!==1)errors.push(`Missing or duplicate ${category}`);
  if(event.formality===3&&outfit.items.filter(i=>i.category==='layer').length!==1)errors.push('Formal event lacks exactly one layer');
  if(new Set(outfit.items.map(i=>i.id)).size!==outfit.items.length)errors.push('Duplicate outfit item');
  for(const selected of outfit.items){
   const item=p.items.find(i=>i.id===selected.id);
   if(!item){errors.push('Invented inventory item');continue;}
   if(JSON.stringify(item)!==JSON.stringify(selected))errors.push('Changed inventory attributes');
   if(item.unavailable||p.rejectedIds?.includes(item.id))errors.push('Unavailable or rejected item');
   if(!item.sizes.includes(p.size))errors.push('Size mismatch');
   if(item.formality<event.formality)errors.push('Dress requirement mismatch');
   if(day(event.date)<day(item.availableFrom)||day(event.date)>day(item.availableUntil))errors.push('Outside availability');
   const current=used.get(item.id)||{item,dates:[]};current.dates.push(event.date);used.set(item.id,current);
  }
 }
 const unique=[...used.values()];
 const spend=unique.filter(x=>x.item.source==='buy').reduce((sum,x)=>sum+x.item.price,0);
 if(spend>p.budget)errors.push('Overspent budget');
 if(unique.filter(x=>x.item.source==='borrow').length>p.maxBorrow)errors.push('Exceeded unique borrowing limit');
 for(const {item,dates} of unique)if(item.source==='borrow'&&Math.max(...dates.map(day))-Math.min(...dates.map(day))>item.loanDays!)errors.push('Exceeded continuous loan window');
 if(plan){
  if(plan.cost!==spend)errors.push('Incorrect reported spending');
  if(plan.feasible!==(eventIds.size===p.events.length))errors.push('Incorrect feasibility flag');
  if(plan.uncovered.map(e=>e.id).sort().join(',')!==p.events.filter(e=>!eventIds.has(e.id)).map(e=>e.id).sort().join(','))errors.push('Incorrect uncovered events');
  if(plan.uniqueItems.map(i=>i.id).sort().join(',')!==[...used.keys()].sort().join(','))errors.push('Incorrect unique item summary');
  if(plan.checklist.map(c=>c.item.id).sort().join(',')!==unique.filter(x=>x.item.source!=='own').map(x=>x.item.id).sort().join(','))errors.push('Incorrect pickup checklist');
  for(const row of plan.checklist){
   const record=used.get(row.item.id);if(!record)continue;
   const first=Math.min(...record.dates.map(day));const last=Math.max(...record.dates.map(day));
   if(day(row.pickup)!==first)errors.push('Incorrect pickup date');
   if(record.item.source==='borrow'){
    const expectedReturn=Math.min(first+record.item.loanDays!,day(record.item.availableUntil));
    if(!row.returnBy||day(row.returnBy)!==expectedReturn||day(row.returnBy)<last)errors.push('Incorrect return date');
   }
  }
 }
 return errors;
}

// Independent brute force: enumerate all event assignments, including leaving an event uncovered.
// Unlike makePlan, no objective pruning is used. Only small, fixed scenario inventories are evaluated.
function enumerate(p:PlannerInput){
 const eligible=(i:Item,e:Event)=>!i.unavailable&&!p.rejectedIds?.includes(i.id)&&i.sizes.includes(p.size)&&day(i.availableFrom)<=day(e.date)&&day(i.availableUntil)>=day(e.date)&&i.formality>=e.formality;
 const choices=p.events.map(event=>{
  const by=(cat:Item['category'])=>p.items.filter(i=>i.category===cat&&eligible(i,event));
  const all:Outfit[]=[];
  for(const top of by('top'))for(const bottom of by('bottom'))for(const shoes of by('shoes')){
   if(event.formality===3){for(const layer of by('layer'))all.push({event,items:[top,bottom,shoes,layer]});}
   else all.push({event,items:[top,bottom,shoes]});
  }
  return all;
 });
 const valid:{outfits:Outfit[];objective:number[]}[]=[];
 const visit=(idx:number,selected:Outfit[])=>{
  if(idx===choices.length){
   if(violations(p,selected).length)return;
   const unique=new Map(selected.flatMap(o=>o.items).map(i=>[i.id,i]));
   const items=[...unique.values()];
   valid.push({outfits:selected,objective:[-selected.length,items.filter(i=>i.source==='buy').reduce((s,i)=>s+i.price,0),items.filter(i=>i.source==='borrow').length,items.length]});return;
  }
  visit(idx+1,selected);
  for(const outfit of choices[idx])visit(idx+1,[...selected,outfit]);
 };
 visit(0,[]);
 valid.sort((a,b)=>{for(let i=0;i<a.objective.length;i++)if(a.objective[i]!==b.objective[i])return a.objective[i]-b.objective[i];return 0;});
 return {valid,choices:choices.map(c=>c.length),best:valid[0].objective};
}

const results=scenarios.map(s=>{
 const input=s.input();const before=JSON.stringify(input);
 const plan=makePlan(input);const errors=violations(input,plan.outfits,plan);assert.deepEqual(errors,[],s.id);
 assert.equal(JSON.stringify(input),before,`${s.id}: input mutation`);
 const enumerated=enumerate(input);
 const objective=[-plan.outfits.length,plan.cost,plan.uniqueItems.filter(i=>i.source==='borrow').length,plan.uniqueItems.length];
 assert.deepEqual(objective,enumerated.best,`${s.id}: optimizer disagrees with exhaustive baseline`);
 assert(enumerated.valid.some(v=>key(v.outfits)===key(plan.outfits)),`${s.id}: output absent from independent enumeration`);
 const complete=enumerated.valid.filter(v=>v.outfits.length===input.events.length);
 const maxCoverage=enumerated.valid.filter(v=>v.outfits.length===plan.outfits.length);
 // Timing is local synchronous solver time only; no browser, network or provider work.
 for(let n=0;n<5;n++)makePlan(input);
 const timings=Array.from({length:25},()=>{const start=performance.now();makePlan(input);return performance.now()-start;}).sort((a,b)=>a-b);
 return {id:s.id,name:s.name,changes:s.changes,input,eventsCovered:plan.outfits.length,totalEvents:input.events.length,purchaseSpendingINR:plan.cost,uniqueBorrowedPieces:plan.uniqueItems.filter(i=>i.source==='borrow').length,completeFeasibleAssignments:complete.length,validCompleteAlternatives:complete.filter(v=>key(v.outfits)!==key(plan.outfits)).length,maximumCoverageAssignments:maxCoverage.length,validMaximumCoverageAlternatives:maxCoverage.filter(v=>key(v.outfits)!==key(plan.outfits)).length,eventLocalCandidateCounts:enumerated.choices,constraintViolations:errors.length,feasible:plan.feasible,outcome:plan.feasible?'fully feasible':'partial',selected:plan.outfits.map(o=>({eventId:o.event.id,itemIds:o.items.map(i=>i.id)})),uncoveredEventIds:plan.uncovered.map(e=>e.id),objectiveVerifiedAgainstIndependentEnumeration:true,runtimeMs:{median:Number(timings[12].toFixed(4)),min:Number(timings[0].toFixed(4)),max:Number(timings.at(-1)!.toFixed(4)),measuredRuns:25,warmupRuns:5}};
});
const expected=[{coverage:3,spend:0},{coverage:3,spend:850},{coverage:3,spend:850},{coverage:2,spend:0},{coverage:3,spend:850},{coverage:3,spend:850},{coverage:1,spend:0}];
results.forEach((r,n)=>{assert.equal(r.eventsCovered,expected[n].coverage,r.id);assert.equal(r.purchaseSpendingINR,expected[n].spend,r.id);});
const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const report={generatedAt:new Date().toISOString(),sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:{planner:fileHash('shared/planner.ts'),demo:fileHash('shared/demo.ts'),evaluation:fileHash('scripts/evaluate.ts')},environment:{node:process.version,platform:process.platform,architecture:process.arch},scope:'Simulated deterministic planner scenarios using the unchanged fictional demo inventory. No human study, retail data or YouCam calls.',definitions:{validCompleteAlternatives:'Distinct complete event-to-item assignments satisfying all constraints, excluding the returned assignment. These are not necessarily equal-cost or equally optimal.',validMaximumCoverageAlternatives:'Distinct assignments covering the same maximum number of events, excluding the returned assignment. These may cost more or use more borrowed pieces.',eventLocalCandidateCounts:'Per-event outfit combinations before global spending and unique-loan constraints; not a count of feasible multi-event plans.',runtime:'Synchronous makePlan only, five warmups followed by 25 local runs. Small fixture results are not scalability benchmarks.'},results};
const output=process.argv[2]||'docs/evaluation-results.json';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${results.length} scenarios; zero final-state violations; objectives match independent exhaustive enumeration. Wrote ${output}`);
console.table(results.map(r=>({scenario:r.id,covered:`${r.eventsCovered}/${r.totalEvents}`,spendINR:r.purchaseSpendingINR,loans:r.uniqueBorrowedPieces,completeAlternatives:r.validCompleteAlternatives,maximumCoverageAlternatives:r.validMaximumCoverageAlternatives,violations:r.constraintViolations,medianMs:r.runtimeMs.median,outcome:r.outcome})));
