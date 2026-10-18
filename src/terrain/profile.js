import { createElevationGrid } from './grid.js';

export const PROFILE_LIMITS = Object.freeze({ vertices: 1024, samples: 20000, distanceM: 10000000 });
const fail = message => { throw new Error(`Terrain profile: ${message}`); };

/** Metric transect over a private grid snapshot. No routing or vertical datum conversion. */
export function deriveTerrainProfile(input, path, { spacingM } = {}) {
  if (!Number.isFinite(spacingM) || spacingM <= 0 || spacingM > 10000) fail('spacing must be positive and at most 10000 m');
  if (!Array.isArray(path) || path.length < 2 || path.length > PROFILE_LIMITS.vertices || path.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isFinite(n) && Math.abs(n) <= 1e9))) fail('expected 2–1024 finite metric vertices');
  const sampler = createElevationGrid(input), grid = sampler.grid, h = grid.horizontal;
  const vertices = path.map(p => [...p]), samples = [];
  let distance = 0;
  const append = (a, b, t, length) => {
    if (samples.length >= PROFILE_LIMITS.samples) fail('sample budget exceeded');
    const coordinate = t === 0 ? [...a] : t === 1 ? [...b] : a.map((v, i) => v + (b[i] - v) * t);
    const value = sampler.sample(...coordinate);
    samples.push({ distanceM: distance + t * length, coordinate, status: value.status, elevationM: value.status === 'value' ? value.valueM : null });
  };
  for (let segment = 1; segment < vertices.length; segment++) {
    const a = vertices[segment - 1], b = vertices[segment], delta = b.map((v, i) => v - a[i]);
    const length = Math.hypot(...delta), steps = Math.ceil(length / spacingM);
    if (!Number.isFinite(length) || length === 0 || distance + length > PROFILE_LIMITS.distanceM) fail('zero-length segment or distance budget exceeded');
    if (steps > PROFILE_LIMITS.samples) fail('sample budget exceeded');
    const times = new Set([0, 1]);
    const add = t => { if (t >= 0 && t <= 1) { times.add(t); if (times.size + samples.length > PROFILE_LIMITS.samples) fail('sample budget exceeded'); } };
    for (let i = 1; i < steps; i++) add(i / steps);
    // Every grid cell boundary is retained, including the grid's outside boundary.
    for (let axis = 0; axis < 2; axis++) if (delta[axis] !== 0) {
      const count = axis === 0 ? grid.width : grid.height;
      for (let i = 0; i < count; i++) add((h.origin[axis] + i * h.step[axis] - a[axis]) / delta[axis]);
    }
    const boundaries = [...times].sort((a, b) => a - b);
    const at = t => sampler.sample(a[0] + delta[0] * t, a[1] + delta[1] * t);
    for (let i = 1; i < boundaries.length; i++) {
      const lo = boundaries[i - 1], hi = boundaries[i], mid = lo + (hi - lo) / 2;
      if (mid === lo || mid === hi) continue;
      // Positive-weight nodata inside a cell must not disappear between valid boundary samples.
      add(mid);
      const values = [at(lo), at(mid), at(hi)];
      if (!values.every(v => v.status === 'value')) continue;
      // Bilinear height along a straight segment within one cell is quadratic.
      const [z0, zm, z1] = values.map(v => v.valueM), qa = 2 * ((z0 - zm) + (z1 - zm)), qb = z1 - z0 - qa;
      if (![qa, qb].every(Number.isFinite)) fail('quadratic arithmetic overflow');
      const tolerance = 64 * Number.EPSILON * Math.max(1, Math.abs(z0), Math.abs(zm), Math.abs(z1));
      if (Math.abs(qa) <= tolerance) continue;
      const root = -qb / (2 * qa);
      if (root > 0 && root < 1) add(lo + (hi - lo) * root);
    }
    for (const t of [...times].sort((a, b) => a - b)) if (segment === 1 || t !== 0) append(a, b, t, length);
    distance += length;
  }
  let ascentM = 0, descentM = 0, coveredDistanceM = 0, minElevationM = null, maxElevationM = null;
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i], previous = samples[i - 1];
    if (p.status === 'value') {
      minElevationM = minElevationM === null ? p.elevationM : Math.min(minElevationM, p.elevationM);
      maxElevationM = maxElevationM === null ? p.elevationM : Math.max(maxElevationM, p.elevationM);
    }
    if (previous?.status !== 'value' || p.status !== 'value') continue;
    coveredDistanceM += p.distanceM - previous.distanceM;
    const difference = p.elevationM - previous.elevationM;
    ascentM += Math.max(0, difference); descentM += Math.max(0, -difference);
  }
  const complete = samples.every(p => p.status === 'value');
  if (![distance, ascentM, descentM, coveredDistanceM].every(Number.isFinite)) fail('numeric overflow');
  return {
    format: 'map-literacy-terrain-profile-v1', reviewStatus: 'draft',
    grid: { id: grid.id, horizontal: structuredClone(h), vertical: structuredClone(grid.vertical), source: structuredClone(grid.source) },
    method: { interpolation: 'bilinear', maximumSpacingM: spacingM, retainWaypoints: true, retainCellBoundaries: true, cellMidpoints: true, quadraticExtrema: true, smoothing: 'none', ascentThresholdM: 0 },
    path: vertices, samples,
    summary: { totalsStatus: complete ? 'complete' : 'partial', distanceM: distance, coveredDistanceM, missingDistanceM: Math.max(0, distance - coveredDistanceM), ascentM, descentM, netChangeM: complete ? samples.at(-1).elevationM - samples[0].elevationM : null, minElevationM, maxElevationM,
      nodataSamples: samples.filter(p => p.status === 'nodata').length, outsideSamples: samples.filter(p => p.status === 'outside').length }
  };
}
