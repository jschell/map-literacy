import { CONTOUR_METADATA, UNVERIFIED_CONTOURS, contourMetadataRequests, readContourMetadata, summarizeContours } from '../map/contour-metadata.js';
import { boundedTerrainImage, terrainRequest, TERRAIN_LIMITS } from '../map/terrain.js';
import { monochrome } from '../print/monochrome.js';

/** Bounded current-frame images only. Stale or incomplete layers never become printable. */
export function createGeographicTerrain(get, onChange) {
  let generation = 0, controller, completed, pendingKey, requested, timer;
  let metadata;
  const holder = get('explorer-terrain');
  function invalidate({ keepPreview = false } = {}) {
    metadata?.controller.abort(); clearTimeout(metadata?.timer); metadata = null;
    get('explorer-contour-details').textContent = `${UNVERIFIED_CONTOURS}; details appear after this area loads.`;
    generation++; controller?.abort(); controller = null; clearTimeout(timer); pendingKey = null; requested = null; completed = null; if (!keepPreview) holder.replaceChildren(); onChange();
  }
  const snapshot = () => completed && requested === completed.key ? completed : null;
  function render({ appearance, contrast }) {
    const result = snapshot(); if (!result) return;
    const canvas = document.createElement('canvas'); canvas.width = result.canvas.width; canvas.height = result.canvas.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(result.canvas, 0, 0);
    if (appearance === 'bw') { const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height); monochrome(pixels.data, contrast); ctx.putImageData(pixels, 0, 0); }
    canvas.setAttribute('aria-label', `USGS contours, water, ${result.roads === 'streets' ? 'streets' : 'highways'} and trails`); canvas.setAttribute('role', 'img');
    holder.replaceChildren(canvas);
  }
  async function decode(blob, pixels, signal) {
    const url = URL.createObjectURL(blob), image = new Image();
    try {
      await new Promise((resolve, reject) => {
        const abort = () => { image.src = ''; reject(new Error('Terrain request canceled.')); };
        image.onload = () => { signal.removeEventListener('abort', abort); resolve(); };
        image.onerror = () => { signal.removeEventListener('abort', abort); reject(new Error('Terrain image could not be decoded.')); };
        if (signal.aborted) return abort();
        signal.addEventListener('abort', abort, { once: true }); image.src = url;
      });
      if (image.naturalWidth !== pixels[0] || image.naturalHeight !== pixels[1]) throw new Error('Terrain source returned unexpected image dimensions.');
      return image;
    } finally { URL.revokeObjectURL(url); }
  }
  function metadataFor(request) {
    const key = JSON.stringify(request.bbox);
    if (metadata?.key === key) return metadata.value;
    metadata?.controller.abort(); clearTimeout(metadata?.timer);
    const entry = { key, controller: new AbortController(), value: { kind: 'loading', credit: `${UNVERIFIED_CONTOURS} (source details pending).`, text: `${UNVERIFIED_CONTOURS}; source details loading. Printing is available.` } };
    metadata = entry;
    entry.timer = setTimeout(() => entry.controller.abort(), CONTOUR_METADATA.timeoutMs);
    Promise.all(contourMetadataRequests(request.bbox).map(async ({ id, url }) => {
      const response = await fetch(url, { signal: entry.controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      return { id, data: await readContourMetadata(response) };
    })).then(summarizeContours).catch(() => {
      entry.controller.abort();
      return { kind: 'unavailable', credit: `${UNVERIFIED_CONTOURS} (source details unavailable).`, text: `${UNVERIFIED_CONTOURS}; source details unavailable or incomplete. The map can still print. Retry map to try again.` };
    }).then((value) => {
      if (metadata !== entry) return;
      entry.value = value;
      if (completed?.metadataKey === key) {
        completed = { ...completed, metadata: value };
        get('explorer-contour-details').textContent = value.text;
      }
    }).finally(() => clearTimeout(entry.timer));
    return entry.value;
  }
  function update(view, options, { retry = false } = {}) {
    let request;
    try { request = terrainRequest(view, options); }
    catch (error) { invalidate(); get('explorer-status').textContent = error.message; return; }
    if (metadata && metadata.key !== JSON.stringify(request.bbox)) { metadata.controller.abort(); clearTimeout(metadata.timer); metadata = null; }
    requested = request.key;
    if (!retry && snapshot()) { render(options); onChange(); return; }
    if (!retry && pendingKey === request.key) return;
    generation++; const current = generation;
    controller?.abort(); clearTimeout(timer); controller = new AbortController(); const signal = controller.signal;
    completed = null; pendingKey = request.key; holder.replaceChildren(); onChange();
    get('explorer-contour-details').textContent = `${UNVERIFIED_CONTOURS}; details appear after this area loads.`;
    get('explorer-status').textContent = 'Loading terrain layers for the outlined area…';
    timer = setTimeout(() => controller?.abort(), TERRAIN_LIMITS.timeoutMs);
    Promise.all(request.layers.map(async (layer) => {
      const response = await fetch(layer.url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      const blob = await boundedTerrainImage(response);
      return { id: layer.id, image: await decode(blob, request.pixels, signal) };
    })).then((layers) => {
      if (current !== generation || signal.aborted) return;
      const canvas = document.createElement('canvas'); [canvas.width, canvas.height] = request.pixels;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot prepare terrain images.');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const { id, image } of layers) {
        ctx.globalAlpha = id === 'relief' ? .18 : 1;
        // Cached hydro's white land background must not obscure optional light relief.
        ctx.globalCompositeOperation = id === 'water' ? 'multiply' : 'source-over';
        ctx.drawImage(image, 0, 0);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      completed = { key: request.key, canvas, view, layers: request.layers.map((l) => l.id), roads: request.roads, metadataKey: JSON.stringify(request.bbox), metadata: metadataFor(request) };
      get('explorer-contour-details').textContent = completed.metadata.text;
      render({ appearance: get('explorer-appearance').value, contrast: get('explorer-topo-contrast').value });
      get('explorer-status').textContent = `Terrain ready: contours, water, ${request.roads === 'streets' ? 'streets' : 'highways'} and trails. Coverage varies; zoom in for source labels.`;
      onChange();
    }).catch((error) => {
      if (current !== generation) return;
      controller?.abort(); completed = null; holder.replaceChildren();
      get('explorer-status').textContent = signal.aborted && error.name === 'AbortError' ? 'Terrain layers timed out or were canceled. Retry map.' : `${error.message} Retry map.`;
      onChange();
    }).finally(() => { if (current === generation) { clearTimeout(timer); pendingKey = null; } });
  }
  return { update, invalidate, snapshot, render };
}
