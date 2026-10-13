import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareOSM } from '../src/data/prepare-osm.js';
import { buildRoadQuery } from '../src/data/osm-query.js';
import { fetchOSM, SOURCE_BYTE_LIMIT } from '../src/data/acquire-osm.js';
import { compareSources } from '../src/data/compare-sources.js';
import { validatePack } from '../src/data/validate-pack.js';

// Invented OSM-format records, never presented as a live extract.
const raw = () => ({ version: 0.6, generator: 'map-literacy synthetic OSM-format test',
  osm3s: { timestamp_osm_base: '2026-10-13T00:00:00Z' }, elements: [
    { type: 'node', id: 1, lon: 0, lat: 0 }, { type: 'node', id: 2, lon: 0.001, lat: 0 },
    { type: 'node', id: 3, lon: 0.001, lat: 0.001 }, { type: 'node', id: 4, lon: 0, lat: 0.001 },
    { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'residential', name: 'Invented A', oneway: 'yes' } },
    { type: 'way', id: 11, nodes: [4, 3], tags: { highway: 'residential', oneway: '-1' } },
  ] });
const options = () => ({ id: 'osm-test', title: 'Synthetic OSM-format test', revision: 1,
  bounds: [-0.0001, -0.0001, 0.0011, 0.0011], sourceBounds: [-0.0002, -0.0002, 0.0012, 0.0012],
  endpoint: 'https://example.com/api/interpreter', query: 'synthetic-test-not-a-network-request', fetchedAt: '2026-10-13T00:00:00.000Z' });
const encode = (v) => new TextEncoder().encode(JSON.stringify(v));
const run = (v = raw()) => prepareOSM(encode(v), options());

test('OSM preparation retains exact bytes, provenance and unknown access', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(raw(), null, 2) + '\n');
  const result = await prepareOSM(bytes, options());
  assert.deepEqual(result.sourceBytes, bytes);
  assert.equal(result.pack.sources[0].sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(result.pack.sources[0].sourceAt, '2026-10-13T00:00:00.000Z');
  assert.equal(result.pack.review.status, 'draft'); assert.equal(result.pack.exercises.length, 0);
  assert.equal(result.pack.topology.edges.length, 2);
  assert.equal(result.pack.topology.edges[0].from, 'node:1');
  assert.equal(result.pack.topology.edges[1].from, 'node:3');
  assert.ok(result.pack.topology.edges.every((e) => e.access === 'unknown'));
  assert.equal(validatePack(result.pack).valid, true);
});
test('geometric crossing does not merge nodes and shared IDs do join', async () => {
  const v = raw(); v.elements[0].lon = 0; v.elements[0].lat = 0;
  v.elements[1].lon = 0.001; v.elements[1].lat = 0.001;
  v.elements[2].lon = 0.001; v.elements[2].lat = 0;
  const p = (await run(v)).pack;
  assert.ok(!p.topology.edges.some((e) => e.from === 'node:2' && e.to === 'node:3'));
  v.elements[5].nodes = [2, 3]; const joined = (await run(v)).pack;
  assert.equal(joined.topology.nodes.filter((n) => n.id === 'node:2').length, 1);
});
test('missing nodes and outside-boundary ways are omitted with explicit report', async () => {
  const v = raw(); v.elements[4].nodes.push(999);
  v.elements[3].lon = 1;
  const result = await run(v);
  assert.equal(result.pack.features.features.length, 0);
  assert.ok(result.report.issues.some((i) => i.code === 'missing-node'));
  assert.ok(result.report.issues.some((i) => i.code === 'boundary-way'));
  assert.equal(JSON.parse(new TextDecoder().decode(result.sourceBytes)).elements[4].nodes.at(-1), 999);
});
test('relations, missing members and conditional rules are preserved as exclusions', async () => {
  const v = raw(); v.elements[4].tags['access:conditional'] = 'no @ (Mo-Fr)';
  v.elements.push({ type: 'relation', id: 100, tags: { type: 'restriction', restriction: 'no_left_turn' },
    members: [{ type: 'way', ref: 10, role: 'from' }, { type: 'node', ref: 2, role: 'via' }, { type: 'way', ref: 999, role: 'to' }] });
  const r = await run(v);
  assert.ok(r.report.issues.some((i) => i.code === 'missing-relation-member'));
  assert.ok(r.report.issues.some((i) => i.code === 'untranslated-restriction'));
  assert.ok(r.report.issues.some((i) => i.code === 'conditional-rule'));
  assert.equal(r.pack.topology.restrictions.length, 0);
  assert.equal(JSON.parse(new TextDecoder().decode(r.sourceBytes)).elements.at(-1).members.length, 3);
});
test('unsafe IDs, duplicate identity and Overpass partial/error remarks fail', async () => {
  const v = raw(); v.elements[0].id = 9007199254740992;
  await assert.rejects(run(v), (e) => e.code === 'invalid-osm');
  const duplicate = raw(); duplicate.elements.push(duplicate.elements[0]);
  await assert.rejects(run(duplicate), (e) => e.code === 'invalid-osm');
  await assert.rejects(run({ ...raw(), remark: 'runtime error: timeout' }), (e) => e.code === 'incomplete-response');
});
test('source IDs can be decimal strings without numeric coercion', async () => {
  const v = raw(); v.elements[0].id = '9007199254740993'; v.elements[4].nodes[0] = '9007199254740993';
  const r = await run(v); assert.ok(r.pack.topology.nodes.some((n) => n.id === 'node:9007199254740993'));
});
test('unknown direction remains unknown rather than presumed permission', async () => {
  const v = raw(); delete v.elements[4].tags.oneway;
  const r = await run(v);
  assert.ok(r.report.issues.some((i) => i.code === 'unknown-direction'));
  assert.equal(r.pack.topology.edges.filter((e) => e.featureId === 'way:10').length, 2);
  assert.ok(r.pack.topology.edges.every((e) => e.access === 'unknown'));
});
test('metadata and bounds validation prevent invalid prepared packs', async () => {
  await assert.rejects(prepareOSM(encode(raw()), { ...options(), fetchedAt: '2026-02-31T00:00:00Z' }), (e) => e.code === 'invalid-metadata');
  await assert.rejects(prepareOSM(encode(raw()), { ...options(), bounds: [0, 0, 1, 1] }), (e) => e.code === 'invalid-prepared-pack');
});
test('bounded query includes relations, full members and metadata', () => {
  const q = buildRoadQuery(options().sourceBounds);
  assert.ok(q.includes('rel(bw.roads)[type=restriction]'));
  assert.ok(q.includes('>>')); assert.ok(q.includes('out meta;'));
  assert.throws(() => buildRoadQuery([-1, -1, 1, 1]));
  assert.throws(() => buildRoadQuery([179, 0, -179, 1]));
});
test('fetch is identified, one request and preserves response bytes', async () => {
  const bytes = encode(raw()); let count = 0;
  const result = await fetchOSM({ endpoint: options().endpoint, query: 'bounded-query', fetchImpl: async (url, init) => {
    count++; assert.equal(init.method, 'POST'); assert.ok(init.headers['User-Agent'].includes('map-literacy'));
    assert.equal(init.redirect, 'error'); return new Response(bytes);
  } });
  assert.equal(count, 1); assert.deepEqual(result, bytes);
});
test('rate limit/error pause respects Retry-After without automatic requests', async () => {
  for (const status of [406, 429, 503]) {
    let count = 0;
    await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', fetchImpl: async () => { count++; return new Response('error', { status, headers: { 'Retry-After': '90' } }); } }), (e) => e.code === `http-${status}` && e.retryAfterMs === 90000);
    assert.equal(count, 1);
  }
});
test('declared and streamed size limits reject unbounded response', async () => {
  let canceled = false;
  const declared = new ReadableStream({ cancel() { canceled = true; } });
  await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', fetchImpl: async () => new Response(declared, { headers: { 'Content-Length': String(SOURCE_BYTE_LIMIT + 1) } }) }), (e) => e.code === 'source-too-large');
  assert.equal(canceled, true);
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(SOURCE_BYTE_LIMIT + 1)); c.close(); } });
  await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', fetchImpl: async () => new Response(body) }), (e) => e.code === 'source-too-large');
});
test('cancellation and network failure remain distinct', async () => {
  await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', signal: AbortSignal.abort(), fetchImpl: () => { throw new Error('Should not request'); } }), (e) => e.code === 'canceled');
  await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', fetchImpl: async () => { throw new Error('offline'); } }), (e) => e.code === 'network-failed');
});
test('timeout aborts one request without retry', async () => {
  let count = 0;
  await assert.rejects(fetchOSM({ endpoint: options().endpoint, query: 'q', timeoutMs: 1000,
    fetchImpl: async (_url, init) => { count++; return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); }
  }), (e) => e.code === 'timeout');
  assert.equal(count, 1);
});
test('source refresh compares exact identities and preserves old object order', () => {
  const a = raw(), b = structuredClone(a); b.elements[0].lon = 0.0001;
  b.elements.pop(); b.elements.push({ type: 'node', id: 99, lon: 0, lat: 0 });
  const r = compareSources(a, b);
  assert.deepEqual(r.changed, ['node:1']); assert.deepEqual(r.removed, ['way:11']); assert.deepEqual(r.added, ['node:99']);
  assert.deepEqual(compareSources(a, { ...a, elements: [...a.elements].reverse() }).changed, []);
  assert.equal(a.elements[0].lon, 0);
});
