import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTraceReview } from '../src/route/trace.js';
import { createMapModel } from '../src/map/model.js';
const packs = JSON.parse(await readFile(new URL('fixtures/packs.json', import.meta.url)));
const state = (edgeIds = [], startNodeId = 'A', mode = 'drive') => ({ startNodeId, mode, edgeIds });
const code = (wanted) => (e) => e.code === wanted;

test('trace uses directed topology, sums source edge distances and never changes the pack', () => {
  const before = JSON.stringify(packs.base), review = createTraceReview(packs.base);
  const trace = review.inspect(state(['AB', 'BC']));
  assert.equal(trace.endNodeId, 'C'); assert.equal(trace.edges.length, 2);
  assert.ok(Math.abs(trace.lengthM - 222.39016046706584) < 1e-8);
  assert.deepEqual(trace.warnings, []);
  assert.deepEqual(review.choices(state()).map((c) => c.edge.id), ['AB', 'AD']);
  assert.equal(JSON.stringify(packs.base), before);
  assert.throws(() => review.inspect(state(['AB'], 'B')), code('disconnected'));
  assert.throws(() => review.inspect(state(['AB'], 'A', 'walk')), code('mode-mismatch'));
});
test('bridge geometry does not create a turn into the crossing disconnected way', () => {
  const review = createTraceReview(packs.base);
  const trace = review.inspect(state(['EF'], 'E'));
  assert.equal(trace.endNodeId, 'F');
  assert.deepEqual(review.choices(state(['EF'], 'E')), []);
  assert.throws(() => review.inspect(state(['EF', 'GH'], 'E')), code('disconnected'));
});
test('unknown access and incomplete topology remain warnings, blocked access is rejected', () => {
  assert.ok(createTraceReview(packs['unknown-access']).inspect(state(['AB', 'BC'])).warnings.some((w) => w.includes('unknown')));
  assert.ok(createTraceReview(packs['incomplete-relation']).inspect(state(['AB'])).warnings.some((w) => w.includes('incomplete')));
  const blocked = structuredClone(packs['unknown-access']); blocked.topology.edges[1].access = 'blocked';
  const review = createTraceReview(blocked);
  assert.throws(() => review.inspect(state(['AB', 'BC'])), code('blocked-access'));
  assert.equal(review.choices(state(['AB']))[0].disabled, true);
  const draft = structuredClone(packs.base); draft.review = { status: 'draft', reviewedAt: null, note: 'Needs review' };
  assert.ok(createTraceReview(draft).inspect(state(['AB'])).warnings.some((w) => w.includes('draft')));
});
test('only and forbidden restrictions match sequence history instead of nodes alone', () => {
  const only = createTraceReview(packs['only-turn']);
  assert.throws(() => only.inspect(state(['AB', 'BD'])), code('only-turn'));
  assert.equal(only.inspect(state(['BD'], 'B')).endNodeId, 'D');
  assert.equal(only.choices(state(['AB'])).find((c) => c.edge.id === 'BD').disabled, true);
  const p = structuredClone(packs['only-turn']); p.topology.restrictions[0] = { ...p.topology.restrictions[0], rule: 'forbidden', edgeSequence: ['AB', 'BD', 'DC'] };
  const forbidden = createTraceReview(p);
  assert.equal(forbidden.inspect(state(['AB', 'BD'])).endNodeId, 'D');
  assert.throws(() => forbidden.inspect(state(['AB', 'BD', 'DC'])), code('forbidden-turn'));
  assert.equal(forbidden.inspect(state(['BD', 'DC'], 'B')).endNodeId, 'C');
});
test('invalid, overlong and off-map traces fail; zero-edge trace has an explicit start', () => {
  const review = createTraceReview(packs.base);
  assert.throws(() => review.inspect(state([], 'missing')), code('invalid-start'));
  assert.throws(() => review.inspect(state(['missing'])), code('missing-edge'));
  assert.throws(() => review.inspect(state([], 'A', 'cycle')), code('unsupported-mode'));
  assert.throws(() => review.inspect(state(Array(1001).fill('AB'))), code('trace-limit'));
  const p = structuredClone(packs.base); p.bounds = [0, 0, .00075, .001]; p.exercises.forEach((x) => { x.review = 'draft'; });
  const small = createTraceReview(p);
  assert.throws(() => small.inspect(state(['AB'])), code('outside-extent'));
  assert.throws(() => small.inspect(state([], 'B')), code('invalid-start'));
  assert.equal(review.inspect(state()).lengthM, 0);
});
test('trace geometry converts through shared screen and fixed-scale Letter transforms', () => {
  const trace = createTraceReview(packs.base).inspect(state(['AB', 'BC']));
  for (const orientation of ['landscape', 'portrait']) {
    const model = createMapModel(packs.base, { paper: true, orientation, scaleDenominator: 1000, rotationDeg: 90 });
    const [a, b] = trace.edges[0].shape.map(model.convert);
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - trace.edges[0].lengthM) < .01);
    assert.equal(model.rotationDeg, 0);
  }
});
