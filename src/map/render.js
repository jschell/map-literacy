const NS = 'http://www.w3.org/2000/svg';
const element = (doc, tag, attrs = {}, text = null) => {
  const node = doc.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== null) node.textContent = text;
  return node;
};

/** No imported HTML/styles are executed. Returns a detached SVG. */
export function renderMap(doc, model, { selectedId = null, headingDeg = null, onSelect = () => {} } = {}) {
  const clipId = `clip-${crypto.randomUUID()}`;
  const svg = element(doc, 'svg', { viewBox: `0 0 ${model.width} ${model.height}`, class: model.paper ? 'map-svg print-map' : 'map-svg screen-map', role: 'img', 'aria-label': `${model.title}, ${model.variant} map${model.draft ? ', unreviewed draft' : ''}` });
  svg.append(element(doc, 'title', {}, model.title));
  const defs = element(doc, 'defs'), clip = element(doc, 'clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
  clip.append(element(doc, 'polygon', { points: model.clip.map((c) => c.join(',')).join(' ') })); defs.append(clip); svg.append(defs);
  const background = element(doc, 'rect', { width: model.width, height: model.height, class: 'map-background' }); svg.append(background);
  const group = element(doc, 'g', { 'clip-path': `url(#${clipId})` }); svg.append(group);
  const layer = (item) => item.role === 'water' ? 0 : item.role === 'building' ? 1 : item.bridge ? 3 : 2;
  const paths = [...model.paths].sort((a, b) => layer(a) - layer(b));
  for (const item of paths) {
    if (item.bridge) group.append(element(doc, 'path', { d: item.d, class: 'bridge-casing', 'stroke-width': model.paper ? 1.8 : 9 }));
    const shape = element(doc, 'path', { d: item.d, class: `feature feature--${item.role} road--${item.level}${item.tunnel ? ' road--tunnel' : ''}${item.id === selectedId ? ' feature--selected' : ''}`, 'data-feature-id': item.id,
      'stroke-width': model.paper ? item.level === 'major' ? 0.7 : item.level === 'path' ? 0.2 : 0.4 : item.level === 'major' ? 4 : item.level === 'path' ? 1.5 : 2.5 });
    shape.append(element(doc, 'title', {}, item.name)); group.append(shape);
    if (item.directionSymbol) {
      const [x, y] = item.directionSymbol.point, size = model.paper ? 1.5 : 7;
      group.append(element(doc, 'path', { d: `M${x},${y-size} L${x-size*.7},${y+size} L${x+size*.7},${y+size} Z`, class: 'direction-symbol', transform: `rotate(${item.directionSymbol.angle} ${x} ${y})` }));
    }
    if (!model.paper) {
      const hit = element(doc, 'path', { d: item.d, class: 'feature-hit', 'stroke-width': 16, 'data-feature-id': item.id });
      hit.addEventListener('click', () => onSelect(item.id)); group.append(hit);
    }
  }
  for (const item of model.landmarks) group.append(element(doc, 'circle', { cx: item.point[0], cy: item.point[1], r: model.paper ? 1.2 : 5, class: 'landmark' }));
  for (const l of model.labels) group.append(element(doc, 'text', { x: l.point[0], y: l.point[1], class: 'map-label', 'font-size': l.fontSize,
    'text-anchor': 'middle', transform: `rotate(${l.rotationDeg} ${l.point[0]} ${l.point[1]})`, 'stroke-width': model.paper ? 0.9 : 4 }, l.text));
  if (headingDeg !== null && Number.isFinite(headingDeg)) {
    const x = model.width / 2, y = model.height / 2, size = model.paper ? 5 : 25;
    group.append(element(doc, 'path', { d: `M${x},${y-size} L${x-size/2},${y+size/2} L${x},${y} L${x+size/2},${y+size/2} Z`, class: 'heading-arrow', transform: `rotate(${headingDeg + model.rotationDeg} ${x} ${y})` }));
  }
  const unit = model.paper ? 1 : 4, x = model.width - 10 * unit, y = 10 * unit;
  svg.append(element(doc, 'path', { d: `M${x},${y-4*unit} L${x-2*unit},${y+3*unit} L${x+2*unit},${y+3*unit} Z`, class: 'north-arrow', transform: `rotate(${model.rotationDeg} ${x} ${y})` }));
  svg.append(element(doc, 'text', { x, y: y + 8 * unit, class: 'north-label', 'font-size': model.paper ? 3 : 14, 'text-anchor': 'middle' }, 'N'));
  // A conservative bar chosen to stay within 25% of map width.
  const maxM = model.width / model.metersToUnits / 4;
  const meters = [10, 20, 50, 100, 200, 500, 1000].filter((n) => n <= maxM).at(-1) ?? 1;
  const barWidth = meters * model.metersToUnits, bx = 5 * unit, by = model.height - 6 * unit;
  svg.append(element(doc, 'path', { d: `M${bx},${by-2*unit} V${by} H${bx+barWidth} V${by-2*unit}`, class: 'scale-bar', 'stroke-width': model.paper ? 0.3 : 2 }));
  svg.append(element(doc, 'text', { x: bx, y: by + 4 * unit, class: 'scale-label', 'font-size': model.paper ? 3 : 13 }, `${meters} m`));
  return svg;
}
