import assert from 'node:assert/strict';
import { buildTerrainLessonFixture } from './terrain-lesson-fixture.js';

export async function checkTerrainLessons(page,base,output) {
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  const saved=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
  try {
    await page.setViewportSize({width:1280,height:1000});
    await page.goto(base);
    await page.waitForFunction(()=>!document.getElementById('scale').disabled);
    await page.locator('#scale').selectOption('5000');await page.locator('#orientation').selectOption('landscape');
    await page.waitForFunction(()=>document.getElementById('preferences-status').textContent.includes('View preferences saved'));
    await page.locator('#heading').selectOption('0');
    await page.locator('#terrain-demo').click();
    await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic hill'));
    assert.equal(await page.locator('#map .feature--contour').count(),3);
    assert.equal(await page.locator('#map .contour-legend').count(),1);
    assert.equal(await page.locator('#map .contour-elevation-label').count(),0);
    assert.equal(await page.locator('#paper-map .contour-elevation-label').count(),0);
    assert.match(await page.locator('#paper-map .contour-legend').textContent(),/Interval: 5 m.*Index: every 25 m/);

    assert.equal(await page.locator('#scale').inputValue(),'1000');
    assert.equal(await page.locator('#orientation').inputValue(),'portrait');
    assert.equal(await page.locator('#print-output').inputValue(),'learner');
    assert.equal(await page.locator('#paper-map .heading-arrow').count(),0);
    assert.deepEqual(await page.locator('#paper-map .exercise-mark').allTextContents(),['80 m','A']);
    await page.locator('#print-preview summary').click();
    await page.locator('#print-preview-content svg').waitFor({state:'visible'});
    const previewMarks=await page.locator('#print-preview-content .exercise-mark').allTextContents();
    assert.deepEqual(previewMarks,['80 m','A']);
    // Map-only output keeps terrain guidance and no stale heading/route wording.
    await page.locator('#print-output').selectOption('map');
    assert.match(await page.locator('#paper-summary').textContent(),/Contour interval: 5 m/);
    assert.ok(await page.locator('#paper-map .contour-elevation-label').count()>0);
    await page.locator('#variant').selectOption('blank');
    assert.equal(await page.locator('#paper-map .contour-elevation-label').count(),0);
    await page.locator('#variant').selectOption('labeled');

    assert.equal(await page.locator('#paper-map .heading-arrow').count(),0);
    await page.locator('#print-output').selectOption('learner');
    await page.locator('#lesson-start').click();await saved();
    await page.waitForFunction(()=>document.querySelector('#map .exercise-annotations')?.textContent.includes('80 m'));
    assert.deepEqual(await page.locator('#map .exercise-mark').allTextContents(),['80 m','A']);
    await page.locator('#lesson-submit').focus();await page.keyboard.press('Enter');
    assert.match(await page.locator('#lesson-status').textContent(),/Enter a valid answer/);
    await page.locator('#answer-elevation').fill('75');await page.locator('#lesson-submit').click();await saved();
    assert.match(await page.locator('#lesson-status').textContent(),/Try again/);
    await page.locator('#lesson-retry').focus();await page.keyboard.press('Enter');await saved();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-elevation');
    await page.locator('#lesson-hint').click();await saved();
    await page.locator('#answer-elevation').fill('85');await page.locator('#lesson-submit').focus();await page.keyboard.press('Enter');await saved();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'lesson-next');
    await page.locator('#rotate').click();
    const download=page.waitForEvent('download');await page.locator('#lesson-export').click();const file=await download;const path=await file.path();
    const {readFile}=await import('node:fs/promises');const backup=JSON.parse(await readFile(path,'utf8'));const id=backup.sessions[0].id;
    assert.equal(backup.packs[0].schemaVersion,2);assert.equal(backup.attempts.length,2);assert.equal(backup.sessions[0].hintCounts['elevation-1'],1);
    await page.reload();await page.waitForFunction(id=>[...document.getElementById('saved-session').options].some(o=>o.value===id),id);
    await page.locator('#saved-session').selectOption(id);await page.locator('#saved-resume').click();await saved();
    await page.waitForFunction(()=>document.getElementById('lesson-revision').textContent.includes('synthetic-terrain-hill'));
    assert.equal(await page.locator('#lesson-hints li').count(),1);
    const version=await page.locator('#map').getAttribute('data-load-version');
    const bad=buildTerrainLessonFixture();bad.terrain.contours[0].levelM++;
    await page.locator('#import').setInputFiles({name:'invalid-terrain.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Map not loaded'));
    assert.equal(await page.locator('#map').getAttribute('data-load-version'),version);
    await page.locator('#scale').selectOption('1000');
    for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
      await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
      await page.waitForFunction(()=>!document.getElementById('print').disabled);
      const texts=await page.locator('#paper-map .exercise-mark').allTextContents();
      assert.equal(texts.includes(audience==='learner'?'A':'A: 85 m'),true);
      assert.equal(await page.locator('#paper-map .contour-elevation-label').count()>0,audience==='instructor');

      assert.equal((await page.locator('#exercise-pages').textContent()).includes('Expected contour A elevation: 85 m'),audience==='instructor');
      await page.evaluate(()=>document.body.dataset.printTarget='lesson');await page.emulateMedia({media:'print'});
      const pdf=await page.pdf({path:new URL(`terrain-${audience}-${orientation}.pdf`,output).pathname,preferCSSPageSize:true,printBackground:true});
      const dimensions=[...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
      assert.ok(dimensions.length>=2);for(const d of dimensions)assert.deepEqual([Number(d[1]),Number(d[2])],orientation==='portrait'?[612,792]:[792,612]);
      await page.emulateMedia({media:'screen'});
    }
    await page.locator('#print-output').selectOption('map');
    await page.locator('#orientation').selectOption('portrait');
    await page.evaluate(()=>document.body.dataset.printTarget='lesson');
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).page),'letter-portrait');
    const mapPdf=await page.pdf({path:new URL('terrain-map-portrait.pdf',output).pathname,preferCSSPageSize:true,printBackground:true});
    assert.equal([...mapPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length,1);
    await page.emulateMedia({media:'screen'});
    await page.locator('#print-output').selectOption('learner');
    await page.locator('#lesson-next').click();await saved();await page.locator('#answer-elevation').fill('90');await page.locator('#lesson-submit').click();await saved();await page.locator('#lesson-next').click();await saved();
    assert.match(await page.locator('#lesson-revision').textContent(),/completed/);
    const restore=page.locator('#lesson-import');await restore.setInputFiles({name:'terrain-session.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.waitForFunction(()=>document.getElementById('lesson-status').textContent.startsWith('Session restored'));
    assert.match(await page.locator('#lesson-revision').textContent(),/2 attempts/);
    await page.waitForFunction(()=>!document.getElementById('save-fork').disabled);
    await page.locator('#save-fork').click();await saved();
    await page.setViewportSize({width:375,height:820});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#map').screenshot({path:new URL('terrain-lesson.png',output).pathname});
    assert.deepEqual(errors,[]);
    return {contourCartography:true,numericScoring:true,keyboardFocus:true,hintsAndReload:true,backupRestore:true,invalidImportRetained:true,letterDocuments:4,narrowReflow:true};
  } finally {page.off('pageerror',onError);await page.setViewportSize({width:1280,height:1000});}
}
