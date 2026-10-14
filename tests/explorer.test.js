import test from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, parseLocation, visibleTiles, MAX_LATITUDE, pageFrame } from '../src/map/explorer.js';

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

test('Letter guide fits desktop and phone viewports with the selected paper shape', () => {
  for (const [width, height] of [[1200, 540], [284, 540], [640, 320]]) {
    for (const orientation of ['portrait', 'landscape']) {
      const frame = pageFrame(width, height, orientation);
      assert.ok(frame.width <= width - 48 && frame.height <= height - 80 + 1e-8);
      assert.ok(Math.abs(frame.width / frame.height - (orientation === 'portrait' ? 8.5 / 11 : 11 / 8.5)) < 1e-8);
    }
  }
});

test('USGS topo uses Web Mercator row/column addressing with isolated cache keys', async () => {
  const { tileURL } = await import('../src/map/basemaps.js');
  assert.equal(tileURL('topo', 15, 5268, 11434), 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/15/11434/5268');
  const center = project(-122.122, 47.674, 15);
  const street = visibleTiles(center, 15, 640, 490), topo = visibleTiles(center, 15, 640, 490, 'topo');
  assert.deepEqual(topo.map(({x,y}) => [x,y]), street.map(({x,y}) => [x,y]));
  assert.ok(topo.every((tile) => !street.some((s) => s.key === tile.key)));
  for (const args of [['topo', 17, 0, 0], ['topo', 16, 0, 65536], ['__proto__', 2, 0, 0], ['topo', 2, .5, 0]]) assert.throws(() => tileURL(...args));
});
