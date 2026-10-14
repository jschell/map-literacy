import { createProjection } from '../geo/projection.js';
import { EARTH_RADIUS_M } from '../geo/distance.js';
import { unproject } from './explorer.js';

export function geographicView(centerPixels, zoom, orientation) {
  const center = unproject(...centerPixels, zoom), projection = createProjection(center);
  // 15 mm margins plus 24 mm vertical reserve for browser print headers/footers.
  const sheetWidth = orientation === 'portrait' ? 185.9 : 249.4, sheetHeight = orientation === 'portrait' ? 225.4 : 161.9;
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
export function streetLabel(name) {
  const abbreviations = { northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW', north: 'N', south: 'S', east: 'E', west: 'W', avenue: 'Ave', street: 'St', road: 'Rd', place: 'Pl', court: 'Ct', drive: 'Dr', boulevard: 'Blvd', lane: 'Ln', terrace: 'Ter', parkway: 'Pkwy', highway: 'Hwy', trail: 'Trl', circle: 'Cir' };
  return name.split(/(\s+)/).map((word) => Object.hasOwn(abbreviations, word.toLowerCase()) ? abbreviations[word.toLowerCase()] : word).join('');
}
export function geographicFurniture(view, fontSize) {
  return [[view.width - Math.max(18, fontSize * 1.7), 0, view.width, Math.max(18, fontSize * 2.5)], [0, view.height - Math.max(14, fontSize * 2), Math.min(55, view.width), view.height]];
}
// Combine adjacent, nearly straight source segments, never across a clipped gap.
function labelRuns(segments, tolerance) {
  const runs = []; let points = [];
  const fits = (candidate) => {
    const a = candidate[0], b = candidate.at(-1), dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (!length) return false;
    return candidate.every((p) => Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / length <= tolerance) && candidate.slice(1).every((p, i) => ((p[0] - candidate[i][0]) * dx + (p[1] - candidate[i][1]) * dy) > 0);
  };
  for (const [a, b] of segments) {
    if (points.length && points.length < 64 && Math.hypot(points.at(-1)[0] - a[0], points.at(-1)[1] - a[1]) < .02 && fits([...points, b])) points.push(b);
    else { if (points.length) runs.push([points[0], points.at(-1)]); points = [a, b]; }
  }
  if (points.length) runs.push([points[0], points.at(-1)]);
  return runs.sort((a, b) => Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) - Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]));
}
// Label continuity uses shared source node identities, not a routing graph.
function labelGroups(roads) {
  const groups = new Map();
  for (const road of [...roads].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!road.name) continue;
    if (!groups.has(road.name)) groups.set(road.name, []);
    groups.get(road.name).push(road);
  }
  return [...groups].map(([name, members]) => {
    const edges = [], adjacency = new Map();
    for (const road of members) road.segments.forEach((segment, i) => {
      const edge = { segment, keys: road.segmentKeys[i], road, index: edges.length }; edges.push(edge);
      for (const key of edge.keys) { if (!adjacency.has(key)) adjacency.set(key, []); adjacency.get(key).push(edge); }
    });
    const visited = new Set(), chains = [];
    const ordered = [...edges].sort((a, b) => Number(a.keys.every((k) => adjacency.get(k).length === 2)) - Number(b.keys.every((k) => adjacency.get(k).length === 2)) || a.index - b.index);
    for (const first of ordered) {
      if (visited.has(first)) continue;
      const segments = [], sourceIds = new Set(); let edge = first, key = first.keys.find((k) => adjacency.get(k).length !== 2) ?? first.keys[0];
      while (edge && !visited.has(edge)) {
        visited.add(edge); sourceIds.add(edge.road.id);
        const forward = edge.keys[0] === key; segments.push(forward ? edge.segment : [edge.segment[1], edge.segment[0]]);
        key = edge.keys[forward ? 1 : 0];
        const neighbors = adjacency.get(key); edge = neighbors.length === 2 ? neighbors.find((e) => !visited.has(e)) : null;
      }
      chains.push({ segments, sourceIds: [...sourceIds].sort() });
    }
    return { ...members[0], name, members, chains, major: members.some((r) => ['motorway', 'trunk', 'primary', 'secondary'].includes(r.tags.highway)) };
  });
}
function roadIndex(roads) {
  const grid = new Map(), cell = 10;
  for (const road of roads) for (const segment of road.segments) {
    const entry = { road, segment }, [a, b] = segment;
    for (let x = Math.floor(Math.min(a[0], b[0]) / cell); x <= Math.floor(Math.max(a[0], b[0]) / cell); x++) for (let y = Math.floor(Math.min(a[1], b[1]) / cell); y <= Math.floor(Math.max(a[1], b[1]) / cell); y++) {
      const key = `${x},${y}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(entry);
    }
  }
  return (box) => {
    const found = new Set();
    for (let x = Math.floor(box[0] / cell); x <= Math.floor(box[2] / cell); x++) for (let y = Math.floor(box[1] / cell); y <= Math.floor(box[3] / cell); y++) for (const entry of grid.get(`${x},${y}`) ?? []) found.add(entry);
    return found;
  };
}
export function geographicModel(features, view, { labels = 'labeled', landmarks = true, fontSize = 8.5 * 25.4 / 72, measureText = (name) => name.length * fontSize * .53 } = {}) {
  const roads = [], context = [], points = [], names = new Set(); let unnamed = 0;
  for (const feature of features) {
    const coordinates = feature.geometry.map(view.convert);
    if (feature.role === 'landmark') { const p = coordinates[0]; if (p[0] >= 0 && p[0] <= view.width && p[1] >= 0 && p[1] <= view.height) points.push({ ...feature, point: p }); continue; }
    const segments = [], segmentKeys = [];
    for (let i = 1; i < coordinates.length; i++) {
      const segment = clipSegment(coordinates[i - 1], coordinates[i], view.width, view.height);
      if (!segment || Math.hypot(segment[1][0] - segment[0][0], segment[1][1] - segment[0][1]) <= .02) continue;
      segments.push(segment);
      segmentKeys.push(segment.map((p, end) => {
        const index = i - 1 + end, original = coordinates[index];
        if (Math.hypot(p[0] - original[0], p[1] - original[1]) > 1e-7) return `clip:${feature.id}:${i}:${end}`;
        return feature.nodeIds?.[index] ? `node:${feature.nodeIds[index]}` : `point:${p[0].toFixed(6)},${p[1].toFixed(6)}`;
      }));
    }
    if (!segments.length) continue;
    const item = { ...feature, segments, segmentKeys, coordinates };
    if (feature.role === 'road') { roads.push(item); if (feature.name) names.add(feature.name); else unnamed++; }
    else context.push(item);
  }
  const furniture = geographicFurniture(view, fontSize), used = [...furniture, ...points.map(({ point: [x, y] }) => [x - 1.4, y - 1.4, x + 1.4, y + 1.4])], placed = [], chosen = new Set(), nearby = roadIndex(roads.filter((road) => road.name || road.tags.highway !== 'service'));
  const ordered = labelGroups(roads).sort((a, b) => Number(b.major) - Number(a.major) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  for (const road of ordered) {
    if (!road.name || chosen.has(road.name) || labels === 'blank') continue;
    if (labels === 'partial' && [...road.name].reduce((sum, c) => sum + c.codePointAt(0), 0) % 2 === 0) continue;
    const text = streetLabel(road.name), textWidth = Math.max(5, measureText(text));
    const candidates = road.chains.flatMap((chain) => labelRuns(chain.segments, fontSize * .45).map((segment) => ({ segment, sourceIds: chain.sourceIds }))).sort((a, b) => Math.hypot(b.segment[1][0] - b.segment[0][0], b.segment[1][1] - b.segment[0][1]) - Math.hypot(a.segment[1][0] - a.segment[0][0], a.segment[1][1] - a.segment[0][1]));
    candidates: for (const { segment: [a, b], sourceIds } of candidates) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < textWidth + 2) continue;
      let angle = Math.atan2(b[1] - a[1], b[0] - a[0]); if (angle > Math.PI / 2) angle -= Math.PI; if (angle < -Math.PI / 2) angle += Math.PI;
      const cosine = Math.cos(angle), sine = Math.sin(angle), w = Math.abs(cosine) * textWidth + Math.abs(sine) * fontSize + 1.5, h = Math.abs(sine) * textWidth + Math.abs(cosine) * fontSize + 1.5;
      const step = Math.max(2, fontSize + 1);
      const positions = [0, ...Array.from({ length: 16 }, (_, i) => [(i + 1) * step, -(i + 1) * step]).flat()];
      for (const offset of positions) {
        const fraction = .5 + offset / length;
        if (fraction <= 0 || fraction >= 1) continue;
        if (Math.min(fraction, 1 - fraction) * length < textWidth / 2 + 1) continue;
        const x = a[0] + (b[0] - a[0]) * fraction + sine * fontSize, y = a[1] + (b[1] - a[1]) * fraction - cosine * fontSize, box = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
        if (box[0] < 2 || box[1] < 2 || box[2] > view.width - 2 || box[3] > view.height - 2 || used.some((r) => overlaps(r, box))) continue;
        let crossing = false;
        for (const { road: other, segment: [c, d] } of nearby(box)) {
          if (other.id === road.id || (other.name && other.name === road.name)) continue;
          const dx = d[0] - c[0], dy = d[1] - c[1];
          if (Math.abs(dx * sine - dy * cosine) / Math.hypot(dx, dy) < .35) continue;
          const clearance = Math.max(4, fontSize * 1.5);
          const local = (p) => [(p[0] - x) * cosine + (p[1] - y) * sine + clearance / 2, -(p[0] - x) * sine + (p[1] - y) * cosine + (fontSize + 1.5) / 2];
          if (clipSegment(local(c), local(d), clearance, fontSize + 1.5)) { crossing = true; break; }
        }
        if (crossing) continue;
        used.push(box); placed.push({ text, sourceName: road.name, x, y, angle: angle * 180 / Math.PI, fontSize, box, featureId: sourceIds[0], sourceIds, placement: 'road', baselineLength: length, textWidth }); chosen.add(road.name); break candidates;
      }
    }
  }
  const inside = (box) => box[0] >= 2 && box[1] >= 2 && box[2] <= view.width - 2 && box[3] <= view.height - 2;
  const hitsBox = (a, b, box) => clipSegment([a[0] - box[0], a[1] - box[1]], [b[0] - box[0], b[1] - box[1]], box[2] - box[0], box[3] - box[1]);
  const crosses = (a, b, c, d) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = d[0] - c[0], vy = d[1] - c[1], determinant = ux * vy - uy * vx;
    if (Math.abs(determinant) < 1e-8) return false;
    const dx = c[0] - a[0], dy = c[1] - a[1], t = (dx * vy - dy * vx) / determinant, u = (dx * uy - dy * ux) / determinant;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const leaders = [];
  // Short/curved roads get a horizontal callout only when both text and leader fit clearly.
  for (const road of ordered) {
    if (labels === 'blank' || chosen.has(road.name) || (labels === 'partial' && [...road.name].reduce((sum, c) => sum + c.codePointAt(0), 0) % 2 === 0)) continue;
    const text = streetLabel(road.name), textWidth = Math.max(5, measureText(text)), halfWidth = textWidth / 2 + 1, halfHeight = fontSize / 2 + .75;
    const anchors = road.members.flatMap((member) => member.segments.map((segment) => ({ segment, member }))).sort((a, b) => Math.hypot(b.segment[1][0] - b.segment[0][0], b.segment[1][1] - b.segment[0][1]) - Math.hypot(a.segment[1][0] - a.segment[0][0], a.segment[1][1] - a.segment[0][1])).slice(0, 4);
    callout: for (const { segment: [a, b], member } of anchors) {
      const start = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      for (const [dx, dy] of [[halfWidth + 3, 0], [-halfWidth - 3, 0], [0, -fontSize * 2.5], [0, fontSize * 2.5], [halfWidth + 3, -fontSize * 2], [-halfWidth - 3, -fontSize * 2], [halfWidth + 3, fontSize * 2], [-halfWidth - 3, fontSize * 2]]) {
        const x = start[0] + dx, y = start[1] + dy, box = [x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight];
        if (!inside(box) || used.some((r) => overlaps(r, box)) || leaders.some(([c, d]) => hitsBox(c, d, box))) continue;
        if ([...nearby(box)].some(({ segment: [c, d] }) => hitsBox(c, d, box))) continue;
        const end = [Math.max(box[0], Math.min(box[2], start[0])), Math.max(box[1], Math.min(box[3], start[1]))];
        if (used.some((r) => hitsBox(start, end, r)) || leaders.some(([c, d]) => crosses(start, end, c, d))) continue;
        const corridor = [Math.min(start[0], end[0]), Math.min(start[1], end[1]), Math.max(start[0], end[0]), Math.max(start[1], end[1])];
        if ([...nearby(corridor)].some(({ road: other, segment: [c, d] }) => other.name !== road.name && crosses(start, end, c, d))) continue;
        const leader = [start, end]; leaders.push(leader); used.push(box); chosen.add(road.name);
        placed.push({ text, sourceName: road.name, x, y, angle: 0, fontSize, box, featureId: member.id, sourceIds: [member.id], placement: 'callout', leader, textWidth }); break callout;
      }
    }
  }
  const landmarkLabels = [];
  if (landmarks) for (const point of points) {
    if (!point.name) continue;
    const [x, y] = point.point, w = measureText(point.name), box = [x + 2, y - fontSize / 2 - .75, x + w + 2, y + fontSize / 2 + .75];
    if (box[2] > view.width - 2 || box[0] < 2 || box[1] < 2 || box[3] > view.height - 2 || used.some((r) => overlaps(r, box)) || leaders.some(([a, b]) => hitsBox(a, b, box)) || [...nearby(box)].some(({ segment: [a, b] }) => hitsBox(a, b, box))) continue;
    used.push(box); landmarkLabels.push({ text: point.name, x: x + 2, y, fontSize });
  }
  return { view, roads, context, points, furniture, labels: placed, landmarkLabels, availableNames: names.size, unnamed, suppressed: labels === 'labeled' ? names.size - chosen.size : 0 };
}
