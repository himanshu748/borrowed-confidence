// Optional browser regression. Install @sparticuz/chromium without saving it first.
// Run after npm run build: node --import tsx tests/browser.mjs
import { chromium as playwright, expect } from '@playwright/test';
import { createApp } from '../server/index.ts';
import {mkdirSync} from 'node:fs';
const app=createApp({env:{NODE_ENV:'production',APP_ORIGIN:'https://browser-test.example'},dbPath:':memory:'});
const server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await playwright.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});
 await desktop.goto(base);await expect(desktop.getByRole('heading',{level:1})).toContainText('Big opportunity');
 await desktop.getByRole('button',{name:'Watch the walkthrough 2:40',exact:true}).first().click();
 await expect(desktop.locator('dialog')).toBeVisible();
 await expect.poll(()=>desktop.locator('video').evaluate(v=>v.readyState)).toBe(4);
 await expect.poll(()=>desktop.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await expect.poll(()=>desktop.locator('video').evaluate(v=>v.captureStream().getAudioTracks().length)).toBe(1);
 await desktop.getByRole('button',{name:'Close walkthrough'}).click();
 await expect(desktop.locator('dialog')).not.toBeVisible();
 await desktop.getByRole('button',{name:'Navy blazer available',exact:false}).click();
 await expect(desktop.locator('.lp-demo-stats')).toContainText('₹850');
 await desktop.locator('#lp-budget').fill('500');
 await expect(desktop.locator('.lp-plan-state')).toContainText('Needs attention');
 await desktop.getByRole('button',{name:'Explore the planner',exact:true}).click();
 await expect(desktop.getByRole('heading',{name:'What’s coming up?'})).toBeVisible();
 await desktop.getByRole('button',{name:'← Home',exact:true}).click();
 await expect(desktop.getByRole('heading',{level:1})).toContainText('Big opportunity');
 console.log('Desktop: narrated video playback with1 actual audio track, close/focus path, stockout, budget gap and full-planner navigation passed.');
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(base);
 await expect(mobile.getByRole('button',{name:'Menu +'})).toBeVisible();
 const overflow=()=>mobile.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 let dims=await overflow();if(dims.scroll>dims.width)throw new Error('Landing mobile overflow '+JSON.stringify(dims));
 await mobile.getByRole('button',{name:'Menu +'}).click();
 await expect(mobile.getByRole('link',{name:'See it work',exact:true})).toBeVisible();
 await mobile.getByRole('link',{name:'See it work',exact:true}).click();
 await expect(mobile.getByRole('button',{name:'Menu +'})).toBeVisible();
 await mobile.getByRole('button',{name:'Navy blazer available',exact:false}).click();
 await expect(mobile.locator('.lp-demo-stats')).toContainText('₹850');
 await mobile.evaluate(()=>window.scrollTo(0,0));
 await mobile.screenshot({path:'test-results/landing-mobile.png',fullPage:true});
 await mobile.getByRole('button',{name:'Watch the walkthrough 2:40',exact:true}).first().click();
 await expect(mobile.locator('dialog')).toBeVisible();
 dims=await overflow();if(dims.scroll>dims.width)throw new Error('Mobile modal overflow '+JSON.stringify(dims));
 await mobile.getByRole('button',{name:'Close walkthrough'}).click();
 await mobile.getByRole('button',{name:'Plan my interview week',exact:false}).click();
 dims=await overflow();if(dims.scroll>dims.width)throw new Error('Planner mobile overflow '+JSON.stringify(dims));
 console.log('Mobile 390px: menu, anchors, live sample, video dialog and planner navigation passed. No horizontal overflow.');
 for(const width of [320,375,768,1024]){await desktop.setViewportSize({width,height:900});await desktop.goto(base);let d=await desktop.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));if(d.s>d.w)throw new Error('Landing overflow at '+width);await desktop.getByRole('button',{name:'Plan my interview week',exact:false}).click();d=await desktop.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));if(d.s>d.w)throw new Error('Planner overflow at '+width);}
 console.log('Width checks 320, 375, 768 and 1024px passed for landing and planner.');
 await desktop.setViewportSize({width:1440,height:1000});
 await desktop.goto(base);await desktop.screenshot({path:'test-results/landing-desktop.png',fullPage:true});
}finally{await browser.close();await new Promise(r=>server.close(r));await app.locals.close();}
