import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainRequest, boundedTerrainImage, TERRAIN_LIMITS } from '../src/map/terrain.js';
import { geographicView } from '../src/map/geographic.js';
import { project } from '../src/map/explorer.js';

test('terrain exports share the exact Mercator print extent, pixel grid and sparse layer selection', () => {
  for (const orientation of ['portrait', 'landscape']) {
    const view = geographicView(project(-121.75, 47.5, 15), 15, orientation);
    const request = terrainRequest(view, { relief: true });
    assert.equal(request.layers.length, 4);
    const x = -121.75 / 180 * Math.PI * 6378137;
    assert.ok(Math.abs((request.bbox[0] + request.bbox[2]) / 2 - x) < 1e-7);
    const mercatorWidth = view.worldWidth * 2 * Math.PI * 6378137 / (256 * 2 ** 15);
    assert.ok(Math.abs(request.bbox[2] - request.bbox[0] - mercatorWidth) < 1e-7);
    assert.ok(Math.abs((request.bbox[2] - request.bbox[0]) / (request.bbox[3] - request.bbox[1]) - request.pixels[0] / request.pixels[1]) < 1e-10);
    for (const layer of request.layers) {
      const p = new URL(layer.url).searchParams;
      assert.equal(p.get('bbox'), request.bbox.join(',')); assert.equal(p.get('bboxSR'), '3857'); assert.equal(p.get('imageSR'), '3857'); assert.equal(p.get('size'), request.pixels.join(','));
      if (layer.id === 'roads') { const ids = p.get('layers').slice(5).split(',').map(Number); assert.ok(ids.includes(29) && ids.includes(37)); assert.ok(!ids.includes(32) && !ids.includes(21) && !ids.includes(27)); }
    }
    assert.notEqual(request.key, terrainRequest(view).key);
  }
  for (const zoom of [2, 12, 17]) assert.throws(() => terrainRequest(geographicView(project(0, 0, zoom), zoom, 'landscape')));
  assert.throws(() => terrainRequest(geographicView(project(179.999, 0, 15), 15, 'landscape')));
});
test('terrain response bounds reject service errors and oversized chunked bodies before decoding', async () => {
  const blob = await boundedTerrainImage(new Response(new Uint8Array([1,2,3]), { headers: { 'content-type': 'image/png' } })); assert.equal(blob.size, 3);
  await assert.rejects(boundedTerrainImage(new Response('{}', { headers: { 'content-type': 'application/json' } })));
  await assert.rejects(boundedTerrainImage(new Response('error', { status: 503, headers: { 'content-type': 'image/png' } })));
  await assert.rejects(boundedTerrainImage(new Response('x', { headers: { 'content-type': 'image/png', 'content-length': String(TERRAIN_LIMITS.maxBytes + 1) } })));
  let canceled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { canceled = true; } });
  await assert.rejects(boundedTerrainImage(new Response(stream, { headers: { 'content-type': 'image/png' } })), /limit/); assert.equal(canceled, true);
});
