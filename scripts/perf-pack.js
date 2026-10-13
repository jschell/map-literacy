import { createHash } from 'node:crypto';
import { lineLengthM } from '../src/geo/distance.js';

/** Synthetic stress data, deliberately not a real neighborhood or teaching pack. */
export function makePerfPack(profile) {
  if (!['neighborhood', 'display-ceiling', 'graph-ceiling'].includes(profile)) throw new Error('Unknown performance profile.');
  const recipe = { generator: 'map-literacy-perf-pack', version: 1, profile, seed: 0, fixtureTimestamp: '2026-10-13T00:00:00.000Z' };
  const sourceBytes = Buffer.from(JSON.stringify(recipe) + '\n');
  const pack = { schemaVersion: 1, id: `perf-${profile}`, title: `Synthetic ${profile} stress data`, revision: 1, module: 'street', capabilities: ['street-core'],
    review: { status: 'draft', reviewedAt: null, note: 'Benchmark only; not a reviewed lesson or real-world geography.' },
    bounds: [-.006, -.006, .006, .006], sourceBounds: [-.006, -.006, .006, .006],
    sources: [{ id: 's', kind: 'synthetic', url: null, query: null, fetchedAt: recipe.fixtureTimestamp, sourceAt: null, version: '1', sha256: createHash('sha256').update(sourceBytes).digest('hex'), license: 'CC0-1.0', attribution: 'Map Literacy synthetic benchmark; not real-world data.', transforms: [{ name: recipe.generator, version: '1', parameters: recipe }] }],
    features: { type: 'FeatureCollection', features: [] }, topology: { nodes: [], edges: [], restrictions: [], completeness: 'complete', exclusions: [] }, labels: [], exercises: [],
    print: { paper: 'letter', orientation: 'landscape', marginMm: 10, scaleDenominator: 10000, labelMinPt: 8, mapRotationDeg: 0 }, extensions: {} };
  const feature = (id, coordinates) => ({ type: 'Feature', id, geometry: { type: 'LineString', coordinates }, properties: { sourceId: 's', role: 'road', name: null, tags: { synthetic: 'yes' } } });
  if (profile !== 'graph-ceiling') {
    const featureCount = profile === 'neighborhood' ? 1000 : 10000, columns = profile === 'neighborhood' ? 40 : 100, rows = Math.ceil(featureCount / columns);
    for (let i = 0; i < featureCount; i++) {
      const col = i % columns, row = Math.floor(i / columns), x = -.00596 + col * .012 / columns, y = -.00596 + row * .012 / rows;
      const count = i < 8000 ? 10 : 9;
      const coordinates = Array.from({ length: count }, (_, j) => [Number((x + j * .000008).toFixed(8)), Number((y + (j % 2) * .000002).toFixed(8))]);
      pack.features.features.push(feature(`f${i}`, coordinates));
      if (i % 5 === 0) pack.labels.push({ id: `l${i}`, featureId: `f${i}`, text: `Road ${i}`, anchor: coordinates[4], rotationDeg: 0, visibleIn: i % 10 ? 'labeled' : 'partial', priority: 50 });
    }
  } else {
    pack.bounds = pack.sourceBounds = [-.0005, -.0005, .0005, .0005]; pack.print.scaleDenominator = 1000;
    const a = [0, 0], b = [.00001, 0]; pack.features.features.push(feature('f0', [a, b]));
    for (let i = 0; i < 19998; i++) pack.topology.nodes.push({ id: `n${i}`, coordinate: i % 2 ? b : a, sourceId: 's', sourceObjectId: null });
    const lengthM = lineLengthM([a, b]);
    for (let i = 0; i < 40000; i++) {
      const pair = Math.floor(i / 4) % 9999, reverse = i % 2 === 1;
      pack.topology.edges.push({ id: `e${i}`, from: `n${pair * 2 + (reverse ? 1 : 0)}`, to: `n${pair * 2 + (reverse ? 0 : 1)}`, featureId: 'f0', sourceId: 's', mode: i % 4 < 2 ? 'drive' : 'walk', access: 'allowed', lengthM, shape: reverse ? [b, a] : [a, b] });
    }
    for (let i = 0; i < 5000; i++) pack.topology.restrictions.push({ id: `r${i}`, edgeSequence: [`e${i * 4}`, `e${i * 4 + 1}`], rule: 'forbidden', mode: 'drive', sourceId: 's' });
  }
  return { pack, sourceBytes, recipe };
}
