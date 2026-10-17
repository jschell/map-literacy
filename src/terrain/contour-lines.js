import { CONTOUR_LIMITS, deriveContours } from './contours.js';

const compare = (a, b) => a[0] - b[0] || a[1] - b[1];
const point = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
const text = s => typeof s === 'string' && s.length > 0 && s.length <= 240;
const fail = () => { throw new Error('Invalid contour segment result or topology budget exceeded.'); };

/** Join exact endpoints only. Branches stop lines rather than inventing connectivity. */
export function stitchContourSegments(input) {
  if (!input || input.format !== 'map-literacy-contour-segments-v1' || !text(input.gridId) ||
      !['LOCAL_METRIC', 'EPSG:26910'].includes(input.horizontalCrs) ||
      !['synthetic-zero', 'NAVD88'].includes(input.verticalReference) || input.units !== 'm' ||
      input.method !== 'marching-squares-asymptotic-v1' || !Number.isInteger(input.skippedCells) || input.skippedCells < 0 || input.skippedCells > CONTOUR_LIMITS.maxCellLevels ||
      !Array.isArray(input.contours) || !input.contours.length || input.contours.length > CONTOUR_LIMITS.maxLevels) fail();
  let total = 0;
  for (let i = 0; i < input.contours.length; i++) {
    const c = input.contours[i];
    if (!c || !Number.isFinite(c.levelM) || (i && c.levelM <= input.contours[i - 1].levelM) || !Array.isArray(c.segments)) fail();
    total += c.segments.length;
    if (total > CONTOUR_LIMITS.maxSegments) fail();
    for (const s of c.segments) if (!Array.isArray(s) || s.length !== 2 || !point(s[0]) || !point(s[1])) fail();
  }
  const contours = input.contours.map(({ levelM, segments }) => {
    const nodes = new Map(), edges = new Map();
    let duplicateSegments = 0, zeroLengthSegments = 0;
    function node(p) {
      // JSON normalizes -0; no rounding, snapping or proximity tolerance is applied.
      const key = JSON.stringify(p);
      if (!nodes.has(key)) nodes.set(key, { coordinate: p.map(v => v === 0 ? 0 : v), edges: [] });
      return key;
    }
    for (const segment of segments) {
      let [a, b] = segment;
      if (compare(a, b) === 0) { zeroLengthSegments++; continue; }
      if (compare(a, b) > 0) [a, b] = [b, a];
      const ka = node(a), kb = node(b), key = JSON.stringify([a, b]);
      if (edges.has(key)) { duplicateSegments++; continue; }
      const edge = { a: ka, b: kb, used: false };
      edges.set(key, edge); nodes.get(ka).edges.push(edge); nodes.get(kb).edges.push(edge);
    }
    const other = (edge, key) => edge.a === key ? edge.b : edge.a;
    const ordered = [...nodes.keys()].sort((a, b) => compare(nodes.get(a).coordinate, nodes.get(b).coordinate));
    for (const key of ordered) nodes.get(key).edges.sort((a, b) => compare(nodes.get(other(a, key)).coordinate, nodes.get(other(b, key)).coordinate));
    const lines = [];
    function walk(start, first) {
      let current = start, edge = first;
      const coordinates = [nodes.get(start).coordinate.slice()];
      while (edge && !edge.used) {
        edge.used = true;
        current = other(edge, current);
        const n = nodes.get(current);
        coordinates.push(n.coordinate.slice());
        if (current === start || n.edges.length !== 2) break;
        edge = n.edges.find(e => !e.used);
      }
      // A return to a branch is geometrically closed but still reported as ambiguous.
      lines.push({ closed: current === start, coordinates });
    }
    // Open chains and branch-to-branch pieces precede isolated degree-two rings.
    for (const key of ordered) if (nodes.get(key).edges.length !== 2)
      for (const edge of nodes.get(key).edges) if (!edge.used) walk(key, edge);
    for (const key of ordered) for (const edge of nodes.get(key).edges) if (!edge.used) walk(key, edge);
    const junctions = ordered.filter(key => nodes.get(key).edges.length > 2)
      .map(key => ({ coordinate: nodes.get(key).coordinate.slice(), degree: nodes.get(key).edges.length }));
    return { levelM, lines, junctions, duplicateSegments, zeroLengthSegments,
      topologyStatus: junctions.length ? 'needs-review' : 'unbranched' };
  });
  return { format: 'map-literacy-contour-lines-v1', gridId: input.gridId,
    horizontalCrs: input.horizontalCrs, verticalReference: input.verticalReference, units: 'm',
    method: 'exact-endpoint-chains-v1', segmentMethod: input.method, skippedCells: input.skippedCells, contours };
}

/** Bounded grid-to-lines preparation; does not enable terrain lesson-pack imports. */
export function deriveContourLines(grid, levelsM) {
  return stitchContourSegments(deriveContours(grid, levelsM));
}
