import { validatePack } from '../data/validate-pack.js';

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const suffix = (path, sequence) => path.length >= sequence.length && sequence.every((id, i) => path[path.length - sequence.length + i] === id);

/** Loaded graph trace inspection, not exercise scoring or route approval. */
export function createTraceReview(pack) {
  const report = validatePack(pack);
  if (!report.valid) fail('invalid-pack', 'Choose a validated lesson pack.');
  const nodes = new Map(pack.topology.nodes.map((n) => [n.id, n]));
  const edges = new Map(pack.topology.edges.map((e) => [e.id, e]));
  const features = new Map(pack.features.features.map((f) => [f.id, f]));
  const outgoing = new Map();
  for (const edge of edges.values()) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push(edge);
  }
  const restrictionIndex = new Map();
  for (const r of pack.topology.restrictions) {
    const key = `${r.mode}:${r.rule}:${r.edgeSequence.at(r.rule === 'only' ? -2 : -1)}`;
    if (!restrictionIndex.has(key)) restrictionIndex.set(key, []);
    restrictionIndex.get(key).push(r);
  }
  const inside = ([lon, lat]) => lon >= pack.bounds[0] && lon <= pack.bounds[2] && lat >= pack.bounds[1] && lat <= pack.bounds[3];
  function checkEdge(edge, current, path, mode) {
    if (!edge) fail('missing-edge', 'That directed edge is not in the loaded pack.');
    if (edge.from !== current) fail('disconnected', 'The next edge must start at the current graph node.');
    if (edge.mode !== mode) fail('mode-mismatch', 'That edge does not support the selected trace mode.');
    if (!edge.shape.every(inside)) fail('outside-extent', 'That edge leaves the displayed lesson extent.');
    if (edge.access === 'blocked') fail('blocked-access', 'The loaded data marks this edge blocked.');
    const restrictions = [...(restrictionIndex.get(`${mode}:only:${path.at(-1)}`) ?? []), ...(restrictionIndex.get(`${mode}:forbidden:${edge.id}`) ?? [])];
    for (const restriction of restrictions) {
      const sequence = restriction.edgeSequence;
      if (restriction.rule === 'only' && suffix(path, sequence.slice(0, -1)) && edge.id !== sequence.at(-1)) fail('only-turn', 'The loaded restriction requires a different next edge.');
      if (restriction.rule === 'forbidden' && suffix([...path, edge.id], sequence)) fail('forbidden-turn', 'The loaded restriction forbids this edge sequence.');
    }
  }
  function inspect({ startNodeId, mode, edgeIds = [] }) {
    if (!['walk', 'drive'].includes(mode)) fail('unsupported-mode', 'Choose walking or driving.');
    const start = nodes.get(startNodeId);
    if (!start || !inside(start.coordinate)) fail('invalid-start', 'Choose a start node inside the lesson extent.');
    if (!Array.isArray(edgeIds) || edgeIds.length > 1000) fail('trace-limit', 'A trace may contain at most 1,000 edges.');
    const path = [], traceEdges = [], warnings = new Set();
    if (pack.review.status !== 'reviewed') warnings.add('Pack is an unreviewed draft.');
    if (pack.topology.completeness === 'partial') warnings.add('Topology is incomplete; exclusions need review.');
    let current = startNodeId, lengthM = 0;
    for (const id of edgeIds) {
      const edge = edges.get(id);
      checkEdge(edge, current, path, mode);
      if (edge.access === 'unknown') warnings.add('Some edge access is unknown; this trace needs review.');
      path.push(id); current = edge.to; lengthM += edge.lengthM;
      traceEdges.push({ ...edge, name: features.get(edge.featureId).properties.name ?? 'Unnamed feature' });
    }
    return { startNodeId, endNodeId: current, mode, edgeIds: [...edgeIds], edges: traceEdges, lengthM, warnings: [...warnings], start: start.coordinate, end: nodes.get(current).coordinate };
  }
  function choices(state) {
    const trace = inspect(state);
    return (outgoing.get(trace.endNodeId) ?? []).filter((e) => e.mode === state.mode).map((edge) => {
      try { if (trace.edgeIds.length >= 1000) fail('trace-limit', 'A trace may contain at most 1,000 edges.'); checkEdge(edge, trace.endNodeId, trace.edgeIds, state.mode); return { edge, disabled: false, reason: '' }; }
      catch (error) { return { edge, disabled: true, reason: error.message }; }
    });
  }
  return { inspect, choices, starts: [...nodes.values()].filter((n) => inside(n.coordinate)), name: (id) => features.get(id)?.properties.name ?? 'Unnamed feature' };
}
