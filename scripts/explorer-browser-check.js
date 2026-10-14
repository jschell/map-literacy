import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { geographicFixture } from './geographic-fixture.js';
const tileImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwONAAAAKUAXE89+72AAAAAElFTkSuQmCC', 'base64');
export async function mockTiles(surface) {
  await surface.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'image/png', body: tileImage }));
  await surface.route('https://overpass-api.de/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(geographicFixture(new URLSearchParams(route.request().postData()).get('data'))) }));
}
export async function checkExplorer(page, base) {
  const requests = [], sourceRequests = []; let failSource = false, failTiles = false, releaseInitial, sourceRejections = 0; const initialSource = new Promise((resolve) => { releaseInitial = resolve; });
  await page.route('https://tile.openstreetmap.org/**', (route) => { requests.push(route.request().url()); return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'image/png', body: failTiles ? Buffer.from('invalid tile') : tileImage }); });
  await page.route('https://overpass-api.de/**', (route) => {
    const query = new URLSearchParams(route.request().postData()).get('data'); sourceRequests.push(query);
    if (failSource === 'http') sourceRejections++;
    return initialSource.then(() => route.fulfill({ ...(failSource === 'http' ? { status: 406 } : {}), contentType: 'application/json', body: JSON.stringify(failSource ? { version: .6, elements: [], remark: 'test failure' } : geographicFixture(query)) }));
  });
  const ready = () => page.locator('#explorer-print').waitFor({ state: 'visible' }).then(() => page.waitForFunction(() => !document.getElementById('explorer-print').disabled && !!document.querySelector('#explorer-vector svg')));
  await page.goto(base);
  // Slow or blocked street data must not block printing an already visible map.
  await page.waitForFunction(() => !document.getElementById('explorer-print').disabled);
  assert.match(await page.locator('#explorer-print-status').textContent(), /visible tile map/);
  await page.evaluate(() => {
    window.basicPrintChecks = [];
    document.getElementById('explorer-print').addEventListener('click', () => { window.basicClick = true; }, { capture: true });
    document.getElementById('explorer-print').addEventListener('click', () => { window.basicClick = false; });
    window.print = () => { window.basicPrintCalls = (window.basicPrintCalls ?? 0) + 1; window.basicPrintChecks.push(window.basicClick); };
  });
  await page.locator('#explorer-print').click();
  assert.equal(await page.evaluate(() => window.basicPrintCalls), 1);
  assert.deepEqual(await page.evaluate(() => window.basicPrintChecks), [true], 'pixel conversion preserves synchronous native printing');
  assert.ok(await page.locator('#geographic-paper-tiles canvas, #geographic-paper-tiles img').count());
  assert.equal(await page.locator('#geographic-paper-tiles').getAttribute('data-appearance'), 'bw');
  assert.ok(await page.locator('#geographic-paper-tiles canvas').evaluateAll((canvases) => canvases.length > 0 && canvases.every((canvas) => {
    const pixel = canvas.getContext('2d').getImageData(128, 128, 1, 1).data;
    return pixel[0] === pixel[1] && pixel[1] === pixel[2] && pixel[0] > 0 && pixel[0] < 255 && pixel[3] === 255;
  })), 'B&W is encoded in actual tile pixels, independent of CSS print filters');
  assert.match(await page.locator('#geographic-paper-credit').textContent(), /Tile map: fixed names/);
  await page.evaluate(() => { delete document.body.dataset.printTarget; });
  releaseInitial(); await ready();
  assert.equal(await page.locator('#map svg').count(), 0, 'no lesson pack is required');
  assert.equal(await page.locator('#explorer-appearance').inputValue(), 'bw');
  assert.equal(await page.locator('#explorer-vector svg [data-street-label]:not([data-street-label=""])').count(), 4);
  assert.match(await page.locator('#explorer-street-status').textContent(), /1 unnamed source roads/);
  const initial = await page.locator('#explorer-vector svg').getAttribute('viewBox');
  await page.evaluate(() => {
    window.nativeMapPrint = window.print; window.originalMapDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = () => new Promise(() => {}); window.printChecks = []; window.mapPrintCalls = 0;
    document.getElementById('explorer-print').addEventListener('click', () => { window.inMapClick = true; }, { capture: true });
    document.getElementById('explorer-print').addEventListener('click', () => { window.inMapClick = false; });
    window.print = () => { window.mapPrintCalls++; window.printChecks.push(window.inMapClick); };
  });
  for (const orientation of ['landscape', 'portrait']) {
    await page.locator('#orientation').selectOption(orientation); await ready();
    const previous = await page.evaluate(() => window.mapPrintCalls);
    await page.locator('#explorer-print').click();
    assert.equal(await page.evaluate(() => window.mapPrintCalls), previous + 1);
    assert.equal(await page.locator('#geographic-paper-tiles canvas, #geographic-paper-tiles img').count(), 0, 'map output contains no raster imagery');
    assert.ok(await page.locator('#geographic-paper-tiles svg path[data-source-id]').count() >= 5);
    const pdf = await page.pdf({ path: new URL(`../artifacts/browser/geographic-${orientation}.pdf`, import.meta.url).pathname, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span>Browser header</span>', footerTemplate: '<span>Browser footer</span>' });
    const boxes = [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)];
    assert.equal(boxes.length, 1); assert.deepEqual(boxes[0].slice(1).map(Number), orientation === 'portrait' ? [612, 792] : [792, 612]);
    assert.equal(/\/Subtype\s*\/Image/.test(pdf.toString('latin1')), false, 'streets and names remain vector');
  }
  assert.deepEqual(await page.evaluate(() => window.printChecks), [true, true]);
  await page.evaluate(() => { window.print = window.nativeMapPrint; HTMLImageElement.prototype.decode = window.originalMapDecode; delete document.body.dataset.printTarget; });
  await page.locator('#orientation').selectOption('landscape'); await ready();
  await page.locator('#explorer-labels').selectOption('blank');
  assert.equal(await page.locator('#explorer-vector [data-street-label]:not([data-street-label=""])').count(), 0);
  await page.locator('#explorer-labels').selectOption('partial');
  const partial = await page.locator('#explorer-vector [data-street-label]:not([data-street-label=""])').count(); assert.ok(partial > 0 && partial < 4);
  await page.locator('#explorer-labels').selectOption('labeled');
  await page.locator('#explorer-appearance').selectOption('color'); assert.ok(await page.locator('#explorer-vector path[stroke="#984324"]').count());
  await page.locator('#explorer-appearance').selectOption('bw');
  const beforeResize = await page.locator('#explorer-vector svg').getAttribute('viewBox'), scale = await page.locator('#explorer-vector svg').getAttribute('data-scale');
  const viewport = page.viewportSize(); await page.setViewportSize({ width: 320, height: 900 }); await ready();
  assert.equal(await page.locator('#explorer-vector svg').getAttribute('viewBox'), beforeResize);
  assert.equal(await page.locator('#explorer-vector svg').getAttribute('data-scale'), scale);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const readablePreview = (expectedWidth) => page.waitForFunction((expectedWidth) => {
    const svg = document.querySelector('#explorer-vector svg');
    if (!svg) return false;
    const width = svg.getBoundingClientRect().width;
    if (expectedWidth !== undefined && Math.abs(width - expectedWidth) > .05) return false;
    const renderedWidth = Number(svg.dataset.previewWidth);
    if (!Number.isFinite(renderedWidth) || Math.abs(renderedWidth - width) > .05) return false;
    const labels = [...svg.querySelectorAll('[data-street-label]:not([data-street-label=""])')];
    return labels.length > 0 && labels.every((node) => Number(node.getAttribute('font-size')) * width / svg.viewBox.baseVal.width >= 11.9);
  }, expectedWidth);
  await readablePreview();
  // Isolate frame-only sizing from the explorer's legitimate inline layout updates.
  // CSSOM keeps CSP intact; !important owns these test dimensions until cleanup.
  for (const width of [231.5, 227.25, 223.5]) {
    const rule = await page.evaluate((width) => {
      const frame = document.getElementById('explorer-frame'), box = document.querySelector('#explorer-vector svg').viewBox.baseVal;
      const sheet = document.styleSheets[0];
      const index = sheet.insertRule(`#explorer-frame { width: ${width}px !important; height: ${width * box.height / box.width}px !important; }`, sheet.cssRules.length);
      // Reproduce a late app layout write that previously overwrote the test width.
      const previous = { width: frame.style.width, height: frame.style.height };
      requestAnimationFrame(() => { frame.style.width = previous.width; frame.style.height = previous.height; });
      return index;
    }, width);
    try {
      await readablePreview(width);
      assert.equal(await page.locator('#explorer-vector svg').getAttribute('viewBox'), beforeResize);
      assert.equal(await page.locator('#explorer-vector svg').getAttribute('data-scale'), scale);
    } finally { await page.evaluate((rule) => document.styleSheets[0].deleteRule(rule), rule); }
    await readablePreview();
  }
  // Check convergence after repeated responsive and fractional-width frame changes.
  for (const width of [641, 375, 321, 320]) {
    await page.setViewportSize({ width, height: 900 }); await readablePreview();
    assert.equal(await page.locator('#explorer-vector svg').getAttribute('viewBox'), beforeResize);
    assert.equal(await page.locator('#explorer-vector svg').getAttribute('data-scale'), scale);
  }
  await page.locator('.explorer').screenshot({ path: new URL('../artifacts/browser/geographic-mobile.png', import.meta.url).pathname });
  await page.setViewportSize(viewport); await ready();
  await page.locator('summary').filter({ hasText: 'Practice markings' }).click();
  await page.locator('#explorer-mark-start').click(); await page.locator('#explorer-map').focus(); await page.keyboard.press('Enter');
  await page.locator('#explorer-heading').selectOption('90'); assert.equal(await page.locator('#explorer-vector [data-heading]').getAttribute('data-heading'), '90');
  const downloadEvent = page.waitForEvent('download'); await page.locator('#explorer-svg').click(); const exportedSvg = await readFile(await (await downloadEvent).path(), 'utf8'); assert.ok(exportedSvg.includes('OpenStreetMap contributors') && exportedSvg.includes('ODbL-1.0'));
  const sourceEvent = page.waitForEvent('download'); await page.locator('#explorer-source').click(); assert.ok(await (await sourceEvent).path());
  const beforePan = await page.locator('#explorer-position').textContent(); await page.locator('#explorer-map').focus(); await page.keyboard.press('ArrowRight'); await ready();
  assert.notEqual(await page.locator('#explorer-position').textContent(), beforePan);
  const box = await page.locator('#explorer-map').boundingBox(); await page.mouse.move(box.x + 100, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 160, box.y + 240); await page.mouse.up(); await ready();
  await page.locator('#explorer-in').click(); await ready();
  await page.locator('#explorer-location').fill('invalid'); await page.locator('#explorer-jump button').click(); assert.match(await page.locator('#explorer-status').textContent(), /Enter latitude/);
  // Invalid/blocked source cannot leave stale vector geometry, but basic printing survives.
  failSource = true; await page.locator('#explorer-location').fill('https://www.openstreetmap.org/#map=17/50/10'); await page.locator('#explorer-jump button').click();
  await page.waitForFunction(() => document.getElementById('explorer-street-status').textContent.includes('Incomplete or oversized'));
  assert.equal(await page.locator('#explorer-print').isDisabled(), false); assert.equal(await page.locator('#explorer-vector svg').count(), 0);
  await page.locator('#explorer-print').click(); assert.equal(await page.locator('#geographic-paper-tiles svg').count(), 0);
  assert.equal(await page.locator('#geographic-print').getAttribute('data-center'), '50.00000,10.00000');
  failSource = 'http'; await page.locator('#explorer-retry').click();
  await page.waitForFunction(() => document.getElementById('explorer-street-status').textContent.includes('(406)'));
  for (const orientation of ['portrait', 'landscape']) {
    await page.locator('#orientation').selectOption(orientation);
    await page.waitForFunction(() => !document.getElementById('explorer-print').disabled);
    await page.locator('#explorer-print').click();
    assert.equal(await page.locator('#geographic-print').getAttribute('data-orientation'), orientation);
    const pdf = await page.pdf({ path: new URL(`../artifacts/browser/tile-${orientation}.pdf`, import.meta.url).pathname, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span>Browser header</span>', footerTemplate: '<span>Browser footer</span>' });
    const boxes = [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)];
    assert.equal(boxes.length, 1); assert.deepEqual(boxes[0].slice(1).map(Number), orientation === 'portrait' ? [612, 792] : [792, 612]);
    // Reduced printable area simulates browser chrome/default printer margins rather than an ideal full sheet.
    const rule = await page.evaluate((orientation) => {
      const sheet = document.styleSheets[0];
      return sheet.insertRule(`@page geographic-${orientation} { size: Letter ${orientation}; margin: 24mm; }`, sheet.cssRules.length);
    }, orientation);
    const insetPdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span>Browser header</span>', footerTemplate: '<span>Browser footer</span>' });
    assert.equal([...insetPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 1, 'map and attribution fit with browser chrome and larger margins');
    await page.evaluate((rule) => document.styleSheets[0].deleteRule(rule), rule);
  }
  await page.locator('#explorer-appearance').selectOption('color'); await page.locator('#explorer-print').click();
  assert.ok(await page.locator('#geographic-paper-tiles img').count()); assert.equal(await page.locator('#geographic-paper-tiles canvas').count(), 0);
  await page.locator('#explorer-appearance').selectOption('bw');
  failSource = false; await page.locator('#explorer-retry').click(); await ready();
  failSource = true; failTiles = true;
  await page.locator('#explorer-location').fill('https://www.openstreetmap.org/#map=17/55/10'); await page.locator('#explorer-jump button').click();
  await page.waitForFunction(() => document.getElementById('explorer-street-status').textContent.includes('Incomplete or oversized') && document.getElementById('explorer-status').textContent.includes('Some map tiles'));
  assert.equal(await page.locator('#explorer-print').isDisabled(), true, 'neither missing tiles nor stale vector geometry can print');
  failSource = false; failTiles = false; await page.locator('#explorer-retry').click(); await ready();
  await page.locator('#explorer-world').click(); await page.waitForFunction(() => document.getElementById('explorer-street-status').textContent.includes('Zoom in'));
  await page.waitForFunction(() => !document.getElementById('explorer-print').disabled);
  await page.locator('#explorer-print').click(); assert.ok(await page.locator('#geographic-paper-tiles canvas, #geographic-paper-tiles img').count());
  await page.reload(); await ready(); assert.match(await page.locator('#explorer-position').textContent(), /Zoom 15/);
  assert.equal(await page.locator('#explorer-vector svg').getAttribute('viewBox'), initial);
  await page.unroute('https://tile.openstreetmap.org/**'); await page.unroute('https://overpass-api.de/**');
  return { vectorPrint: true, sourceIndependentPrint: true, sourceRejections, printWithoutLesson: true, nativeClick: true, monochromeAndLabels: true, viewportIndependent: true, sourceRequests: sourceRequests.length };
}
