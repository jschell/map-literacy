import { acquireGeographicSource, geographicQuery } from '../data/geographic-source.js';
import { geographicModel } from '../map/geographic.js';
import { renderGeographic } from '../map/geographic-render.js';
const contains = (outer, inner) => outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
export function createGeographicStreets(get) {
  let view, source, currentKey, timer, controller, version = 0, nextRequest = 0, model, svg, previewWidth;
  const cache = [], annotations = [];
  const metrics = document.createElement('canvas').getContext('2d'); if (metrics) metrics.font = '8.5pt Arial';
  const measureText = (name) => metrics ? metrics.measureText(name).width * 25.4 / 96 : name.length * (8.5 * 25.4 / 72) * .53;
  const status = (text) => { get('explorer-street-status').textContent = text; };
  function render() {
    if (!source || !view) return;
    model = geographicModel(source.features, view, { labels: get('explorer-labels').value, landmarks: get('explorer-landmarks').checked, measureText });
    svg = renderGeographic(document, model, { appearance: get('explorer-appearance').value, annotations, heading: get('explorer-heading').value === '' ? null : Number(get('explorer-heading').value) });
    previewWidth = get('explorer-frame').clientWidth;
    const minimumTextSize = 12 * view.width / Math.max(1, previewWidth);
    const fontSize = Math.max(8.5 * 25.4 / 72, minimumTextSize);
    const previewModel = geographicModel(source.features, view, { labels: get('explorer-labels').value, landmarks: get('explorer-landmarks').checked, fontSize, measureText: (name) => measureText(name) * fontSize / (8.5 * 25.4 / 72) });
    const preview = renderGeographic(document, previewModel, { appearance: get('explorer-appearance').value, annotations, heading: get('explorer-heading').value === '' ? null : Number(get('explorer-heading').value), minimumTextSize });
    get('explorer-vector').replaceChildren(preview); get('explorer-print').disabled = false;
    get('explorer-svg').disabled = false; get('explorer-source').disabled = false;
    status(`Print: ${model.labels.length}/${model.availableNames} street names · Preview: ${previewModel.labels.length} · ${model.unnamed} unnamed source roads/paths.${model.suppressed ? ` ${model.suppressed} names did not fit; zoom in for more room.` : ''} North up · 1:${Math.round(view.scaleDenominator).toLocaleString()}.`);
  }
  async function request(token) {
    if (token !== version) return;
    if (Date.now() < nextRequest) { timer = setTimeout(() => request(token), Math.min(60000, nextRequest - Date.now())); return; }
    controller = new AbortController(); const active = controller;
    const timeout = setTimeout(() => active.abort(), 25000);
    nextRequest = Date.now() + 5000;
    const bounds = view.bounds.map((v, i) => v + (i < 2 ? -1 : 1) * (view.bounds[i % 2 + 2] - view.bounds[i % 2]) * .1);
    try {
      const result = await acquireGeographicSource(bounds, { signal: active.signal });
      if (token !== version) return;
      source = result; cache.unshift(result); if (cache.length > 3) cache.pop(); render();
    } catch (error) {
      if (token !== version) return;
      if (error.retryMs) nextRequest = Math.max(nextRequest, Date.now() + error.retryMs);
      status(active.signal.aborted ? 'Street source timed out. Retry map.' : error.message);
    } finally { clearTimeout(timeout); if (controller === active) controller = null; }
  }
  function update(next, { retry = false } = {}) {
    const key = JSON.stringify([next.center, next.zoom, next.orientation]);
    view = next;
    if (key === currentKey && !retry) { if (source && svg) { if (previewWidth !== get('explorer-frame').clientWidth) render(); else get('explorer-print').disabled = false; } return; }
    currentKey = key; version++; controller?.abort(); clearTimeout(timer);
    source = cache.find((entry) => contains(entry.provenance.bounds, view.bounds));
    if (source) { render(); return; }
    get('explorer-vector').replaceChildren(); get('geographic-paper-tiles').replaceChildren(); get('explorer-print').disabled = true; get('explorer-svg').disabled = true; get('explorer-source').disabled = true;
    try { geographicQuery(view.bounds); } catch (error) { status(error.message); return; }
    status('Loading street geometry and names…');
    timer = setTimeout(() => request(version), 650);
  }
  for (const id of ['explorer-appearance', 'explorer-labels', 'explorer-landmarks', 'explorer-heading']) get(id).addEventListener('change', render);
  const download = (content, type, name) => {
    const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  get('explorer-svg').onclick = () => {
    if (!svg || !source) return;
    const exported = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({ xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${view.width} ${view.height + 10}`, width: `${view.width}mm`, height: `${view.height + 10}mm` })) exported.setAttribute(name, value);
    const copy = svg.cloneNode(true); copy.setAttribute('width', view.width); copy.setAttribute('height', view.height);
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata'); metadata.textContent = JSON.stringify(source.provenance);
    const credit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    for (const [name, value] of Object.entries({ x: 2, y: view.height + 5, 'font-size': 3, 'font-family': 'Arial, sans-serif', fill: 'black' })) credit.setAttribute(name, value);
    credit.textContent = '© OpenStreetMap contributors · openstreetmap.org/copyright';
    exported.append(metadata, copy, credit); download(new XMLSerializer().serializeToString(exported), 'image/svg+xml', 'street-map.svg');
  };
  get('explorer-source').onclick = () => { if (source) download(JSON.stringify({ format: 'map-literacy-geographic-source-v1', ...source, view: { center: view.center, zoom: view.zoom, orientation: view.orientation, appearance: get('explorer-appearance').value, labels: get('explorer-labels').value, landmarkNames: get('explorer-landmarks').checked, heading: get('explorer-heading').value === '' ? null : Number(get('explorer-heading').value) }, annotations }, null, 2), 'application/json', 'street-map-source.json'); };
  get('explorer-clear').onclick = () => { annotations.length = 0; render(); };
  return {
    update,
    ready: () => Boolean(source && svg),
    view: () => view,
    snapshot: () => {
      if (!source || !svg) return null;
      const copy = svg.cloneNode(true); copy.querySelector('clipPath').id = 'geographic-paper-clip'; copy.querySelector('[clip-path]').setAttribute('clip-path', 'url(#geographic-paper-clip)');
      return { svg: copy, model, provenance: source.provenance };
    },
    annotate(coordinate, kind) {
      if (!source || annotations.length >= 100) return;
      if (kind !== 'route') { const index = annotations.findIndex((a) => a.kind === kind); if (index !== -1) annotations.splice(index, 1); }
      annotations.push({ coordinate, kind }); render();
    },
    invalidate() { currentKey = null; version++; controller?.abort(); clearTimeout(timer); source = null; svg = null; get('explorer-vector').replaceChildren(); get('geographic-paper-tiles').replaceChildren(); get('explorer-print').disabled = true; get('explorer-svg').disabled = true; get('explorer-source').disabled = true; }
  };
}
