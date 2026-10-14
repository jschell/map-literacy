const NS = 'http://www.w3.org/2000/svg';
const path = (segments) => segments.map(([a, b]) => `M${a.join(',')}L${b.join(',')}`).join('');
export function renderGeographic(doc, model, { appearance = 'bw', annotations = [], heading = null, minimumTextSize = 0 } = {}) {
  const { view } = model, color = appearance === 'color';
  const make = (tag, attributes = {}, text) => { const node = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, String(v)); if (text !== undefined) node.textContent = text; return node; };
  const svg = make('svg', { xmlns: NS, viewBox: `0 0 ${view.width} ${view.height}`, width: `${view.width}mm`, height: `${view.height}mm`, role: 'img', 'aria-label': 'Street map with north arrow and scale bar', 'data-scale': view.scaleDenominator });
  svg.append(make('rect', { width: view.width, height: view.height, fill: 'white' }));
  const defs = make('defs'), clip = make('clipPath', { id: 'geographic-clip' }); clip.append(make('rect', { width: view.width, height: view.height })); defs.append(clip); svg.append(defs);
  const drawing = make('g', { 'clip-path': 'url(#geographic-clip)' }); svg.append(drawing);
  for (const item of model.context) drawing.append(make('path', { d: path(item.segments), fill: 'none', stroke: item.role === 'water' ? color ? '#16769b' : '#666' : color ? '#5c8651' : '#888', 'stroke-width': .25, 'stroke-dasharray': item.role === 'park' ? '1 1' : 'none' }));
  const sorted = [...model.roads].sort((a, b) => (Number(a.tags.layer) || 0) - (Number(b.tags.layer) || 0));
  for (const road of sorted) {
    const major = ['motorway', 'trunk', 'primary', 'secondary'].includes(road.tags.highway), trail = ['path', 'footway', 'cycleway', 'steps'].includes(road.tags.highway), width = major ? .85 : road.tags.highway === 'tertiary' ? .65 : trail ? .25 : road.tags.highway === 'service' ? .22 : .45;
    if (road.tags.bridge && road.tags.bridge !== 'no') drawing.append(make('path', { d: path(road.segments), stroke: 'white', 'stroke-width': width + 1, fill: 'none' }));
    drawing.append(make('path', { d: path(road.segments), 'data-source-id': road.id, stroke: color && major ? '#984324' : '#111', 'stroke-width': width, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': trail || ['construction', 'proposed'].includes(road.tags.highway) || (road.tags.tunnel && road.tags.tunnel !== 'no') ? '1.2 .8' : 'none' }));
    if (['yes', '1', 'true', '-1'].includes(road.tags.oneway) && !Object.keys(road.tags).some((key) => key.includes('conditional') || key.startsWith('oneway:'))) {
      const segment = road.segments.find(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 8);
      if (segment) {
        const [a, b] = segment, x = a[0] + (b[0] - a[0]) * .3, y = a[1] + (b[1] - a[1]) * .3;
        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + (road.tags.oneway === '-1' ? 180 : 0);
        drawing.append(make('path', { d: 'M-1.5,-1.2L0,0L-1.5,1.2', fill: 'none', stroke: 'black', 'stroke-width': .5, transform: `translate(${x} ${y}) rotate(${angle})`, 'data-oneway': road.id }));
      }
    }
  }
  for (const point of model.points) drawing.append(make('circle', { cx: point.point[0], cy: point.point[1], r: .9, fill: color ? '#28596b' : 'black' }));
  const text = (label, anchor = 'middle') => make('text', { x: label.x, y: label.y, 'text-anchor': anchor, 'dominant-baseline': 'central', 'font-family': 'Arial, sans-serif', 'font-size': Math.max(label.fontSize, minimumTextSize), transform: label.angle ? `rotate(${label.angle} ${label.x} ${label.y})` : '', fill: 'black', stroke: 'white', 'stroke-width': .85, 'paint-order': 'stroke', 'data-street-label': label.featureId ?? '' }, label.text);
  for (const label of model.labels) drawing.append(text(label));
  for (const label of model.landmarkLabels) drawing.append(text(label, 'start'));
  if (heading !== null) {
    const start = annotations.find((a) => a.kind === 'start');
    const [x, y] = start ? view.convert(start.coordinate) : [view.width / 2, view.height / 2];
    drawing.append(make('path', { d: 'M0,0V-12m-2.5,4L0,-12L2.5,-8', fill: 'none', stroke: color ? '#165787' : 'black', 'stroke-width': .8, transform: `translate(${x} ${y}) rotate(${heading})`, 'data-heading': heading }));
  }
  const route = annotations.filter((a) => a.kind === 'route').map((a) => view.convert(a.coordinate));
  if (route.length > 1) drawing.append(make('path', { d: route.map((p, i) => `${i ? 'L' : 'M'}${p.join(',')}`).join(''), stroke: color ? '#933' : 'black', 'stroke-width': 1, 'stroke-dasharray': '2 1', fill: 'none' }));
  for (const point of annotations.filter((a) => a.kind !== 'route')) { const [x, y] = view.convert(point.coordinate); drawing.append(make('circle', { cx: x, cy: y, r: Math.max(3, minimumTextSize * .8), fill: 'white', stroke: 'black', 'stroke-width': .5 }), text({ x, y, text: point.kind === 'start' ? 'S' : 'E', fontSize: 3 })); }
  svg.append(make('path', { d: `M${view.width - 10},${Math.max(5, minimumTextSize + 4) + 10}V${Math.max(5, minimumTextSize + 4)}m-2,3l2,-3l2,3`, fill: 'none', stroke: 'black', 'stroke-width': .5 }), text({ x: view.width - 10, y: Math.max(3, minimumTextSize / 2 + 1), text: 'N', fontSize: 3 }));
  const target = view.groundWidth / 5, power = 10 ** Math.floor(Math.log10(target)), distance = [1, 2, 5, 10].map((v) => v * power).filter((v) => v <= target).at(-1), length = distance / view.groundWidth * view.width;
  svg.append(make('path', { d: `M5,${view.height - 6}h${length}m-${length},-1v2m${length},-2v2`, fill: 'none', stroke: 'black', 'stroke-width': .5 }), text({ x: 5 + length / 2, y: view.height - Math.max(10, minimumTextSize + 5), text: distance >= 1000 ? `${distance / 1000} km` : `${distance} m`, fontSize: 3 }));
  return svg;
}
