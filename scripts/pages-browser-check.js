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
    const geographicChecks = await checkExplorer(preview, base);
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
    assert.ok((await preview.locator('#lesson-revision').textContent()).includes('1 attempts'));
    assert.equal(await preview.locator('#orientation').inputValue(), 'portrait');
    const pdf = await preview.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.ok(/\/MediaBox\s*\[0 0 612 792\]/.test(pdf.toString('latin1')));
    assert.ok(requests.every((url) => url.startsWith(base) || url.startsWith('https://tile.openstreetmap.org/') || url.startsWith('https://overpass-api.de/') || new URL(url).pathname === '/favicon.ico'), 'app assets stay under the project prefix');
    await preview.evaluate(() => {
      window.pagesViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => window.pagesViolations.push(event.effectiveDirective));
      const script = document.createElement('script'); script.textContent = 'window.inlinePagesScriptRan = true'; document.head.append(script);
    });
    await preview.waitForFunction(() => window.pagesViolations.some((directive) => directive.startsWith('script-src')));
    assert.equal(await preview.evaluate(() => window.inlinePagesScriptRan === true), false);
    assert.deepEqual(errors, []);
    return { geographicChecks, projectPath: '/map-literacy/', metaCspBlocksInline: 'passed', reloadAndPreferences: 'passed', backup: 'passed', portraitPdf: 'passed' };
  } finally {
    await preview.close(); await new Promise((resolve) => server.close(resolve));
  }
}
