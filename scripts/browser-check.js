import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(base);
  assert.equal(await page.locator('#map svg').count(), 0);
  await page.getByRole('button', { name: 'Load synthetic map' }).click();
  await page.locator('#map svg').waitFor();
  assert.equal(await page.locator('#map .feature').count(), 6);
  const geometry = await page.locator('#map .feature').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d')));
  await page.locator('#variant').selectOption('blank');
  assert.equal(await page.locator('#map .map-label').count(), 0);
  assert.deepEqual(await page.locator('#map .feature').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d'))), geometry);
  await page.locator('#variant').selectOption('labeled');
  await page.locator('#variant').selectOption('partial');
  assert.ok(await page.locator('#map .map-label').count() > 0);
  await page.locator('#variant').selectOption('labeled');
  await page.locator('#feature').selectOption('road:AB');
  assert.ok((await page.locator('#selection').textContent()).includes('road:AB'));
  await page.locator('#heading').selectOption('90');
  await page.getByRole('button', { name: 'Rotate 90°' }).click();
  assert.ok((await page.locator('#status').textContent()).includes('90°'));
  assert.ok((await page.locator('#map .heading-arrow').getAttribute('transform')).includes('180'));
  await page.locator('#import').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('Map not loaded'));
  assert.equal(await page.locator('#map .feature').count(), 6);
  const hostile = JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json', import.meta.url), 'utf8'));
  const payload = '<img src=x onerror=alert(1)>';
  hostile.labels = [{ ...hostile.labels[0], text: payload, anchor: [.0005, .0005] }];
  await page.locator('#import').setInputFiles({ name: 'literal-text.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile)) });
  await page.waitForFunction((text) => document.querySelector('#map .map-label')?.textContent === text, payload);
  assert.equal(await page.locator('#map img, #map script').count(), 0);
  await page.locator('#demo').click();
  await page.waitForFunction(() => document.querySelectorAll('#map .map-label').length > 1);
  await page.locator('#heading').selectOption('90');
  await page.screenshot({ path: new URL('desktop.png', output).pathname, fullPage: true });
  await page.emulateMedia({ media: 'print' });
  const physical = await page.locator('#paper-map svg').evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
  assert.ok(Math.abs(physical.width - 259.4 * 96 / 25.4) < 0.1);
  assert.ok(Math.abs(physical.height - 145 * 96 / 25.4) < 0.1);
  await page.pdf({ path: new URL('synthetic-map.pdf', output).pathname, preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  let realPack = null;
  if (process.env.MAP_LITERACY_REVIEW_PACK) {
    const started = Date.now();
    await page.locator('#import').setInputFiles(process.env.MAP_LITERACY_REVIEW_PACK);
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('Unreviewed draft'));
    realPack = { loadMs: Date.now() - started, features: await page.locator('#map .feature').count() };
    assert.ok(realPack.features > 0);
    await page.screenshot({ path: new URL('real-map.png', output).pathname, fullPage: true });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: new URL('real-map.pdf', output).pathname, preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(base); await mobile.locator('#demo').tap(); await mobile.locator('#map svg').waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: new URL('mobile.png', output).pathname, fullPage: true });
  if (process.env.MAP_LITERACY_REVIEW_PACK) {
    await mobile.locator('#import').setInputFiles(process.env.MAP_LITERACY_REVIEW_PACK);
    await mobile.waitForFunction(() => document.getElementById('status').textContent.includes('Unreviewed draft'));
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: new URL('real-mobile.png', output).pathname, fullPage: true });
  }
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ syntheticFeatures: 6, variantsAndSelection: 'passed', invalidImportRetainsMap: 'passed', pdfDimensions: physical, mobileOverflow: false, realPack, browserErrors: errors }));
} finally { await browser.close(); server?.kill(); }
