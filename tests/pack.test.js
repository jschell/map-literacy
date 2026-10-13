import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validatePack } from '../src/data/validate-pack.js';
import { readImport } from '../src/data/read-pack.js';
import { PACK_LIMITS } from '../src/data/pack-schema.js';
import { distanceM } from '../src/geo/distance.js';

const fixture = (name) => readFile(new URL(`fixtures/${name}`, import.meta.url));
const packs = JSON.parse(await fixture('packs.json'));
const expected = JSON.parse(await fixture('expected.json'));
const modified = (fn) => { const p = structuredClone(packs.base); fn(p); return p; };
const rejects = (p, code = 'invalid-import') => {
  const r = validatePack(p); assert.equal(r.valid, false); assert.ok(r.errors.some((e) => e.code === code), JSON.stringify(r.errors)); return r;
};

for (const row of expected.validation) test(`fixture import: ${row.pack}`, async () => {
  const p = packs[row.pack]; const before = JSON.stringify(p);
  const report = validatePack(p); assert.equal(report.valid, row.valid, JSON.stringify(report.errors));
  if (row.code) assert.ok(report.errors.some((e) => e.code === row.code));
  if (row.valid) assert.deepEqual(await readImport(new Blob([before])), p);
  else await assert.rejects(readImport(new Blob([before])), (e) => e.code === row.code);
  assert.equal(JSON.stringify(p), before, 'Validation/import must not mutate caller data.');
});

test('source hashes refer to actual deterministic raw bytes', async () => {
  const hash = createHash('sha256').update(await fixture('synthetic-source.json')).digest('hex');
  for (const p of Object.values(packs)) assert.equal(p.sources[0].sha256, hash);
});
test('distance matches independent equatorial and meridian known values', () => {
  assert.ok(Math.abs(distanceM([0, 0], [1, 0]) - 111195.0802335329) < 0.000001);
  assert.ok(Math.abs(distanceM([0, 0], [0, 1]) - 111195.0802335329) < 0.000001);
  assert.equal(distanceM([0, 0], [0, 0]), 0);
});
test('bridge lines retain disconnected identities and one-way has no reverse edge', () => {
  const { edges } = packs.base.topology;
  assert.equal(edges.find((e) => e.id === 'EF').to, 'F');
  assert.equal(edges.find((e) => e.id === 'GH').from, 'G');
  assert.ok(!edges.some((e) => e.from === 'B' && e.to === 'A'));
});

const bad = [
  ['duplicate node', (p) => p.topology.nodes.push(p.topology.nodes[0])],
  ['duplicate feature', (p) => p.features.features.push(p.features.features[0])],
  ['unknown field', (p) => { p.script = 'run me'; }],
  ['rubric/type mismatch', (p) => { p.exercises[0].rubric = p.exercises[2].rubric; }],
  ['source URL', (p) => { p.sources[0].url = 'http://example.com'; }],
  ['source kind needs URL', (p) => { p.sources[0].kind = 'osm'; }],
  ['missing source ref', (p) => { p.features.features[0].properties.sourceId = 'nope'; }],
  ['source hash', (p) => { p.sources[0].sha256 = 'unknown'; }],
  ['invalid date', (p) => { p.sources[0].fetchedAt = '2026-02-31T00:00:00.000Z'; }],
  ['shape endpoint', (p) => { p.topology.edges[0].shape[0] = [0.0001, 0]; }],
  ['geometry length', (p) => { p.topology.edges[0].lengthM = 5; }],
  ['restriction adjacency', (p) => p.topology.restrictions.push({ id: 'r', edgeSequence: ['AB', 'DC'], rule: 'only', mode: 'drive', sourceId: 'synthetic' })],
  ['detour missing closure', (p) => { p.exercises[3].scenario = null; }],
  ['closure bad reference', (p) => { p.exercises[3].scenario.closedEdgeIds = ['missing']; }],
  ['review without note', (p) => { p.review.note = ''; }],
  ['reviewed excluded endpoint', (p) => { p.topology.exclusions.push({ id: 'x', objectIds: ['A'], reason: 'Unknown topology' }); }],
  ['distance objective mismatch', (p) => { p.exercises[2].rubric.objective = 'max-distance'; }],
  ['capability duplicate', (p) => { p.capabilities.push('street-core'); }],
  ['nonfinite', (p) => { p.topology.edges[0].lengthM = Infinity; }],
  ['out of bounds', (p) => { p.labels[0].anchor = [1, 1]; }],
  ['empty extension only', (p) => { p.extensions['custom:code'] = 'anything'; }],
];
for (const [name, mutate] of bad) test(`reject ${name}`, () => rejects(modified(mutate)));

test('dateline, oversized extent and high latitude fail explicitly', () => {
  rejects(modified((p) => { p.bounds = [179, 0, -179, 0.001]; }), 'extent-unsupported');
  rejects(modified((p) => { p.sourceBounds = [-1, -1, 1, 1]; }), 'extent-unsupported');
  rejects(modified((p) => { p.bounds = [0, 71, 0.001, 71.001]; }), 'extent-unsupported');
});
test('cycles, invalid objects, reserved keys and bounded nesting do not throw', () => {
  const p = structuredClone(packs.base); p.extensions.loop = p; rejects(p);
  rejects(null); rejects(new Date()); rejects({ ...packs.base, constructor: 'bad' });
  let value = {}; for (let i = 0; i < 34; i++) value = { next: value };
  rejects(modified((p) => { p.sources[0].transforms[0].parameters = value; }), 'limit-exceeded');
});
test('invalid UTF-8 and malformed JSON fail without a persistence adapter', async () => {
  await assert.rejects(readImport(new Blob([new Uint8Array([0xff])])), (e) => e.code === 'invalid-import');
  await assert.rejects(readImport(new Blob(['{'])), (e) => e.code === 'invalid-import');
});
test('byte limit is checked before reading and cancellation after reading is honored', async () => {
  const file = new Blob([new Uint8Array(PACK_LIMITS.bytes + 1)]);
  file.arrayBuffer = () => { throw new Error('Should not read oversized file'); };
  await assert.rejects(readImport(file), (e) => e.code === 'limit-exceeded');
  const controller = new AbortController(); const normal = new Blob([JSON.stringify(packs.base)]);
  normal.arrayBuffer = async () => { controller.abort(); return new ArrayBuffer(0); };
  await assert.rejects(readImport(normal, controller.signal), (e) => e.code === 'canceled');
  await assert.rejects(readImport(new Blob([]), AbortSignal.abort()), (e) => e.code === 'canceled');
});
test('error ordering is stable by path then code', () => {
  const p = modified((p) => { delete p.title; p.zzz = 'unexpected'; p.id = ''; });
  assert.deepEqual(validatePack(p), validatePack(p));
  const paths = validatePack(p).errors.map((e) => e.path);
  assert.deepEqual(paths, [...paths].sort());
});
test('coordinate and array budgets are enforced across collections', () => {
  rejects(modified((p) => { p.labels = Array(2001).fill(p.labels[0]); }), 'limit-exceeded');
  rejects(modified((p) => { p.features.features[0].geometry.coordinates = Array.from({ length: 100000 }, () => [0, 0]); }), 'limit-exceeded');
});
test('sparse arrays and oversized arbitrary metadata are rejected', () => {
  rejects(modified((p) => { p.topology.nodes = Array(2); }));
  rejects(modified((p) => { p.sources[0].transforms[0].parameters.note = 'x'.repeat(2001); }), 'limit-exceeded');
});
test('unclosed polygon and complete topology with exclusions fail', () => {
  rejects(modified((p) => { p.features.features[0].geometry = { type: 'Polygon', coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001]]] }; }));
  rejects(modified((p) => { p.topology.exclusions.push({ id: 'gap', objectIds: ['unknown:relation'], reason: 'Missing members' }); }));
});
