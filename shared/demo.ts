import type {Item,Event,Category,Source} from './planner';
const base={sizes:['M'],formality:3,availableFrom:'2026-10-25',availableUntil:'2026-11-15',location:'Campus Career Closet',loanDays:4};
const row=(id:string,name:string,category:Category,source:Source,color:string,extra:Partial<Item>={}):Item=>({...base,id,name,category,source,color,price:0,...extra});
export const DEMO_EVENTS:Event[]=[{id:'e1',name:'Graduate role interview',date:'2026-10-27',formality:3},{id:'e2',name:'Campus career fair',date:'2026-10-29',formality:2},{id:'e3',name:'Final-round interview',date:'2026-10-30',formality:3}];
export const DEMO_ITEMS:Item[]=[
 row('own-shirt','Your white shirt','top','own','#ecece6',{location:'Your wardrobe'}),
 row('own-trousers','Your charcoal trousers','bottom','own','#484b50',{location:'Your wardrobe'}),
 row('own-shoes','Your black shoes','shoes','own','#23282a',{location:'Your wardrobe'}),
 row('navy-blazer','Navy interview blazer','layer','borrow','#253a54',{note:'Sample inventory. Four calendar-day loan.'}),
 row('charcoal-blazer','Charcoal loan blazer','layer','borrow','#54545a',{loanDays:2,availableUntil:'2026-10-29',note:'Short loan. Not available for the final round.'}),
 row('buy-blazer','Everyday formal blazer','layer','buy','#766958',{price:850,location:'Illustrative retail option',note:'Fictional item and price. No checkout.'}),
 row('blue-shirt','Pale blue shirt','top','borrow','#b9cdd8',{sizes:['L','XL']}),
 row('cream-shirt','Ivory shirt','top','buy','#e7dec7',{sizes:['S'],price:550,location:'Illustrative retail option'}),
 row('black-pants','Black tailored trousers','bottom','borrow','#333a41',{sizes:['L']}),
 row('navy-pants','Navy trousers','bottom','borrow','#283e59',{sizes:['S']}),
 row('loafers','Black loafers','shoes','borrow','#313232',{sizes:['L']}),
 row('tan-shoes','Tan formal shoes','shoes','buy','#9a7252',{sizes:['XL'],price:750,location:'Illustrative retail option'}),
 row('stone-blazer','Stone blazer','layer','borrow','#b8b0a0',{sizes:['S']}),
 row('green-blazer','Forest blazer','layer','borrow','#40594d',{sizes:['L']}),
 row('grey-blazer','Grey blazer','layer','borrow','#989a9c',{sizes:['XL']}),
 row('navy-knit','Navy knit top','top','own','#2a4055',{formality:1,location:'Your wardrobe'}),
 row('cream-knit','Cream knit top','top','borrow','#d9d1be',{formality:1,sizes:['S','M']}),
 row('denim','Dark denim','bottom','own','#334d69',{formality:1,location:'Your wardrobe'}),
 row('sneakers','White sneakers','shoes','own','#e4e7e4',{formality:1,location:'Your wardrobe'}),
 row('black-shirt','Black collared shirt','top','borrow','#383b3d',{sizes:['XL']})
];
export const SOURCE_LABEL={own:'Own',borrow:'Borrow',buy:'Buy'};
