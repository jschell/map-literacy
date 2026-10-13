import { lineLengthM } from '../geo/distance.js';
import { validatePack } from './validate-pack.js';
import { SOURCE_BYTE_LIMIT, SourceError } from './acquire-osm.js';
import { buildRoadQuery } from './osm-query.js';

const inside = (c, b) => c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3];
const osmId = (id) => {
  if ((typeof id === 'number' && Number.isSafeInteger(id) && id > 0) || (typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id))) return String(id);
  throw new SourceError('invalid-osm', 'OSM identifiers must be positive safe integers or decimal strings.');
};
const normalizedDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) || !Number.isFinite(Date.parse(v))) throw new SourceError('invalid-metadata', 'Expected UTC source timestamp.');
  const date = new Date(v).toISOString();
  if (date !== v && date.replace('.000Z', 'Z') !== v) throw new SourceError('invalid-metadata', 'Invalid calendar timestamp.');
  return date;
};

/** Preserve exact raw bytes separately; emit draft drawing/topology plus review report. */
export async function prepareOSM(bytes, options) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > SOURCE_BYTE_LIMIT) throw new SourceError('source-too-large', 'Expected bounded source bytes.');
  const { id, title, revision = 1, bounds, sourceBounds, endpoint, query, fetchedAt } = options;
  buildRoadQuery(sourceBounds); // Validates extent before processing source.
  let raw;
  try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new SourceError('invalid-osm', 'Expected UTF-8 OSM JSON.'); }
  if (!raw || raw.version !== 0.6 || !Array.isArray(raw.elements) || raw.elements.length > 100000) throw new SourceError('invalid-osm', 'Expected bounded OSM JSON elements.');
  if (Object.hasOwn(raw, 'remark')) throw new SourceError('incomplete-response', 'Overpass reported an error/remark; not a successful snapshot.');
  const elements = new Map();
  const nodes = new Map();
  for (const item of raw.elements) {
    if (!item || !['node', 'way', 'relation'].includes(item.type)) throw new SourceError('invalid-osm', 'Unknown OSM element type.');
    const key = `${item.type}:${osmId(item.id)}`;
    if (elements.has(key)) throw new SourceError('invalid-osm', 'Duplicate OSM identity.');
    const tags = item.tags ?? {};
    if (!tags || typeof tags !== 'object' || Array.isArray(tags) || Object.entries(tags).some(([k, v]) => k.length > 2000 || typeof v !== 'string' || v.length > 2000)) throw new SourceError('invalid-osm', 'Invalid tags.');
    if (item.type === 'node') {
      if (!Number.isFinite(item.lon) || !Number.isFinite(item.lat) || Math.abs(item.lon) > 180 || Math.abs(item.lat) > 90) throw new SourceError('invalid-osm', 'Invalid node coordinate.');
      nodes.set(osmId(item.id), item);
    }
    if (item.type === 'way' && (!Array.isArray(item.nodes) || item.nodes.length < 2 || item.nodes.length > 100000)) throw new SourceError('invalid-osm', 'Invalid way nodes.');
    if (item.type === 'way') item.nodes.forEach(osmId);
    if (item.type === 'relation') {
      if (!Array.isArray(item.members) || item.members.length > 10000) throw new SourceError('invalid-osm', 'Invalid relation members.');
      item.members.forEach((m) => { if (!m || !['node', 'way', 'relation'].includes(m.type) || typeof m.role !== 'string') throw new SourceError('invalid-osm', 'Invalid relation member.'); osmId(m.ref); });
    }
    elements.set(key, item);
  }
  const sourceId = 'osm-source';
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const report = { sourceHash: hash, sourceObjects: elements.size, drawnWays: 0, derivedEdges: 0, unknownAccessEdges: 0,
    namedWays: 0, unnamedWays: 0, issues: [], reviewStatus: 'draft' };
  const exclusions = [];
  const issue = (code, objectIds, detail) => {
    if (report.issues.length >= 5000) throw new SourceError('report-too-large', 'Too many source issues; choose a smaller extract.');
    report.issues.push({ code, objectIds, detail });
    exclusions.push({ id: `issue:${exclusions.length}`, objectIds, reason: `${code}: ${detail}` });
  };
  const features = []; const derivedNodes = new Map(); const edges = [];
  const addNode = (node) => {
    const nodeId = `node:${osmId(node.id)}`;
    derivedNodes.set(nodeId, { id: nodeId, coordinate: [node.lon, node.lat], sourceId, sourceObjectId: nodeId });
    return nodeId;
  };
  for (const [key, way] of elements) {
    if (way.type !== 'way' || !way.tags?.highway) continue;
    if (way.tags.area === 'yes') { issue('unsupported-area-road', [key], 'Area geometry is not a centerline road; raw object retained.'); continue; }
    const resolved = way.nodes.map((nodeId) => nodes.get(osmId(nodeId)));
    if (resolved.some((n) => !n)) { issue('missing-node', [key], 'Way skipped: source node missing.'); continue; }
    const shape = resolved.map((n) => [n.lon, n.lat]);
    if (shape.some((c) => !inside(c, sourceBounds))) { issue('boundary-way', [key], 'Whole way skipped: node outside bounded source extent; raw object retained.'); continue; }
    if (lineLengthM(shape) === 0) { issue('zero-length-way', [key], 'Way has no measurable length.'); continue; }
    features.push({ type: 'Feature', id: key, geometry: { type: 'LineString', coordinates: shape }, properties: { sourceId, role: 'road', name: way.tags.name ?? null, tags: { ...way.tags } } });
    report.drawnWays++; if (way.tags.name) report.namedWays++; else { report.unnamedWays++; issue('missing-name', [key], 'Name unavailable; do not invent a label.'); }
    const oneway = way.tags.oneway;
    const direction = ['yes', '1', 'true'].includes(oneway) ? 'forward' : oneway === '-1' ? 'reverse' : ['no', '0', 'false'].includes(oneway) ? 'both' : 'unknown';
    if (direction === 'unknown') issue('unknown-direction', [key], 'Explicit supported oneway tag absent; candidate graph edges have unknown access.');
    if (Object.keys(way.tags).some((tag) => tag.includes('conditional') || tag.startsWith('oneway:'))) issue('conditional-rule', [key], 'Conditional/mode-specific rules require manual or routing-engine review.');
    issue('unreviewed-access', [key], 'Driving access is not inferred from highway tags; every derived edge is unknown until review.');
    for (let i = 1; i < resolved.length; i++) {
      const a = resolved[i - 1], b = resolved[i];
      const segment = [[a.lon, a.lat], [b.lon, b.lat]];
      const lengthM = lineLengthM(segment);
      if (lengthM === 0) { issue('zero-length-segment', [key], 'Repeated coordinates omitted from graph.'); continue; }
      const aId = addNode(a), bId = addNode(b);
      const add = (from, to, s, suffix) => edges.push({ id: `${key}:${i}:${suffix}`, from, to, featureId: key, sourceId, mode: 'drive', access: 'unknown', lengthM, shape: s });
      if (direction !== 'reverse') add(aId, bId, segment, 'f');
      if (direction !== 'forward') add(bId, aId, [...segment].reverse(), 'r');
    }
  }
  for (const [key, item] of elements) {
    if (item.type !== 'relation') continue;
    const missing = item.members.filter((m) => !elements.has(`${m.type}:${osmId(m.ref)}`));
    if (missing.length) issue('missing-relation-member', [key, ...missing.map((m) => `${m.type}:${osmId(m.ref)}`)], 'Required relation objects are missing.');
    if (item.tags?.type === 'restriction') issue('untranslated-restriction', [key, ...item.members.map((m) => `${m.type}:${osmId(m.ref)}`)], 'Restriction preserved in raw source; no legal maneuver inferred before profile-aware translation/review.');
  }
  report.derivedEdges = edges.length; report.unknownAccessEdges = edges.length;
  const pack = {
    schemaVersion: 1, id, title, revision, module: 'street', capabilities: ['street-core'],
    review: { status: 'draft', reviewedAt: null, note: 'Prepared from OSM; source/access/restriction/label review required before scored lessons.' },
    bounds, sourceBounds,
    sources: [{ id: sourceId, kind: 'osm', url: endpoint, query, fetchedAt: normalizedDate(fetchedAt),
      sourceAt: raw.osm3s?.timestamp_osm_base ? normalizedDate(raw.osm3s.timestamp_osm_base) : null,
      version: typeof raw.generator === 'string' ? raw.generator : null, sha256: hash, license: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors — https://www.openstreetmap.org/copyright',
      transforms: [{ name: 'prepare-osm', version: '1', parameters: { sourceFile: 'source.osm.json', reportFile: 'review-report.json', mode: 'drive', accessPolicy: 'unknown-until-reviewed' } }] }],
    features: { type: 'FeatureCollection', features },
    topology: { nodes: [...derivedNodes.values()], edges, restrictions: [], completeness: exclusions.length ? 'partial' : 'complete', exclusions },
    labels: [], exercises: [], print: { paper: 'letter', orientation: 'landscape', marginMm: 10, scaleDenominator: 5000, labelMinPt: 8, mapRotationDeg: 0 }, extensions: {},
  };
  const validation = validatePack(pack);
  if (!validation.valid) throw Object.assign(new SourceError('invalid-prepared-pack', 'Prepared pack violates v1 contract.'), { errors: validation.errors });
  return { pack, report, sourceBytes: bytes.slice() };
}
