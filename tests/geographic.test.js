import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { project } from '../src/map/explorer.js';
import { geographicView, geographicModel, clipSegment } from '../src/map/geographic.js';
import { geographicQuery, parseGeographicSource, acquireGeographicSource } from '../src/data/geographic-source.js';
import { geographicFixture } from '../scripts/geographic-fixture.js';
const view = (orientation = 'landscape') => geographicView(project(-122.122, 47.674, 15), 15, orientation);
test('physical geographic extent is independent of viewport and has a calibrated local scale', () => {
  for (const orientation of ['portrait', 'landscape']) {
    const v = view(orientation); assert.ok(Math.abs(v.width / v.height - (orientation === 'portrait' ? 8.5 / 11 : 11 / 8.5)) < 1e-10);
    assert.deepEqual(v.inverse(v.convert(v.center)), v.center);
    assert.ok(Math.abs(v.scaleDenominator * v.width / 1000 - v.groundWidth) < 1e-8);
    assert.ok(v.bounds[0] < v.center[0] && v.bounds[2] > v.center[0]);
  }
});
test('ways crossing the entire print area survive clipping with original identity and tags', () => {
  const v = view(), features = parseGeographicSource(geographicFixture(geographicQuery(v.bounds))), model = geographicModel(features, v);
  assert.equal(model.roads.length, 5); assert.equal(model.availableNames, 4); assert.equal(model.unnamed, 1); assert.equal(model.labels.length, 4);
  assert.equal(model.roads.find((f) => f.id === 'way:3').tags.bridge, 'yes');
  assert.deepEqual(clipSegment([-10, 5], [30, 5], 20, 10), [[0, 5], [20, 5]]); assert.equal(clipSegment([-10, -5], [30, -5], 20, 10), null);
  for (const label of model.labels) assert.ok(label.fontSize >= 8 * 25.4 / 72);
});
test('partial/blank labels are stable, missing names remain missing and invalid sources fail', () => {
  const v = view(), features = parseGeographicSource(geographicFixture(geographicQuery(v.bounds)));
  const partial = geographicModel(features, v, { labels: 'partial' }); assert.ok(partial.labels.length > 0 && partial.labels.length < 4);
  assert.deepEqual(partial.labels, geographicModel([...features].reverse(), v, { labels: 'partial' }).labels);
  assert.equal(geographicModel(features, v, { labels: 'blank' }).labels.length, 0);
  assert.throws(() => parseGeographicSource({ version: .6, elements: [], remark: 'timeout' }));
  assert.throws(() => parseGeographicSource({ version: .6, elements: [{ type: 'way', id: 1, tags: { highway: 'road' } }] }));
  assert.throws(() => geographicQuery([-10, -10, 10, 10]));
});
test('acquisition retains exact raw source bytes and hash, query, date and attribution', async () => {
  const v = view(), raw = JSON.stringify(geographicFixture(geographicQuery(v.bounds)));
  const source = await acquireGeographicSource(v.bounds, { fetchImpl: async () => new Response(raw) });
  assert.equal(source.raw, raw); assert.match(source.provenance.sha256, /^[a-f0-9]{64}$/); assert.equal(source.provenance.license, 'ODbL-1.0'); assert.ok(source.provenance.query.includes('out body geom'));
  await assert.rejects(acquireGeographicSource(v.bounds, { fetchImpl: async () => new Response('busy', { status: 429, headers: { 'retry-after': '60' } }) }), (error) => error.retryMs === 60000);
});

test('dense names remain minimum-size and non-overlapping with explicit suppression', () => {
  const v = view(), features = Array.from({ length: 80 }, (_, i) => ({ id: `way:${i + 1}`, role: 'road', name: `Neighborhood Road ${i}`, tags: { highway: 'residential' }, geometry: [v.inverse([-10, 3 + i * (v.height - 6) / 79]), v.inverse([v.width + 10, 3 + i * (v.height - 6) / 79])] }));
  const model = geographicModel(features, v);
  assert.ok(model.labels.length > 0 && model.suppressed > 0);
  assert.equal(model.labels.length + model.suppressed, 80);
  for (let i = 0; i < model.labels.length; i++) {
    const a = model.labels[i].box; assert.ok(a[0] >= 2 && a[1] >= 2 && a[2] <= v.width - 2 && a[3] <= v.height - 2);
    for (const label of model.labels.slice(i + 1)) { const b = label.box; assert.equal(a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1], false); }
  }
});

test('UTF-8 BOM and non-ASCII names retain exact download/hash provenance', async () => {
  const v = view(), data = geographicFixture(geographicQuery(v.bounds)); data.elements[0].tags.name = 'Rue du café';
  const raw = '\uFEFF' + JSON.stringify(data);
  const source = await acquireGeographicSource(v.bounds, { fetchImpl: async () => new Response(raw) });
  assert.equal(source.raw, raw); assert.equal(source.provenance.sha256, createHash('sha256').update(raw).digest('hex'));
  assert.equal(source.features[0].name, 'Rue du café');
});

test('HTTP-date provider cooldown is respected without an automatic retry', async () => {
  const date = new Date(Date.now() + 90000).toUTCString();
  let calls = 0;
  await assert.rejects(acquireGeographicSource(view().bounds, { fetchImpl: async () => { calls++; return new Response('busy', { status: 503, headers: { 'retry-after': date } }); } }), (error) => error.retryMs > 80000);
  assert.equal(calls, 1);
});
