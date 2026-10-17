import { checkTerrainLessons } from './terrain-lessons-browser-check.js';
import { checkTerrainOverlay } from './terrain-overlay-browser-check.js';
import { checkPrintQuality } from './print-quality-browser-check.js';
import { checkExplorer, mockTiles } from './explorer-browser-check.js';
import assert from 'node:assert/strict';
import { checkPreferences } from './preferences-browser-check.js';
import { checkAutosave } from './autosave-browser-check.js';
import { checkStorage } from './storage-browser-check.js';
import { checkStorageUpgrades } from './storage-upgrade-browser-check.js';
import { checkAccessibility } from './accessibility-browser-check.js';
import { checkPagesPackage } from './pages-browser-check.js';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { makePerfPack } from './perf-pack.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MAP_LITERACY_PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.MAP_LITERACY_URL ?? `http://127.0.0.1:${process.env.MAP_LITERACY_PORT ?? 4173}`;
const output = new URL('../artifacts/browser/', import.meta.url);
await mkdir(output, { recursive: true });
let server;
if (!process.env.MAP_LITERACY_URL) {
  server = spawn(process.execPath, [fileURLToPath(new URL('dev-server.js', import.meta.url))], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.kill(); reject(new Error('Dev server did not start.')); }, 5000);
    server.once('error', (e) => { clearTimeout(timer); reject(e); });
    server.once('exit', (code) => { clearTimeout(timer); if (code) reject(new Error(`Dev server exited ${code}`)); });
    server.stdout.once('data', () => { clearTimeout(timer); resolve(); });
  });
}
const portableModule = process.env.MAP_LITERACY_PORTABLE_CHROMIUM === '1' ? require('@sparticuz/chromium') : null;
const portable = portableModule?.default ?? portableModule;
let browser;
try { browser = await chromium.launch({ headless: true,
  ...(process.env.MAP_LITERACY_BROWSER_EXECUTABLE ? { executablePath: process.env.MAP_LITERACY_BROWSER_EXECUTABLE, ...(portable ? { args: portable.args } : {}) }
    : portable ? { executablePath: await portable.executablePath(), args: portable.args } : {}) }); }
catch (error) { server?.kill(); throw error; }
const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await mockTiles(desktopContext);
const page = await desktopContext.newPage();
const errors = [], sourceRejectionMessages = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // The geographic failure test deliberately serves HTTP 406; account for every such response.
  if (m.location().url.startsWith('https://overpass-api.de/') && m.text() === 'Failed to load resource: the server responded with a status of 406 (Not Acceptable)') sourceRejectionMessages.push(m.text());
  else errors.push(m.text());
});
async function afterInstall(operation) {
  await page.waitForFunction(() => !document.getElementById('save-status')?.textContent.startsWith('Saving'));
  const version = await page.locator('#map').getAttribute('data-load-version');
  await operation();
  await page.waitForFunction((old) => (document.getElementById('map').dataset.loadVersion ?? null) !== old, version);
  // Fixture scenarios explicitly use their authored view defaults. Persistence is checked separately.
  await page.locator('#preferences-defaults').click();
}
const loadDemo = () => afterInstall(() => page.locator('#demo').click());
const importReady = (file) => afterInstall(() => page.locator('#import').setInputFiles(file));
try {
  await page.goto(base);
  const terrainOverlayChecks = await checkTerrainOverlay(page);
  const geographicChecks = await checkExplorer(page, base);
  const printQuality = await checkPrintQuality(page, base);
  const storageChecks = await checkStorage(page);
  storageChecks.upgrades = await checkStorageUpgrades(page);
  const autosaveChecks = await checkAutosave(page, base);
  const preferenceChecks = await checkPreferences(page, base);
  const accessibilityChecks = await checkAccessibility(page, base);
  assert.equal(await page.locator('#map svg').count(), 0);
  await loadDemo();
  await page.locator('#map svg').waitFor();
  assert.equal(await page.locator('#map .feature').count(), 6);
  assert.ok((await page.locator('#attribution').textContent()).includes('CC0-1.0'));
  await page.locator('#lesson-start').click();
  await page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
  await page.locator('#answer-heading').focus(); await page.keyboard.type('359');
  await page.locator('#lesson-hint').click();
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).startsWith('Correct.'));
  const sessionDownloadEvent = page.waitForEvent('download');
  await page.locator('#lesson-export').click(); const sessionDownload = await sessionDownloadEvent;
  const sessionBackupPath = new URL('session-backup.json', output).pathname; await sessionDownload.saveAs(sessionBackupPath);
  await page.reload();
  await afterInstall(() => page.locator('#lesson-import').setInputFiles(sessionBackupPath));
  await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Session restored from revision'));
  assert.ok((await page.locator('#lesson-revision').textContent()).includes('1 attempts'));
  assert.equal(await page.locator('#lesson-hint').isDisabled(), true);
  assert.equal(await page.locator('#answer-heading').inputValue(), '');
  assert.equal(await page.locator('#lesson-hints li').count(), 1);
  await page.evaluate(() => {
    window.originalBackupRead = Blob.prototype.arrayBuffer;
    window.delayedBackupStarted = false;
    Blob.prototype.arrayBuffer = async function () {
      const bytes = await window.originalBackupRead.call(this);
      if (this.name === 'session-backup.json') { window.delayedBackupStarted = true; await new Promise((resolve) => { window.releaseBackupRead = resolve; }); }
      return bytes;
    };
  });
  await page.locator('#lesson-import').setInputFiles(sessionBackupPath);
  await page.waitForFunction(() => window.delayedBackupStarted);
  await loadDemo();
  await page.evaluate(async () => { Blob.prototype.arrayBuffer = window.originalBackupRead; window.releaseBackupRead(); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  assert.equal(await page.locator('#lesson-revision').textContent(), '');
  await afterInstall(() => page.locator('#lesson-import').setInputFiles(sessionBackupPath));
  await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Session restored from revision'));
  await page.locator('#lesson-import').setInputFiles({ name: 'bad-backup.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Session not restored'));
  const oversizedBackup = JSON.parse(await readFile(sessionBackupPath, 'utf8'));
  const expandedFeatures = oversizedBackup.packs[0].features.features;
  for (let n = expandedFeatures.length; n < 1001; n++) expandedFeatures.push({ ...structuredClone(expandedFeatures[0]), id: `extra-${n}` });
  await page.locator('#lesson-import').setInputFiles({ name: 'oversized-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(oversizedBackup)) });
  await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Session not restored') && document.getElementById('lesson-status').textContent.includes('initial browser limit'));
  assert.equal(await page.locator('#map .feature').count(), 6);
  assert.ok((await page.locator('#lesson-revision').textContent()).includes('1 attempts'));
  assert.equal(await page.locator('#lesson-submit').isDisabled(), true);
  await page.locator('#lesson-retry').click();
  await page.locator('#answer-heading').fill('16');
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).startsWith('Try again.'));
  assert.ok((await page.locator('#lesson-revision').textContent()).includes('2 attempts'));
  await page.locator('#lesson-next').click();
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).startsWith('Enter a valid answer'));
  await page.locator('#answer-lon').fill('0'); await page.locator('#answer-lat').fill('0');
  await page.locator('#lesson-submit').click(); await page.locator('#lesson-next').click();
  await page.locator('#trace-start').selectOption('A');
  for (const id of ['AB', 'BC']) { await page.locator('#trace-edge').selectOption(id); await page.locator('#trace-add').click(); }
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).startsWith('Correct.'));
  await page.locator('#lesson-next').click();
  assert.ok((await page.locator('#lesson-route').textContent()).includes('Closed directed edges: BC'));
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).includes('closed edge'));
  await page.locator('#lesson-retry').click(); await page.locator('#trace-clear').click();
  for (const id of ['AD', 'DC']) { await page.locator('#trace-edge').selectOption(id); await page.locator('#trace-add').click(); }
  await page.locator('#lesson-submit').click();
  assert.ok((await page.locator('#lesson-status').textContent()).startsWith('Correct.'));
  await page.locator('#lesson-next').click();
  assert.ok((await page.locator('#lesson-status').textContent()).includes('Session completed'));
  await page.reload(); assert.equal(await page.locator('#lesson-revision').textContent(), '');
  await loadDemo(); assert.equal(await page.locator('#lesson-revision').textContent(), '');
  await page.evaluate(() => { window.geometryBeforeLabels = document.querySelector('#map .feature'); window.paperBeforeLabels = document.querySelector('#paper-map svg'); });
  const geometry = await page.locator('#map .feature').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d')));
  await page.locator('#variant').selectOption('blank');
  assert.equal(await page.locator('#map .map-label').count(), 0);
  assert.equal(await page.evaluate(() => window.geometryBeforeLabels === document.querySelector('#map .feature') && window.paperBeforeLabels === document.querySelector('#paper-map svg')), true);
  assert.deepEqual(await page.locator('#map .feature').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d'))), geometry);
  await page.locator('#variant').selectOption('labeled');
  await page.locator('#variant').selectOption('partial');
  assert.ok(await page.locator('#map .map-label').count() > 0);
  await page.locator('#variant').selectOption('labeled');
  await page.locator('#feature').selectOption('road:AB');
  assert.equal(await page.evaluate(() => window.geometryBeforeLabels === document.querySelector('#map .feature')), true);
  assert.equal(await page.locator('#map .feature--selected').getAttribute('data-feature-id'), 'road:AB');
  assert.ok((await page.locator('#selection').textContent()).includes('road:AB'));
  await page.locator('#heading').selectOption('90');
  await page.evaluate(() => { window.paperBeforeRotation = document.querySelector('#paper-map svg'); });
  await page.getByRole('button', { name: 'Rotate 90°' }).click();
  assert.equal(await page.evaluate(() => window.paperBeforeRotation === document.querySelector('#paper-map svg')), true);
  assert.ok((await page.locator('#status').textContent()).includes('90°'));
  assert.ok((await page.locator('#map .heading-arrow').getAttribute('transform')).includes('180'));
  await page.locator('#import').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Map not loaded'));
  assert.equal(await page.locator('#map .feature').count(), 6);
  const hostile = JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json', import.meta.url), 'utf8'));
  const payload = '<img src=x onerror=alert(1)>';
  hostile.labels = [{ ...hostile.labels[0], text: payload, anchor: [.0005, .0005] }];
  await importReady({ name: 'literal-text.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile)) });
  await page.waitForFunction((text) => document.querySelector('#map .map-label')?.textContent === text, payload);
  assert.equal(await page.locator('#map img, #map script').count(), 0);
  await loadDemo();
  await page.waitForFunction(() => document.querySelectorAll('#map .map-label').length > 1);
  // Directed graph trace: native keyboard controls, map taps, print opt-in and constraints.
  await page.locator('#trace-start').selectOption('A');
  await page.locator('#trace-edge').selectOption('AB');
  await page.locator('#trace-add').focus(); await page.keyboard.press('Enter');
  await page.locator('#trace-edge').selectOption('BC'); await page.locator('#trace-add').click();
  assert.equal(await page.locator('#trace-steps li').count(), 2);
  assert.equal(await page.locator('#map .trace-line').count(), 2);
  assert.equal(await page.locator('#map .trace-arrow').count(), 2);
  assert.ok((await page.locator('#trace-status').textContent()).includes('222 m'));
  assert.equal(await page.locator('#paper-map .trace-line').count(), 0);
  await page.locator('#include-trace').check();
  assert.equal(await page.locator('#paper-map .trace-line').count(), 2);
  const traceGeometry = await page.locator('#map .trace-line').first().getAttribute('d');
  await page.locator('#rotate').click();
  assert.notEqual(await page.locator('#map .trace-line').first().getAttribute('d'), traceGeometry);
  await page.locator('#variant').selectOption('blank');
  assert.equal(await page.locator('#map .trace-line').count(), 2);
  assert.equal(await page.locator('#map .map-label').count(), 0);
  await page.locator('#variant').selectOption('labeled');
  for (const orientation of ['portrait', 'landscape']) {
    await page.locator('#orientation').selectOption(orientation);
    await page.emulateMedia({ media: 'print' });
    const tracePdf = await page.pdf({ path: new URL(`trace-${orientation}.pdf`, output).pathname, preferCSSPageSize: true, printBackground: true });
    assert.equal((tracePdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1);
    assert.ok((await page.locator('#paper-footer').textContent()).includes('Trace preview'));
    await page.emulateMedia({ media: 'screen' });
  }
  await page.screenshot({ path: new URL('trace-desktop.png', output).pathname, fullPage: true });
  await page.locator('#trace-back').click(); assert.equal(await page.locator('#trace-steps li').count(), 1);
  await page.locator('#trace-clear').click(); assert.equal(await page.locator('#map .trace-line').count(), 0);
  await page.locator('#trace-start').selectOption('E');
  await page.locator('#trace-edge').selectOption('EF'); await page.locator('#trace-add').click();
  await page.locator('#trace-map').click();
  await page.locator('#map .feature-hit[data-feature-id="road:GH"]').click({ force: true });
  assert.equal(await page.locator('#trace-steps li').count(), 1);
  assert.ok((await page.locator('#trace-status').textContent()).includes('visual crossing does not connect'));
  await page.locator('#trace-map').click();
  await page.locator('#trace-mode').selectOption('walk');
  assert.equal(await page.locator('#trace-steps li').count(), 0);
  assert.equal(await page.locator('#trace-add').isDisabled(), true);
  const variants = JSON.parse(await readFile(new URL('../tests/fixtures/packs.json', import.meta.url), 'utf8'));
  for (const name of ['unknown-access', 'only-turn']) {
    await importReady({ name: `${name}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(variants[name])) });
    await page.waitForFunction(() => document.getElementById('trace-start').value === '');
    await page.locator('#trace-mode').selectOption('drive');
    await page.locator('#trace-start').selectOption('A');
    await page.locator('#trace-edge').selectOption('AB'); await page.locator('#trace-add').click();
    if (name === 'only-turn') assert.equal(await page.locator('#trace-edge option[value="BD"]').evaluate(n => n.disabled), true);
    await page.locator('#trace-edge').selectOption('BC'); await page.locator('#trace-add').click();
    if (name === 'unknown-access') {
      assert.ok((await page.locator('#trace-status').textContent()).includes('access is unknown'));
      await page.locator('#include-trace').check();
      assert.ok((await page.locator('#paper-footer').textContent()).includes('needs review'));
    }
  }
  await loadDemo();
  await page.waitForFunction(() => document.getElementById('trace-start').value === '');
  assert.equal(await page.locator('#map .trace-line').count(), 0);
  // Authoring: keyboard fields, rotated-map placement, atomic failure, undo and download/re-import.
  const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json', import.meta.url), 'utf8'));
  await page.locator('#lesson-start').click();
  const editedId = fixture.labels[0].id;
  await page.locator('#label-choice').selectOption(editedId);
  await page.locator('#label-text').fill('Reviewed placement');
  await page.locator('#label-visible').selectOption('partial');
  await page.locator('#label-rotation').fill('15');
  await page.locator('#label-lon').fill('0.0004');
  await page.locator('#label-lat').fill('0.0004');
  await page.getByRole('button', { name: 'Apply label', exact: true }).click();
  assert.ok((await page.locator('#edit-status').textContent()).includes(`Draft revision ${fixture.revision + 1}`));
  assert.equal(await page.locator('#lesson-start').isDisabled(), true);
  assert.equal(await page.locator('#lesson-revision').textContent(), '');
  assert.ok((await page.locator('#lesson-status').textContent()).includes('Pack content changed'));
  assert.ok((await page.locator('#paper-title').textContent()).includes('UNREVIEWED DRAFT'));
  await page.locator('#label-lon').fill('1');
  await page.getByRole('button', { name: 'Apply label', exact: true }).click();
  assert.ok((await page.locator('#edit-status').textContent()).includes('Label not changed'));
  await page.getByRole('button', { name: 'Rotate 90°' }).click();
  await page.locator('#place-label').click();
  const mapBox = await page.locator('#map svg').boundingBox();
  await page.locator('#map svg').click({ position: { x: mapBox.width / 2, y: mapBox.height / 2 } });
  // MouseEvent client coordinates are integer CSS pixels; allow 1.5 pixels of click quantization.
  const clipBox = await page.locator('#map clipPath polygon').evaluate((n) => ({ width: n.getBBox().width, height: n.getBBox().height }));
  const clickToleranceDeg = .001 / Math.min(clipBox.width, clipBox.height) * 1.5;
  assert.ok(Math.abs(Number(await page.locator('#label-lon').inputValue()) - .0005) < clickToleranceDeg);
  assert.ok(Math.abs(Number(await page.locator('#label-lat').inputValue()) - .0005) < clickToleranceDeg);
  await page.getByRole('button', { name: 'Apply label', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export-pack').click();
  const download = await downloadEvent;
  const savedPath = new URL('edited-pack.json', output).pathname;
  await download.saveAs(savedPath);
  const saved = JSON.parse(await readFile(savedPath, 'utf8'));
  assert.equal(saved.revision, fixture.revision + 2);
  assert.equal(saved.labels[0].text, 'Reviewed placement');
  assert.equal(saved.labels[0].visibleIn, 'partial');
  assert.deepEqual(saved.sources, fixture.sources); assert.deepEqual(saved.topology, fixture.topology);
  await page.locator('#undo-label').click();
  assert.ok((await page.locator('#edit-status').textContent()).includes(`draft revision ${fixture.revision + 3}`));
  await importReady(savedPath);
  await page.waitForFunction(() => [...document.querySelectorAll('#label-choice option')].some((n) => n.textContent.includes('Reviewed placement')));
  await page.locator('#label-choice').selectOption(editedId);
  assert.equal(await page.locator('#label-text').inputValue(), 'Reviewed placement');
  await page.locator('#delete-label').click();
  assert.equal(await page.locator(`#label-choice option[value="${editedId}"]`).count(), 0);
  await page.locator('#undo-label').click();
  assert.equal(await page.locator(`#label-choice option[value="${editedId}"]`).count(), 1);
  await page.locator('#label-choice').selectOption('');
  await page.locator('#feature').selectOption('road:AB');
  await page.locator('#label-text').fill('New label');
  await page.getByRole('button', { name: 'Apply label', exact: true }).click();
  assert.equal(await page.locator('#label-choice option').count(), fixture.labels.length + 2);
  await loadDemo();
  await page.waitForFunction(() => document.getElementById('undo-label').disabled);
  await page.locator('#heading').selectOption('90');
  await page.screenshot({ path: new URL('desktop.png', output).pathname, fullPage: true });
  const physical = {};
  for (const [orientation, width, height] of [['landscape', 259.4, 145], ['portrait', 195.9, 208.5]]) {
    await page.locator('#orientation').selectOption(orientation);
    assert.equal(await page.locator('#print').isDisabled(), false);
    await page.evaluate(() => { window.printMeasurementNode = document.querySelector('#paper-map svg'); });
    await page.emulateMedia({ media: 'print' });
    await page.waitForFunction(({ width, height }) => {
      const rect = document.querySelector('#paper-map svg')?.getBoundingClientRect();
      return matchMedia('print').matches && rect && Math.abs(rect.width - width * 96 / 25.4) < .1 && Math.abs(rect.height - height * 96 / 25.4) < .1;
    }, { width, height });
    // Query and measure in one task; a locator handle can refer to a detached old SVG.
    physical[orientation] = await page.evaluate(() => {
      const rect = document.querySelector('#paper-map svg').getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert.ok(Math.abs(physical[orientation].width - width * 96 / 25.4) < 0.1, JSON.stringify({ orientation, physical: physical[orientation] }));
    assert.ok(Math.abs(physical[orientation].height - height * 96 / 25.4) < 0.1);
    assert.ok((await page.locator('#paper-footer').textContent()).includes(`Letter ${orientation}`));
    const fits = await page.locator('#print-sheet').evaluate((sheet) => {
      const box = sheet.getBoundingClientRect();
      return [...sheet.children].every((child) => { const r = child.getBoundingClientRect(); return r.right <= box.right + .1 && r.bottom <= box.bottom + .1 && child.scrollHeight <= child.clientHeight + 1; });
    });
    assert.equal(fits, true);
    const pdf = await page.pdf({ path: new URL(`synthetic-${orientation}.pdf`, output).pathname, preferCSSPageSize: true, printBackground: true });
    // Inspect this pinned Chromium's uncompressed page dictionaries, not arbitrary imported PDFs.
    assert.equal(await page.evaluate(() => window.printMeasurementNode === document.querySelector('#paper-map svg')), true, 'Paper SVG stays stable through print mode and PDF generation');
    const pdfText = pdf.toString('latin1');
    assert.equal((pdfText.match(/\/Type \/Page\b/g) ?? []).length, 1);
    const mediaBox = pdfText.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
    assert.ok(mediaBox, 'Generated PDF has a readable MediaBox');
    assert.deepEqual(mediaBox.slice(1).map(Number), orientation === 'portrait' ? [612, 792] : [792, 612]);
    await page.emulateMedia({ media: 'screen' });
  }
  // Import honors the pack default; a wide extent fits landscape, then fails portrait.
  const wide = JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json', import.meta.url), 'utf8'));
  wide.bounds = [-.0005, 0, .0015, .001]; wide.sourceBounds = [-.005, -.005, .005, .005];
  await importReady({ name: 'wide.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wide)) });
  await page.waitForFunction(() => document.getElementById('orientation').value === 'landscape');
  assert.equal(await page.locator('#print').isDisabled(), false);
  await page.locator('#orientation').selectOption('portrait');
  assert.equal(await page.locator('#print').isDisabled(), true);
  assert.ok((await page.locator('#status').textContent()).includes('does not fit'));
  assert.equal(await page.locator('#paper-map svg').count(), 0);
  await page.locator('#orientation').selectOption('landscape');
  assert.equal(await page.locator('#print').isDisabled(), false);
  wide.print.orientation = 'portrait'; wide.bounds = [0, 0, .0016, .0016];
  await importReady({ name: 'tall.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(wide)) });
  await page.waitForFunction(() => document.getElementById('orientation').value === 'portrait' && !document.getElementById('print').disabled);
  await page.locator('#orientation').selectOption('landscape');
  assert.equal(await page.locator('#print').isDisabled(), true);
  await loadDemo();
  await page.waitForFunction(() => document.getElementById('orientation').value === 'landscape' && !document.getElementById('print').disabled);
  // Exercise sheets are independent of review heading/trace controls.
  await loadDemo();
  await page.waitForFunction(() => document.getElementById('print-exercise').options.length === 4 && document.getElementById('trace-start').value === '');
  await page.locator('#heading').selectOption('90');
  await page.locator('#trace-start').selectOption('A');
  await page.locator('#trace-edge').selectOption('AB'); await page.locator('#trace-add').click();
  await page.locator('#include-trace').check();
  for (const orientation of ['portrait', 'landscape']) {
    await page.locator('#orientation').selectOption(orientation);
    for (const exercise of ['heading', 'endpoint', 'route', 'detour']) {
      await page.locator('#print-exercise').selectOption(exercise);
      for (const audience of ['instructor', 'learner']) {
        await page.locator('#print-output').selectOption(audience);
        assert.equal(await page.locator('#print').isDisabled(), false);
        assert.equal(await page.locator('#paper-map .trace-line').count(), 0);
        assert.equal(await page.locator('#paper-map .heading-arrow').count(), audience === 'instructor' && exercise === 'heading' ? 1 : 0);
        if (audience === 'learner') {
          assert.equal(await page.locator('#exercise-pages .sheet-answer, #exercise-pages .sheet-hint').count(), 0);
          assert.equal(await page.locator('#exercise-pages .sheet-answer-space').count(), 1);
        }
        if (exercise === 'endpoint') assert.equal(await page.locator('#paper-map .exercise-mark').count(), audience === 'instructor' ? 1 : 0);
        if (exercise === 'detour') assert.equal(await page.locator('#paper-map .closure-line').count(), 2);
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator('#exercise-pages .exercise-page').evaluateAll((pages) => pages.every((page) => [...page.children].every((node) => node.scrollHeight <= node.clientHeight + 1))), true);
        const pdf = await page.pdf({ path: new URL(`${audience}-${exercise}-${orientation}.pdf`, output).pathname, preferCSSPageSize: true, printBackground: true });
        const pdfText = pdf.toString('latin1'), expectedPages = await page.locator('#exercise-pages .exercise-page').count() + 1;
        assert.equal((pdfText.match(/\/Type \/Page\b/g) ?? []).length, expectedPages);
        const expectedBox = orientation === 'portrait' ? [612, 792] : [792, 612];
        const boxes = [...pdfText.matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)];
        assert.equal(boxes.length, expectedPages);
        assert.ok(boxes.every((m) => JSON.stringify(m.slice(1).map(Number)) === JSON.stringify(expectedBox)));
        await page.emulateMedia({ media: 'screen' });
      }
    }
  }
  const longPack = JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json', import.meta.url), 'utf8'));
  longPack.id = 'long-print'; longPack.title = 'Map'.repeat(40);
  longPack.exercises[0].prompt = '<img src=x onerror=alert(1)>' + 'P'.repeat(1900);
  longPack.exercises[0].hints = ['H'.repeat(2000), 'I'.repeat(2000), 'J'.repeat(2000)];
  longPack.sources[0].attribution = 'C'.repeat(2000); longPack.exercises[0].review = 'draft';
  await importReady({ name: 'long-print.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(longPack)) });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('MapMapMap'));
  await page.locator('#print-exercise').selectOption('heading'); await page.locator('#print-output').selectOption('instructor');
  assert.ok(await page.locator('#exercise-pages .exercise-page').count() > 1);
  assert.equal(await page.locator('#exercise-pages img, #exercise-pages script').count(), 0);
  assert.ok((await page.locator('#exercise-pages .sheet-paragraph').allTextContents()).join('').includes(longPack.exercises[0].prompt));
  for (const hint of longPack.exercises[0].hints) assert.ok((await page.locator('#exercise-pages .sheet-hint').allTextContents()).join('').includes(hint));
  assert.ok((await page.locator('#exercise-pages .sheet-credit').allTextContents()).join('').includes(longPack.sources[0].attribution));
  assert.ok((await page.locator('#paper-title').textContent()).includes('UNREVIEWED DRAFT'));
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#exercise-pages .sheet-content').evaluateAll((nodes) => nodes.every((n) => n.scrollHeight <= n.clientHeight + 1)), true);
  await page.pdf({ path: new URL('long-instructor.pdf', output).pathname, preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#print-output').selectOption('learner');
  assert.equal(await page.locator('#exercise-pages .sheet-answer, #exercise-pages .sheet-hint').count(), 0);
  await loadDemo(); await page.waitForFunction(() => document.getElementById('print-output').value === 'map');
  assert.equal(await page.locator('#exercise-pages .exercise-page').count(), 0);
  // Search remains native and bounded without losing items beyond the first 200.
  const neighborhood = makePerfPack('neighborhood').pack;
  await importReady({ name: 'neighborhood.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(neighborhood)) });
  assert.ok(await page.locator('#feature option').count() <= 202);
  await page.locator('#feature-filter').fill('f999');
  await page.locator('#feature').selectOption('f999');
  await page.locator('#feature-filter').fill('no-matches');
  assert.equal(await page.locator('#feature').inputValue(), 'f999');
  assert.ok((await page.locator('#feature-matches').textContent()).includes('0 matches'));
  await page.locator('#feature-filter').fill('');
  assert.equal(await page.locator('#feature').inputValue(), 'f999');
  assert.equal(await page.locator('#map .feature--selected').getAttribute('data-feature-id'), 'f999');
  await page.locator('#label-text').fill('One label too many');
  await page.getByRole('button', { name: 'Apply label', exact: true }).click();
  assert.ok((await page.locator('#edit-status').textContent()).includes('Label not changed'));
  assert.ok((await page.locator('#edit-status').textContent()).includes('initial browser limit'));
  assert.equal(await page.locator('#label-choice option').count(), 201);
  const graph = makePerfPack('graph-ceiling').pack;
  await importReady({ name: 'graph.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(graph)) });
  assert.ok(await page.locator('#trace-start option').count() <= 202);
  await page.locator('#trace-start-filter').fill('n12000');
  await page.locator('#trace-start').selectOption('n12000');
  await page.locator('#trace-start-filter').fill('no-match');
  assert.equal(await page.locator('#trace-start').inputValue(), 'n12000');
  await page.locator('#trace-edge-filter').fill('e24000');
  await page.locator('#trace-edge').selectOption('e24000'); await page.locator('#trace-add').click();
  assert.equal(await page.locator('#trace-steps li').count(), 1);
  const versionBeforeRejection = await page.locator('#map').getAttribute('data-load-version');
  await page.locator('#import').setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(makePerfPack('display-ceiling').pack)) });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('initial browser limit'));
  assert.equal(await page.locator('#map').getAttribute('data-load-version'), versionBeforeRejection);
  assert.equal(await page.locator('#map .feature').count(), 1);
  assert.equal(await page.locator('#trace-steps li').count(), 1);
  assert.equal(await page.locator('#trace-start').inputValue(), 'n12000');
  await loadDemo();
  let realPack = null;
  if (process.env.MAP_LITERACY_REVIEW_PACK) {
    const started = Date.now();
    await importReady(process.env.MAP_LITERACY_REVIEW_PACK);
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('Unreviewed draft'));
    realPack = { loadMs: Date.now() - started, features: await page.locator('#map .feature').count() };
    assert.ok(realPack.features > 0);
    await page.screenshot({ path: new URL('real-map.png', output).pathname, fullPage: true });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: new URL('real-map.pdf', output).pathname, preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.locator('#scale').selectOption('10000');
    await page.locator('#orientation').selectOption('portrait');
    assert.equal(await page.locator('#print').isDisabled(), false);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: new URL('real-portrait.pdf', output).pathname, preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
  }
  const pagesPackageChecks = process.env.MAP_LITERACY_RELEASE_CHECK === '1' ? await checkPagesPackage(page) : null;
  const terrainLessonChecks = await checkTerrainLessons(page,base,output);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mockTiles(mobile);
  await mobile.goto(base); await mobile.locator('#demo').tap(); await mobile.locator('#map svg').waitFor();
  await mobile.locator('#lesson-start').tap(); await mobile.locator('#answer-heading').fill('0');
  await mobile.locator('#lesson-submit').tap();
  assert.ok((await mobile.locator('#lesson-status').textContent()).startsWith('Correct.'));
  await mobile.locator('#lesson-end').tap();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.locator('#trace-start').selectOption('A');
  await mobile.locator('#trace-map').tap();
  await mobile.locator('#map .feature-hit[data-feature-id="road:AB"]').tap({ force: true });
  assert.equal(await mobile.locator('#trace-steps li').count(), 1);
  await mobile.locator('#trace-map').tap();
  await mobile.locator('#feature').selectOption('road:AB');
  await mobile.locator('#label-text').fill('Touch label');
  await mobile.getByRole('button', { name: 'Apply label', exact: true }).tap();
  assert.ok((await mobile.locator('#edit-status').textContent()).includes('Label applied'));
  await mobile.locator('#orientation').selectOption('portrait');
  assert.equal(await mobile.locator('#print').isDisabled(), false);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: new URL('mobile.png', output).pathname, fullPage: true });
  if (process.env.MAP_LITERACY_REVIEW_PACK) {
    const mobileVersion = await mobile.locator('#map').getAttribute('data-load-version');
    await mobile.locator('#import').setInputFiles(process.env.MAP_LITERACY_REVIEW_PACK);
    await mobile.waitForFunction((old) => document.getElementById('map').dataset.loadVersion !== old, mobileVersion);
    await mobile.waitForFunction(() => document.getElementById('status').textContent.includes('Unreviewed draft'));
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: new URL('real-mobile.png', output).pathname, fullPage: true });
  }
  await mobile.close();
  assert.equal(sourceRejectionMessages.length, geographicChecks.sourceRejections);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ terrainLessonChecks, terrainOverlayChecks, geographicChecks, printQuality, syntheticFeatures: 6, pagesPackageChecks, storageChecks, autosaveChecks, preferenceChecks, accessibilityChecks, memoryLessonSessions: 'passed', sessionBackupControls: 'passed', variantsAndSelection: 'passed', labelEditingAndExport: 'passed', directedTracingAndPrint: 'passed', exerciseSheetsAndPagination: 'passed', boundedSearchAndRenderLimits: 'passed', invalidImportRetainsMap: 'passed', pdfDimensions: physical, mobileOverflow: false, realPack, browserErrors: errors }));
} finally { await browser.close(); server?.kill(); }

