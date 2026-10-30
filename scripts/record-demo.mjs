// Records real application interactions; never submits a paid rendering request.
// Usage: node scripts/record-demo.mjs https://host.example /absolute/output-dir
import {chromium, expect} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.argv[2]||'http://localhost:3001';
const out=resolve(process.argv[3]||'test-results/demo');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage();let paidPosts=0;
page.on('request',r=>{if(r.url().includes('/api/tryons')&&r.method()==='POST')paidPosts++;});
const started=Date.now(),events=[];
const log=action=>events.push({seconds:Number(((Date.now()-started)/1000).toFixed(2)),action});
const until=async seconds=>{const remaining=seconds*1000-(Date.now()-started);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));};
try {
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);log('Landing loaded');
 await page.screenshot({path:out+'/01-landing.png'});
 await until(15);await page.getByRole('button',{name:'Plan my interview week'}).click();log('Planner opened');
 await page.locator('.stats').scrollIntoViewIfNeeded();
 await page.screenshot({path:out+'/02-planner.png'});
 await until(29);await page.locator('.checklist').scrollIntoViewIfNeeded();log('Pickup and loan-return shortlist');
 await until(41);await page.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
 await page.locator('.candidate-context').scrollIntoViewIfNeeded();log('Exact navy blazer and interview selected');
 await until(49);await page.locator('.live-form').scrollIntoViewIfNeeded();
 await page.getByLabel('Upload person photo').setInputFiles('live-evidence/outer-test/synthetic-person.jpg');
 await page.getByLabel('Upload garment reference').setInputFiles('live-evidence/outer-test/synthetic-blazer.jpg');
 await expect.poll(()=>page.locator('.upload img').count()).toBe(2);
 await page.getByRole('checkbox').check();log('Synthetic source images selected and consent control shown; NO render submitted');
 await until(62);await page.getByRole('button',{name:'Inspect verified result replay'}).click();
 await page.locator('.inspection-result').scrollIntoViewIfNeeded();log('Genuine October25 outer result replay loaded');
 await page.locator('.inspection-result').screenshot({path:out+'/03-youcam-replay.png'});
 const slider=page.getByRole('slider',{name:'Before and after comparison'});
 await until(69);await slider.fill('100');log('Before image');
 await until(75);await slider.fill('0');log('Actual provider after image');
 await until(81);await slider.fill('50');
 await until(88);await page.locator('.decision-bar').scrollIntoViewIfNeeded();
 await until(92);await page.getByRole('button',{name:'Reject & recalculate'}).click();
 await expect(page.locator('.decision-report')).toContainText('₹0 → ₹850');
 await page.locator('.decision-report').scrollIntoViewIfNeeded();log('Rejected actual item; solver recalculated spend0to850 and loans1to0');
 await page.screenshot({path:out+'/04-recalculated.png'});
 await until(110);await page.locator('.stats').scrollIntoViewIfNeeded();
 await until(120);await page.getByRole('spinbutton',{name:'Budget in rupees'}).fill('500');
 await page.getByRole('button',{name:'Build my week'}).click();await page.locator('.stats').scrollIntoViewIfNeeded();
 await expect(page.locator('.stats')).toContainText('2 / 3');log('Budget500 yields honest partial2of3');
 await page.screenshot({path:out+'/05-budget-gap.png'});
 await until(136);await page.getByRole('spinbutton',{name:'Budget in rupees'}).fill('1500');
 await page.getByRole('button',{name:'Build my week'}).click();await page.locator('.stats').scrollIntoViewIfNeeded();log('Budget restored; feasible3of3');
 await until(145);await page.locator('.checklist').scrollIntoViewIfNeeded();
 await until(160);if(paidPosts!==0)throw new Error('Recording unexpectedly started a render');
 log('Recording complete; zero rendering POSTs');
} finally {
 const video=page.video();await context.close();
 const path=await video.path();writeFileSync(out+'/capture.json',JSON.stringify({base,startedAt:new Date(started).toISOString(),rawVideo:path,paidRenderingPosts:paidPosts,events},null,2));
 await browser.close();console.log(JSON.stringify({rawVideo:path,paidRenderingPosts:paidPosts,durationSeconds:160}));
}
