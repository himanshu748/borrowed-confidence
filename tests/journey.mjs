// Real Chromium UI checks. The second journey explicitly injects HTTP fixtures;
// neither journey contacts YouCam or proves a newly generated provider result.
import {chromium, expect} from '@playwright/test';
import {createApp} from '../server/index.ts';
import {mkdirSync, readFileSync} from 'node:fs';
const app = createApp({env:{NODE_ENV:'production',APP_ORIGIN:'https://browser-test.example'}, dbPath:':memory:'});
const server = app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base = 'http://127.0.0.1:'+server.address().port;
const browser = await chromium.launch({headless:true});
mkdirSync('test-results',{recursive:true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  let posts=0; page.on('request',request=>{if(request.url().includes('/api/tryons')&&request.method()==='POST')posts++;});
  await page.goto(base+'/#planner');
  await expect(page.locator('.stats')).toContainText('₹0');
  const selected=page.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true});
  await selected.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.candidate-context')).toContainText('Graduate role interview');
  await expect(page.locator('.candidate-context')).toContainText('Navy interview blazer');
  await expect(page.getByRole('button',{name:'Generate real preview'})).toBeDisabled();
  await page.getByRole('button',{name:'Inspect verified result replay'}).click();
  await expect(page.locator('.inspection-result')).toContainText('HISTORICAL PROVIDER RESULT');
  const slider=page.getByRole('slider',{name:'Before and after comparison'});
  await slider.focus(); await page.keyboard.press('ArrowRight'); await expect(slider).toHaveValue('51');
  await expect.poll(()=>page.locator('.comparison>img').evaluate(image=>image.complete&&image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/youcam-replay-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Accept candidate'}).click();
  await expect(page.locator('.decision-report')).toContainText('accepted');
  await expect(page.locator('.stats')).toContainText('₹0');
  await expect(page.locator('.outfit-grid')).toContainText('Accepted');
  await selected.click();
  await expect(page.locator('.candidate-context')).toContainText('Graduate role interview');
  await page.getByRole('button',{name:'Reject & recalculate'}).click();
  await expect(page.locator('.decision-report')).toContainText('₹0 → ₹850');
  await expect(page.locator('.decision-report')).toContainText('1 → 0');
  await expect(page.locator('.stats')).toContainText('₹850');
  await expect(page.locator('.stats')).toContainText('3 / 3');
  await expect(page.locator('.outfit-grid')).not.toContainText('Navy interview blazer');
  await page.screenshot({path:'test-results/recalculated-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Try-on studio',exact:true}).click();
  await expect(page.locator('.decision-bar')).toContainText('Rejected from your week');
  await expect(page.getByRole('button',{name:'Accept candidate'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Reject & recalculate'})).toHaveCount(0);
  await page.getByRole('button',{name:'Your week',exact:true}).click();
  await page.getByRole('button',{name:'← Home',exact:true}).click();
  await page.getByRole('button',{name:'Plan my interview week'}).click();
  await expect(page.locator('.stats')).toContainText('₹850');
  const skip=page.getByRole('link',{name:'Skip to planner content'});
  await skip.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'What’s coming up?'})).toBeVisible();
  await expect(page.locator('#planner-main')).toBeFocused();
  await page.getByRole('button',{name:'Try on Everyday formal blazer for Graduate role interview',exact:true}).click();
  await expect(page.getByRole('button',{name:'Inspect verified result replay'})).toHaveCount(0);
  await page.getByRole('button',{name:'← Back to your week'}).click();
  await expect(page.getByRole('heading',{name:'A good plan looks like you.'})).toBeFocused();
  await page.getByRole('textbox',{name:'Event 1 name'}).fill('Changed event');
  await page.getByRole('button',{name:'Build my week'}).click();
  await page.getByRole('button',{name:'Try-on studio',exact:true}).click();
  await expect(page.locator('.candidate-context')).toHaveCount(0);
  if(posts!==0)throw new Error('Replay/navigation unexpectedly submitted a render');
  console.log('Replay journey: exact item/event, real historical image, keyboard comparison, accept, reject/replan metrics, navigation preservation, stale-context invalidation; 0 render submissions.');

  const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await mobile.goto(base+'/#planner');
  await mobile.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
  await mobile.getByRole('button',{name:'Inspect verified result replay'}).click();
  for(const width of [320,390,768]) {
    await mobile.setViewportSize({width,height:844});
    if(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Studio overflow at '+width);
  }
  await mobile.setViewportSize({width:390,height:844});
  await mobile.screenshot({path:'test-results/youcam-replay-mobile.png',fullPage:true});
  await mobile.getByRole('button',{name:'Reject & recalculate'}).click();
  await expect(mobile.locator('.decision-report')).toContainText('₹0 → ₹850');
  await mobile.getByRole('button',{name:'The wardrobe',exact:true}).click();
  await mobile.getByRole('button',{name:'Rejected · reconsider',exact:true}).click();
  await mobile.getByRole('button',{name:'Your week',exact:true}).click();
  await expect(mobile.locator('.stats')).toContainText('₹0');
  await expect(mobile.locator('.decision-report')).toHaveCount(0);
  console.log('Mobile/reduced motion: 320, 390 and 768px studio, comparison and recalculation without horizontal overflow.');

  // Fixture-backed browser behavior: status/progress/failure/consent only.
  const fixture=await browser.newPage(); let submitCount=0,polls=0,fail=false;
  await fixture.route('**/api/status',route=>route.fulfill({json:{liveEnabled:true,reason:'AUTOMATED TEST FIXTURE ONLY'}}));
  await fixture.route('**/api/tryons',async route=>{
    submitCount++; const body=route.request().postDataJSON();
    if(body.consent!==true||body.category!=='outer')throw new Error('Consent/category contract failed');
    await route.fulfill({status:202,json:{id:'fixture',state:'queued'}});
  });
  await fixture.route('**/api/tryons/fixture',route=>route.fulfill({json:fail ? {state:'error',error:'Fixture provider unavailable'} : {state:++polls===1?'uploading':polls===2?'rendering':'success',resultUrl:base+'/fixture-result.jpg'}}));
  await fixture.route('**/fixture-result.jpg',route=>route.fulfill({contentType:'image/jpeg',body:readFileSync('live-evidence/outer-test/youcam-result.jpg')}));
  await fixture.goto(base+'/#planner');
  await fixture.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
  await fixture.getByLabel('Upload person photo').setInputFiles('live-evidence/outer-test/synthetic-person.jpg');
  await fixture.getByLabel('Upload garment reference').setInputFiles('live-evidence/outer-test/synthetic-blazer.jpg');
  await expect(fixture.getByRole('button',{name:'Generate real preview'})).toBeDisabled();
  await expect.poll(()=>fixture.locator('.upload img').count()).toBe(2);
  await fixture.getByRole('checkbox').check();
  await fixture.getByRole('button',{name:'Generate real preview'}).dblclick();
  await expect(fixture.locator('.render-progress')).toContainText('Queued');
  await expect.poll(()=>fixture.locator('.render-progress .reached').count(),{timeout:12000}).toBe(5);
  if(submitCount!==1)throw new Error('Double-click created multiple render submissions');
  await fixture.getByRole('button',{name:'Accept candidate'}).click();
  await expect(fixture.locator('.decision-report')).toContainText('completed live YouCam result');
  await fixture.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
  await fixture.locator('.live-form summary').click();fail=true;
  await fixture.getByRole('button',{name:'Generate real preview'}).click();
  await expect(fixture.locator('.render-progress')).toContainText('Fixture provider unavailable');
  await new Promise(resolve=>setTimeout(resolve,2100));
  if(submitCount!==2)throw new Error('Failure caused an automatic render retry');
  console.log('HTTP-FIXTURE UI journey: consent gate, exact category, upload/render/complete progress, double-click guard, acceptance, safe failure with no automatic retry. Not live-provider evidence.');

  // Delay native FileReader completion to reproduce clear/context-change races.
  // These are genuine local file reads; no generated output is injected here.
  const reads=await browser.newPage();
  await reads.addInitScript(()=>{
    const original=FileReader.prototype.readAsDataURL;
    window.__pendingReads=[];
    FileReader.prototype.readAsDataURL=function(file) {
      const reader=this; window.__pendingReads.push(()=>new Promise(resolve=>{reader.addEventListener('loadend',resolve,{once:true});original.call(reader,file);}));
    };
  });
  await reads.route('**/api/session',route=>route.fulfill({status:204}));
  await reads.goto(base+'/#planner');
  await reads.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
  await reads.getByLabel('Upload person photo').setInputFiles('live-evidence/outer-test/synthetic-person.jpg');
  await reads.getByRole('button',{name:'Clear photos & session',exact:true}).click();
  await expect(reads.getByRole('status').filter({hasText:'Local photos and application session cleared'})).toBeVisible();
  await reads.evaluate(async()=>{await Promise.all(window.__pendingReads.splice(0).map(read=>read()));});
  await expect.poll(()=>reads.locator('.upload img').count()).toBe(0);
  await expect.poll(()=>reads.getByLabel('Upload person photo').evaluate(input=>input.files.length)).toBe(0);
  // Selecting the same file again must fire change after clearing its DOM input.
  await reads.getByLabel('Upload person photo').setInputFiles('live-evidence/outer-test/synthetic-person.jpg');
  await reads.evaluate(async()=>{await Promise.all(window.__pendingReads.splice(0).map(read=>read()));});
  await expect.poll(()=>reads.locator('.upload img').count()).toBe(1);
  await reads.getByLabel('Upload garment reference').setInputFiles('live-evidence/outer-test/synthetic-blazer.jpg');
  await reads.getByRole('button',{name:'← Back to your week',exact:true}).click();
  await reads.getByRole('button',{name:'Try on Your white shirt for Graduate role interview',exact:true}).click();
  await reads.evaluate(async()=>{await Promise.all(window.__pendingReads.splice(0).map(read=>read()));});
  await expect(reads.locator('.candidate-context')).toContainText('Your white shirt');
  await expect.poll(()=>reads.getByLabel('Upload garment reference').evaluate(input=>input.files.length)).toBe(0);
  await expect.poll(()=>reads.locator('.studio-inputs>div').nth(1).locator('img').count()).toBe(0);
  console.log('File-read regression: clear and context switches ignore stale reads, reset file inputs, permit same-file reselection and preserve only the current garment context.');

  // Hold job creation and deletion independently. Clear must wait for the first
  // response's session cookie, and prevent a second request during deletion.
  const clearing=await browser.newPage(); let releaseSubmit,releaseDelete,creationStarted=false,deletionStarted=false,deletionCookie='';
  const submitGate=new Promise(resolve=>releaseSubmit=resolve),deleteGate=new Promise(resolve=>releaseDelete=resolve);
  await clearing.route('**/api/status',route=>route.fulfill({json:{liveEnabled:true,reason:'CLEAR-RACE TEST FIXTURE ONLY'}}));
  await clearing.route('**/api/tryons',async route=>{
    creationStarted=true; await submitGate;
    await route.fulfill({status:202,headers:{'Set-Cookie':'spindle_session='+ 'a'.repeat(64)+'; Path=/api; HttpOnly; SameSite=Strict'},json:{id:'clear-fixture',state:'queued'}});
  });
  await clearing.route('**/api/session',async route=>{
    deletionStarted=true; deletionCookie=route.request().headers().cookie||''; await deleteGate; await route.fulfill({status:204});
  });
  await clearing.goto(base+'/#planner');
  await clearing.getByRole('button',{name:'Try on Navy interview blazer for Graduate role interview',exact:true}).click();
  await clearing.getByLabel('Upload person photo').setInputFiles('live-evidence/outer-test/synthetic-person.jpg');
  await clearing.getByLabel('Upload garment reference').setInputFiles('live-evidence/outer-test/synthetic-blazer.jpg');
  await expect.poll(()=>clearing.locator('.upload img').count()).toBe(2);
  await clearing.getByRole('checkbox').check();
  await clearing.getByRole('button',{name:'Generate real preview'}).click();
  await expect.poll(()=>creationStarted).toBe(true);
  await clearing.getByRole('button',{name:'Clear photos & session',exact:true}).click();
  await expect(clearing.getByRole('button',{name:'Clearing photos & session…',exact:true})).toBeDisabled();
  await expect(clearing.getByLabel('Upload person photo')).toBeDisabled();
  await expect(clearing.getByRole('button',{name:'Generate real preview'})).toBeDisabled();
  await expect(clearing.getByRole('button',{name:'Inspect verified result replay'})).toBeDisabled();
  if(deletionStarted)throw new Error('Clear raced ahead of the session-creation response');
  releaseSubmit(); await expect.poll(()=>deletionStarted).toBe(true);
  if(!deletionCookie.includes('spindle_session='+'a'.repeat(64)))throw new Error('Deletion did not use the newly established session cookie');
  await expect(clearing.getByRole('button',{name:'Generate real preview'})).toBeDisabled();
  releaseDelete();
  await expect(clearing.getByRole('status').filter({hasText:'Local photos and application session cleared'})).toBeVisible();
  await expect(clearing.locator('.render-progress')).toHaveCount(0);
  await expect(clearing.locator('.upload img')).toHaveCount(0);
  console.log('Clear-race HTTP fixture: waits for job-creation cookie, blocks uploads/render/replay until DELETE settles, ignores late creation state. No live provider calls.');
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
} finally {await browser.close();await app.locals.close();await new Promise(resolve=>server.close(resolve));}
