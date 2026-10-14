import assert from 'node:assert/strict';

export async function checkExplorer(page, base) {
  const requests = [];
  let failTiles = false;
  // Never request the public tile service from automated browser tests.
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ contentType: 'image/png', body: failTiles ? Buffer.from('invalid image') : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64') });
  });
  await page.goto(base);
  assert.equal(requests.length, 0);
  await page.locator('#explorer-enable').click();
  await page.waitForFunction(() => [...document.querySelectorAll('#explorer-tiles img')].every((img) => img.complete && img.naturalWidth > 0));
  assert.ok(requests.length > 0 && requests.length <= 28);
  await page.locator('#explorer-location').fill('47.674, -122.122');
  await page.locator('#explorer-jump button').click();
  assert.match(await page.locator('#explorer-position').textContent(), /47.67400, -122.12200.*Zoom 15/);
  const before = await page.locator('#explorer-position').textContent();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(220);
  assert.notEqual(await page.locator('#explorer-position').textContent(), before);
  await page.keyboard.press('+');
  assert.match(await page.locator('#explorer-position').textContent(), /Zoom 16/);
  const box = await page.locator('#explorer-map').boundingBox();
  const dragged = await page.locator('#explorer-position').textContent();
  await page.mouse.move(box.x + 200, box.y + 200); await page.mouse.down();
  await page.mouse.move(box.x + 350, box.y + 240, { steps: 5 }); await page.mouse.up();
  assert.notEqual(await page.locator('#explorer-position').textContent(), dragged);
  await page.mouse.wheel(0, -100);
  assert.match(await page.locator('#explorer-position').textContent(), /Zoom 17/);
  const valid = await page.locator('#explorer-position').textContent();
  await page.locator('#explorer-location').fill('invalid'); await page.locator('#explorer-jump button').click();
  assert.match(await page.locator('#explorer-status').textContent(), /Enter latitude/);
  assert.equal(await page.locator('#explorer-position').textContent(), valid);
  await page.locator('#explorer-place').fill('Redmond & Seattle');
  assert.equal(await page.locator('#explorer-search').getAttribute('href'), 'https://www.openstreetmap.org/search?query=Redmond%20%26%20Seattle');
  assert.equal(await page.locator('#map svg').count(), 0);
  await page.locator('#demo').click(); await page.locator('#map svg').waitFor();
  const version = await page.locator('#map').getAttribute('data-load-version');
  await page.locator('#explorer-out').click();
  assert.equal(await page.locator('#map').getAttribute('data-load-version'), version);
  assert.ok((await page.locator('#explorer-link').getAttribute('href')).startsWith('https://www.openstreetmap.org/#map='));
  await page.locator('#explorer-location').fill('https://www.openstreetmap.org/#map=14/47.674/-122.122');
  await page.locator('#explorer-jump button').click();
  assert.match(await page.locator('#explorer-position').textContent(), /Zoom 14/);
  // Same Pointer Events path used by touch; include two-finger pinch and canceled drag.
  await page.locator('#explorer-map').evaluate((map) => {
    const send = (type, id, x, y) => map.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y }));
    const original = map.setPointerCapture; map.setPointerCapture = () => {};
    send('pointerdown', 11, 100, 100); send('pointermove', 11, 160, 120); send('pointercancel', 11, 160, 120);
    send('pointerdown', 12, 100, 100); send('pointerdown', 13, 200, 100);
    send('pointermove', 13, 300, 100); send('pointerup', 12, 100, 100); send('pointerup', 13, 300, 100);
    map.setPointerCapture = original;
  });
  assert.match(await page.locator('#explorer-position').textContent(), /Zoom 15/);
  failTiles = true;
  await page.locator('#explorer-location').fill('https://www.openstreetmap.org/#map=19/70/100');
  await page.locator('#explorer-jump button').click();
  await page.waitForFunction(() => document.getElementById('explorer-status').textContent.startsWith('Some map tiles'));
  failTiles = false; await page.locator('#explorer-retry').click();
  await page.waitForFunction(() => [...document.querySelectorAll('#explorer-tiles img')].every((img) => img.complete && img.naturalWidth > 0));
  await page.locator('#explorer-world').click();
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > innerWidth).map((el) => [el.tagName, el.id, el.getBoundingClientRect().right]).slice(0, 12))));
  await page.locator('.explorer').screenshot({ path: new URL('../artifacts/browser/geographic-mobile.png', import.meta.url).pathname });
  await page.setViewportSize(viewport);
  assert.match(await page.locator('#explorer-position').textContent(), /0.00000, 0.00000.*Zoom 2/);
  await page.reload(); assert.equal(await page.locator('#explorer-map').isHidden(), true);
  await page.unroute('https://tile.openstreetmap.org/**');
  return { mockedTiles: requests.length, geographicNavigation: true, lessonUnchanged: true };
}
