import { validateTerrainPack } from '../terrain/lesson-pack.js';
import { distanceM, lineLengthM } from '../geo/distance.js';
import { PACK_LIMITS, packSchema, terrainPackSchema } from './pack-schema.js';

const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const inside = (c, b) => c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3];
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

/** Pure, non-mutating v1 structural and reference validation. Does not verify source hash bytes. */
export function validatePack(value) {
  const errors = [];
  const add = (path, code, message) => {
    if (errors.length < PACK_LIMITS.errors) errors.push({ path, code, message });
  };
  const result = () => ({ valid: errors.length === 0, errors: errors.sort((a, b) => compare(a.path, b.path) || compare(a.code, b.code)) });
  // Guard callers supplying JS values as well as JSON; never recurse unbounded/cyclic input.
  const ancestors = new Set();
  let visited = 0;
  const checkJSON = (v, path, depth) => {
    if (depth > PACK_LIMITS.depth || ++visited > 1500000) { add(path, 'limit-exceeded', 'JSON depth or value budget exceeded.'); return; }
    if (errors.length >= PACK_LIMITS.errors) return;
    if (typeof v === 'string' && v.length > 2000) { add(path, 'limit-exceeded', 'Text budget exceeded.'); return; }
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number' && Number.isFinite(v)) return;
    if (!Array.isArray(v) && !plain(v)) { add(path, 'invalid-import', 'Expected finite JSON data.'); return; }
    if (ancestors.has(v)) { add(path, 'invalid-import', 'Cyclic data is not JSON.'); return; }
    if (Array.isArray(v) && Object.keys(v).length !== v.length) { add(path, 'invalid-import', 'Sparse or extended arrays are not accepted.'); return; }
    ancestors.add(v);
    for (const [k, item] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(k)) add(`${path}.${k}`, 'invalid-import', 'Reserved key.');
      checkJSON(item, `${path}.${k}`, depth + 1);
      if (visited > 1500000 || errors.length >= PACK_LIMITS.errors) break;
    }
    ancestors.delete(v);
  };
  checkJSON(value, '$', 0);
  if (errors.length) return result();
  if (!plain(value)) { add('$', 'invalid-import', 'Expected a pack object.'); return result(); }
  const terrainVersion = value.schemaVersion === 2 && value.module === 'topographic' && Array.isArray(value.capabilities) && ['terrain-contours-v1','terrain-contours-v1,terrain-slopes-v1','terrain-contours-v1,terrain-profiles-v1','terrain-contours-v1,terrain-slopes-v1,terrain-profiles-v1'].includes(value.capabilities.join(','));
  if (value.schemaVersion !== 1 && !terrainVersion) { add('$.schemaVersion', 'unsupported-version', 'Unsupported pack version/capability; street v1 and synthetic contour v2 are supported.'); return result(); }
  if (!terrainVersion && (value.module === 'topographic' || (Array.isArray(value.capabilities)
    && value.capabilities.some((c) => c === 'terrain-v1' || c === 'directions-v1')))) {
    add('$.capabilities', 'unsupported-capability', 'Only street-core is implemented.'); return result();
  }
  const shape = (schema, v, path) => {
    const fail = (message) => add(path, 'invalid-import', message);
    if (errors.length >= PACK_LIMITS.errors) return;
    switch (schema.type) {
      case 'json': return;
      case 'nullable': if (v !== null) shape(schema.item, v, path); return;
      case 'enum': if (!schema.values.includes(v)) fail('Unsupported value.'); return;
      case 'string':
        if (typeof v !== 'string' || v.length < schema.min || v.length > schema.max || (schema.pattern && !schema.pattern.test(v))) { fail('Invalid text or identifier.'); return; }
        if (schema.format === 'date' && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v)) fail('Expected a canonical UTC date.');
        if (schema.format === 'https') { try { const u = new URL(v); if (u.protocol !== 'https:' || u.username || u.password) fail('Expected HTTPS without credentials.'); } catch { fail('Invalid URL.'); } }
        return;
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v) || v < schema.min || v > schema.max || (schema.integer && !Number.isSafeInteger(v)) || (schema.exclusiveMin && v === schema.min)) fail('Number outside permitted range.');
        return;
      case 'tuple':
        if (!Array.isArray(v) || v.length !== schema.items.length) { fail('Wrong tuple length.'); return; }
        schema.items.forEach((s, i) => shape(s, v[i], `${path}[${i}]`)); return;
      case 'array':
        if (!Array.isArray(v)) { fail('Expected array.'); return; }
        if (v.length < schema.min || v.length > schema.max) { add(path, 'limit-exceeded', 'Array outside permitted size.'); return; }
        v.forEach((item, i) => shape(schema.items, item, `${path}[${i}]`)); return;
      case 'record':
        if (!plain(v)) { fail('Expected object.'); return; }
        for (const [k, item] of Object.entries(v)) shape(schema.item, item, `${path}.${k}`);
        return;
      case 'object':
        if (!plain(v)) { fail('Expected object.'); return; }
        for (const k of Object.keys(v)) if (!Object.hasOwn(schema.fields, k)) add(`${path}.${k}`, 'invalid-import', 'Unknown field.');
        for (const [k, s] of Object.entries(schema.fields)) {
          if (!Object.hasOwn(v, k)) add(`${path}.${k}`, 'invalid-import', 'Required field missing.');
          else shape(s, v[k], `${path}.${k}`);
        }
        return;
      case 'discriminated':
        if (!plain(v) || !Object.hasOwn(schema.choices, v[schema.key])) { fail('Unknown object type.'); return; }
        shape(schema.choices[v[schema.key]], v, path); return;
      default: throw new Error('Invalid schema descriptor');
    }
  };
  shape(terrainVersion ? terrainPackSchema : packSchema, value, '$');
  if (errors.length) return result();
  const p = value;
  if (terrainVersion) { try { validateTerrainPack(p); } catch (error) { add('$.terrain','invalid-import',error.message); return result(); } }
  if (p.topology.completeness === 'complete' && p.topology.exclusions.length > 0) add('$.topology.completeness', 'invalid-import', 'Excluded content must be marked partial.');
  for (const [key, max] of [['bounds', 5000], ['sourceBounds', 10000]]) {
    const b = p[key];
    if (b[0] >= b[2] || b[1] >= b[3] || Math.abs(b[1]) > 70 || Math.abs(b[3]) > 70
      || distanceM(b.slice(0, 2), b.slice(2)) > max) add(`$.${key}`, 'extent-unsupported', 'Invalid or unsupported extent.');
  }
  if (!inside(p.bounds.slice(0, 2), p.sourceBounds) || !inside(p.bounds.slice(2), p.sourceBounds)) add('$.bounds', 'invalid-import', 'Display bounds must be inside source bounds.');
  if (!terrainVersion && (new Set(p.capabilities).size !== p.capabilities.length || p.capabilities.length !== 1 || p.capabilities[0] !== 'street-core')) add('$.capabilities', 'invalid-import', 'Expected unique street-core capability.');
  if (p.review.status === 'reviewed' && (p.review.reviewedAt === null || !p.review.note.trim())) add('$.review', 'invalid-import', 'Reviewed content needs review date and note.');
  const index = (items, path) => {
    const map = new Map();
    items.forEach((item, i) => { if (map.has(item.id)) add(`${path}[${i}].id`, 'invalid-import', 'Duplicate identifier.'); else map.set(item.id, item); });
    return map;
  };
  const sources = index(p.sources, '$.sources');
  const features = index(p.features.features, '$.features.features');
  const nodes = index(p.topology.nodes, '$.topology.nodes');
  const edges = index(p.topology.edges, '$.topology.edges');
  index(p.topology.restrictions, '$.topology.restrictions');
  index(p.topology.exclusions, '$.topology.exclusions');
  index(p.labels, '$.labels'); index(p.exercises, '$.exercises');
  const ref = (map, id, path) => { if (!map.has(id)) add(path, 'invalid-import', 'Unresolved reference.'); return map.get(id); };
  let coordinateCount = 0;
  const point = (c, path) => {
    coordinateCount += 1;
    if (!inside(c, p.sourceBounds)) add(path, 'invalid-import', 'Coordinate outside source bounds.');
  };
  p.sources.forEach((s, i) => { if (s.url === null && s.kind !== 'synthetic') add(`$.sources[${i}].url`, 'invalid-import', 'Non-synthetic source needs URL.'); if (s.kind === 'synthetic' && s.transforms.length === 0) add(`$.sources[${i}].transforms`, 'invalid-import', 'Synthetic source needs recipe.'); });
  p.features.features.forEach((f, i) => {
    const path = `$.features.features[${i}]`;
    ref(sources, f.properties.sourceId, `${path}.properties.sourceId`);
    if (!terrainVersion && f.properties.role === 'contour') add(`${path}.properties.role`, 'unsupported-capability', 'Contours require terrain support.');
    const walk = (c, loc) => { if (typeof c[0] === 'number') point(c, loc); else c.forEach((v, j) => walk(v, `${loc}[${j}]`)); };
    walk(f.geometry.coordinates, `${path}.geometry.coordinates`);
    const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat() : [];
    rings.forEach((ring) => { if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) add(`${path}.geometry.coordinates`, 'invalid-import', 'Polygon ring is not closed.'); });
  });
  p.topology.nodes.forEach((n, i) => { point(n.coordinate, `$.topology.nodes[${i}].coordinate`); ref(sources, n.sourceId, `$.topology.nodes[${i}].sourceId`); });
  p.topology.edges.forEach((e, i) => {
    const path = `$.topology.edges[${i}]`;
    const start = ref(nodes, e.from, `${path}.from`); const end = ref(nodes, e.to, `${path}.to`);
    ref(features, e.featureId, `${path}.featureId`); ref(sources, e.sourceId, `${path}.sourceId`);
    e.shape.forEach((c, j) => point(c, `${path}.shape[${j}]`));
    if ((start && distanceM(start.coordinate, e.shape[0]) > 0.1) || (end && distanceM(end.coordinate, e.shape.at(-1)) > 0.1)) add(`${path}.shape`, 'invalid-import', 'Shape endpoints differ from nodes.');
    const actual = lineLengthM(e.shape);
    if (Math.abs(e.lengthM - actual) > Math.max(0.1, actual * 0.001)) add(`${path}.lengthM`, 'invalid-import', 'Length disagrees with geometry.');
  });
  p.topology.restrictions.forEach((r, i) => {
    const path = `$.topology.restrictions[${i}]`; ref(sources, r.sourceId, `${path}.sourceId`);
    const sequence = r.edgeSequence.map((id, j) => ref(edges, id, `${path}.edgeSequence[${j}]`));
    sequence.forEach((e, j) => { if (e && (e.mode !== r.mode || (j > 0 && sequence[j - 1] && sequence[j - 1].to !== e.from))) add(`${path}.edgeSequence[${j}]`, 'invalid-import', 'Restriction mode/connectivity mismatch.'); });
  });
  p.labels.forEach((l, i) => { ref(features, l.featureId, `$.labels[${i}].featureId`); point(l.anchor, `$.labels[${i}].anchor`); });
  const excluded = new Set(p.topology.exclusions.flatMap((e) => e.objectIds));
  p.exercises.forEach((x, i) => {
    const path = `$.exercises[${i}]`;
    x.sourceIds.forEach((id, j) => ref(sources, id, `${path}.sourceIds[${j}]`));
    if (x.scenario) x.scenario.closedEdgeIds.forEach((id, j) => ref(edges, id, `${path}.scenario.closedEdgeIds[${j}]`));
    if (x.type === 'detour' && (!x.scenario || x.scenario.closedEdgeIds.length === 0)) add(`${path}.scenario`, 'invalid-import', 'Detour needs closures.');
    if (x.type === 'heading' && x.scenario !== null) add(`${path}.scenario`, 'invalid-import', 'Heading does not use closures.');
    if (x.type === 'endpoint') point(x.rubric.expected, `${path}.rubric.expected`);
    if (x.type === 'route' || x.type === 'detour') {
      ref(nodes, x.rubric.startNodeId, `${path}.rubric.startNodeId`); ref(nodes, x.rubric.endNodeId, `${path}.rubric.endNodeId`);
      if ((x.rubric.objective === 'any-valid') !== (x.rubric.maxDistanceM === null)) add(`${path}.rubric.maxDistanceM`, 'invalid-import', 'Distance must agree with objective.');
      if (x.review === 'reviewed' && (excluded.has(x.rubric.startNodeId) || excluded.has(x.rubric.endNodeId))) add(`${path}.review`, 'invalid-import', 'Reviewed exercise uses excluded endpoint.');
    }
  });
  if (coordinateCount > PACK_LIMITS.coordinates) add('$', 'limit-exceeded', 'Coordinate budget exceeded.');
  return result();
}
