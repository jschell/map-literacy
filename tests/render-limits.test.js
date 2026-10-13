import test from 'node:test';
import assert from 'node:assert/strict';
import { makePerfPack } from '../scripts/perf-pack.js';
import { assertRenderable } from '../src/map/render-limits.js';
import { matchingOptions } from '../src/ui/search-select.js';

test('initial render budget accepts measured neighborhood data but not display ceiling', () => {
  const pack = makePerfPack('neighborhood').pack;
  assert.deepEqual(assertRenderable(pack), { features: 1000, displayCoordinates: 10000, labels: 200 });
  assert.throws(() => assertRenderable(makePerfPack('display-ceiling').pack), (e) => e.code === 'render-limit-exceeded');
  assert.equal(assertRenderable(makePerfPack('graph-ceiling').pack).features, 1);
  for (const key of ['features', 'coordinates', 'labels']) {
    const p = structuredClone(pack);
    if (key === 'features') p.features.features.push(p.features.features[0]);
    if (key === 'coordinates') p.features.features[0].geometry.coordinates.push([0, 0]);
    if (key === 'labels') p.labels.push(p.labels[0]);
    assert.throws(() => assertRenderable(p), (e) => e.code === 'render-limit-exceeded');
  }
});
test('bounded options preserve selected IDs and find entries beyond the first page literally', () => {
  const items = Array.from({ length: 20000 }, (_, i) => ({ id: `n${i}`, text: `Node n${i}` }));
  assert.equal(matchingOptions(items, '', '').visible.length, 200);
  const found = matchingOptions(items, 'NODE N19999', 'n0');
  assert.equal(found.matches, 1); assert.deepEqual(found.visible.map((i) => i.id), ['n19999', 'n0']);
  assert.equal(matchingOptions(items, 'missing', 'n19999').matches, 0);
  assert.deepEqual(matchingOptions(items, 'missing', 'n19999').visible.map((i) => i.id), ['n19999']);
  const literal = [{ id: 'x', text: '<img src=x onerror=alert(1)>' }];
  assert.equal(matchingOptions(literal, 'onerror', '').visible[0].text, literal[0].text);
});
