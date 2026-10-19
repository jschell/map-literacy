import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
export async function checkTerrainSlopes(page,base,output) {
 const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
 await page.goto(base); await page.locator('#nav-review').click();await page.locator('#slope-demo').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('relative slope'));
 assert.equal(await page.locator('#paper-map .slope-span').count(),2);
 await page.locator('#lesson-start').click();await saved();await page.waitForFunction(()=>document.querySelectorAll('#map .slope-span').length===2);
 assert.equal(await page.locator('#answer-slope').isVisible(),true);
 await page.locator('#lesson-submit').click();assert.match(await page.locator('#lesson-status').textContent(),/Enter a valid answer/);
 await page.locator('#answer-slope').selectOption('B');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/Try again/);
 await page.locator('#lesson-retry').focus();await page.keyboard.press('Enter');await saved();assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-slope');
 await page.locator('#lesson-hint').click();await saved();await page.locator('#answer-slope').selectOption('A');await page.locator('#lesson-submit').focus();await page.keyboard.press('Enter');await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
 await page.locator('#rotate').click();assert.equal(await page.locator('#map .slope-span').count(),2);
 const event=page.waitForEvent('download');await page.locator('#lesson-export').click();const download=await event;const backup=JSON.parse(await readFile(await download.path(),'utf8'));const id=backup.sessions[0].id;
 assert.equal(backup.attempts.length,2);assert.equal(backup.attempts[1].answer.choice,'A');
 await page.reload();await page.waitForFunction(id=>[...document.getElementById('saved-session').options].some(o=>o.value===id),id);await page.locator('#saved-session').selectOption(id);await page.locator('#saved-resume').click();await saved();
 assert.equal(await page.locator('#lesson-hints li').count(),1);
 for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
  await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
  assert.equal(await page.locator('#paper-map .slope-span').count(),2);
  assert.equal((await page.locator('#exercise-pages').textContent()).includes('Expected comparison: A is steeper'),audience==='instructor');
  const event=page.waitForEvent('download');await page.locator('#lesson-pdf').click();const file=await event;
  await file.saveAs(new URL(`slope-${audience}-${orientation}.pdf`,output).pathname);
  const text=(await readFile(await file.path())).toString('latin1');const sizes=[...text.matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)];assert.equal(sizes.length,2);
  for(const s of sizes)assert.deepEqual([+s[1],+s[2]],orientation==='portrait'?[612,792]:[792,612]);
 }
 for(const choice of ['B','equal']) {await page.locator('#lesson-next').click();await saved();await page.locator('#answer-slope').selectOption(choice);await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);}
 await page.locator('#lesson-next').click();await saved();assert.match(await page.locator('#lesson-progress').textContent(),/All questions answered/);
 await page.locator('#lesson-import').setInputFiles({name:'slope-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));
 await page.waitForFunction(()=>!document.getElementById('save-fork').disabled);await page.locator('#save-fork').click();await saved();
 await page.setViewportSize({width:375,height:820});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#map').screenshot({path:new URL('slope-narrow.png',output).pathname});await page.setViewportSize({width:1280,height:1000});
 return {choices:['A','B','equal'],keyboardRetry:true,saveReload:true,backupFork:true,letterDownloads:4,narrowReflow:true};
}
