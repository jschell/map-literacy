import assert from 'node:assert/strict';

/** Synthetic independent layers exercise alignment, missing-source gates and stale responses. */
export async function checkTerrain(page, checkPdfDownload) {
  const fixtures = await page.evaluate(() => {
    const result = {};
    for (const [width, height] of [[1980,1530], [1530,1980]]) for (const id of ['water','contours','roads','relief']) {
      const c = document.createElement('canvas'); c.width = width; c.height = height; const p = c.getContext('2d');
      if (id === 'water') { p.fillStyle = '#7dbbe8'; p.fillRect(100, 100, 180, height - 200); }
      if (id === 'contours') {
        p.strokeStyle = '#ac713d'; p.lineWidth = 2;
        for (let y = 70; y < height - 70; y += 48) { p.beginPath(); p.moveTo(320,y); p.bezierCurveTo(700,y-40,1000,y+40,width-50,y); p.stroke(); }
        p.fillStyle = '#714719'; p.font = '24px Arial'; p.fillText('SYNTHETIC 200 m', 500, 400);
      }
      if (id === 'roads') { p.strokeStyle = '#555555'; p.lineWidth = 5; p.beginPath(); p.moveTo(400,80); p.lineTo(width-80,height-80); p.stroke(); }
      if (id === 'relief') { p.fillStyle = '#888888'; p.fillRect(0,0,width,height); }
      result[`${width},${height}/${id}`] = c.toDataURL('image/png').split(',')[1];
    }
    return result;
  });
  const records = []; let fail = '', holdNext = false, release, held;
  const matcher = /^https:\/\/(?:carto|basemap|elevation)\.nationalmap\.gov\/.*\/(?:export|exportImage)\?/;
  const handler = async (route) => {
    const u = new URL(route.request().url()), size = u.searchParams.get('size');
    const id = u.pathname.includes('USGSHydroCached') ? 'water' : u.pathname.includes('contours') ? 'contours' : u.pathname.includes('transportation') ? 'roads' : 'relief';
    records.push({ id, size, bbox: u.searchParams.get('bbox'), layers: u.searchParams.get('layers') });
    if (holdNext && id === 'water') { holdNext = false; held(); await new Promise((r) => { release = r; }); }
    if (fail === id) return route.fulfill({ contentType: 'application/json', body: '{"error":{"message":"source unavailable"}}' }).catch(() => {});
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'image/png', body: Buffer.from(fixtures[`${size}/${id}`], 'base64') }).catch(() => {});
  };
  await page.route(matcher, handler);
  const ready = () => page.waitForFunction(() => !document.getElementById('explorer-print').disabled && !!document.querySelector('#explorer-terrain canvas'));
  const jump = async (lat, lon) => { await page.locator('#explorer-location').fill(`https://www.openstreetmap.org/#map=15/${lat}/${lon}`); await page.locator('#explorer-jump button').click(); };
  await jump(47.5,-121.75);
  await page.evaluate(() => { window.terrainOriginalPrint = window.print; window.terrainPrintCalls = 0; window.print = () => { window.terrainPrintCalls++; }; });
  try {
    await page.locator('#explorer-basemap').selectOption('terrain'); await ready();
    assert.equal(await page.locator('#explorer-relief-wrap').isVisible(), true);
    assert.equal(await page.locator('#explorer-labels').isDisabled(), true);
    assert.equal(await page.locator('#explorer-vector svg').count(), 0);
    for (const orientation of ['landscape','portrait']) {
      await page.locator('#orientation').selectOption(orientation); await ready();
      await page.locator('#explorer-print').click();
      const canvas = page.locator('#geographic-paper-tiles canvas');
      const samples = await canvas.evaluate((c) => ({ width:c.width,height:c.height,water:[...c.getContext('2d').getImageData(180,200,1,1).data],background:[...c.getContext('2d').getImageData(20,20,1,1).data] }));
      assert.deepEqual([samples.width,samples.height], orientation === 'landscape' ? [1980,1530] : [1530,1980]);
      assert.equal(samples.water[0],samples.water[1]); assert.ok(samples.water[0]<220); assert.deepEqual(samples.background,[255,255,255,255]);
      assert.match(await page.locator('#geographic-paper-credit').textContent(), /units\/interval unverified/);
      const pdf = await page.pdf({ path:new URL(`../artifacts/browser/terrain-native-${orientation}.pdf`,import.meta.url).pathname,preferCSSPageSize:true,printBackground:true });
      assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)??[]).length,1); assert.match(pdf.toString('latin1'),/\/Subtype\s*\/Image/);
      await checkPdfDownload(page,orientation,'terrain');
    }
    const requestsBeforeStyle = records.length;
    await page.locator('#explorer-appearance').selectOption('color');
    const colored = await page.locator('#explorer-terrain canvas').evaluate((c)=>[...c.getContext('2d').getImageData(180,200,1,1).data]);
    assert.notEqual(colored[0],colored[2]); assert.equal(records.length,requestsBeforeStyle,'styling reuses current loaded sources');
    await checkPdfDownload(page,'portrait','terrain-color');
    await page.locator('#explorer-appearance').selectOption('bw');
    await page.locator('#explorer-relief').selectOption('light'); await ready();
    await page.locator('#explorer-print').click();
    const shaded = await page.locator('#geographic-paper-tiles canvas').evaluate((c)=>c.getContext('2d').getImageData(20,20,1,1).data[0]);
    assert.ok(shaded < 255 && shaded > 215,'optional relief stays light');
    assert.match(await page.locator('#geographic-paper-credit').textContent(),/light relief/);
    fail='roads'; await page.locator('#explorer-retry').click();
    await page.waitForFunction(()=>document.getElementById('explorer-status').textContent.includes('PNG'));
    assert.equal(await page.locator('#explorer-print').isDisabled(),true); assert.equal(await page.locator('#explorer-pdf').isDisabled(),true);
    fail=''; await page.locator('#explorer-retry').click(); await ready();
    holdNext=true; const started=new Promise(r=>{held=r;}); await jump(47.51,-121.75); await started;
    assert.equal(await page.locator('#explorer-print').isDisabled(),true);
    await jump(47.52,-121.75); await ready(); release();
    await page.locator('#explorer-print').click(); assert.match(await page.locator('#geographic-print').getAttribute('data-center'),/^47.52000,/);
    await page.locator('#explorer-map').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#explorer-print').isDisabled(),true); await ready();
    await page.locator('#explorer-world').click();
    await page.waitForFunction(()=>document.getElementById('explorer-status').textContent.includes('13–16')); assert.equal(await page.locator('#explorer-print').isDisabled(),true);
    await jump(47.5,-121.75); await ready();
    await page.locator('#explorer-relief').selectOption('off'); await ready();
    assert.ok(await page.locator('#explorer-print').isEnabled());
    assert.ok((await page.evaluate(()=>window.terrainPrintCalls))>=4);
    const grids = new Map(); for(const r of records) { const key=r.bbox+'/'+r.size; if(!grids.has(key)) grids.set(key,new Set()); grids.get(key).add(r.id); }
    assert.ok([...grids.values()].some(ids=>ids.has('contours')&&ids.has('water')&&ids.has('roads')&&ids.has('relief')));
    await page.locator('#explorer-basemap').selectOption('street');
    await page.waitForFunction(()=>!document.getElementById('explorer-print').disabled&&!!document.querySelector('#explorer-vector svg'));
    assert.equal(await page.locator('#explorer-relief-wrap').isVisible(),false);
    return { sharedGrid:true,sourcePixels:[1980,1530],missingLayerBlocksPrint:true,staleViewRejected:true,lightRelief:true,letterPdf:true };
  } finally {
    release?.(); await page.unroute(matcher,handler);
    await page.evaluate(()=>{window.print=window.terrainOriginalPrint;delete window.terrainOriginalPrint;delete document.body.dataset.printTarget;delete document.body.dataset.printOrientation;});
  }
}
