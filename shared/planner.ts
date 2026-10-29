export type Source = 'own' | 'borrow' | 'buy';
export type Category = 'top' | 'bottom' | 'layer' | 'shoes';
export interface Item { id:string; name:string; category:Category; source:Source; price:number; color:string; sizes:string[]; formality:number; availableFrom:string; availableUntil:string; loanDays?:number; location:string; unavailable?:boolean; note?:string; }
export interface Event {id:string; name:string; date:string; formality:number;}
export interface PlannerInput {items:Item[]; events:Event[]; budget:number; size:string; maxBorrow:number; rejectedIds?:string[];}
export interface Outfit {event:Event; items:Item[];}
export interface Plan {outfits:Outfit[]; cost:number; uniqueItems:Item[]; uncovered:Event[]; feasible:boolean; checklist:{item:Item;pickup:string;returnBy?:string;events:string[]}[]; reasons:string[];}
const DAY=86400000;
export const dateNumber=(s:string)=>Date.parse(s+'T12:00:00Z');
export const addDays=(s:string,n:number)=>new Date(dateNumber(s)+n*DAY).toISOString().slice(0,10);
export function validateInput(p:PlannerInput):void {
 if(!Number.isFinite(p.budget)||p.budget<0||p.budget>1000000)throw new Error('Enter a budget between 0 and 1,000,000.');
 if(!Number.isInteger(p.maxBorrow)||p.maxBorrow<0||p.maxBorrow>30)throw new Error('Borrow limit must be a whole number between 0 and 30.');
 if(p.events.length>6||p.events.length===0)throw new Error('Choose between one and six events.');
 if(p.items.length>60)throw new Error('Use at most 60 inventory items.');
 if(new Set(p.items.map(i=>i.id)).size!==p.items.length)throw new Error('Inventory identifiers must be unique.');
 if(new Set(p.events.map(e=>e.id)).size!==p.events.length)throw new Error('Event identifiers must be unique.');
 for(const e of p.events)if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(dateNumber(e.date))||new Date(dateNumber(e.date)).toISOString().slice(0,10)!==e.date||![1,2,3].includes(e.formality))throw new Error('Check event dates and dress requirements.');
 for(const i of p.items)if(!Number.isFinite(i.price)||i.price<0||(i.source!=='buy'&&i.price!==0)||![1,2,3].includes(i.formality)||!Number.isFinite(dateNumber(i.availableFrom))||!Number.isFinite(dateNumber(i.availableUntil))||(i.source==='borrow'&&(!Number.isInteger(i.loanDays)||i.loanDays!<1)))throw new Error('Check inventory prices, dates and loan windows.');
}
function usable(item:Item,event:Event,p:PlannerInput){return !item.unavailable&&!p.rejectedIds?.includes(item.id)&&item.sizes.includes(p.size)&&item.availableFrom<=event.date&&item.availableUntil>=event.date&&item.formality>=event.formality;}
function options(event:Event,p:PlannerInput):Item[][] {
 const by=(cat:Category)=>p.items.filter(i=>i.category===cat&&usable(i,event,p));
 const layers=by('layer'); const out:Item[][]=[];
 for(const t of by('top'))for(const b of by('bottom'))for(const s of by('shoes')){
  if(event.formality===3){for(const l of layers)out.push([t,b,s,l]);} else out.push([t,b,s]);
 }
 return out;
}
/** Exact bounded search: maximize covered events, then minimize total unique purchase cost,
 * then unique borrowed pieces and total pieces. A borrowed item has one continuous loan.
 * Pickup is on its first event date. No reservations or physical-fit guarantees are implied. */
export function makePlan(p:PlannerInput):Plan {
 validateInput(p);
 const events=[...p.events].sort((a,b)=>a.date.localeCompare(b.date));
 const choices=events.map(e=>options(e,p));
 let explored=0;
 let best:{outfits:Outfit[];unique:Map<string,Item>;used:Map<string,string[]>;cost:number;borrow:number;score:number[]}|undefined;
 const better=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]<b[i];}return false;};
 const visit=(idx:number,outfits:Outfit[],unique:Map<string,Item>,used:Map<string,string[]>,cost:number,borrow:number)=>{
  if(++explored>250000)throw new Error('This inventory creates too many combinations. Narrow it by size or remove similar items.');
  if(best&&outfits.length+(events.length-idx)<best.outfits.length)return;
  if(idx===events.length){const score=[-outfits.length,cost,borrow,unique.size];if(!best||better(score,best.score))best={outfits:[...outfits],unique,used,cost,borrow,score};return;}
  const ev=events[idx];
  for(const candidate of choices[idx]){
   const next=new Map(unique),dates=new Map(used);let c=cost,b=borrow,ok=true;
   for(const item of candidate){
    if(!next.has(item.id)){next.set(item.id,item);if(item.source==='buy')c+=item.price;if(item.source==='borrow')b++;}
    const ds=[...(dates.get(item.id)||[]),ev.date];dates.set(item.id,ds);
    if(item.source==='borrow'&&((dateNumber(ds[ds.length-1])-dateNumber(ds[0]))/DAY>item.loanDays!))ok=false;
   }
   if(!ok||c>p.budget||b>p.maxBorrow)continue;
   if(best&&best.outfits.length===events.length&&c>best.cost)continue;
   visit(idx+1,[...outfits,{event:ev,items:candidate}],next,dates,c,b);
  }
  visit(idx+1,outfits,unique,used,cost,borrow);
 };
 visit(0,[],new Map(),new Map(),0,0);
 const selected=best!;const covered=new Set(selected.outfits.map(o=>o.event.id));
 const uncovered=events.filter(e=>!covered.has(e.id));
 const checklist=[...selected.unique.values()].filter(i=>i.source!=='own').map(item=>{
  const ds=selected.used.get(item.id)!;
  return {item,pickup:ds[0],returnBy:item.source==='borrow'?[addDays(ds[0],item.loanDays!),item.availableUntil].sort()[0]:undefined,events:selected.outfits.filter(o=>o.items.some(i=>i.id===item.id)).map(o=>o.event.name)};
 });
 return {outfits:selected.outfits,cost:selected.cost,uniqueItems:[...selected.unique.values()],uncovered,feasible:uncovered.length===0,checklist,reasons:[`${selected.outfits.length} of ${events.length} events covered under your constraints.`,`${selected.borrow} unique borrowed pieces, counted once across all events.`,uncovered.length?'No feasible complete plan. Try widening availability, changing inventory or increasing the budget.':'Reusing an outfit is allowed. No purchase is added solely to create variety.','Borrow periods use calendar days for this sample policy. Pickup and fitting must be confirmed with the lender.']};
}
