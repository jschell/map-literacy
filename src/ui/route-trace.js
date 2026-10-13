import { createSearchSelect } from './search-select.js';
import { createTraceReview } from '../route/trace.js';
const get = (id) => document.getElementById(id);

export function createRouteTrace({ getPack, redraw }) {
  const startPicker = createSearchSelect({ select: get('trace-start'), filter: get('trace-start-filter'), summary: get('trace-start-matches'), placeholder: 'Choose a start node' });
  const edgePicker = createSearchSelect({ select: get('trace-edge'), filter: get('trace-edge-filter'), summary: get('trace-edge-matches'), placeholder: 'Choose a directed edge' });
  let review = null, state = null, tracing = false;
  const message = (text) => { get('trace-status').textContent = text; };
  function toggle(value) {
    tracing = value; get('trace-map').setAttribute('aria-pressed', String(value));
    get('trace-map').textContent = value ? 'Stop map tracing' : 'Trace with map taps';
  }
  function refresh() {
    const trace = state ? review.inspect(state) : null;
    const choices = state ? review.choices(state) : [];
    edgePicker.set(choices.map(({ edge, disabled, reason }) => ({ id: edge.id, disabled, text: `${review.name(edge.featureId)} · ${edge.from} → ${edge.to} (${edge.id}) · ${edge.access}${disabled ? ` — ${reason}` : ''}` })), '', true);
    edgePicker.enabled(Boolean(state));
    get('trace-add').disabled = true;
    get('trace-back').disabled = !trace?.edges.length; get('trace-clear').disabled = !trace?.edges.length;
    get('trace-map').disabled = !state;
    get('include-trace').disabled = !trace?.edges.length;
    get('trace-steps').replaceChildren();
    for (const edge of trace?.edges ?? []) {
      const item = document.createElement('li'); item.textContent = `${edge.name}: ${edge.from} → ${edge.to} · ${Math.round(edge.lengthM)} m · access ${edge.access}`; get('trace-steps').append(item);
    }
    message(trace ? `Trace preview · ${trace.edges.length} steps · ${Math.round(trace.lengthM)} m · current node ${trace.endNodeId}. ${trace.warnings.join(' ')} This is not route approval or exercise scoring.` : 'Select a start graph node to trace a path. No route or location is selected automatically.');
  }
  function append(id) {
    if (!state) return;
    try {
      const next = { ...state, edgeIds: [...state.edgeIds, id] }; review.inspect(next); state = next;
      refresh(); redraw();
    } catch (error) { message(`Edge not added: ${error.message} The prior trace is retained.`); }
  }
  get('trace-start').addEventListener('change', () => {
    state = get('trace-start').value ? { startNodeId: get('trace-start').value, mode: get('trace-mode').value, edgeIds: [] } : null;
    toggle(false); refresh(); redraw();
  });
  get('trace-mode').addEventListener('change', () => {
    if (state) state = { ...state, mode: get('trace-mode').value, edgeIds: [] };
    toggle(false); refresh(); redraw();
  });
  get('trace-edge-filter').addEventListener('input', () => { get('trace-add').disabled = !get('trace-edge').value; });
  get('trace-edge').addEventListener('change', () => { get('trace-add').disabled = !get('trace-edge').value; });
  get('trace-add').addEventListener('click', () => append(get('trace-edge').value));
  get('trace-back').addEventListener('click', () => { if (state) { state = { ...state, edgeIds: state.edgeIds.slice(0, -1) }; refresh(); redraw(); } });
  get('trace-clear').addEventListener('click', () => { if (state) { state = { ...state, edgeIds: [] }; refresh(); redraw(); } });
  get('trace-map').addEventListener('click', () => { toggle(!tracing); if (tracing) { get('map').scrollIntoView({ block: 'center' }); message('Tap a road with one outgoing edge from the current node. Use the directed-edge list to resolve ambiguous roads.'); } });
  get('include-trace').addEventListener('change', redraw);
  refresh();
  return {
    isTracing: () => tracing,
    overlay: () => state ? review.inspect(state) : null,
    printOverlay: () => get('include-trace').checked && state?.edgeIds.length ? review.inspect(state) : null,
    selectFeature(id) {
      const choices = review.choices(state).filter((c) => c.edge.featureId === id && !c.disabled);
      if (choices.length === 1) append(choices[0].edge.id);
      else message(choices.length > 1 ? 'This road has multiple outgoing edges. Choose its directed edge in the list.' : 'No usable outgoing edge on this road from the current graph node. A visual crossing does not connect nodes.');
    },
    installed() {
      review = createTraceReview(getPack()); state = null; toggle(false);
      startPicker.set(review.starts.map((node) => ({ id: node.id, text: `${node.id} · ${node.coordinate.map((v) => v.toFixed(5)).join(', ')}` })), '', true);
      startPicker.enabled(true);
      get('trace-start').disabled = false; get('trace-mode').disabled = false; get('include-trace').checked = false;
      refresh();
    },
    packChanged() { review = createTraceReview(getPack()); refresh(); }
  };
}
