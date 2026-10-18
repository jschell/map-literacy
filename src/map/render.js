import { isIndexContour, contourLabelCandidates } from '../terrain/cartography.js';
import { createContourOverlayModel } from '../terrain/geographic.js';
const NS = 'http://www.w3.org/2000/svg';
const element = (doc, tag, attrs = {}, text = null) => {
  const node = doc.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== null) node.textContent = text;
  return node;
};

/** No imported HTML/styles are executed. Returns a detached SVG. */
export function renderMap(doc, model, { selectedId = null, headingDeg = null, route = null, annotations = null, terrain = null, onSelect = () => {} } = {}) {
  const showContourElevations = annotations?.contourElevations ?? model.contourLabelsAllowed;
  const contours = terrain ? createContourOverlayModel(terrain, model) : null;
  const clipId = `clip-${crypto.randomUUID()}`;
  const svg = element(doc, 'svg', { viewBox: `0 0 ${model.width} ${model.height}`, class: model.paper ? 'map-svg print-map' : 'map-svg screen-map', role: 'img', 'aria-label': `${model.title}, ${model.variant} map${model.draft ? ', unreviewed draft' : ''}` });
  svg.dataset.contourElevations = showContourElevations ? 'visible' : 'hidden';
  svg.append(element(doc, 'title', {}, model.title));
  const defs = element(doc, 'defs'), clip = element(doc, 'clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
  clip.append(element(doc, 'polygon', { points: model.clip.map((c) => c.join(',')).join(' ') })); defs.append(clip); svg.append(defs);
  const background = element(doc, 'rect', { width: model.width, height: model.height, class: 'map-background' }); svg.append(background);
  const group = element(doc, 'g', { 'clip-path': `url(#${clipId})` }); svg.append(group);
  if (contours) {
    const layer = element(doc, 'g', { class: 'terrain-overlay', 'pointer-events': 'none', 'aria-label': 'Draft terrain contours' });
    layer.append(element(doc, 'title', {}, `Draft contours; horizontal operation accuracy ${contours.horizontalAccuracyM} m; elevations ${contours.verticalReference}; source grid ${contours.sourceGridSha256}. Not reviewed lesson answers.`));
    for (const path of contours.paths) layer.append(element(doc, 'path', {
      d: path.points.map((p,i)=>`${i?'L':'M'}${p.join(',')}`).join(' '),
      class: 'terrain-contour', 'data-elevation-m': path.levelM, 'stroke-width': model.paper ? .2 : 1.2
    }));
    group.append(layer);
  }
  const layer = (item) => item.role === 'water' ? 0 : item.role === 'building' ? 1 : item.bridge ? 3 : 2;
  const paths = [...model.paths].sort((a, b) => layer(a) - layer(b));
  for (const item of paths) {
    if (item.bridge) group.append(element(doc, 'path', { d: item.d, class: 'bridge-casing', 'stroke-width': model.paper ? 1.8 : 9 }));
    const index = item.contourLevelM !== undefined && isIndexContour(item.contourLevelM,model.contourIntervalM);
    const shape = element(doc, 'path', { d: item.d, class: `feature feature--${item.role} road--${item.level}${item.tunnel ? ' road--tunnel' : ''}${item.role === 'contour' ? index ? ' contour--index' : ' contour--intermediate' : ''}${item.id === selectedId ? ' feature--selected' : ''}`, 'data-feature-id': item.id,
      'stroke-width': item.role === 'contour' ? model.paper ? index ? .5 : .22 : index ? 3 : 1.5 : model.paper ? item.level === 'major' ? 0.7 : item.level === 'path' ? 0.2 : 0.4 : item.level === 'major' ? 4 : item.level === 'path' ? 1.5 : 2.5 });
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
  if(model.depressionTicks?.length) {
    const marks=element(doc,'g',{class:'depression-hachures','pointer-events':'none','clip-path':`url(#${clipId})`});
    for(const t of model.depressionTicks)marks.append(element(doc,'path',{d:`M${model.convert(t.from).join(',')} L${model.convert(t.to).join(',')}`,class:'depression-tick',fill:'none',stroke:'black','stroke-width':model.paper?.22:1.5}));
    svg.append(marks);
  }
  if (route) {
    const overlay = element(doc, 'g', { class: 'route-overlay', 'clip-path': `url(#${clipId})`, 'pointer-events': 'none' });
    for (const edge of route.edges) {
      const d = edge.shape.map((point, i) => `${i ? 'L' : 'M'}${model.convert(point).join(',')}`).join(' ');
      overlay.append(element(doc, 'path', { d, class: 'trace-casing', 'stroke-width': model.paper ? 1.8 : 9 }));
      overlay.append(element(doc, 'path', { d, class: 'trace-line', 'data-edge-id': edge.id, 'stroke-width': model.paper ? .9 : 4, 'stroke-dasharray': model.paper ? '2 1' : '8 4' }));
      const i = Math.max(1, Math.floor(edge.shape.length / 2)), a = model.convert(edge.shape[i - 1]), b = model.convert(edge.shape[i]);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > (model.paper ? 4 : 16)) {
        const x = a[0] + (b[0] - a[0]) / 3, y = a[1] + (b[1] - a[1]) / 3, size = model.paper ? 2 : 7;
        overlay.append(element(doc, 'path', { d: `M${-size},${-size} L0,0 L${-size},${size}`, class: 'trace-arrow', transform: `translate(${x} ${y}) rotate(${Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI})`, 'stroke-width': model.paper ? .7 : 3 }));
      }
    }
    svg.append(overlay);
    const marker = (coordinate, text) => {
      const [cx, cy] = model.convert(coordinate), r = model.paper ? 3 : 12;
      const g = element(doc, 'g', { class: 'trace-marker', 'pointer-events': 'none' });
      g.append(element(doc, 'circle', { cx, cy, r, fill: 'white', stroke: 'black', 'stroke-width': model.paper ? .3 : 1.5 }));
      g.append(element(doc, 'text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': model.paper ? 3 : 13, fill: 'black' }, text));
      svg.append(g);
    };
    if (!annotations?.routeEndpoints) {
      marker(route.start, route.edges.length && route.startNodeId === route.endNodeId ? 'S/E' : 'S');
      if (route.startNodeId !== route.endNodeId) marker(route.end, 'E');
    }
  }
  for (const item of model.landmarks) group.append(element(doc, 'circle', { cx: item.point[0], cy: item.point[1], r: model.paper ? 1.2 : 5, class: 'landmark' }));
  const blockedLabels = [];
  for(const m of annotations?.markers ?? []) {const [x,y]=model.convert(m.coordinate),r=model.paper?7:28;blockedLabels.push([x-r,y-r,x+r,y+r]);}
  svg.contourBlockedLabels = blockedLabels;
  const labelLayer = element(doc, 'g', { class: 'map-label-layer', 'clip-path': `url(#${clipId})` }); svg.append(labelLayer);
  updateMapLabels(doc, svg, model);
  if (headingDeg !== null && Number.isFinite(headingDeg)) {
    const x = model.width / 2, y = model.height / 2, size = model.paper ? 5 : 25;
    group.append(element(doc, 'path', { d: `M${x},${y-size} L${x-size/2},${y+size/2} L${x},${y} L${x+size/2},${y+size/2} Z`, class: 'heading-arrow', transform: `rotate(${headingDeg + model.rotationDeg} ${x} ${y})` }));
  }
  if (annotations) {
    const marks = element(doc, 'g', { class: 'exercise-annotations', 'pointer-events': 'none' }); svg.append(marks);
    for (const edge of annotations.closedEdges) {
      const d = edge.shape.map((point, i) => `${i ? 'L' : 'M'}${model.convert(point).join(',')}`).join(' ');
      marks.append(element(doc, 'path', { d, class: 'closure-line', 'stroke-width': model.paper ? .6 : 3, 'stroke-dasharray': model.paper ? '1 1' : '5 5', 'clip-path': `url(#${clipId})` }));
      const i = Math.max(1, Math.floor(edge.shape.length / 2)), a = model.convert(edge.shape[i - 1]), b = model.convert(edge.shape[i]);
      const x = a[0] + (b[0] - a[0]) / 3, y = a[1] + (b[1] - a[1]) / 3, cross = model.paper ? 2 : 10;
      marks.append(element(doc, 'path', { d: `M${x-cross},${y-cross} L${x+cross},${y+cross} M${x-cross},${y+cross} L${x+cross},${y-cross}`, class: 'closure-line', 'stroke-width': model.paper ? .8 : 4 }));
    }
    for(const coordinates of annotations.lines ?? []) {
      const d=coordinates.map((p,i)=>`${i?'L':'M'}${model.convert(p).join(',')}`).join(' ');
      marks.append(element(doc,'path',{d,class:'profile-transect',fill:'none',stroke:'white','stroke-width':model.paper?1.5:7}));
      marks.append(element(doc,'path',{d,class:'profile-transect',fill:'none',stroke:'black','stroke-width':model.paper?.6:3,'stroke-dasharray':model.paper?'2 1':'8 4'}));
    }
    for (const span of annotations.spans ?? []) {
      const a=model.convert(span.from),b=model.convert(span.to),length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,unit=model.paper?1:4;
      const g=element(doc,'g',{class:'slope-span','data-span':span.text});marks.append(g);
      const d=`M${a.join(',')} L${b.join(',')}`;
      g.append(element(doc,'path',{d,fill:'none',stroke:'white','stroke-width':1.4*unit}));
      g.append(element(doc,'path',{d,fill:'none',stroke:'black','stroke-width':.6*unit}));
      for(const p of [a,b])g.append(element(doc,'path',{d:`M${p[0]-dy*1.2*unit},${p[1]+dx*1.2*unit} L${p[0]+dy*1.2*unit},${p[1]-dx*1.2*unit}`,stroke:'black','stroke-width':.4*unit}));
      const x=a[0]-dx*6*unit,y=a[1]-dy*6*unit;
      g.append(element(doc,'circle',{cx:x,cy:y,r:2.4*unit,fill:'white',stroke:'black','stroke-width':.3*unit}));
      g.append(element(doc,'text',{x,y,class:'exercise-mark','text-anchor':'middle','dominant-baseline':'central','font-size':model.paper?3:13,fill:'black'},span.text));
    }
    for (const marker of annotations.markers) {
      const [cx, cy] = model.convert(marker.coordinate);
      const font = model.paper ? 3 : 13, radius = model.paper ? 3 : 13;
      if(marker.text.length>3) { const width=marker.text.length*font*.62+font; marks.append(element(doc,'rect',{x:cx-width/2,y:cy-radius,width,height:radius*2,fill:'white',stroke:'black','stroke-width':model.paper ? .3 : 1})); }
      else marks.append(element(doc, 'circle', { cx, cy, r: radius, fill: 'white', stroke: 'black', 'stroke-width': model.paper ? .3 : 1 }));
      marks.append(element(doc, 'text', { x: cx, y: cy, class: 'exercise-mark', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': font, fill: 'black' }, marker.text));
    }
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
  if (model.contourIntervalM) {
    const u=model.paper?1:4,w=55*u,h=18*u,x=2*u,y=2*u;
    const legend=element(doc,'g',{class:'contour-legend','aria-label':`Contour interval ${model.contourIntervalM} metres; index every fifth interval from synthetic zero`});
    legend.append(element(doc,'rect',{x,y,width:w,height:h,fill:'white',stroke:'black','stroke-width':.2*u}));
    for(const [i,index] of [false,true].entries()) {
      const cy=y+(5+i*5)*u;
      legend.append(element(doc,'path',{d:`M${x+2*u},${cy} h${8*u}`,fill:'none',stroke:'black','stroke-width':(index?.5:.22)*u}));
      legend.append(element(doc,'text',{x:x+12*u,y:cy+u,'font-size':3*u,fill:'black'},index?`Index: every ${model.contourIntervalM*5} m`:`Interval: ${model.contourIntervalM} m`));
    }
    legend.append(element(doc,'text',{x:x+2*u,y:y+15*u,'font-size':3*u,fill:'black'},model.depressionTicks?.length?'Inward ticks: lower inside':'Synthetic zero; no hachures'));svg.append(legend);
  }
  if (contours) {
    svg.append(element(doc, 'rect', { x: model.paper ? 2 : 8, y: model.paper ? 1 : 2, width: model.paper ? 55 : 210, height: model.paper ? 6 : 20, class: 'terrain-note-background' }));
    svg.append(element(doc, 'text', { x: model.paper ? 3 : 10, y: model.paper ? 5 : 16, class: 'terrain-review-note', 'font-size': model.paper ? 3 : 12 }, 'Draft terrain; 4 m operation'));
  }
  return svg;
}


/** Reuse geometry/hit targets when only label visibility changes. */
export function updateMapLabels(doc, svg, model) {
  const labelLayer = svg.querySelector('.map-label-layer'); labelLayer.replaceChildren();
  for (const l of model.labels) labelLayer.append(element(doc, 'text', { x: l.point[0], y: l.point[1], class: 'map-label', 'font-size': l.fontSize,
    'text-anchor': 'middle', transform: `rotate(${l.rotationDeg} ${l.point[0]} ${l.point[1]})`, 'stroke-width': model.paper ? 0.9 : 4 }, l.text));
  svg.querySelector('.contour-label-layer')?.remove();
  if(svg.dataset.contourElevations === 'visible') {
    const layer=element(doc,'g',{class:'contour-label-layer','pointer-events':'none'});
    for(const l of contourLabelCandidates(model,svg.contourBlockedLabels))layer.append(element(doc,'text',{x:l.point[0],y:l.point[1],class:'contour-elevation-label','text-anchor':'middle','dominant-baseline':'central','font-size':l.fontSize,fill:'black',stroke:'white','stroke-width':model.paper?1:4,'paint-order':'stroke fill'},l.text));
    svg.append(layer);
  }
  svg.setAttribute('aria-label', `${model.title}, ${model.variant} map${model.draft ? ', unreviewed draft' : ''}`);
}
