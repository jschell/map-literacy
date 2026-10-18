import { buildTerrainLessonFixture, buildTerrainSlopeFixture, buildTerrainProfileFixture } from './terrain-lesson-fixture.js';
import { buildTerrainFixtures } from './terrain-fixtures.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lineLengthM } from '../src/geo/distance.js';

export function buildFixtures() {
  const coordinates = { A: [0, 0], B: [0.001, 0], C: [0.001, 0.001], D: [0, 0.001],
    E: [0.0003, 0.0002], F: [0.0007, 0.0008], G: [0.0003, 0.0008], H: [0.0007, 0.0002] };
  const links = ['AB', 'BC', 'AD', 'DC', 'EF', 'GH'];
  const raw = { recipeVersion: 2, coordinates, links, onewayWays: links, bridgeWays: ['EF'], note: 'Synthetic geometry; EF bridges over GH without a shared node.' };
  const rawBytes = JSON.stringify(raw, null, 2) + '\n';
  const hash = createHash('sha256').update(rawBytes).digest('hex');
  const base = {
    schemaVersion: 1, id: 'synthetic-square', title: 'Synthetic streets and bridge crossing', revision: 2,
    module: 'street', capabilities: ['street-core'],
    review: { status: 'reviewed', reviewedAt: '2026-10-13T00:00:00.000Z', note: 'Synthetic recipe and known answers reviewed; no real roads represented.' },
    bounds: [-0.0001, -0.0001, 0.0011, 0.0011], sourceBounds: [-0.0002, -0.0002, 0.0012, 0.0012],
    sources: [{ id: 'synthetic', kind: 'synthetic', url: null, query: null,
      fetchedAt: '2026-10-13T00:00:00.000Z', sourceAt: null, version: 'recipe-v2', sha256: hash,
      license: 'CC0-1.0', attribution: 'Map Literacy synthetic fixture data; no geographic source.',
      transforms: [{ name: 'generate-fixtures', version: '2', parameters: { sourceFile: 'synthetic-source.json' } }] }],
    features: { type: 'FeatureCollection', features: links.map((id) => ({ type: 'Feature', id: `road:${id}`,
      geometry: { type: 'LineString', coordinates: [coordinates[id[0]], coordinates[id[1]]] },
      properties: { sourceId: 'synthetic', role: 'road', name: `Road ${id}`, tags: { synthetic: 'yes', oneway: 'yes', ...(id === 'EF' ? { bridge: 'yes' } : {}) } } })) },
    topology: {
      nodes: Object.entries(coordinates).map(([id, coordinate]) => ({ id, coordinate, sourceId: 'synthetic', sourceObjectId: null })),
      edges: links.map((id) => ({ id, from: id[0], to: id[1], featureId: `road:${id}`, sourceId: 'synthetic', mode: 'drive', access: 'allowed', lengthM: lineLengthM([coordinates[id[0]], coordinates[id[1]]]), shape: [coordinates[id[0]], coordinates[id[1]]] })),
      restrictions: [], completeness: 'complete', exclusions: [],
    },
    labels: links.map((id, index) => ({ id: `label:${id}`, featureId: `road:${id}`, text: `Road ${id}`,
      anchor: [(coordinates[id[0]][0] + coordinates[id[1]][0]) / 2, (coordinates[id[0]][1] + coordinates[id[1]][1]) / 2],
      rotationDeg: -Math.atan2(coordinates[id[1]][1] - coordinates[id[0]][1], coordinates[id[1]][0] - coordinates[id[0]][0]) * 180 / Math.PI,
      visibleIn: index % 2 === 0 ? 'partial' : 'labeled', priority: 50 })),
    exercises: [
      { id: 'heading', type: 'heading', prompt: 'Face true north.', review: 'reviewed', sourceIds: ['synthetic'], hints: ['North is 0 degrees.'], scenario: null, rubric: { expectedDeg: 0, toleranceDeg: 15 } },
      { id: 'endpoint', type: 'endpoint', prompt: 'Locate A.', review: 'reviewed', sourceIds: ['synthetic'], hints: [], scenario: null, rubric: { expected: coordinates.A, toleranceM: 20 } },
      { id: 'route', type: 'route', prompt: 'Trace any valid route from A to C.', review: 'reviewed', sourceIds: ['synthetic'], hints: [], scenario: null,
        rubric: { startNodeId: 'A', endNodeId: 'C', mode: 'drive', objective: 'any-valid', maxDistanceM: null } },
      { id: 'detour', type: 'detour', prompt: 'Reach C when BC is closed in this synthetic exercise.', review: 'reviewed', sourceIds: ['synthetic'], hints: [],
        scenario: { id: 'closure', closedEdgeIds: ['BC'], label: 'Synthetic closure, not a real road condition.' },
        rubric: { startNodeId: 'A', endNodeId: 'C', mode: 'drive', objective: 'any-valid', maxDistanceM: null } },
    ],
    print: { paper: 'letter', orientation: 'landscape', marginMm: 10, scaleDenominator: 1000, labelMinPt: 8, mapRotationDeg: 0 }, extensions: {},
  };
  const packs = { base };
  const variant = (name, mutate) => {
    const p = structuredClone(base); p.id = `synthetic-${name}`;
    p.sources[0].transforms.push({ name: 'fixture-variant', version: '1', parameters: { name } });
    mutate(p); packs[name] = p;
  };
  variant('no-exercises', (p) => { p.exercises = []; });
  variant('unknown-access', (p) => { p.topology.edges.find((e) => e.id === 'BC').access = 'unknown'; p.exercises.forEach((x) => { if (x.type === 'route' || x.type === 'detour') x.review = 'draft'; }); });
  variant('incomplete-relation', (p) => { p.topology.completeness = 'partial'; p.topology.exclusions = [{ id: 'missing-member', objectIds: ['B', 'BC'], reason: 'Synthetic missing relation member; route content awaits review.' }]; p.exercises.forEach((x) => { if (x.type === 'route' || x.type === 'detour') x.review = 'draft'; }); });
  variant('only-turn', (p) => { const shape = [coordinates.B, coordinates.D];
    p.features.features.push({ type: 'Feature', id: 'road:BD', geometry: { type: 'LineString', coordinates: shape }, properties: { sourceId: 'synthetic', role: 'road', name: 'Road BD', tags: { synthetic: 'yes' } } });
    p.topology.edges.push({ id: 'BD', from: 'B', to: 'D', featureId: 'road:BD', sourceId: 'synthetic', mode: 'drive', access: 'allowed', lengthM: lineLengthM(shape), shape });
    p.topology.restrictions.push({ id: 'only-bc', edgeSequence: ['AB', 'BC'], rule: 'only', mode: 'drive', sourceId: 'synthetic' });
  });
  variant('zero-distance', (p) => { p.exercises[2].rubric.endNodeId = 'A'; });
  variant('one-way-return', (p) => { p.exercises[2].rubric.startNodeId = 'B'; p.exercises[2].rubric.endNodeId = 'A'; p.exercises[2].review = 'draft'; });
  variant('bad-reference', (p) => { p.topology.edges[0].from = 'missing'; });
  variant('future-topo', (p) => { p.module = 'topographic'; p.capabilities = ['terrain-v1']; });
  variant('future-route', (p) => { p.capabilities.push('directions-v1'); });
  variant('unsupported-version', (p) => { p.schemaVersion = 2; });
  const expected = {
    validation: Object.keys(packs).map((name) => ({ pack: name, valid: !['bad-reference', 'future-topo', 'future-route', 'unsupported-version'].includes(name),
      code: name === 'bad-reference' ? 'invalid-import' : name.startsWith('future-') ? 'unsupported-capability' : name === 'unsupported-version' ? 'unsupported-version' : null })),
    lessonCases: [
      { id: 'heading-wrap', pack: 'base', exercise: 'heading', answers: [359, 15, 16], statuses: ['correct', 'correct', 'incorrect'], implementedIn: '04' },
      { id: 'endpoint-boundary', pack: 'base', exercise: 'endpoint', distancesM: [19.9, 20, 20.1], statuses: ['correct', 'correct', 'incorrect'], implementedIn: '04' },
      { id: 'two-valid-routes', pack: 'base', exercise: 'route', answers: [['AB', 'BC'], ['AD', 'DC']], statuses: ['correct', 'correct'], implementedIn: '04' },
      { id: 'disconnected-order', pack: 'base', exercise: 'route', answers: [['BC', 'AB']], statuses: ['incorrect'], implementedIn: '04' },
      { id: 'one-way-return', pack: 'one-way-return', expectedPath: null, implementedIn: '04' },
      { id: 'bridge-crossing', pack: 'base', from: 'E', to: 'H', expectedPath: null, implementedIn: '04' },
      { id: 'detour', pack: 'base', exercise: 'detour', answers: [['AD', 'DC'], ['AB', 'BC']], statuses: ['correct', 'incorrect'], implementedIn: '04' },
      { id: 'only-turn', pack: 'only-turn', exercise: 'route', answers: [['AB', 'BD', 'DC']], statuses: ['incorrect'], implementedIn: '04' },
      { id: 'unknown-access', pack: 'unknown-access', exercise: 'route', answers: [['AB', 'BC']], statuses: ['needs-review'], implementedIn: '04' },
      { id: 'zero-distance', pack: 'zero-distance', exercise: 'route', answers: [[]], statuses: ['correct'], implementedIn: '04' },
    ],
    deferredCases: [
      { id: 'stale-save', expected: 'conflict', implementedIn: '05' },
      { id: 'rollback', expected: 'No partial backup import', implementedIn: '05' },
    ],
  };
  return { 'terrain-profiles.json': JSON.stringify(buildTerrainProfileFixture(),null,2)+'\n', 'terrain-slopes.json': JSON.stringify(buildTerrainSlopeFixture(),null,2)+'\n', 'terrain-hill.json': JSON.stringify(buildTerrainLessonFixture(),null,2)+'\n', ...buildTerrainFixtures(), 'synthetic-source.json': rawBytes, 'street-square.json': JSON.stringify(base, null, 2) + '\n', 'packs.json': JSON.stringify(packs, null, 2) + '\n', 'expected.json': JSON.stringify(expected, null, 2) + '\n' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = new URL('../tests/fixtures/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [name, content] of Object.entries(buildFixtures())) {
    const target = new URL(name, directory);
    if (process.argv.includes('--check')) {
      if (await readFile(target, 'utf8') !== content) throw new Error(`Fixture differs: ${name}`);
    } else await writeFile(target, content);
  }
  console.log(process.argv.includes('--check') ? 'Fixtures reproduce exactly.' : 'Generated synthetic fixtures.');
}
