import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { project } from '../src/map/explorer.js';
import { geographicView, geographicModel, clipSegment, streetLabel } from '../src/map/geographic.js';
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


test('street labels abbreviate English tokens while retaining full source names', () => {
  assert.equal(streetLabel('Northeast 132nd Street'), 'NE 132nd St');
  assert.equal(streetLabel('184th Avenue Northeast'), '184th Ave NE');
  assert.equal(streetLabel('Rue du café'), 'Rue du café');
  assert.equal(streetLabel('constructor __proto__ Avenue'), 'constructor __proto__ Ave');
  const v = view(), features = parseGeographicSource(geographicFixture(geographicQuery(v.bounds))), model = geographicModel(features, v);
  for (const label of model.labels) {
    assert.equal(label.sourceName, features.find((f) => f.id === label.featureId).name);
    if (label.placement === 'road') assert.ok(label.baselineLength >= label.textWidth + 2);
    else assert.equal(label.leader.length, 2);
  }
});
test('short road fragments and sharp bends cannot carry overlong labels', () => {
  const v = view();
  const road = (id, points, name = 'A Very Long Neighborhood Road') => ({ id, role: 'road', name, tags: { highway: 'residential' }, geometry: points.map(v.inverse) });
  const tiny = geographicModel([road('way:1', [[40, 50], [42, 50]])], v);
  assert.equal(tiny.labels[0].placement, 'callout'); assert.deepEqual(tiny.labels[0].leader[0].map(Math.round), [41, 50]);
  const straight = geographicModel([road('way:2', Array.from({ length: 21 }, (_, i) => [10 + i * 8, 70]), 'Northeast 132nd Street')], v);
  assert.equal(straight.labels.length, 1); assert.equal(straight.labels[0].text, 'NE 132nd St');
  const bent = geographicModel([road('way:3', [[60, 60], [65, 60], [65, 65]])], v);
  assert.equal(bent.labels.length, 1); assert.equal(bent.labels[0].placement, 'callout');
});
test('label placement avoids crossing road junctions and reserved legend boxes', () => {
  const v = view(), road = (id, name, points) => ({ id, role: 'road', name, tags: { highway: 'residential' }, geometry: points.map(v.inverse) });
  const model = geographicModel([road('way:1', 'Long Street', [[10, 70], [v.width - 10, 70]]), road('way:2', null, [[v.width / 2, 10], [v.width / 2, v.height - 10]])], v);
  assert.equal(model.labels.length, 1);
  const label = model.labels[0]; assert.ok(Math.abs(label.x - v.width / 2) > Math.max(4, label.fontSize * 1.5) / 2);
  for (const region of model.furniture) assert.equal(label.box[0] < region[2] && label.box[2] > region[0] && label.box[1] < region[3] && label.box[3] > region[1], false);
});


test('same-name runs join source-shared nodes but never join distinct grade-separated nodes', () => {
  const v = view(), road = (id, points, nodeIds) => ({ id, role: 'road', name: 'Long Street', nodeIds, tags: { highway: 'residential' }, geometry: points.map(v.inverse) });
  const parts = [road('way:1', [[10, 70], [50, 70]], [1, 2]), road('way:2', [[50, 70], [90, 70]], [2, 3])];
  const joined = geographicModel(parts, v, { measureText: () => 60 });
  assert.equal(joined.labels.length, 1); assert.deepEqual(joined.labels[0].sourceIds, ['way:1', 'way:2']);
  parts[1].nodeIds = [20, 3];
  const separated = geographicModel(parts, v, { measureText: () => 60 }); assert.equal(separated.labels.length, 1); assert.equal(separated.labels[0].placement, 'callout'); 
});
