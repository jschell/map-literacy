import { createProjection } from '../geo/projection.js';
import { EARTH_RADIUS_M } from '../geo/distance.js';
import { unproject } from './explorer.js';

export function geographicView(centerPixels, zoom, orientation) {
  const center = unproject(...centerPixels, zoom), projection = createProjection(center);
  const sheetWidth = orientation === 'portrait' ? 195.9 : 259.4, sheetHeight = orientation === 'portrait' ? 259.4 : 195.9;
  const ratio = orientation === 'portrait' ? 8.5 / 11 : 11 / 8.5;
  const width = Math.min(sheetWidth, (sheetHeight - 10) * ratio), height = width / ratio;
  const worldWidth = orientation === 'portrait' ? 640 * ratio : 640, worldHeight = worldWidth / ratio;
  const metersPerPixel = 2 * Math.PI * EARTH_RADIUS_M * Math.cos(center[1] * Math.PI / 180) / (256 * 2 ** zoom);
  const groundWidth = worldWidth * metersPerPixel, groundHeight = worldHeight * metersPerPixel;
  const convert = (coordinate) => { const [x, y] = projection.project(coordinate); return [width / 2 + x * width / groundWidth, height / 2 - y * height / groundHeight]; };
  const inverse = ([x, y]) => projection.inverse([(x - width / 2) * groundWidth / width, (height / 2 - y) * groundHeight / height]);
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(inverse);
  const bounds = [Math.min(...corners.map((p) => p[0])), Math.min(...corners.map((p) => p[1])), Math.max(...corners.map((p) => p[0])), Math.max(...corners.map((p) => p[1]))];
  return { center, zoom, orientation, width, height, worldWidth, worldHeight, groundWidth, groundHeight, bounds, convert, inverse, scaleDenominator: groundWidth / (width / 1000) };
}
export function clipSegment(a, b, width, height) {
  const dx = b[0] - a[0], dy = b[1] - a[1]; let low = 0, high = 1;
  for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) low = Math.max(low, t); else high = Math.min(high, t);
    if (low > high) return null;
  }
  return [[a[0] + low * dx, a[1] + low * dy], [a[0] + high * dx, a[1] + high * dy]];
}
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
export function geographicModel(features, view, { labels = 'labeled', landmarks = true, fontSize = 8.5 * 25.4 / 72, measureText = (name) => name.length * fontSize * .53 } = {}) {
  const roads = [], context = [], points = [], names = new Set(); let unnamed = 0;
  for (const feature of features) {
    const coordinates = feature.geometry.map(view.convert);
    if (feature.role === 'landmark') { const p = coordinates[0]; if (p[0] >= 0 && p[0] <= view.width && p[1] >= 0 && p[1] <= view.height) points.push({ ...feature, point: p }); continue; }
    const segments = [];
    for (let i = 1; i < coordinates.length; i++) { const segment = clipSegment(coordinates[i - 1], coordinates[i], view.width, view.height); if (segment && Math.hypot(segment[1][0] - segment[0][0], segment[1][1] - segment[0][1]) > .02) segments.push(segment); }
    if (!segments.length) continue;
    const item = { ...feature, segments, coordinates };
    if (feature.role === 'road') { roads.push(item); if (feature.name) names.add(feature.name); else unnamed++; }
    else context.push(item);
  }
  const used = [[view.width - Math.max(18, fontSize * 1.7), 0, view.width, Math.max(18, fontSize * 2.5)], [0, view.height - Math.max(14, fontSize * 2), 55, view.height]], placed = [], chosen = new Set();
  const ordered = [...roads].sort((a, b) => Number(['motorway', 'trunk', 'primary', 'secondary'].includes(b.tags.highway)) - Number(['motorway', 'trunk', 'primary', 'secondary'].includes(a.tags.highway)) || a.name?.localeCompare(b.name ?? '') || a.id.localeCompare(b.id));
  for (const road of ordered) {
    if (!road.name || chosen.has(road.name) || labels === 'blank') continue;
    // Stable partial selection based on source name, unaffected by response ordering.
    if (labels === 'partial' && [...road.name].reduce((sum, c) => sum + c.codePointAt(0), 0) % 2 === 0) continue;
    const textWidth = Math.max(5, measureText(road.name));
    const candidates = [...road.segments].sort((a, b) => Math.hypot(...[b[1][0] - b[0][0], b[1][1] - b[0][1]]) - Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]));
    for (const [a, b] of candidates) {
      let angle = Math.atan2(b[1] - a[1], b[0] - a[0]); if (angle > Math.PI / 2) angle -= Math.PI; if (angle < -Math.PI / 2) angle += Math.PI;
      const w = Math.abs(Math.cos(angle)) * textWidth + Math.abs(Math.sin(angle)) * fontSize + 1.5;
      const h = Math.abs(Math.sin(angle)) * textWidth + Math.abs(Math.cos(angle)) * fontSize + 1.5;
      const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2, box = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
      if (box[0] < 2 || box[1] < 2 || box[2] > view.width - 2 || box[3] > view.height - 2 || used.some((r) => overlaps(r, box))) continue;
      used.push(box); placed.push({ text: road.name, x, y, angle: angle * 180 / Math.PI, fontSize, box, featureId: road.id }); chosen.add(road.name); break;
    }
  }
  const landmarkLabels = [];
  if (landmarks) for (const point of points) {
    if (!point.name) continue;
    const [x, y] = point.point, w = measureText(point.name), box = [x + 2, y - 2, x + w + 2, y + 2];
    if (box[2] > view.width - 2 || box[0] < 2 || box[1] < 2 || box[3] > view.height - 2 || used.some((r) => overlaps(r, box))) continue;
    used.push(box); landmarkLabels.push({ text: point.name, x: x + 2, y, fontSize });
  }
  return { view, roads, context, points, labels: placed, landmarkLabels, availableNames: names.size, unnamed, suppressed: labels === 'labeled' ? names.size - chosen.size : 0 };
}
