import {distanceM} from '../geo/distance.js';
import {createSearchSelect} from './search-select.js';
const get = id => document.getElementById(id);

/** Draft placement stays in memory and never reads the exercise's answer rubric. */
export function createEndpointAnswer({getPack, getModel, isPracticing, redraw}) {
  let coordinate = null, cursor = null, key = null;
  const references = createSearchSelect({select:get('endpoint-reference'),filter:get('endpoint-reference-filter'),summary:get('endpoint-reference-matches'),placeholder:'Choose a map reference'});
  const inside = p => { const [w,s,e,n] = getPack().bounds; return p.every(Number.isFinite) && p[0]>=w && p[0]<=e && p[1]>=s && p[1]<=n; };
  function place(point) {
    if (!isPracticing() || !inside(point)) return;
    coordinate = [...point]; cursor = [...point];
    const reference = getPack().topology.nodes.find(n=>n.coordinate.every((v,i)=>Math.abs(v-point[i])<1e-12));
    references.choose(reference?.id ?? '');
    get('answer-lon').value = point[0]; get('answer-lat').value = point[1];
    get('endpoint-status').textContent = 'Tentative answer marked with ?. Move it if needed, then Submit answer.';
    redraw();
  }
  get('map').addEventListener('click', event => {
    if (!isPracticing()) return;
    const matrix = get('map').querySelector('svg')?.getScreenCTM(); if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    place(getModel().invert([point.x, point.y]));
  });
  get('endpoint-place').addEventListener('click', () => { cursor ??= getModel().invert([getModel().width/2,getModel().height/2]); get('map-panel').focus(); redraw(); get('endpoint-status').textContent = 'Map focused. Arrow keys move the cursor on screen; Shift moves in smaller steps. Enter places your answer. Tab returns to the other controls.'; });
  get('endpoint-reference').addEventListener('change', () => {
    const node = getPack().topology.nodes.find(n => n.id === get('endpoint-reference').value);
    if (node) place(node.coordinate); else { coordinate=null; cursor=null; get('answer-lon').value=''; get('answer-lat').value=''; get('endpoint-status').textContent='No point selected. Choose a map reference or place a point.'; redraw(); }
  });
  for (const id of ['answer-lon','answer-lat']) get(id).addEventListener('input', () => {
    const point = [Number(get('answer-lon').value), Number(get('answer-lat').value)];
    if (get('answer-lon').value && get('answer-lat').value && inside(point)) place(point);
    else {
      coordinate = null; cursor = null; references.choose('');
      get('endpoint-status').textContent = 'Enter both coordinates inside the lesson extent, or choose a point on the map.';
      redraw();
    }
  });
  get('map-panel').addEventListener('keydown', event => {
    if (!isPracticing() || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(event.key)) return;
    event.preventDefault();
    const model = getModel(); cursor ??= model.invert([model.width/2, model.height/2]);
    if (event.key === 'Enter') { place(cursor); return; }
    const [x,y] = model.convert(cursor), step = event.shiftKey ? 2 : 12;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    const point = model.invert([x+dx,y+dy]);
    if (inside(point)) cursor = point;
    const position = model.convert(cursor);
    let near = null, closest = Infinity;
    for (const node of getPack().topology.nodes) {
      const p=model.convert(node.coordinate), gap=Math.hypot(p[0]-position[0],p[1]-position[1]);
      if (gap<closest) {closest=gap;near={node};}
    }
    let relative = '';
    if (near) {
      const a=model.projection.project(near.node.coordinate), b=model.projection.project(cursor);
      const angle=(Math.atan2(b[0]-a[0],b[1]-a[1])*180/Math.PI+360)%360;
      const direction=['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round(angle/45)%8];
      relative=` ${Math.round(distanceM(near.node.coordinate,cursor))} metres ${direction} of reference ${near.node.id}.`;
    }
    get('endpoint-status').textContent = `Cursor moved ${event.key.slice(5).toLowerCase()} on screen.${relative} Press Enter to place, or choose a reference from the list.`;
    redraw();
  });
  return {
    answer: () => coordinate ? [...coordinate] : null,
    clear() { coordinate = null; cursor = null; get('answer-lon').value=''; get('answer-lat').value=''; get('endpoint-reference-filter').value = ''; references.choose(''); get('endpoint-status').textContent = 'No point selected. Tap the map or choose a reference below.'; },
    sync(exerciseKey) {
      if (key === exerciseKey) return;
      key = exerciseKey; this.clear();
      if (!exerciseKey) { references.set([], '', true); return; }
      const pack = getPack(), names = new Map(pack.features.features.map(f => [f.id,f.properties.name ?? 'Unnamed road']));
      const connections = new Map(pack.topology.nodes.map(n=>[n.id,new Set()]));
      for (const edge of pack.topology.edges) for (const id of [edge.from,edge.to]) connections.get(id).add(names.get(edge.featureId));
      references.set(pack.topology.nodes.filter(n=>inside(n.coordinate)).map(n=>({id:n.id,text:`${n.id} · ${[...connections.get(n.id)].join(', ')}`})), '', true);
    },
    markers() { return isPracticing() ? [...(coordinate ? [{coordinate,text:'?'}] : []), ...(cursor && (!coordinate || cursor.some((v,i)=>v!==coordinate[i])) ? [{coordinate:cursor,text:'+'}] : [])] : coordinate ? [{coordinate,text:'?'}] : []; }
  };
}
