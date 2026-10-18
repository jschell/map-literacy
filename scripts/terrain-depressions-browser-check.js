import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {buildTerrainLessonFixture} from './terrain-lesson-fixture.js';
export async function checkTerrainDepressions(page,base,output) {
 const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
 await page.goto(base);await page.locator('#depression-demo').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic basin'));
 assert.equal(await page.locator('#map .depression-tick').count(),35);assert.equal(await page.locator('#paper-map .depression-tick').count(),35);assert.match(await page.locator('#map .contour-legend').textContent(),/Inward ticks: lower inside/);
 assert.equal(await page.locator('#paper-map .contour-elevation-label').count(),0);assert.deepEqual(await page.locator('#paper-map .exercise-mark').allTextContents(),['115 m','A']);
 await page.locator('#lesson-start').click();await saved();await page.locator('#answer-elevation').fill('120');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/Try again/);
 await page.locator('#lesson-retry').focus();await page.keyboard.press('Enter');await saved();assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-elevation');await page.locator('#lesson-hint').click();await saved();
 await page.locator('#answer-elevation').fill('110');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
 await page.locator('#rotate').click();assert.equal(await page.locator('#map .depression-tick').count(),35);
 const ev=page.waitForEvent('download');await page.locator('#lesson-export').click();const backup=JSON.parse(await readFile(await (await ev).path(),'utf8')),id=backup.sessions[0].id;
 await page.reload();await page.waitForFunction(id=>[...document.getElementById('saved-session').options].some(o=>o.value===id),id);await page.locator('#saved-session').selectOption(id);await page.locator('#saved-resume').click();await saved();assert.equal(await page.locator('#lesson-hints li').count(),1);assert.equal(await page.locator('#map .depression-tick').count(),35);
 const version=await page.locator('#map').getAttribute('data-load-version'),bad=buildTerrainLessonFixture();bad.capabilities.push('terrain-depressions-v1');
 await page.locator('#import').setInputFiles({name:'false-depression.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Map not loaded'));assert.equal(await page.locator('#map').getAttribute('data-load-version'),version);
 for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
  await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
  assert.equal(await page.locator('#paper-map .depression-tick').count(),35);assert.equal((await page.locator('#exercise-pages').textContent()).includes('Expected contour A elevation: 110 m'),audience==='instructor');
  assert.match(await page.locator('#paper-summary').textContent(),/decrease inward/);
  const ev=page.waitForEvent('download');await page.locator('#lesson-pdf').click();const dl=await ev;await dl.saveAs(new URL(`depression-${audience}-${orientation}.pdf`,output).pathname);
  const sizes=[...(await readFile(await dl.path())).toString('latin1').matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)];assert.ok(sizes.length>=2);for(const s of sizes)assert.deepEqual([+s[1],+s[2]],orientation==='portrait'?[612,792]:[792,612]);
  await page.evaluate(()=>document.body.dataset.printTarget='lesson');await page.emulateMedia({media:'print'});await page.pdf({path:new URL(`depression-native-${audience}-${orientation}.pdf`,output).pathname,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
 }
 await page.locator('#lesson-next').click();await saved();await page.locator('#answer-elevation').fill('105');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
 await page.setViewportSize({width:375,height:820});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#map').screenshot({path:new URL('depressions-narrow.png',output).pathname});
 await page.locator('#lesson-next').click();await saved();assert.match(await page.locator('#lesson-progress').textContent(),/All questions answered/);
 await page.locator('#lesson-import').setInputFiles({name:'depression-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));await page.waitForFunction(()=>!document.getElementById('save-fork').disabled);await page.locator('#save-fork').click();await saved();
 await page.locator('#terrain-demo').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic hill'));assert.equal(await page.locator('#map .depression-tick').count(),0);
 await page.setViewportSize({width:1280,height:1000});return{inwardTicks:35,hillNotHatched:true,numericScoring:true,keyboardRetry:true,hintsAndReload:true,backupFork:true,falseDepressionRejected:true,letterDownloads:4,nativeDocuments:4,narrowReflow:true};
}
