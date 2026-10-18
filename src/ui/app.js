import { renderProfileChart } from '../terrain/profile-chart.js';
import { lessonPdf } from '../export/lesson-pdf.js';
import { createExplorer } from './explorer.js';
import { createPreferences } from './preferences.js';
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
let explorer = null;
let pdfSnapshot = null, pdfGeneration = 0, makingLessonPdf = false, lessonPdfUrl = null, lastPdfKey = null;
function invalidateLessonPdf() {
  pdfGeneration++; pdfSnapshot = null;
  if (lessonPdfUrl) URL.revokeObjectURL(lessonPdfUrl);
  lessonPdfUrl = null;
  get('lesson-pdf-link').hidden = true; get('lesson-pdf-link').removeAttribute('href');
  get('lesson-pdf-status').textContent = 'Download the selected lesson output as a fixed-size Letter PDF. Print the PDF at actual size.';
}
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
  get('selection').textContent = feature ? `${feature.properties.name ?? 'Unnamed feature'} · ${feature.id}. ${pack.module === 'topographic' ? 'Synthetic contour; use the labeled reference and contour interval.' : 'Drawing geometry alone does not establish a permitted driving route.'}` : 'Choose a road on the map or use the feature list.';
  editor.selectedFeature(selected); updateView();
}
function updateView() {
  explorer?.updateFrame();
  if (!pack) return;
  const variant = get('variant').value, scaleDenominator = Number(get('scale').value);
  const orientation = get('orientation').value;
  get('print-sheet').dataset.orientation = orientation;
  document.body.dataset.printOrientation = orientation;
  const headingDeg = pack.module === 'topographic' ? null : get('heading').value === '' ? null : Number(get('heading').value);
  const screenWidth = Math.max(280, Math.min(2000, Math.round(get('map').clientWidth)));
  const screenHeight = Math.max(320, Math.min(560, screenWidth * .56));
  const screenKey = `${variant}:${rotation}:${screenWidth}`;
  const model = cachedModel(screenModels, screenKey, () => createMapModel(pack, { variant, rotationDeg: rotation, screenWidth, screenHeight })); currentModel = model;
  const overlay = trace.overlay(), lessonAnnotations = lessons.annotations(), profile = lessons.profile();
  get('profile-panel').hidden = !profile;
  if(pack.module === 'topographic') get('map-help').textContent = lessonAnnotations ? 'Read the marked contour references, slope spans, H/L landform axis or S/E profile. Use the labeled answer field and Submit answer; hints and retry are available.' : 'Begin or resume a lesson session to show its references and question. Synthetic elevations use a synthetic zero; no real terrain is represented.';
  const profileKey = profile ? JSON.stringify([pack.id,pack.revision,profile.path,Math.round(get('profile-chart').clientWidth)]) : '';
  if(get('profile-chart').dataset.key!==profileKey) {
    get('profile-chart').dataset.key=profileKey;get('profile-chart').replaceChildren(...(profile?[renderProfileChart(document,profile)]:[]));
    get('profile-values').replaceChildren(...(profile?profile.samples.map(p=>{const row=document.createElement('tr');for(const value of [p.distanceM,p.elevationM]) {const cell=document.createElement('td');cell.textContent=Number(value.toFixed(2));row.append(cell);}return row;}):[]));
  }
  const viewKey = JSON.stringify([rotation, screenWidth, screenHeight, headingDeg, overlay?.startNodeId, overlay?.mode, overlay?.edgeIds,lessonAnnotations]);
  if (screenViewKey !== viewKey) {
    get('map').replaceChildren(renderMap(document, model, { selectedId: selected, headingDeg, route: overlay, annotations:lessonAnnotations, onSelect: (id) => { if (!editor.isPlacing()) { if (trace.isTracing()) trace.selectFeature(id); else selectFeature(id); } } }));
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
    const mapAnnotations = pack.module === 'topographic' ? {closedEdges:[],markers:[],contourElevations:true} : null;
    const spec = output === 'map' ? null : createExercisePrint(pack, get('print-exercise').value, output);
    const pagesKey = `${pack.id}:${pack.revision}:${orientation}:${output}:${get('print-exercise').value}`;
    if (pagesKey !== printPagesKey) {
      const pages = spec ? paginateExercise(document, spec, pack, orientation) : [];
      get('exercise-pages').dataset.orientation = orientation; get('exercise-pages').replaceChildren(...pages); printPagesKey = pagesKey;
    }
    const paperHeading = spec ? spec.headingDeg : headingDeg, paperTrace = spec ? null : printTrace;
    const paperKeyForView = JSON.stringify([orientation, scaleDenominator, pack.revision, output, spec?.exerciseId, paperHeading, paperTrace?.startNodeId, paperTrace?.mode, paperTrace?.edgeIds]);
    if (paperViewKey !== paperKeyForView) {
      get('paper-map').replaceChildren(renderMap(document, paper, { headingDeg: paperHeading, route: paperTrace, annotations: spec?.annotations ?? mapAnnotations }));
      paperViewKey = paperKeyForView;
    } else if (paperVariant !== variant) updateMapLabels(document, get('paper-map').querySelector('svg'), paper);
    paperVariant = variant;
    get('print').disabled = false;
    get('paper-title').textContent = spec?.title ?? `${pack.title} — ${variant}${paper.draft ? ' — UNREVIEWED DRAFT' : ''}`;
    get('paper-summary').textContent = spec?.summary ?? (pack.module === 'topographic' ? `Synthetic terrain; read the labeled contour elevations. Contour interval: ${pack.terrain.intervalM} m. Choose Learner worksheet for a labeled reference and an elevation question.` : 'Mark a route, indicate your heading and explain how the roads connect.');
    get('paper-footer').textContent = spec ? `Letter ${orientation} · North up · 1:${scaleDenominator.toLocaleString()} · Print at 100% / actual size; measure the scale bar. ${spec.kind} · Page 1 of ${get('exercise-pages').children.length + 1} · Source credits follow the map.` : `Letter ${orientation} · ${printTrace ? `Trace preview: ${printTrace.edges.length} steps, ${Math.round(printTrace.lengthM)} m; S start, E end${printTrace.warnings.length ? '; needs review' : ''}; not route approval. ` : ''}North up · 1:${scaleDenominator.toLocaleString()} · Print at 100% / actual size; measure the scale bar. ${pack.sources.map((s) => `${s.attribution} · source ${s.sourceAt?.slice(0, 10) ?? 'date unknown'}`).join(' | ')}`;
    const pdfKey = JSON.stringify([pack.id, pagesKey, paperKeyForView, variant]);
    if (pdfKey !== lastPdfKey) { invalidateLessonPdf(); lastPdfKey = pdfKey; }
    pdfSnapshot = { svg: get('paper-map').querySelector('svg'), model: paper, title: get('paper-title').textContent, summary: get('paper-summary').textContent, footer: get('paper-footer').textContent, spec, packId: pack.id, revision: pack.revision };
    get('lesson-pdf').disabled = makingLessonPdf;
    if (get('print-preview').open) {
      const preview = get('print-preview-content');
      preview.dataset.orientation = orientation;
      const title = document.createElement('h3'); title.textContent = get('paper-title').textContent;
      const summary = document.createElement('p'); summary.textContent = get('paper-summary').textContent;
      const footer = document.createElement('p'); footer.className = 'note'; footer.textContent = get('paper-footer').textContent;
      preview.replaceChildren(renderMap(document, paper, { headingDeg: paperHeading, route: paperTrace, annotations: spec?.annotations ?? mapAnnotations }), title, summary, footer);
    }
  } catch (error) {
    invalidateLessonPdf(); get('lesson-pdf').disabled = true;
    get('print-preview-content').replaceChildren();
    get('paper-map').replaceChildren(); get('exercise-pages').replaceChildren(); printPagesKey = null; paperViewKey = null; get('print').disabled = true; printError = error.message;
    get('paper-summary').textContent = '';
    get('paper-title').textContent = 'Print output is unavailable'; get('paper-footer').textContent = printError;
  }
  announce(`${pack.title} · ${pack.review.status === 'reviewed' ? 'Reviewed pack' : 'Unreviewed draft'} · ${pack.features.features.length} features · ${model.labels.length + get('map').querySelectorAll('.contour-elevation-label').length} labels shown${model.suppressedLabels ? `, ${model.suppressedLabels} suppressed to avoid collisions/edges` : ''} · screen rotated ${rotation}°. ${printError}`);
}
function install(value) {
  assertRenderable(value); lessons.guardReplacement();
  invalidateLessonPdf(); lastPdfKey = null;
  pack = value; selected = null; rotation = 0;
  screenModels.clear(); paperModels.clear(); printPagesKey = null; screenViewKey = null; paperViewKey = null; screenSelected = null;
  get('print-exercise').replaceChildren();
  for (const exercise of pack.exercises) get('print-exercise').add(new Option(`${exercise.type} · ${exercise.id}${exercise.review !== 'reviewed' ? ' · draft' : ''}`, exercise.id));
  if (!pack.exercises.length) get('print-exercise').add(new Option('No exercises in this pack', ''));
  get('print-exercise').disabled = !pack.exercises.length;
  get('print-output').value = pack.module === 'topographic' ? 'learner' : 'map';
  get('heading').disabled = pack.module === 'topographic';
  get('scale').value = String(pack.print.scaleDenominator);
  get('orientation').value = pack.print.orientation;

  get('attribution').textContent = pack.sources.map((s) => `${s.attribution} · ${s.license} · source ${s.sourceAt?.slice(0, 10) ?? 'date unknown'}`).join(' | ');
  get('map-help').textContent = pack.module === 'topographic' ? 'Begin a lesson session to show its contour references or slope spans. Use the labeled answer field and Submit answer; hints and retry are available.' : 'Keyboard alternatives: choose a road in Feature selection, or build a path with Start graph node, Next directed edge and Add edge below.';
  featurePicker.set(pack.features.features.map((f) => ({ id: f.id, text: `${f.properties.name ?? 'Unnamed feature'} (${f.id})` })), '', true); featurePicker.enabled(true);
  get('selection').textContent = pack.module === 'topographic' ? 'Synthetic terrain lesson. Use the contour elevations and marked exercise references. No real terrain is represented.' : 'Choose a road on the map or use the feature list.'; editor.installed(); trace.installed(); lessons.installed(); preferences.installed(); updateView();
  get('map').dataset.loadVersion = String(++loadVersion);
}
async function load(operation) {
  lessons.cancelPending(); job?.abort(); const current = new AbortController(); job = current;
  announce('Reading and validating map…');
  try { const value = await operation(current.signal); if (job === current && !current.signal.aborted) install(value); }
  catch (error) { if (job === current && !current.signal.aborted) announce(`Map not loaded: ${error.message} ${error.errors?.[0]?.path ?? ''} The previous map is retained.`); }
}
const featurePicker = createSearchSelect({ select: get('feature'), filter: get('feature-filter'), summary: get('feature-matches'), placeholder: 'No feature selected' });
const trace = createRouteTrace({ getPack: () => pack, redraw: updateView });
const lessons = createLessons({ getPack: () => pack, getTrace: () => trace.overlay(), cancelPackLoad: () => { job?.abort(); if (pack) updateView(); else announce('Choose a map or restore a session backup.'); }, installPack: (value) => { job?.abort(); install(value); } });
const editor = createLabelEditor({ getPack: () => pack, getModel: () => currentModel, applyPack: (value) => { assertRenderable(value); lessons.guardReplacement(); pack = value; screenModels.clear(); paperModels.clear(); printPagesKey = null; screenViewKey = null; paperViewKey = null; screenSelected = null; trace.packChanged(); lessons.packChanged(); updateView(); } });

const preferences = createPreferences({
  readView: () => ({ labels: get('variant').value, mapRotationDeg: rotation, printScale: Number(get('scale').value), orientation: get('orientation').value }),
  applyView: (values) => { get('variant').value = values.labels; rotation = values.mapRotationDeg; get('scale').value = String(values.printScale); get('orientation').value = values.orientation; updateView(); },
  preferPackPrintDefaults: () => pack?.module === 'topographic',
  packDefaults: () => ({ labels: 'labeled', mapRotationDeg: 0, printScale: pack?.print.scaleDenominator ?? 5000, orientation: pack?.print.orientation ?? 'landscape' })
});

get('demo').addEventListener('click', () => load(async (signal) => {
  const response = await fetch('tests/fixtures/street-square.json', { signal });
  if (!response.ok) throw new Error('Synthetic map could not be loaded.');
  return readImport(await response.blob(), signal);
}));
get('landform-demo').addEventListener('click',()=>load(async(signal)=>{const r=await fetch('tests/fixtures/terrain-landforms.json',{signal});if(!r.ok)throw new Error('Landform lesson could not be loaded.');return readImport(await r.blob(),signal);}));
get('profile-demo').addEventListener('click',()=>load(async(signal)=>{const r=await fetch('tests/fixtures/terrain-profiles.json',{signal});if(!r.ok)throw new Error('Profile lesson could not be loaded.');return readImport(await r.blob(),signal);}));
get('slope-demo').addEventListener('click', () => load(async(signal) => { const r=await fetch('tests/fixtures/terrain-slopes.json',{signal});if(!r.ok)throw new Error('Slope lesson could not be loaded.');return readImport(await r.blob(),signal); }));
get('terrain-demo').addEventListener('click', () => load(async(signal) => { const response=await fetch('tests/fixtures/terrain-hill.json',{signal}); if(!response.ok) throw new Error('Contour lesson could not be loaded.'); return readImport(await response.blob(),signal); }));
document.addEventListener('lesson-view-changed', () => requestAnimationFrame(updateView));
get('import').addEventListener('change', () => { const file = get('import').files[0]; if (file) load((signal) => readImport(file, signal)); get('import').value = ''; });
get('rotate').addEventListener('click', () => { rotation = (rotation + 90) % 360; preferences.changed(); });
for (const id of ['variant', 'scale', 'orientation']) get(id).addEventListener('change', () => preferences.changed());
for (const id of ['heading', 'print-output', 'print-exercise']) get(id).addEventListener('change', updateView);
get('feature').addEventListener('change', () => selectFeature(get('feature').value));
get('lesson-pdf').addEventListener('click', async () => {
  if (makingLessonPdf) return;
  updateView(); if (!pdfSnapshot) return;
  const snapshot = pdfSnapshot, generation = pdfGeneration;
  makingLessonPdf = true; get('lesson-pdf').disabled = true; get('lesson-pdf').setAttribute('aria-busy', 'true');
  get('lesson-pdf-status').textContent = 'Preparing the selected lesson PDF…';
  try {
    const bytes = await lessonPdf(document, snapshot);
    if (generation !== pdfGeneration) return;
    if (lessonPdfUrl) URL.revokeObjectURL(lessonPdfUrl);
    lessonPdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = get('lesson-pdf-link'); link.href = lessonPdfUrl;
    link.download = `map-literacy-lesson-${snapshot.spec?.audience ?? 'map'}-${snapshot.model.orientation}.pdf`; link.hidden = false;
    get('lesson-pdf-status').textContent = `PDF ready: Letter ${snapshot.model.orientation}, 1:${snapshot.model.scaleDenominator.toLocaleString()}. Save this snapshot and print at actual size / 100%. Lossless 300 dpi; no browser headers or footers.`;
    link.click();
  } catch (error) { if (generation === pdfGeneration) get('lesson-pdf-status').textContent = `PDF not prepared: ${error.message} Retry the download.`; }
  finally { makingLessonPdf = false; get('lesson-pdf').removeAttribute('aria-busy'); get('lesson-pdf').disabled = !pdfSnapshot; }
});
get('print-preview').addEventListener('toggle', updateView);
get('print').addEventListener('click', () => { updateView(); if (!get('print').disabled) { document.body.dataset.printTarget = 'lesson'; window.print(); } });
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


explorer = createExplorer();
