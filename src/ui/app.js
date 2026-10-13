import { createLessons } from './lessons.js';
import { readImport } from '../data/read-pack.js';
import { createMapModel } from '../map/model.js';
import { createSearchSelect } from './search-select.js';
import { assertRenderable } from '../map/render-limits.js';
import { createRouteTrace } from './route-trace.js';
import { createLabelEditor } from './label-editor.js';
import { createExercisePrint } from '../print/exercise.js';
import { paginateExercise } from '../print/pages.js';
import { renderMap, updateMapLabels } from '../map/render.js';
const get = (id) => document.getElementById(id);
let pack = null, rotation = 0, selected = null, job = null, currentModel = null, loadVersion = 0;
let printPagesKey = null, screenViewKey = null, paperViewKey = null, screenSelected = null, screenVariant = null, paperVariant = null;
const screenModels = new Map(), paperModels = new Map();
function cachedModel(cache, key, create) {
  if (cache.has(key)) { const model = cache.get(key); cache.delete(key); cache.set(key, model); return model; }
  const model = create(); cache.set(key, model);
  if (cache.size > 4) cache.delete(cache.keys().next().value);
  return model;
}
const announce = (text) => { get('status').textContent = text; };

function selectFeature(id) {
  selected = id || null; featurePicker.choose(selected);
  const feature = pack?.features.features.find((f) => f.id === id);
  get('selection').textContent = feature ? `${feature.properties.name ?? 'Unnamed feature'} · ${feature.id}. Drawing geometry alone does not establish a permitted driving route.` : 'Choose a road on the map or use the feature list.';
  editor.selectedFeature(selected); updateView();
}
function updateView() {
  if (!pack) return;
  const variant = get('variant').value, scaleDenominator = Number(get('scale').value);
  const orientation = get('orientation').value;
  get('print-sheet').dataset.orientation = orientation;
  const headingDeg = get('heading').value === '' ? null : Number(get('heading').value);
  const screenWidth = Math.max(280, Math.min(2000, Math.round(get('map').clientWidth)));
  const screenHeight = Math.max(320, Math.min(560, screenWidth * .56));
  const screenKey = `${variant}:${rotation}:${screenWidth}`;
  const model = cachedModel(screenModels, screenKey, () => createMapModel(pack, { variant, rotationDeg: rotation, screenWidth, screenHeight })); currentModel = model;
  const overlay = trace.overlay();
  const viewKey = JSON.stringify([rotation, screenWidth, screenHeight, headingDeg, overlay?.startNodeId, overlay?.mode, overlay?.edgeIds]);
  if (screenViewKey !== viewKey) {
    get('map').replaceChildren(renderMap(document, model, { selectedId: selected, headingDeg, route: overlay, onSelect: (id) => { if (!editor.isPlacing()) { if (trace.isTracing()) trace.selectFeature(id); else selectFeature(id); } } }));
    screenViewKey = viewKey;
  } else {
    if (screenVariant !== variant) updateMapLabels(document, get('map').querySelector('svg'), model);
    if (screenSelected !== selected) {
      for (const shape of get('map').querySelectorAll('.feature')) {
        const id = shape.getAttribute('data-feature-id');
        if (id === screenSelected || id === selected) shape.classList.toggle('feature--selected', id === selected);
      }
    }
  }
  screenSelected = selected; screenVariant = variant;
  get('include-trace').disabled = get('print-output').value !== 'map' || !overlay?.edges.length;
  const printTrace = trace.printOverlay();
  let printError = '';
  try {
    const paperKey = `${variant}:${scaleDenominator}:${orientation}`;
    const paper = cachedModel(paperModels, paperKey, () => createMapModel(pack, { paper: true, variant, scaleDenominator, orientation }));
    const output = get('print-output').value;
    const spec = output === 'map' ? null : createExercisePrint(pack, get('print-exercise').value, output);
    const pagesKey = `${pack.id}:${pack.revision}:${orientation}:${output}:${get('print-exercise').value}`;
    if (pagesKey !== printPagesKey) {
      const pages = spec ? paginateExercise(document, spec, pack, orientation) : [];
      get('exercise-pages').dataset.orientation = orientation; get('exercise-pages').replaceChildren(...pages); printPagesKey = pagesKey;
    }
    const paperHeading = spec ? spec.headingDeg : headingDeg, paperTrace = spec ? null : printTrace;
    const paperKeyForView = JSON.stringify([orientation, scaleDenominator, pack.revision, output, spec?.exerciseId, paperHeading, paperTrace?.startNodeId, paperTrace?.mode, paperTrace?.edgeIds]);
    if (paperViewKey !== paperKeyForView) {
      get('paper-map').replaceChildren(renderMap(document, paper, { headingDeg: paperHeading, route: paperTrace, annotations: spec?.annotations }));
      paperViewKey = paperKeyForView;
    } else if (paperVariant !== variant) updateMapLabels(document, get('paper-map').querySelector('svg'), paper);
    paperVariant = variant;
    get('print').disabled = false;
    get('paper-title').textContent = spec?.title ?? `${pack.title} — ${variant}${paper.draft ? ' — UNREVIEWED DRAFT' : ''}`;
    get('paper-summary').textContent = spec?.summary ?? 'Mark a route, indicate your heading and explain how the roads connect.';
    get('paper-footer').textContent = spec ? `Letter ${orientation} · North up · 1:${scaleDenominator.toLocaleString()} · Print at 100% / actual size; measure the scale bar. ${spec.kind} · Page 1 of ${get('exercise-pages').children.length + 1} · Source credits follow the map.` : `Letter ${orientation} · ${printTrace ? `Trace preview: ${printTrace.edges.length} steps, ${Math.round(printTrace.lengthM)} m; S start, E end${printTrace.warnings.length ? '; needs review' : ''}; not route approval. ` : ''}North up · 1:${scaleDenominator.toLocaleString()} · Print at 100% / actual size; measure the scale bar. ${pack.sources.map((s) => `${s.attribution} · source ${s.sourceAt?.slice(0, 10) ?? 'date unknown'}`).join(' | ')}`;
  } catch (error) {
    get('paper-map').replaceChildren(); get('exercise-pages').replaceChildren(); printPagesKey = null; paperViewKey = null; get('print').disabled = true; printError = error.message;
    get('paper-summary').textContent = '';
    get('paper-title').textContent = 'Print output is unavailable'; get('paper-footer').textContent = printError;
  }
  announce(`${pack.title} · ${pack.review.status === 'reviewed' ? 'Reviewed pack' : 'Unreviewed draft'} · ${pack.features.features.length} features · ${model.labels.length} labels shown${model.suppressedLabels ? `, ${model.suppressedLabels} suppressed to avoid collisions/edges` : ''} · screen rotated ${rotation}°. ${printError}`);
}
function install(value) {
  assertRenderable(value);
  pack = value; selected = null; rotation = 0;
  screenModels.clear(); paperModels.clear(); printPagesKey = null; screenViewKey = null; paperViewKey = null; screenSelected = null;
  get('print-exercise').replaceChildren();
  for (const exercise of pack.exercises) get('print-exercise').add(new Option(`${exercise.type} · ${exercise.id}${exercise.review !== 'reviewed' ? ' · draft' : ''}`, exercise.id));
  if (!pack.exercises.length) get('print-exercise').add(new Option('No exercises in this pack', ''));
  get('print-exercise').disabled = !pack.exercises.length;
  get('print-output').value = 'map';
  get('scale').value = String(pack.print.scaleDenominator);
  get('orientation').value = pack.print.orientation;

  get('attribution').textContent = pack.sources.map((s) => `${s.attribution} · ${s.license} · source ${s.sourceAt?.slice(0, 10) ?? 'date unknown'}`).join(' | ');
  featurePicker.set(pack.features.features.map((f) => ({ id: f.id, text: `${f.properties.name ?? 'Unnamed feature'} (${f.id})` })), '', true); featurePicker.enabled(true);
  get('selection').textContent = 'Choose a road on the map or use the feature list.'; editor.installed(); trace.installed(); lessons.installed(); updateView();
  get('map').dataset.loadVersion = String(++loadVersion);
}
async function load(operation) {
  job?.abort(); const current = new AbortController(); job = current;
  announce('Reading and validating map…');
  try { const value = await operation(current.signal); if (job === current && !current.signal.aborted) install(value); }
  catch (error) { if (job === current && !current.signal.aborted) announce(`Map not loaded: ${error.message} ${error.errors?.[0]?.path ?? ''} The previous map is retained.`); }
}
const featurePicker = createSearchSelect({ select: get('feature'), filter: get('feature-filter'), summary: get('feature-matches'), placeholder: 'No feature selected' });
const trace = createRouteTrace({ getPack: () => pack, redraw: updateView });
const lessons = createLessons({ getPack: () => pack, getTrace: () => trace.overlay() });
const editor = createLabelEditor({ getPack: () => pack, getModel: () => currentModel, applyPack: (value) => { assertRenderable(value); pack = value; screenModels.clear(); paperModels.clear(); printPagesKey = null; screenViewKey = null; paperViewKey = null; screenSelected = null; trace.packChanged(); lessons.packChanged(); updateView(); } });

get('demo').addEventListener('click', () => load(async (signal) => {
  const response = await fetch('tests/fixtures/street-square.json', { signal });
  if (!response.ok) throw new Error('Synthetic map could not be loaded.');
  return readImport(await response.blob(), signal);
}));
get('import').addEventListener('change', () => { const file = get('import').files[0]; if (file) load((signal) => readImport(file, signal)); get('import').value = ''; });
get('rotate').addEventListener('click', () => { rotation = (rotation + 90) % 360; updateView(); });
for (const id of ['variant', 'heading', 'scale', 'orientation', 'print-output', 'print-exercise']) get(id).addEventListener('change', updateView);
get('feature').addEventListener('change', () => selectFeature(get('feature').value));
get('print').addEventListener('click', () => { updateView(); if (!get('print').disabled) window.print(); });
let lastWidth = 0;
new ResizeObserver(() => {
  const width = Math.round(get('map').clientWidth);
  // Print CSS hides the screen map; that is not a new screen viewport.
  if (width < 280 || matchMedia('print').matches) return;
  if (width !== lastWidth) {
    lastWidth = width; screenModels.clear();
    if (pack) requestAnimationFrame(() => { if (!matchMedia('print').matches && get('map').clientWidth >= 280) updateView(); });
  }
}).observe(get('map-panel'));

