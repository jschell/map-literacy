import test from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, parseLocation, visibleTiles, MAX_LATITUDE } from '../src/map/explorer.js';

test('geographic locations round trip at world and street zoom', () => {
  for (const zoom of [2, 15, 19]) for (const [lon, lat] of [[0, 0], [-122.122, 47.674], [179.99, -80]]) {
    const result = unproject(...project(lon, lat, zoom), zoom);
    assert.ok(Math.abs(result[0] - lon) < 1e-8); assert.ok(Math.abs(result[1] - lat) < 1e-8);
  }
});
test('map links and coordinate entry agree; invalid locations leave no ambiguous interpretation', () => {
  assert.deepEqual(parseLocation('47.674, -122.122'), { lat: 47.674, lon: -122.122, zoom: 15 });
  assert.deepEqual(parseLocation('https://www.openstreetmap.org/#map=16/47.674/-122.122'), { lat: 47.674, lon: -122.122, zoom: 16 });
  for (const text of ['London', '90, 0', '0, 181', '0 0', 'https://evil.example/#map=15/0/0', 'https://www.openstreetmap.org/#map=99/0/0']) assert.throws(() => parseLocation(text));
});
test('visible tiles cover viewport without offscreen prefetch and wrap across dateline', () => {
  const width = 1200, height = 540;
  const tiles = visibleTiles(project(179.99, 0, 15), 15, width, height);
  assert.ok(tiles.length <= 28);
  assert.ok(tiles.some((tile) => tile.url.includes('/15/0/')));
  for (const tile of tiles) {
    assert.ok(tile.x < width && tile.x + 256 > 0 && tile.y < height && tile.y + 256 > 0);
    assert.match(tile.url, /^https:\/\/tile\.openstreetmap\.org\/15\/\d+\/\d+\.png$/);
  }
  for (const lat of [-MAX_LATITUDE, MAX_LATITUDE]) for (const tile of visibleTiles(project(0, lat, 2), 2, width, height)) {
    const y = Number(tile.url.split('/').at(-1).replace('.png', '')); assert.ok(y >= 0 && y < 4);
  }
});
