import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {buildTerrainProfileFixture} from './terrain-lesson-fixture.js';
export async function checkTerrainProfileLessons(page,base,output) {
 const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
 await page.goto(base);await page.locator('#profile-demo').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('elevation profiles'));
 assert.equal(await page.locator('#paper-map .profile-transect').count(),2);assert.equal(await page.locator('#exercise-pages .paper-profile').count(),1);
 await page.locator('#lesson-start').click();await saved();await page.locator('#profile-panel').waitFor({state:'visible'});assert.ok(await page.locator('#profile-values tr').count()>2);
 assert.match(await page.locator('#map-help').textContent(),/Read the marked/);
 assert.ok(await page.locator('#map .contour-elevation-label').count()>0);
 const styleCheck=await page.evaluate(async()=>{
  const {createMapModel}=await import('./src/map/model.js'),{renderMap}=await import('./src/map/render.js');
  const p=await (await fetch('tests/fixtures/terrain-profiles.json')).json(),m=createMapModel(p);m.paths[0].contourLevelM=75;
  const svg=renderMap(document,m),index=svg.querySelector('.contour--index'),other=svg.querySelector('.contour--intermediate');
  return Number(index.getAttribute('stroke-width'))>Number(other.getAttribute('stroke-width'));
 });assert.equal(styleCheck,true);

 assert.match(await page.locator('#profile-chart svg').getAttribute('aria-label'),/Axes use different scales/);
 await page.locator('#lesson-submit').click();assert.match(await page.locator('#lesson-status').textContent(),/Enter a valid answer/);
 await page.locator('#answer-profile').fill('0');await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/Try again/);
 await page.locator('#lesson-retry').focus();await page.keyboard.press('Enter');await saved();assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-profile');
 await page.locator('#lesson-hint').click();await saved();await page.locator('#answer-profile').fill('20');await page.locator('#lesson-submit').focus();await page.keyboard.press('Enter');await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
 await page.locator('#rotate').click();assert.deepEqual(await page.locator('#map .exercise-mark').allTextContents(),['S','E']);
 const event=page.waitForEvent('download');await page.locator('#lesson-export').click();const file=await event;const backup=JSON.parse(await readFile(await file.path(),'utf8')),id=backup.sessions[0].id;assert.equal(backup.attempts[1].answer.valueM,20);
 await page.reload();await page.waitForFunction(id=>[...document.getElementById('saved-session').options].some(o=>o.value===id),id);await page.locator('#saved-session').selectOption(id);await page.locator('#saved-resume').click();await saved();await page.locator('#profile-panel').waitFor({state:'visible'});assert.equal(await page.locator('#lesson-hints li').count(),1);
 const version=await page.locator('#map').getAttribute('data-load-version');const bad=buildTerrainProfileFixture();bad.exercises[0].rubric.path[0][0]=990;
 await page.locator('#import').setInputFiles({name:'invalid-profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Map not loaded'));assert.equal(await page.locator('#map').getAttribute('data-load-version'),version);
 for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
  await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
  assert.equal(await page.locator('#exercise-pages .paper-profile').count(),1);
  if(audience==='learner')assert.equal(await page.locator('#exercise-pages h2').filter({hasText:'Answer and explanation'}).evaluate(n=>Boolean(n.closest('.exercise-page').querySelector('.sheet-answer-space'))),true);
  assert.equal((await page.locator('#exercise-pages').textContent()).includes('Expected ascent: 20 m'),audience==='instructor');
  const event=page.waitForEvent('download');await page.locator('#lesson-pdf').click();const file=await event;await file.saveAs(new URL(`profile-${audience}-${orientation}.pdf`,output).pathname);
  const text=(await readFile(await file.path())).toString('latin1'),sizes=[...text.matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)];assert.ok(sizes.length>=2&&sizes.length<=3);for(const s of sizes)assert.deepEqual([+s[1],+s[2]],orientation==='portrait'?[612,792]:[792,612]);
  await page.evaluate(()=>document.body.dataset.printTarget='lesson');await page.emulateMedia({media:'print'});
  await page.pdf({path:new URL(`profile-native-${audience}-${orientation}.pdf`,output).pathname,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
 }
 for(const answer of ['10','10','-10']) {await page.locator('#lesson-next').click();await saved();await page.locator('#answer-profile').fill(answer);await page.locator('#lesson-submit').click();await saved();assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);}
 await page.setViewportSize({width:375,height:820});await page.waitForFunction(()=>document.querySelector('#profile-chart svg')?.getAttribute('viewBox')!=='0 0 180 70');
 const clipped=await page.locator('#profile-chart svg').evaluate(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox();return {text:n.textContent,b:{x:b.x,y:b.y,width:b.width,height:b.height},view:{width:v.width,height:v.height}};}).filter(({b})=>b.x<0||b.y<0||b.x+b.width>v.width+.01||b.y+b.height>v.height+.01);});assert.deepEqual(clipped,[]);
 const labelClips=await page.locator('#map .contour-elevation-label, #map .contour-legend text').evaluateAll(nodes=>nodes.filter(n=>{const b=n.getBBox(),v=n.ownerSVGElement.viewBox.baseVal;return b.x<0||b.y<0||b.x+b.width>v.width+.1||b.y+b.height>v.height+.1;}).map(n=>n.textContent));assert.deepEqual(labelClips,[]);
 await page.locator('#map').screenshot({path:new URL('profile-cartography-narrow.png',output).pathname});
 await page.locator('#profile-panel').screenshot({path:new URL('profile-narrow.png',output).pathname});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#lesson-next').click();await saved();assert.match(await page.locator('#lesson-revision').textContent(),/all questions answered/);assert.equal(await page.locator('#profile-panel').isVisible(),false);
 await page.locator('#lesson-import').setInputFiles({name:'profile-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));await page.waitForFunction(()=>!document.getElementById('save-fork').disabled);await page.locator('#save-fork').click();await saved();
 await page.setViewportSize({width:1280,height:1000});return {quantities:['ascent','descent','net-change'],signedAnswer:true,chartAndTable:true,keyboardRetry:true,saveReload:true,invalidImportRetained:true,backupFork:true,letterDownloads:4,nativeDocuments:4,narrowReflow:true};
}
