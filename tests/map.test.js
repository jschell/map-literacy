import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProjection, rotateScreen, boundsPerimeter } from '../src/geo/projection.js';
import { createMapModel } from '../src/map/model.js';
import { distanceM } from '../src/geo/distance.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));

test('projection gives independent equatorial meter coordinates and inverse', () => {
  const p = createProjection([0, 0]);
  assert.ok(Math.abs(p.project([0.01, 0])[0] - 1111.950802335329) < 0.000001);
  assert.ok(Math.abs(p.project([0, 0.01])[1] - 1111.950802335329) < 0.000001);
  assert.deepEqual(p.inverse([0, 0]), [0, 0]);
});
test('projection round trips and local distances across latitude limits', () => {
  for (const latitude of [-70, -47.67, 0, 47.67, 70]) {
    const p = createProjection([-122.12, latitude]);
    const a = [-122.14, latitude - 0.005], b = [-122.10, latitude + 0.005];
    assert.ok(distanceM(a, p.inverse(p.project(a))) < 0.1);
    const xyA = p.project(a), xyB = p.project(b);
    const error = Math.abs(Math.hypot(xyA[0] - xyB[0], xyA[1] - xyB[1]) / distanceM(a, b) - 1);
    assert.ok(error < 0.005, String(error));
  }
});
test('rotation separates true heading from page orientation', () => {
  const east = rotateScreen([100, 0], 90);
  assert.ok(Math.abs(east[0]) < 1e-10); assert.ok(Math.abs(east[1] - 100) < 1e-10);
  const north = rotateScreen([0, 100], 90);
  assert.ok(Math.abs(north[0] - 100) < 1e-10);
});
test('bounds perimeter follows edges in order without interleaved clipping', () => {
  const points = boundsPerimeter([0, 0, 1, 1], 2);
  assert.deepEqual(points, [[0, 0], [.5, 0], [1, 0], [1, .5], [1, 1], [.5, 1], [0, 1], [0, .5]]);
});
test('map variants retain identical paths and clip extent without mutating pack', () => {
  const before = JSON.stringify(pack);
  const labeled = createMapModel(pack), blank = createMapModel(pack, { variant: 'blank' });
  assert.deepEqual(labeled.paths, blank.paths); assert.deepEqual(labeled.clip, blank.clip);
  assert.equal(blank.labels.length, 0); assert.ok(labeled.labels.length > 0);
  assert.equal(JSON.stringify(pack), before);
});
test('paper scale is in mm, remains north up and is not fitted silently', () => {
  const m = createMapModel(pack, { paper: true, rotationDeg: 90, scaleDenominator: 5000 });
  assert.equal(m.width, 259.4); assert.equal(m.height, 145); assert.equal(m.rotationDeg, 0);
  assert.equal(m.metersToUnits, 0.2); assert.ok(m.labels.every((l) => l.fontSize >= 8 * 25.4 / 72));
  const bigger = structuredClone(pack); bigger.bounds = [-0.02, -0.005, 0.02, 0.005]; bigger.sourceBounds = bigger.bounds;
  assert.throws(() => createMapModel(bigger, { paper: true }), (e) => e.code === 'print-extent-too-large');
});
test('map coordinate conversion/inversion is stable after rotation', () => {
  for (const rotationDeg of [0, 90, 180, 270]) {
    const m = createMapModel(pack, { rotationDeg });
    assert.ok(distanceM([0.001, 0.001], m.invert(m.convert([0.001, 0.001]))) < 0.1);
  }
});
test('manual partial labels and collision priority are deterministic', () => {
  const p = structuredClone(pack);
  p.labels[0].visibleIn = 'partial';
  for (const l of p.labels.slice(1)) l.visibleIn = 'labeled';
  p.labels[1].anchor = p.labels[0].anchor; p.labels[1].priority = 1;
  const a = createMapModel(p), b = createMapModel(p);
  assert.deepEqual(a.labels, b.labels); assert.ok(a.suppressedLabels > 0);
  const partial = createMapModel(p, { variant: 'partial' });
  assert.equal(partial.labels.length, 1); assert.equal(partial.labels[0].id, p.labels[0].id);
});
test('automatic road labels deduplicate names and use a stable partial subset', () => {
  const p = structuredClone(pack); p.labels = [];
  p.features.features[0].properties.name = 'Same name'; p.features.features[1].properties.name = 'Same name';
  const m = createMapModel(p);
  assert.ok(m.labels.filter((l) => l.text === 'Same name').length <= 1);
  assert.ok(createMapModel(p, { variant: 'partial' }).labels.length <= m.labels.length);
});
test('explicit direction symbols rotate with map and suppress conditional tags', () => {
  const p = structuredClone(pack); p.features.features[0].properties.tags.oneway = 'yes';
  const a = createMapModel(p), b = createMapModel(p, { rotationDeg: 90 });
  assert.ok(a.paths[0].directionSymbol);
  assert.ok(Math.abs(b.paths[0].directionSymbol.angle - a.paths[0].directionSymbol.angle - 90) < 1e-7);
  p.features.features[0].properties.tags['oneway:conditional'] = 'no @ (Mo)';
  assert.equal(createMapModel(p).paths[0].directionSymbol, null);
});
test('phone maps retain readable native label size instead of shrinking a desktop canvas', () => {
  const m = createMapModel(pack, { screenWidth: 354, screenHeight: 320 });
  assert.equal(m.width, 354); assert.ok(m.labels.every((l) => l.fontSize >= 13));
  assert.equal(createMapModel(pack, { paper: true, scaleDenominator: 1000 }).metersToUnits, 1);
});


test('Letter orientations retain true scale, north-up geometry and label size', () => {
  for (const orientation of ['portrait', 'landscape']) {
    const p = structuredClone(pack); p.print.orientation = orientation;
    const m = createMapModel(p, { paper: true, scaleDenominator: 1000, rotationDeg: 90 });
    const a = m.convert([0, 0]), b = m.convert([0.0005, 0]);
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - distanceM([0, 0], [0.0005, 0])) < 0.01);
    assert.equal(m.rotationDeg, 0); assert.equal(m.orientation, orientation);
    assert.ok(m.labels.length > 0);
    assert.ok(m.labels.every((l) => l.fontSize >= 8 * 25.4 / 72));
    assert.ok(distanceM([0.0005, 0], m.invert(b)) < 0.1);
  }
  assert.throws(() => createMapModel(pack, { paper: true, orientation: 'square' }), /Unsupported print orientation/);
});
test('Letter fit limits depend on orientation without automatic rescaling', () => {
  const wide = structuredClone(pack); wide.bounds = [-.0005, 0, .0015, .001]; wide.sourceBounds = [-.005, -.005, .005, .005];
  assert.equal(createMapModel(wide, { paper: true, orientation: 'landscape', scaleDenominator: 1000 }).metersToUnits, 1);
  assert.throws(() => createMapModel(wide, { paper: true, orientation: 'portrait', scaleDenominator: 1000 }), (e) => e.code === 'print-extent-too-large');
  const tall = structuredClone(pack); tall.bounds = [0, 0, .0016, .0016]; tall.sourceBounds = [-.005, -.005, .005, .005];
  assert.equal(createMapModel(tall, { paper: true, orientation: 'portrait', scaleDenominator: 1000 }).metersToUnits, 1);
  assert.throws(() => createMapModel(tall, { paper: true, orientation: 'landscape', scaleDenominator: 1000 }), (e) => e.code === 'print-extent-too-large');
});
