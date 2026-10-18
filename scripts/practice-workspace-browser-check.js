import assert from 'node:assert/strict';

/** Complete spatial tasks with the controls a learner sees, never by filling coordinates. */
export async function checkPracticeWorkspace(page, base, output) {
  const saved = () => page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
  const marks = () => page.locator('#map .exercise-mark').allTextContents();
  const clickReference = async (text, touch = false) => {
    const reference = page.locator('#map .exercise-mark').filter({hasText:new RegExp(`^${text}$`)});
    await reference.scrollIntoViewIfNeeded(); const box = await reference.boundingBox(); assert.ok(box);
    if (touch) await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  };
  await page.goto(base); await page.locator('#demo').click(); await page.locator('#lesson-start').click(); await saved();
  await page.locator('#answer-heading').fill('0'); await page.locator('#lesson-submit').click(); await saved();
  await page.locator('#lesson-next').click(); await saved();
  assert.match(await page.locator('#lesson-prompt').textContent(),/Locate A/);
  assert.ok((await marks()).includes('A')); assert.ok(!(await marks()).includes('X'));
  assert.equal(await page.locator('#answer-lon').isVisible(), false, 'coordinate entry is optional advanced detail');
  await clickReference('A'); assert.ok((await marks()).includes('?'));
  await page.locator('#lesson-reset').click(); await page.waitForFunction(()=>![...document.querySelectorAll('#map .exercise-mark')].some(n=>n.textContent==='?')); assert.ok(!(await marks()).includes('?'));
  await page.locator('#endpoint-coordinates summary').click();
  await page.locator('#answer-lon').fill('1'); await page.locator('#answer-lat').fill('1');
  await page.locator('#lesson-submit').click(); assert.match(await page.locator('#lesson-status').textContent(),/^Enter a valid answer/);
  assert.ok(!(await marks()).includes('?'),'invalid coordinates cannot submit a point different from the marker');
  await page.locator('#answer-lon').fill('0'); await page.locator('#answer-lat').fill('0');
  assert.ok((await marks()).includes('?'));
  await page.locator('#lesson-reset').click(); await page.locator('#endpoint-coordinates summary').click();
  await page.locator('#endpoint-place').click(); assert.equal(await page.evaluate(()=>document.activeElement.id),'map-panel');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'map-panel','redrawing keeps keyboard map focus');
  assert.ok((await marks()).includes('?'));
  await page.locator('#lesson-reset').click();
  await page.locator('#rotate').click(); await clickReference('A');
  await page.locator('#lesson-submit').click(); await saved(); assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
  await page.locator('#lesson-retry').click(); await saved();
  await page.locator('#endpoint-reference').selectOption('C');
  await page.locator('#lesson-submit').click(); await saved(); assert.match(await page.locator('#lesson-status').textContent(),/^Try again/);
  await page.locator('#lesson-retry').click(); await saved();
  await page.locator('#endpoint-reference').selectOption('A');
  await page.locator('#lesson-submit').click(); await saved();
  const mapBox = await page.locator('#map-panel').boundingBox(), answerBox = await page.locator('.practice-answer').boundingBox();
  assert.ok(mapBox.x+mapBox.width<=answerBox.x,'desktop map is beside answers');
  await page.locator('#practice-workspace').screenshot({path:new URL('practice-endpoint-desktop.png',output).pathname});
  await page.locator('#lesson-next').click(); await saved();
  assert.equal(await page.locator('#trace-start').inputValue(),'A'); assert.equal(await page.locator('#trace-mode').inputValue(),'drive');
  assert.equal(await page.locator('#trace-map').getAttribute('aria-pressed'),'true');
  for (const edge of ['AB','BC']) { await page.locator('#trace-edge').selectOption(edge); await page.locator('#trace-add').click(); }
  await page.locator('#lesson-submit').click(); await saved(); assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
  await page.locator('#lesson-next').click(); await saved();
  assert.equal(await page.locator('#trace-steps li').count(),0,'new detour does not silently submit the old route');
  assert.ok(await page.locator('#map .closure-line').count()>=2);
  assert.ok((await marks()).includes('Start A')); assert.ok((await marks()).includes('End C'));
  // A fresh alternative can be drawn by map taps without configuring start/mode.
  for (const id of ['road:AD','road:DC']) {
    await page.locator('#map').scrollIntoViewIfNeeded();
    const point = await page.locator(`#map .feature-hit[data-feature-id="${id}"]`).evaluate(path=>{
      const p=path.getPointAtLength(path.getTotalLength()/2).matrixTransform(path.getScreenCTM()); return {x:p.x,y:p.y};
    });
    await page.mouse.click(point.x,point.y);
  }
  assert.equal(await page.locator('#trace-steps li').count(),2);
  assert.equal(await page.locator('#map .trace-marker').count(),0,'task destination is not confused with the trace cursor');
  await page.locator('#lesson-submit').click(); await saved(); assert.match(await page.locator('#lesson-status').textContent(),/^Correct/);
  await page.locator('#practice-workspace').screenshot({path:new URL('practice-detour-desktop.png',output).pathname});
  await page.locator('#lesson-end').click(); await saved();
  await page.locator('#profile-demo').click(); await page.locator('#lesson-start').click(); await saved();
  assert.equal(await page.locator('#profile-panel').isVisible(),true);
  assert.equal(await page.locator('#lesson-route').isVisible(),false);
  await page.setViewportSize({width:390,height:844});
  const narrow = await page.locator('#map-panel').boundingBox(), below = await page.locator('.practice-answer').boundingBox(), chart = await page.locator('#profile-panel').boundingBox();
  assert.ok(chart.y>=narrow.y+narrow.height-1 && below.y>=chart.y+chart.height-1,'mobile profile belongs between map and answer');
  assert.ok(below.y-chart.y-chart.height<75,'unrelated controls do not separate evidence from answers');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#practice-workspace').screenshot({path:new URL('practice-profile-mobile.png',output).pathname});
  await page.locator('#lesson-end').click(); await saved();
  await page.locator('#demo').click(); await page.locator('#lesson-start').click(); await saved();
  await page.locator('#answer-heading').fill('0'); await page.locator('#lesson-submit').click(); await saved();
  await page.locator('#lesson-next').click(); await saved();
  const mobileMap = await page.locator('#map-panel').boundingBox(), mobileAnswer = await page.locator('.practice-answer').boundingBox();
  assert.ok(mobileAnswer.y-mobileMap.y-mobileMap.height<75,'mobile answer follows the map without review controls');
  await page.locator('#practice-workspace').screenshot({path:new URL('practice-endpoint-mobile.png',output).pathname});
  await page.setViewportSize({width:1280,height:1000});
  return {pointerEndpoint:true,keyboardEndpoint:true,rotatedPlacement:true,resetAndRetry:true,routeContext:true,newQuestionClearsTrace:true,visibleClosure:true,desktopAdjacent:true,mobileStacked:true,profileTogether:true};
}
