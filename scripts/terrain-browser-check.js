import assert from 'node:assert/strict';

/** Synthetic independent layers exercise alignment, missing-source gates and stale responses. */
export async function checkTerrain(page, checkPdfDownload) {
  const fixtures = await page.evaluate(() => {
    const result = {};
    for (const [width, height] of [[1980,1530], [1530,1980]]) for (const id of ['water','contours','roads','roads-sparse','relief']) {
      const c = document.createElement('canvas'); c.width = width; c.height = height; const p = c.getContext('2d');
      if (id === 'water') { p.fillStyle = '#7dbbe8'; p.fillRect(100, 100, 180, height - 200); }
      if (id === 'contours') {
        p.strokeStyle = '#ac713d'; p.lineWidth = 2;
        for (let y = 70; y < height - 70; y += 48) { p.beginPath(); p.moveTo(320,y); p.bezierCurveTo(700,y-40,1000,y+40,width-50,y); p.stroke(); }
        p.fillStyle = '#714719'; p.font = '24px Arial'; p.fillText('SYNTHETIC 200 ft', 500, 400);
      }
      if (id === 'roads' || id === 'roads-sparse') { p.strokeStyle = '#555555'; p.lineWidth = 5; p.beginPath(); p.moveTo(400,80); p.lineTo(width-80,height-80); p.stroke(); }
      if (id === 'roads') { p.strokeStyle='#222222'; p.lineWidth=8; p.beginPath(); p.moveTo(350,700); p.lineTo(width-100,700); p.stroke(); p.fillStyle='#222222'; p.font='24px Arial'; p.fillText('Test Local St',500,680); }
      if (id === 'relief') { p.fillStyle = '#888888'; p.fillRect(0,0,width,height); }
      result[`${width},${height}/${id}`] = c.toDataURL('image/png').split(',')[1];
    }
    return result;
  });
  const metadataRecords = []; let metadataMode = 'mixed', holdMetadata = false, releaseMetadata, metadataHeld;
  const metadataMatcher = /^https:\/\/carto\.nationalmap\.gov\/arcgis\/rest\/services\/contours\/MapServer\/(25|26|33|34)\/query\?/;
  const metadataHandler = async (route) => {
    const url = new URL(route.request().url()), id = Number(url.pathname.split('/').at(-2)), mode = metadataMode;
    metadataRecords.push({ id, bbox: url.searchParams.get('geometry') });
    if (holdMetadata && id === 25) { holdMetadata = false; metadataHeld(); await new Promise(r => { releaseMetadata = r; }); }
    const attributes = mode === 'metric' ? [{ contourunits:2, contourinterval:10 }] : [{ contourunits:1, contourinterval:20 },{ contourunits:1, contourinterval:40 }];
    let data = { features: id < 30 ? attributes.map(a=>({ attributes:a })) : [] };
    if(mode === 'unknown' && id === 26) data.features = [{ attributes:{ contourunits:99, contourinterval:20 } }];
    if(mode === 'partial' && id === 33) data.exceededTransferLimit = true;
    if(mode === 'error') data = { error:{ code:500 } };
    await route.fulfill({ contentType:'application/json',body:JSON.stringify(data) }).catch(()=>{});
  };
  await page.route(metadataMatcher,metadataHandler);
  const metadataReady = (part = '20 ft, 40 ft') => page.waitForFunction((part)=>document.getElementById('explorer-contour-details').textContent.includes(part),part);
  const records = []; let fail = '', holdNext = false, release, held;
  const matcher = /^https:\/\/(?:carto|basemap|elevation)\.nationalmap\.gov\/.*\/(?:export|exportImage)\?/;
  const handler = async (route) => {
    const u = new URL(route.request().url()), size = u.searchParams.get('size');
    const id = u.pathname.includes('USGSHydroCached') ? 'water' : u.pathname.includes('contours') ? 'contours' : u.pathname.includes('transportation') ? 'roads' : 'relief';
    records.push({ id, size, bbox: u.searchParams.get('bbox'), layers: u.searchParams.get('layers') });
    if (holdNext && id === 'water') { holdNext = false; held(); await new Promise((r) => { release = r; }); }
    if (fail === id) return route.fulfill({ contentType: 'application/json', body: '{"error":{"message":"source unavailable"}}' }).catch(() => {});
    return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'image/png', body: Buffer.from(fixtures[`${size}/${id === 'roads' && !u.searchParams.get('layers').split(',').includes('32') ? 'roads-sparse' : id}`], 'base64') }).catch(() => {});
  };
  await page.route(matcher, handler);
  const ready = () => page.waitForFunction(() => !document.getElementById('explorer-print').disabled && !!document.querySelector('#explorer-terrain canvas'));
  const jump = async (lat, lon) => { await page.locator('#explorer-location').fill(`https://www.openstreetmap.org/#map=15/${lat}/${lon}`); await page.locator('#explorer-jump button').click(); };
  await jump(47.5,-121.75);
  await page.evaluate(() => { window.terrainOriginalPrint = window.print; window.terrainPrintCalls = 0; window.print = () => { window.terrainPrintCalls++; }; });
  try {
    await page.locator('#explorer-basemap').selectOption('terrain'); await ready(); await metadataReady();
    assert.equal(await page.locator('#explorer-relief-wrap').isVisible(), true);
    assert.equal(await page.locator('#explorer-terrain-roads-wrap').isVisible(), true);
    assert.equal(await page.locator('#explorer-terrain-roads').inputValue(),'streets');
    assert.equal(await page.locator('#explorer-labels').isDisabled(), true);
    assert.equal(await page.locator('#explorer-vector svg').count(), 0);
    const terrainViewport=page.viewportSize();await page.setViewportSize({width:320,height:900});await ready();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'terrain controls fit a phone');
    await page.setViewportSize(terrainViewport);await ready();
    for (const orientation of ['landscape','portrait']) {
      await page.locator('#explorer-orientation').selectOption(orientation); await ready(); await metadataReady();
      await page.locator('#explorer-print').click();
      const canvas = page.locator('#geographic-paper-tiles canvas');
      const samples = await canvas.evaluate((c) => ({ width:c.width,height:c.height,water:[...c.getContext('2d').getImageData(180,200,1,1).data],background:[...c.getContext('2d').getImageData(20,20,1,1).data],localStreet:c.getContext('2d').getImageData(600,700,1,1).data[0] }));
      assert.deepEqual([samples.width,samples.height], orientation === 'landscape' ? [1980,1530] : [1530,1980]);
      assert.ok(samples.localStreet<150,'terrain print includes local street geometry');
      assert.equal(samples.water[0],samples.water[1]); assert.ok(samples.water[0]<220); assert.deepEqual(samples.background,[255,255,255,255]);
      assert.match(await page.locator('#geographic-paper-credit').textContent(), /20 ft, 40 ft \(vary within this area\)/);
      const pdf = await page.pdf({ path:new URL(`../artifacts/browser/terrain-native-${orientation}.pdf`,import.meta.url).pathname,preferCSSPageSize:true,printBackground:true });
      assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)??[]).length,1); assert.match(pdf.toString('latin1'),/\/Subtype\s*\/Image/);
      await checkPdfDownload(page,orientation,'terrain');
    }
    const metadataBeforeRoadChoice=metadataRecords.length;
    await page.locator('#explorer-terrain-roads').selectOption('sparse'); await ready();
    await page.locator('#explorer-print').click();
    const roadSample=()=>page.locator('#geographic-paper-tiles canvas').evaluate(c=>c.getContext('2d').getImageData(600,700,1,1).data[0]);
    assert.ok((await roadSample())>220,'sparse selection excludes the local street');
    assert.match(await page.locator('#geographic-paper-credit').textContent(),/highways\/trails/);
    await page.locator('#explorer-terrain-roads').selectOption('streets'); await ready(); await page.locator('#explorer-print').click();
    assert.ok((await roadSample())<150);assert.match(await page.locator('#geographic-paper-credit').textContent(),/streets\/trails/);
    assert.equal(metadataRecords.length,metadataBeforeRoadChoice,'road detail changes reuse same-area contour metadata');
    holdNext=true;const changingRoads=new Promise(r=>{held=r;});
    await page.locator('#explorer-terrain-roads').selectOption('sparse'); await changingRoads;
    assert.equal(await page.locator('#explorer-print').isDisabled(),true);
    await page.locator('#explorer-terrain-roads').selectOption('streets'); await ready(); release();
    await page.locator('#explorer-print').click();assert.ok((await roadSample())<150,'late sparse response cannot replace streets');
    const requestsBeforeStyle = records.length, detailsBeforeStyle = metadataRecords.length;
    await page.locator('#explorer-appearance').selectOption('color');
    const colored = await page.locator('#explorer-terrain canvas').evaluate((c)=>[...c.getContext('2d').getImageData(180,200,1,1).data]);
    assert.notEqual(colored[0],colored[2]); assert.equal(records.length,requestsBeforeStyle,'styling reuses current loaded sources');
    await checkPdfDownload(page,'portrait','terrain-color');
    await page.locator('#explorer-appearance').selectOption('bw');
    await page.locator('#explorer-relief').selectOption('light'); await ready();
    assert.equal(metadataRecords.length,detailsBeforeStyle,'relief/style changes reuse current-area metadata');
    await page.locator('#explorer-print').click();
    const shaded = await page.locator('#geographic-paper-tiles canvas').evaluate((c)=>c.getContext('2d').getImageData(20,20,1,1).data[0]);
    assert.ok(shaded < 255 && shaded > 215,'optional relief stays light');
    assert.match(await page.locator('#geographic-paper-credit').textContent(),/light relief/);
    fail='roads'; await page.locator('#explorer-retry').click();
    await page.waitForFunction(()=>document.getElementById('explorer-status').textContent.includes('PNG'));
    assert.equal(await page.locator('#explorer-print').isDisabled(),true); assert.equal(await page.locator('#explorer-pdf').isDisabled(),true);
    fail=''; await page.locator('#explorer-retry').click(); await ready();
    for(const mode of ['unknown','partial','error']) {
      metadataMode = mode; await page.locator('#explorer-retry').click(); await ready(); await metadataReady('details unavailable or incomplete');
      assert.equal(await page.locator('#explorer-print').isEnabled(),true,'metadata failure must not block basic map printing');
      await page.locator('#explorer-print').click(); assert.match(await page.locator('#geographic-paper-credit').textContent(),/units\/interval unverified/);
    }
    metadataMode='mixed'; holdMetadata=true; const detailsStarted=new Promise(r=>{metadataHeld=r;});
    await jump(47.53,-121.75); await ready(); await detailsStarted;
    await page.locator('#explorer-print').click(); assert.match(await page.locator('#geographic-paper-credit').textContent(),/source details pending/);
    await checkPdfDownload(page,'portrait','terrain-metadata-pending');
    metadataMode='metric'; await jump(47.54,-121.75); await ready(); await metadataReady('10 m'); releaseMetadata();
    await page.locator('#explorer-print').click();
    assert.match(await page.locator('#geographic-print').getAttribute('data-center'),/^47.54000,/);
    assert.match(await page.locator('#geographic-paper-credit').textContent(),/interval: 10 m/);
    assert.equal((await page.locator('#geographic-paper-credit').textContent()).includes('20 ft'),false);
    metadataMode='mixed';
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
    assert.equal(await page.locator('#explorer-terrain-roads-wrap').isVisible(),false);
    return { localStreetContext:true,staleRoadChoiceRejected:true,contourMetadata:true,metadataFailureKeepsPrint:true,staleMetadataRejected:true,sharedGrid:true,sourcePixels:[1980,1530],missingLayerBlocksPrint:true,staleViewRejected:true,lightRelief:true,letterPdf:true };
  } finally {
    releaseMetadata?.(); await page.unroute(metadataMatcher,metadataHandler);
    release?.(); await page.unroute(matcher,handler);
    await page.evaluate(()=>{window.print=window.terrainOriginalPrint;delete window.terrainOriginalPrint;delete document.body.dataset.printTarget;delete document.body.dataset.printOrientation;});
  }
}
