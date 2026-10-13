import { readImport } from '../data/read-pack.js';
import { createMapModel } from '../map/model.js';
import { renderMap } from '../map/render.js';
const get = (id) => document.getElementById(id);
let pack = null, rotation = 0, selected = null, job = null;
const screenModels = new Map(), paperModels = new Map();
const announce = (text) => { get('status').textContent = text; };

function selectFeature(id) {
  selected = id || null; get('feature').value = id || '';
  const feature = pack?.features.features.find((f) => f.id === id);
  get('selection').textContent = feature ? `${feature.properties.name ?? 'Unnamed feature'} · ${feature.id}. Drawing geometry alone does not establish a permitted driving route.` : 'Choose a road on the map or use the feature list.';
  updateView();
}
function updateView() {
  if (!pack) return;
  const variant = get('variant').value, scaleDenominator = Number(get('scale').value);
  const headingDeg = get('heading').value === '' ? null : Number(get('heading').value);
  const screenWidth = Math.max(280, Math.min(2000, Math.round(get('map').clientWidth)));
  const screenHeight = Math.max(320, Math.min(560, screenWidth * .56));
  const screenKey = `${variant}:${rotation}:${screenWidth}`;
  if (!screenModels.has(screenKey)) screenModels.set(screenKey, createMapModel(pack, { variant, rotationDeg: rotation, screenWidth, screenHeight }));
  const model = screenModels.get(screenKey);
  get('map').replaceChildren(renderMap(document, model, { selectedId: selected, headingDeg, onSelect: selectFeature }));
  let printError = '';
  try {
    const paperKey = `${variant}:${scaleDenominator}`;
    if (!paperModels.has(paperKey)) paperModels.set(paperKey, createMapModel(pack, { paper: true, variant, scaleDenominator }));
    const paper = paperModels.get(paperKey);
    get('paper-map').replaceChildren(renderMap(document, paper, { headingDeg }));
    get('print').disabled = false;
    get('paper-title').textContent = `${pack.title} — ${variant}${paper.draft ? ' — UNREVIEWED DRAFT' : ''}`;
    get('paper-footer').textContent = `North up · 1:${scaleDenominator.toLocaleString()} · Print at 100% / actual size; measure the scale bar. ${pack.sources.map((s) => `${s.attribution} · source ${s.sourceAt?.slice(0, 10) ?? 'date unknown'}`).join(' | ')}`;
  } catch (error) {
    get('paper-map').replaceChildren(); get('print').disabled = true; printError = error.message;
    get('paper-title').textContent = 'Map cannot be printed at this scale'; get('paper-footer').textContent = printError;
  }
  announce(`${pack.title} · ${pack.review.status === 'reviewed' ? 'Reviewed pack' : 'Unreviewed draft'} · ${pack.features.features.length} features · ${model.labels.length} labels shown${model.suppressedLabels ? `, ${model.suppressedLabels} suppressed to avoid collisions/edges` : ''} · screen rotated ${rotation}°. ${printError}`);
}
function install(value) {
  pack = value; selected = null; rotation = 0;
  screenModels.clear(); paperModels.clear();
  get('scale').value = String(pack.print.scaleDenominator);
  get('feature').replaceChildren(new Option('No feature selected', ''));
  for (const f of pack.features.features) get('feature').add(new Option(`${f.properties.name ?? 'Unnamed feature'} (${f.id})`, f.id));
  get('selection').textContent = 'Choose a road on the map or use the feature list.'; updateView();
}
async function load(operation) {
  job?.abort(); const current = new AbortController(); job = current;
  announce('Reading and validating map…');
  try { const value = await operation(current.signal); if (job === current && !current.signal.aborted) install(value); }
  catch (error) { if (job === current && !current.signal.aborted) announce(`Map not loaded: ${error.message} ${error.errors?.[0]?.path ?? ''} The previous map is retained.`); }
}
get('demo').addEventListener('click', () => load(async (signal) => {
  const response = await fetch('tests/fixtures/street-square.json', { signal });
  if (!response.ok) throw new Error('Synthetic map could not be loaded.');
  return readImport(await response.blob(), signal);
}));
get('import').addEventListener('change', () => { const file = get('import').files[0]; if (file) load((signal) => readImport(file, signal)); get('import').value = ''; });
get('rotate').addEventListener('click', () => { rotation = (rotation + 90) % 360; updateView(); });
for (const id of ['variant', 'heading', 'scale']) get(id).addEventListener('change', updateView);
get('feature').addEventListener('change', () => selectFeature(get('feature').value));
get('print').addEventListener('click', () => { updateView(); if (!get('print').disabled) window.print(); });
let lastWidth = 0;
new ResizeObserver(() => {
  const width = Math.round(get('map').clientWidth);
  if (width !== lastWidth) { lastWidth = width; screenModels.clear(); if (pack) requestAnimationFrame(updateView); }
}).observe(get('map-panel'));
