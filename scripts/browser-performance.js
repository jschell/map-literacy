import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { platform, arch, cpus } from 'node:os';
import { makePerfPack } from './perf-pack.js';
import { validatePack } from '../src/data/validate-pack.js';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const mod = process.env.MAP_LITERACY_PORTABLE_CHROMIUM === '1' ? require('@sparticuz/chromium') : null, portable = mod?.default ?? mod;
const samples = Number(process.env.MAP_LITERACY_PERF_SAMPLES ?? 20);
assert.ok(Number.isInteger(samples) && samples >= 20 && samples <= 100);
const output = new URL('../artifacts/performance/', import.meta.url); await mkdir(output, { recursive: true });
const server = spawn(process.execPath, [fileURLToPath(new URL('dev-server.js', import.meta.url))], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const stats = (values) => { const sorted = [...values].sort((a, b) => a - b); return { samples: values.length, medianMs: sorted[Math.ceil(sorted.length * .5) - 1], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1), valuesMs: values }; };
const report = { generatedAt: new Date().toISOString(), environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length }, method: 'Import includes automation file delivery; interactions measure input dispatch to two requestAnimationFrame boundaries; headless desktop, not physical device or isolated raster time. Each profile starts from an empty app after prior-profile GC; nearest-rank p95, cold and cached samples mixed, no timing gate.', profiles: [] };
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000); server.once('error', reject); server.once('exit', () => reject(new Error('Server exited'))); server.stdout.once('data', () => { clearTimeout(timer); resolve(); }); });
  browser = await chromium.launch({ headless: true, ...(process.env.MAP_LITERACY_BROWSER_EXECUTABLE ? { executablePath: process.env.MAP_LITERACY_BROWSER_EXECUTABLE, ...(portable ? { args: portable.args } : {}) } : portable ? { executablePath: await portable.executablePath(), args: portable.args } : {}) });
  report.environment.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const client = await page.context().newCDPSession(page);
  for (const profile of ['neighborhood', 'display-ceiling', 'graph-ceiling']) {
    const { pack, sourceBytes } = makePerfPack(profile), json = JSON.stringify(pack);
    assert.equal(validatePack(pack).valid, true); assert.ok(Buffer.byteLength(json) <= 10 * 1024 * 1024);
    await writeFile(new URL(`${profile}-source.json`, output), sourceBytes);
    await writeFile(new URL(`${profile}-pack.json`, output), json);
    await page.goto(`http://127.0.0.1:${process.env.MAP_LITERACY_PORT ?? 4173}`);
    await client.send('HeapProfiler.collectGarbage');

    await page.evaluate(() => { window.importStart = performance.now(); });
    await page.locator('#import').setInputFiles({ name: `${profile}.json`, mimeType: 'application/json', buffer: Buffer.from(json) });
    await page.waitForFunction((title) => document.getElementById('status').textContent.includes(title), pack.title);
    const importMs = await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - window.importStart; });
    const result = { profile, compactBytes: Buffer.byteLength(json), features: pack.features.features.length, labels: pack.labels.length, nodes: pack.topology.nodes.length, edges: pack.topology.edges.length, restrictions: pack.topology.restrictions.length, importMs, metrics: {} };
    for (const operation of ['rotation', 'labels', 'selection', 'orientation']) {
      const values = [];
      for (let i = 0; i < samples; i++) {
        values.push(await page.evaluate(async ({ operation, i }) => {
          const start = performance.now();
          if (operation === 'rotation') document.getElementById('rotate').click();
          else {
            const id = operation === 'labels' ? 'variant' : operation === 'selection' ? 'feature' : 'orientation';
            const node = document.getElementById(id);
            node.value = operation === 'labels' ? ['blank', 'partial', 'labeled'][i % 3] : operation === 'selection' ? (i % 2 ? '' : 'f0') : (i % 2 ? 'landscape' : 'portrait');
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - start;
        }, { operation, i }));
      }
      result.metrics[operation] = stats(values); console.log(JSON.stringify({ profile, operation, medianMs: result.metrics[operation].medianMs, p95Ms: result.metrics[operation].p95Ms }));
    }
    if (profile === 'graph-ceiling') {
      await page.locator('#trace-start').selectOption('n12000');
      const values = [];
      for (let i = 0; i < samples; i++) {
        values.push(await page.evaluate(async (i) => {
          const start = performance.now(), node = document.getElementById('trace-edge');
          node.value = i % 2 ? 'e24001' : 'e24000'; node.dispatchEvent(new Event('change', { bubbles: true }));
          document.getElementById('trace-add').click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return performance.now() - start;
        }, i));
      }
      assert.equal(await page.locator('#trace-steps li').count(), samples);
      result.metrics.traceAppend = stats(values);
    }
    result.domNodes = await page.locator('body *').count();
    await client.send('HeapProfiler.collectGarbage'); result.jsHeapAfterGc = await client.send('Runtime.getHeapUsage');
    assert.deepEqual(errors, []); assert.equal(await page.locator('#print').isDisabled(), false);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ path: new URL(`${profile}.pdf`, output).pathname, preferCSSPageSize: true });
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1);
    result.pdfPages = 1; report.profiles.push(result); console.log(JSON.stringify(result));
    await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2) + '\n');
    await page.emulateMedia({ media: 'screen' });
  }
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2) + '\n');
} finally { await browser?.close(); server.kill(); }
