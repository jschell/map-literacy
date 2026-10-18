import { deriveDepressionTicks } from '../terrain/depressions.js';
import { deriveContourLines } from '../terrain/contour-lines.js';
import { createProjection, boundsPerimeter, rotateScreen } from '../geo/projection.js';
import { assertRenderable } from './render-limits.js';
import { validatePack } from '../data/validate-pack.js';

const rounded = (v) => Number(v.toFixed(4));
const pathLine = (line, convert, close = false) => line.map((p, i) => `${i ? 'L' : 'M'}${convert(p).map(rounded).join(',')}`).join(' ') + (close ? ' Z' : '');
const level = (f) => ['motorway', 'trunk', 'primary', 'secondary'].includes(f.properties.tags.highway) ? 'major'
  : ['footway', 'path', 'cycleway', 'steps', 'pedestrian'].includes(f.properties.tags.highway) ? 'path' : 'local';
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export const LETTER_LAYOUTS = Object.freeze({
  landscape: Object.freeze({ width: 259.4, height: 145 }),
  portrait: Object.freeze({ width: 195.9, height: 208.5 })
});

/** Shared model for screen and paper. SVG clipping preserves source geometry. */
export function createMapModel(pack, { paper = false, variant = 'labeled', rotationDeg = 0, scaleDenominator = pack.print.scaleDenominator, orientation = pack.print.orientation, screenWidth = 1000, screenHeight = 560 } = {}) {
  const validation = validatePack(pack);
  if (!validation.valid) throw Object.assign(new Error('Invalid lesson pack.'), { errors: validation.errors });
  assertRenderable(pack);
  if (!['labeled', 'partial', 'blank'].includes(variant) || !Number.isFinite(rotationDeg)) throw new Error('Invalid view options.');
  if (![1000, 5000, 10000].includes(scaleDenominator)) throw new Error('Unsupported print scale.');
  if (!Number.isFinite(screenWidth) || !Number.isFinite(screenHeight) || screenWidth < 280 || screenWidth > 2000 || screenHeight < 280 || screenHeight > 1000) throw new Error('Unsupported screen dimensions.');
  if (!Object.hasOwn(LETTER_LAYOUTS, orientation)) throw new Error('Unsupported print orientation.');
  const center = [(pack.bounds[0] + pack.bounds[2]) / 2, (pack.bounds[1] + pack.bounds[3]) / 2];
  const projection = createProjection(center);
  const rotation = paper ? 0 : ((rotationDeg % 360) + 360) % 360;
  const projected = boundsPerimeter(pack.bounds).map((p) => rotateScreen(projection.project(p), rotation));
  const minX = Math.min(...projected.map((p) => p[0])), maxX = Math.max(...projected.map((p) => p[0]));
  const minY = Math.min(...projected.map((p) => p[1])), maxY = Math.max(...projected.map((p) => p[1]));
  const width = paper ? LETTER_LAYOUTS[orientation].width : screenWidth, height = paper ? LETTER_LAYOUTS[orientation].height : screenHeight;
  const padding = paper ? 0 : 40;
  const terrainTop = pack.terrain ? paper ? 22 : 90 : padding;
  const terrainBottom = pack.terrain ? paper ? 10 : 40 : padding;
  const centerY = (terrainTop + height - terrainBottom) / 2;
  const factor = paper ? 1000 / scaleDenominator : Math.min((width - 2 * padding) / (maxX - minX), (height - terrainTop - terrainBottom) / (maxY - minY));
  if (paper && ((maxX - minX) * factor > width || (maxY - minY) * factor > height - terrainTop - terrainBottom)) {
    throw Object.assign(new Error('The selected extent does not fit this print scale. Choose another orientation, a larger scale denominator or a smaller extent.'), { code: 'print-extent-too-large' });
  }
  const offsetX = (minX + maxX) / 2, offsetY = (minY + maxY) / 2;
  const convert = (c) => { const [x, y] = rotateScreen(projection.project(c), rotation); return [width / 2 + (x - offsetX) * factor, centerY + (y - offsetY) * factor]; };
  const invert = ([x, y]) => {
    const local = [(x - width / 2) / factor + offsetX, (y - centerY) / factor + offsetY];
    const a = rotation * Math.PI / 180;
    return projection.inverse([local[0] * Math.cos(a) + local[1] * Math.sin(a), local[0] * Math.sin(a) - local[1] * Math.cos(a)]);
  };
  const paths = [], landmarks = [];
  for (const feature of pack.features.features) {
    const g = feature.geometry;
    if (g.type === 'Point') { landmarks.push({ id: feature.id, point: convert(g.coordinates), name: feature.properties.name ?? feature.id }); continue; }
    const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' || g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
    let directionSymbol = null;
    const direction = feature.properties.tags.oneway;
    if (['yes', '1', 'true', '-1'].includes(direction) && !Object.keys(feature.properties.tags).some((k) => k.startsWith('oneway:'))) {
      const line = lines[0], i = Math.max(1, Math.floor(line.length / 2));
      const a = convert(line[i - 1]), b = convert(line[i]);
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > (paper ? 5 : 20)) directionSymbol = { point: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90 + (direction === '-1' ? 180 : 0) };
    }
    const contour = pack.terrain?.contours.find(c => c.featureId === feature.id);
    paths.push({ contourLevelM: contour?.levelM, id: feature.id, name: feature.properties.name ?? 'Unnamed feature', role: feature.properties.role, directionSymbol,
      level: level(feature), bridge: feature.properties.tags.bridge === 'yes', tunnel: feature.properties.tags.tunnel === 'yes',
      d: lines.map((line) => pathLine(line, convert, g.type === 'Polygon' || g.type === 'MultiPolygon')).join(' '),
      lines, geometryType: g.type });
  }
  const fontSize = paper ? pack.print.labelMinPt * 25.4 / 72 : 13;
  const explicit = pack.labels.length > 0;
  const candidates = explicit ? pack.labels.map((l) => ({ ...l, explicit: true })) : pack.features.features.filter((f) => f.properties.name && f.properties.role === 'road' && ['LineString', 'MultiLineString'].includes(f.geometry.type)).map((f) => {
    const line = f.geometry.type === 'LineString' ? f.geometry.coordinates : f.geometry.coordinates[0];
    return { id: `auto:${f.id}`, featureId: f.id, text: f.properties.name, anchor: line[Math.floor(line.length / 2)], rotationDeg: 0,
      priority: level(f) === 'major' ? 90 : level(f) === 'local' ? 50 : 10, visibleIn: 'labeled', explicit: false };
  });
  candidates.sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const boxes = [], labels = [], names = new Set(); let suppressed = 0;
  const insideExtent = (c) => c[0] >= pack.bounds[0] && c[0] <= pack.bounds[2] && c[1] >= pack.bounds[1] && c[1] <= pack.bounds[3];
  for (const [i, l] of candidates.entries()) {
    if (variant === 'blank' || (variant === 'partial' && (explicit ? l.visibleIn !== 'partial' : i % 2 !== 0))) continue;
    if (!explicit && names.has(l.text)) continue;
    const anchor = convert(l.anchor);
    const angle = (l.rotationDeg + rotation) * Math.PI / 180;
    const textWidth = l.text.length * fontSize * 0.62;
    const boxWidth = Math.abs(textWidth * Math.cos(angle)) + Math.abs(fontSize * Math.sin(angle));
    const boxHeight = Math.abs(textWidth * Math.sin(angle)) + Math.abs(fontSize * Math.cos(angle));
    const box = [anchor[0] - boxWidth / 2 - fontSize / 4, anchor[1] - boxHeight - fontSize / 4, anchor[0] + boxWidth / 2 + fontSize / 4, anchor[1] + fontSize / 4];
    const boxCorners = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
    if (box[0] < 0 || box[1] < 0 || box[2] > width || box[3] > height || !boxCorners.every((corner) => insideExtent(invert(corner))) || boxes.some((b) => overlaps(box, b))) { suppressed++; continue; }
    boxes.push(box); names.add(l.text); labels.push({ ...l, point: anchor, rotationDeg: l.rotationDeg + rotation, fontSize });
  }
  let depressionTicks=[];
  if(pack.capabilities.includes('terrain-depressions-v1')) {
    const frameProjection=createProjection(pack.terrain.frame.center),origin=pack.terrain.frame.origin;
    const geographic=p=>frameProjection.inverse([p[0]-origin[0],p[1]-origin[1]]);
    depressionTicks=deriveDepressionTicks(pack.terrain.grid,deriveContourLines(pack.terrain.grid,[...new Set(pack.terrain.contours.map(c=>c.levelM))])).map(t=>({from:geographic(t.from),to:geographic(t.to)}));
  }
  return { depressionTicks, contourIntervalM: pack.terrain?.intervalM, contourLabelsAllowed: !pack.exercises.some(x => x.type === 'contour-elevation'), width, height, paper, orientation, rotationDeg: rotation, scaleDenominator, paths, landmarks, labels, suppressedLabels: suppressed,
    projection, convert, invert, metersToUnits: factor, clip: projected.map(([x, y]) => [width / 2 + (x - offsetX) * factor, centerY + (y - offsetY) * factor]),
    draft: pack.review.status !== 'reviewed', variant, packId: pack.id, title: pack.title };
}

