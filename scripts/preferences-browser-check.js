import assert from 'node:assert/strict';
export async function checkPreferences(page, base) {
  const saved = () => page.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('View preferences saved in this browser.'));
  await page.goto(base); await page.locator('#nav-review').click(); await page.locator('#demo').click(); await page.locator('#map svg').waitFor();
  await page.locator('#variant').selectOption('blank'); await page.locator('#orientation').selectOption('portrait'); await page.locator('#scale').selectOption('5000'); await page.locator('#rotate').click(); await saved();
  await page.reload(); await page.locator('#demo').click(); await page.locator('#map svg').waitFor();
  assert.equal(await page.locator('#variant').inputValue(), 'blank'); assert.equal(await page.locator('#orientation').inputValue(), 'portrait'); assert.equal(await page.locator('#scale').inputValue(), '5000');
  assert.ok((await page.locator('#status').textContent()).includes('90°'));
  const downloadEvent = page.waitForEvent('download'); await page.locator('#preferences-export').click(); const download = await downloadEvent; const path = await download.path();
  await page.locator('#preferences-defaults').click(); await saved();
  await page.locator('#preferences-import').setInputFiles(path); await saved(); assert.equal(await page.locator('#variant').inputValue(), 'blank');
  const other = await page.context().newPage(); await other.goto(base); await other.locator('#nav-review').click();
  await other.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('View preferences saved'));
  await page.locator('#variant').selectOption('partial'); await saved();
  await other.locator('#variant').selectOption('labeled');
  await other.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('another tab changed'));
  assert.equal(await other.locator('#variant').inputValue(), 'labeled');
  await other.locator('#preferences-reload').click(); await other.waitForFunction(() => document.getElementById('variant').value === 'partial'); await other.close();
  await page.evaluate(() => {
    window.nativePreferenceRead = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = async function () { const bytes = await window.nativePreferenceRead.call(this); if (this.name === 'delayed-prefs.json') { window.preferenceReadStarted = true; await new Promise((resolve) => { window.releasePreferenceRead = resolve; }); } return bytes; };
  });
  await page.locator('#preferences-import').setInputFiles({ name: 'delayed-prefs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ singleton: 'singleton', settingsVersion: 1, version: 0, values: { labels: 'labeled', mapRotationDeg: 0, printScale: 1000, orientation: 'landscape' } })) });
  await page.waitForFunction(() => window.preferenceReadStarted);
  await page.locator('#variant').selectOption('blank'); await saved();
  await page.evaluate(async () => { Blob.prototype.arrayBuffer = window.nativePreferenceRead; window.releasePreferenceRead(); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  assert.equal(await page.locator('#variant').inputValue(), 'blank');
  await page.evaluate(async () => {
    const { openStorage } = await import('/src/storage/indexeddb.js'); const db = await openStorage(); const record = await db.loadSettings();
    const backup = await db.exportBackup(); if (backup.settings.values.labels !== 'blank') throw new Error('Full backup omitted preferences'); db.close();
    const raw = await new Promise((r, j) => { const q = indexedDB.open('map-literacy'); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error); });
    record.values.labels = 'future-style'; const tx = raw.transaction(['settings'], 'readwrite'); tx.objectStore('settings').put(record);
    await new Promise((r, j) => { tx.oncomplete = r; tx.onabort = () => j(tx.error); }); raw.close();
  });
  await page.reload(); await page.waitForFunction(() => document.getElementById('preferences-status').textContent.includes('stored value is unavailable'));
  assert.equal(await page.locator('#variant').inputValue(), 'labeled');
  const retained = await page.evaluate(async () => { const { openStorage } = await import('/src/storage/indexeddb.js'); const s = await openStorage(); const value = await s.loadSettings(); s.close(); return value.values.labels; });
  assert.equal(retained, 'future-style');
  await page.locator('#preferences-defaults').click(); await saved();
  await page.goto(base); await page.locator('#nav-review').click();
  return { reload: 'passed', fileRestore: 'passed', staleRestore: 'passed', crossTabConflict: 'passed', invalidStoredFallback: 'passed' };
}
