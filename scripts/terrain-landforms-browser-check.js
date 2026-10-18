import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {buildTerrainLandformFixture} from './terrain-landform-fixture.js';
export async function checkTerrainLandforms(page,base,output) {
 const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
 await page.goto(base);await page.locator('#landform-demo').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic landforms'));
 assert.ok(await page.locator('#map .contour--index').count()>0);assert.ok(await page.locator('#map .contour--intermediate').count()>0);
 assert.deepEqual(await page.locator('#paper-map .exercise-mark').allTextContents(),['H','L','A']);assert.equal(await page.locator('#profile-panel').isVisible(),false);
 await page.locator('#lesson-start').click();await saved();await page.locator('#lesson-submit').click();assert.match(await page.locator('#lesson-status').textContent(),/Enter a valid answer/);
 await page.locator('#answer-landform').selectOption('ridge');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/Try again/);
 await page.locator('#lesson-retry').focus();await page.keyboard.press('Enter');await saved();assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-landform');
 await page.locator('#lesson-hint').click();await saved();await page.locator('#answer-landform').selectOption('valley');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
 await page.locator('#rotate').click();assert.deepEqual(await page.locator('#map .exercise-mark').allTextContents(),['H','L','A']);
 const ev=page.waitForEvent('download');await page.locator('#lesson-export').click();const backup=JSON.parse(await readFile(await (await ev).path(),'utf8')),id=backup.sessions[0].id;assert.equal(backup.attempts[1].answer.choice,'valley');
 await page.reload();await page.waitForFunction(id=>[...document.getElementById('saved-session').options].some(o=>o.value===id),id);await page.locator('#saved-session').selectOption(id);await page.locator('#saved-resume').click();await saved();assert.equal(await page.locator('#lesson-hints li').count(),1);
 const version=await page.locator('#map').getAttribute('data-load-version'),bad=buildTerrainLandformFixture();bad.exercises[0].rubric.halfWidthM=100;
 await page.locator('#import').setInputFiles({name:'invalid-landform.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Map not loaded'));assert.equal(await page.locator('#map').getAttribute('data-load-version'),version);
 for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
  await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
  assert.equal((await page.locator('#exercise-pages').textContent()).includes('Expected landform: valley'),audience==='instructor');
  const ev=page.waitForEvent('download');await page.locator('#lesson-pdf').click();const dl=await ev;await dl.saveAs(new URL(`landform-${audience}-${orientation}.pdf`,output).pathname);
  const sizes=[...(await readFile(await dl.path())).toString('latin1').matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)];assert.ok(sizes.length>=2);for(const s of sizes)assert.deepEqual([+s[1],+s[2]],orientation==='portrait'?[612,792]:[792,612]);
  await page.evaluate(()=>document.body.dataset.printTarget='lesson');await page.emulateMedia({media:'print'});await page.pdf({path:new URL(`landform-native-${audience}-${orientation}.pdf`,output).pathname,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
 }
 for(const choice of ['ridge','valley','ridge']){await page.locator('#lesson-next').click();await saved();await page.locator('#answer-landform').selectOption(choice);await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);}
 await page.setViewportSize({width:375,height:820});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('#map .contour-elevation-label').count()>0);await page.locator('#map').screenshot({path:new URL('landforms-narrow.png',output).pathname});
 await page.locator('#lesson-next').click();await saved();assert.match(await page.locator('#lesson-revision').textContent(),/completed/);
 await page.locator('#lesson-import').setInputFiles({name:'landform-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));await page.waitForFunction(()=>!document.getElementById('save-fork').disabled);await page.locator('#save-fork').click();await saved();
 await page.setViewportSize({width:1280,height:1000});return{ridgeAndValley:true,reverseAxis:true,keyboardRetry:true,hintsAndReload:true,backupFork:true,invalidImportRetained:true,letterDownloads:4,nativeDocuments:4,narrowReflow:true};
}
