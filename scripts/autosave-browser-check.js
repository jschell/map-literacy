import assert from 'node:assert/strict';
export async function checkAutosave(page, base) {
  const context = page.context();
  const saved = (p) => p.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
  try {
    await page.goto(base); await page.locator('#nav-review').click();
    await page.evaluate(() => { window.progressEvents = []; for (const name of ['answer-submitted', 'answer-scored', 'save-completed', 'save-failed']) document.addEventListener(name, (e) => window.progressEvents.push({ name, detail: structuredClone(e.detail) })); });
    await page.locator('#demo').click(); await page.locator('#map svg').waitFor(); await page.locator('#lesson-start').click(); await saved(page);
    await page.waitForFunction(() => document.getElementById('saved-session').options.length === 2);
    const sessionId = await page.locator('#saved-session option').nth(1).getAttribute('value');
    // Inject a failed transaction, retaining the accepted answer for export/retry.
    await page.evaluate(() => { window.originalTransaction = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (names, mode, ...args) { if (mode === 'readwrite' && Array.from(names).includes('sessions')) throw new DOMException('Test quota exhausted', 'QuotaExceededError'); return window.originalTransaction.call(this, names, mode, ...args); }; });
    await page.locator('#answer-heading').fill('359'); await page.locator('#lesson-submit').click();
    await page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Changes are not saved.'));
    assert.ok((await page.locator('#lesson-revision').textContent()).includes('1 attempt'));
    assert.equal(await page.locator('#lesson-export').isDisabled(), false);
    const events = await page.evaluate(() => window.progressEvents);
    assert.equal(events.find((e) => e.name === 'answer-submitted').detail.answer.degrees, 359);
    assert.equal(events.find((e) => e.name === 'answer-scored').detail.result.status, 'correct');
    assert.equal(events.find((e) => e.name === 'save-failed').detail.code, 'storage-full');
    assert.equal(events.filter((e) => e.name === 'save-completed').length, 1);
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.originalTransaction; });
    await page.locator('#save-retry').click(); await saved(page);
    await page.reload(); await page.locator(`#saved-session option[value="${sessionId}"]`).waitFor({ state: 'attached' });
    assert.equal(await page.locator('#map svg').count(), 0);
    await page.locator('#saved-session').selectOption(sessionId); await page.locator('#saved-resume').click();
    await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Saved session resumed'));
    assert.ok((await page.locator('#lesson-revision').textContent()).includes('1 attempt'));
    assert.equal(await page.locator('#lesson-submit').isDisabled(), true);
    const other = await context.newPage(); await other.goto(base); await other.locator('#nav-review').click();
    await other.locator(`#saved-session option[value="${sessionId}"]`).waitFor({ state: 'attached' });
    await other.locator('#saved-session').selectOption(sessionId); await other.locator('#saved-resume').click();
    await other.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Saved session resumed'));
    await page.locator('#lesson-next').click(); await saved(page);
    await other.locator('#lesson-retry').click();
    await other.waitForFunction(() => document.getElementById('save-status').textContent.includes('another session version'));
    assert.equal(await other.locator('#lesson-export').isDisabled(), false);
    await other.locator('#save-fork').click(); await saved(other);
    const forkId = await other.evaluate(async () => { const {openStorage} = await import('/src/storage/indexeddb.js'); const s = await openStorage(); const list = await s.listSessions(); s.close(); return list.sessions.find((v) => v.id !== document.getElementById('saved-session').value)?.id; });
    assert.ok(forkId && forkId !== sessionId);
    await other.close();
    // Detect an externally advanced version on focus, then explicitly discard memory changes.
    await page.evaluate(async (id) => { const {openStorage} = await import('/src/storage/indexeddb.js'); const s = await openStorage(); const b = await s.loadSession(id); const old = b.session.version; b.session.version++; await s.commit(b, {expectedVersion:old}); s.close(); window.dispatchEvent(new Event('focus')); }, sessionId);
    await page.waitForFunction(() => document.getElementById('save-status').textContent.includes('another session version'));
    await page.locator('#save-reload').click();
    await page.waitForFunction(() => document.getElementById('lesson-status').textContent.includes('Latest saved version resumed'));
    await saved(page);
    const memory = await context.newPage();
    await memory.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
    await memory.goto(base); await memory.locator('#nav-review').click(); await memory.locator('#demo').click(); await memory.locator('#map svg').waitFor();
    await memory.locator('#lesson-start').click(); await memory.locator('#answer-heading').fill('0'); await memory.locator('#lesson-submit').click();
    await memory.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Changes are not saved'));
    assert.ok((await memory.locator('#lesson-revision').textContent()).includes('1 attempt'));
    const downloadEvent = memory.waitForEvent('download'); await memory.locator('#lesson-export').click(); const download = await downloadEvent;
    assert.ok((await download.path())); await memory.close();
    return { degradedBackup: 'passed', reload: 'passed', quotaRetry: 'passed', crossTabConflict: 'passed', forkAndReload: 'passed' };
  } finally { if (!page.isClosed()) await page.goto(base).catch(() => {}); }
}
