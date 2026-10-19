import { checkExplorer } from './explorer-browser-check.js';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.js';
import { META_CSP } from './static-policy.js';

/** Project-path and meta-CSP smoke test; does not emulate every GitHub Pages behavior. */
export async function checkPagesPackage(page) {
  const root = fileURLToPath(new URL('../dist/pages/', import.meta.url));
  const server = createStaticServer(root, { basePath: '/map-literacy/', headers: {} });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/map-literacy/`;
  const preview = await page.context().newPage(), errors = [], requests = [];
  preview.on('pageerror', (error) => errors.push(error.message));
  preview.on('request', (request) => requests.push(request.url()));
  try {
    const response = await preview.goto(base);
    assert.equal(response.headers()['content-security-policy'], undefined);
    assert.equal(await preview.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), META_CSP);
    const version = new URL(await preview.locator('script[type=module]').getAttribute('src'), base).searchParams.get('v');
    assert.match(version, /^[a-f0-9]{16}$/);
    const geographicChecks = await checkExplorer(preview, base);
    const modules = requests.filter((url) => url.startsWith(base) && new URL(url).pathname.endsWith('.js'));
    assert.ok(modules.length > 10 && modules.every((url) => new URL(url).searchParams.get('v') === version), 'all module imports use one release fingerprint');
    await preview.locator('#nav-review').click();
    await preview.locator('#demo').click(); await preview.locator('#map svg').waitFor();
    assert.equal(await preview.locator('#map .feature').count(), 6);
    await preview.locator('#lesson-start').click();
    const saved = () => preview.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
    await saved();
    await preview.locator('#answer-heading').fill('0'); await preview.locator('#lesson-submit').click(); await saved();
    assert.ok((await preview.locator('#lesson-status').textContent()).startsWith('Correct.'));
    const id = await preview.locator('#saved-session option').nth(1).getAttribute('value');
    const downloadEvent = preview.waitForEvent('download'); await preview.locator('#lesson-export').click();
    assert.ok(await (await downloadEvent).path());
    await preview.locator('#orientation').selectOption('portrait');
    await preview.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('saved in this browser'));
    await preview.reload();
    await preview.locator(`#saved-session option[value="${id}"]`).waitFor({ state: 'attached' });
    await preview.locator('#saved-session').selectOption(id); await preview.locator('#saved-resume').click();
    await preview.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Saved session resumed'));
    assert.ok((await preview.locator('#lesson-revision').textContent()).includes('1 attempt'));
    assert.equal(await preview.locator('#orientation').inputValue(), 'portrait');
    const pdf = await preview.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.ok(/\/MediaBox\s*\[0 0 612 792\]/.test(pdf.toString('latin1')));
    await preview.emulateMedia({media:'screen'});
    await preview.locator('#terrain-demo').click();
    await preview.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic hill'));
    await preview.locator('#lesson-start').click();await saved();
    await preview.locator('#answer-elevation').fill('85');await preview.locator('#lesson-submit').click();await saved();
    assert.match(await preview.locator('#lesson-status').textContent(),/^Correct/);
    const lessonDownload = preview.waitForEvent('download'); await preview.locator('#lesson-pdf').click();
    const directPdf = await lessonDownload; assert.ok(await directPdf.path());
    assert.match(await preview.locator('#lesson-pdf-status').textContent(), /PDF ready: Letter portrait, 1:1,000/);
    await saved(); await preview.locator('#slope-demo').click();
    await preview.waitForFunction(()=>document.getElementById('status').textContent.includes('relative slope'));
    await preview.locator('#lesson-start').click(); await saved();
    await preview.locator('#answer-slope').selectOption('A');await preview.locator('#lesson-submit').click();await saved();
    assert.match(await preview.locator('#lesson-status').textContent(), /^Correct/);
    await preview.locator('#profile-demo').click();await preview.waitForFunction(()=>document.getElementById('status').textContent.includes('elevation profiles'));
    await preview.locator('#lesson-start').click();await saved();await preview.locator('#answer-profile').fill('20');await preview.locator('#lesson-submit').click();await saved();
    assert.match(await preview.locator('#lesson-status').textContent(),/^Correct/);
    await preview.locator('#profile-panel').waitFor({state:'visible'});
    const profileDownload=preview.waitForEvent('download');await preview.locator('#lesson-pdf').click();assert.ok(await (await profileDownload).path());
    await preview.locator('#landform-demo').click();await preview.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic landforms'));
    await preview.locator('#lesson-start').click();await saved();await preview.locator('#answer-landform').selectOption('valley');await preview.locator('#lesson-submit').click();await saved();assert.match(await preview.locator('#lesson-status').textContent(),/^Correct/);
    const landformDownload=preview.waitForEvent('download');await preview.locator('#lesson-pdf').click();assert.ok(await (await landformDownload).path());
    await preview.locator('#depression-demo').click();await preview.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic basin'));assert.equal(await preview.locator('#map .depression-tick').count(),35);
    await preview.locator('#lesson-start').click();await saved();await preview.locator('#answer-elevation').fill('110');await preview.locator('#lesson-submit').click();await saved();assert.match(await preview.locator('#lesson-status').textContent(),/^Correct/);
    const depressionDownload=preview.waitForEvent('download');await preview.locator('#lesson-pdf').click();assert.ok(await (await depressionDownload).path());
    assert.ok(requests.every((url) => url.startsWith(base) || url.startsWith(`blob:${new URL(base).origin}/`) || url.startsWith('https://tile.openstreetmap.org/') || url.startsWith('https://basemap.nationalmap.gov/') || url.startsWith('https://overpass-api.de/') || url.startsWith('https://carto.nationalmap.gov/') || url.startsWith('https://elevation.nationalmap.gov/') || new URL(url).pathname === '/favicon.ico'), 'app assets stay under the project prefix');
    await preview.evaluate(() => {
      window.pagesViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => window.pagesViolations.push(event.effectiveDirective));
      const script = document.createElement('script'); script.textContent = 'window.inlinePagesScriptRan = true'; document.head.append(script);
    });
    await preview.waitForFunction(() => window.pagesViolations.some((directive) => directive.startsWith('script-src')));
    assert.equal(await preview.evaluate(() => window.inlinePagesScriptRan === true), false);
    assert.deepEqual(errors, []);
    return { geographicChecks, projectPath: '/map-literacy/', terrainDepressions: 'passed', terrainLandforms: 'passed', terrainProfiles: 'passed', terrainSlope: 'passed', terrainLesson: 'passed', lessonPdf: 'passed', metaCspBlocksInline: 'passed', reloadAndPreferences: 'passed', backup: 'passed', portraitPdf: 'passed' };
  } finally {
    await preview.close(); await new Promise((resolve) => server.close(resolve));
  }
}
