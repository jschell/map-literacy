import { geographicPdf } from '../export/geographic-pdf.js';
import { BASEMAPS, USGS_ACKNOWLEDGMENT, rasterFurniture } from '../map/basemaps.js';
import { geographicView } from '../map/geographic.js';
import { createGeographicStreets } from './geographic-streets.js';
import { project, unproject, parseLocation, visibleTiles, wrap, DEFAULT_VIEW, pageFrame } from '../map/explorer.js';

/** Default geographic preview; never installs or modifies a lesson pack. */
export function createExplorer() {
  const get = (id) => document.getElementById(id);
  const viewport = get('explorer-map'), layer = get('explorer-tiles');
  let basemap = 'street';
  let active = true, zoom = DEFAULT_VIEW.zoom, center = project(DEFAULT_VIEW.lon, DEFAULT_VIEW.lat, zoom), timer, generation = 0, lastView;
  const images = new Map(), pointers = new Map();
  const streets = createGeographicStreets(get, () => updatePrintAvailability());
  let displayScale = 1, marking = '', pointerStart = null, dragged = false;
  const size = () => [viewport.clientWidth, viewport.clientHeight];
  function tileSnapshot() {
    if (!lastView || lastView.zoom !== zoom || lastView.orientation !== get('orientation').value || lastView.center.some((value, i) => value !== center[i])) return null;
    const view = geographicView(center, zoom, lastView.orientation);
    const tiles = visibleTiles(center, zoom, view.worldWidth, view.worldHeight, basemap);
    if (!tiles.length || !tiles.every((tile) => { const image = images.get(tile.key); return image?.complete && image.naturalWidth > 0; })) return null;
    return { view, tiles };
  }
  function currentVector() {
    const view = streets.view(), focus = unproject(...center, zoom);
    return basemap === 'street' && streets.ready() && view.zoom === zoom && view.orientation === get('orientation').value && view.center.every((value, i) => Math.abs(value - focus[i]) <= 1e-9);
  }
  function updatePrintAvailability() {
    const vector = currentVector(), tiles = tileSnapshot();
    if (basemap === 'topo') {
      get('explorer-print').disabled = !tiles; get('explorer-pdf').disabled = !tiles;
      get('explorer-print-status').textContent = tiles ? 'Ready to print the USGS topographic map. Raster contours and labels are fixed.' : 'Print is waiting for USGS topographic tiles for this view.';
      return;
    }
    get('explorer-pdf').disabled = !vector && !tiles;
    get('explorer-print').disabled = !vector && !tiles;
    get('explorer-print-status').textContent = vector ? 'Ready to print the vector street map.' : tiles ? 'Ready to print the visible tile map. Vector street data is not ready; tile names are fixed and practice markings are unavailable.' : 'Print is waiting for map tiles or vector streets for this view.';
  }
  function normalize() {
    const world = 256 * 2 ** zoom;
    center = [wrap(center[0], world), Math.max(0, Math.min(world, center[1]))];
  }
  function updateFrame({ sourceUpdate = true } = {}) {
    if (viewport.clientWidth === 0 || viewport.clientHeight === 0) return;
    const orientation = get('orientation').value;
    const frame = pageFrame(...size(), orientation);
    lastView = { orientation, frame, width: viewport.clientWidth, height: viewport.clientHeight, center: [...center], zoom };
    const outline = get('explorer-frame');
    outline.style.width = `${frame.width}px`; outline.style.height = `${frame.height}px`;
    outline.dataset.orientation = orientation;
    get('explorer-frame-label').textContent = `US Letter · ${orientation} · print area`;
    try {
      const streetView = geographicView(center, zoom, orientation);
      displayScale = get('explorer-frame').clientWidth / streetView.worldWidth;
      if (sourceUpdate && basemap === 'street') streets.update(streetView);
    } catch (error) { streets.invalidate(); get('explorer-street-status').textContent = error.message; }
  }
  function describe({ sourceUpdate = true } = {}) {
    updateFrame({ sourceUpdate });
    const [lon, lat] = unproject(...center, zoom);
    get('explorer-position').textContent = `Center: ${lat.toFixed(5)}, ${lon.toFixed(5)} · Zoom ${zoom}`;
    get('explorer-link').href = `https://www.openstreetmap.org/#map=${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`;
    get('explorer-out').disabled = zoom === 2; get('explorer-in').disabled = zoom === BASEMAPS[basemap].maxZoom;
  }
  function paint() {
    // Print hides the geographic preview; do not request tiles for a hidden viewport.
    if (!active || viewport.clientWidth === 0 || viewport.clientHeight === 0 || matchMedia('print').matches) return;
    clearTimeout(timer); normalize(); describe();
    layer.dataset.basemap = basemap; layer.dataset.appearance = get('explorer-appearance').value;
    layer.style.transformOrigin = '0 0';
    layer.style.transform = `scale(${displayScale})`;
    const current = ++generation, [width, height] = size();
    const tiles = visibleTiles(center, zoom, width / displayScale, height / displayScale, basemap), keys = new Set(tiles.map((tile) => tile.key));
    for (const [key, img] of images) if (!keys.has(key)) { img.remove(); images.delete(key); }
    for (const tile of tiles) {
      let img = images.get(tile.key);
      if (!img) {
        img = document.createElement('img'); img.alt = ''; img.draggable = false;
        images.set(tile.key, img); layer.append(img); img.crossOrigin = 'anonymous'; img.src = tile.url;
      }
      img.style.left = `${tile.x}px`; img.style.top = `${tile.y}px`;
      img.onload = img.onerror = () => {
        if (current !== generation) return;
        updatePrintAvailability();
        const failed = [...images.values()].some((image) => image.complete && image.naturalWidth === 0);
        get('explorer-status').textContent = failed ? 'Some map tiles could not load. Check your connection, then Retry map tiles.' : (basemap === 'topo' ? 'USGS Topo: drag to browse; zoom for contour detail.' : 'Drag to browse. Zoom for street detail.');
      };
    }
    updatePrintAvailability();
    const loaded = [...images.values()].every((image) => image.complete && image.naturalWidth > 0);
    const failed = [...images.values()].some((image) => image.complete && image.naturalWidth === 0);
    get('explorer-status').textContent = failed ? 'Some map tiles could not load. Check your connection, then Retry map tiles.' : loaded ? (basemap === 'topo' ? 'USGS Topo: drag to browse; zoom for contour detail.' : 'Drag to browse. Zoom for street detail.') : 'Loading visible map tiles…';
  }
  function move(dx, dy) {
    if (!active) return;
    center[0] += dx / displayScale; center[1] += dy / displayScale;
    get('explorer-print').disabled = true; get('explorer-pdf').disabled = true;
    get('explorer-print-status').textContent = 'Move the map to choose an area; printing is ready when the new view loads.';
    // Immediate visual drag; only request the settled visible view, without prefetch.
    const transform = layer.dataset.offset ? JSON.parse(layer.dataset.offset) : [0, 0];
    transform[0] -= dx; transform[1] -= dy;
    layer.dataset.offset = JSON.stringify(transform);
    layer.style.transform = `translate(${transform[0]}px, ${transform[1]}px) scale(${displayScale})`;
    const preview = get('explorer-vector').querySelector('svg');
    if (preview) preview.style.transform = `translate(${transform[0]}px, ${transform[1]}px)`;
    describe({ sourceUpdate: false }); clearTimeout(timer); timer = setTimeout(settle, 180);
  }
  function settle() {
    delete layer.dataset.offset;
    const preview = get('explorer-vector').querySelector('svg'); if (preview) preview.style.transform = '';
    paint();
  }
  function changeZoom(delta, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    if (!active) return;
    const next = Math.max(2, Math.min(BASEMAPS[basemap].maxZoom, zoom + delta));
    if (next === zoom) return;
    const factor = 2 ** (next - zoom);
    center = [(center[0] + (x - viewport.clientWidth / 2) / displayScale) * factor - (x - viewport.clientWidth / 2) / displayScale,
      (center[1] + (y - viewport.clientHeight / 2) / displayScale) * factor - (y - viewport.clientHeight / 2) / displayScale];
    zoom = next; settle();
  }
  function preparePrint() {
    const snapshot = basemap === 'street' ? streets.snapshot() : null;
    const focus = unproject(...center, zoom);
    if (!snapshot || snapshot.model.view.zoom !== zoom || snapshot.model.view.orientation !== get('orientation').value || snapshot.model.view.center.some((value, i) => Math.abs(value - focus[i]) > 1e-9)) {
      return prepareTilePrint();
    }
    get('geographic-print-status').textContent = '';
    delete get('geographic-paper-tiles').dataset.rendering;
    const { view } = snapshot.model;
    get('geographic-print').dataset.orientation = view.orientation;
    document.body.dataset.printOrientation = view.orientation;
    get('geographic-print').dataset.center = `${view.center[1].toFixed(5)},${view.center[0].toFixed(5)}`;
    get('geographic-paper-map').style.width = `${view.width}mm`;
    get('geographic-paper-map').style.height = `${view.height}mm`;
    get('geographic-paper-tiles').replaceChildren(snapshot.svg);
    const coverage = `${snapshot.model.labels.length}/${snapshot.model.availableNames} street names`;
    get('geographic-paper-credit').textContent = `© OpenStreetMap contributors · openstreetmap.org/copyright · ${coverage} · ${snapshot.provenance.sourceAt ? 'Data ' + snapshot.provenance.sourceAt.slice(0, 10) : 'Fetched ' + snapshot.provenance.fetchedAt.slice(0, 10)} · source ${snapshot.provenance.sha256.slice(0, 12)}`;
    return true;
  }
  function prepareTilePrint() {
    const snapshot = tileSnapshot();
    get('geographic-paper-tiles').replaceChildren();
    if (!snapshot) return false;
    const { view, tiles } = snapshot, holder = get('geographic-paper-tiles');
    holder.dataset.rendering = 'tiles';
    holder.dataset.basemap = basemap;
    holder.dataset.appearance = get('explorer-appearance').value;
    get('geographic-print').dataset.orientation = view.orientation;
    document.body.dataset.printOrientation = view.orientation;
    get('geographic-print').dataset.center = `${view.center[1].toFixed(5)},${view.center[0].toFixed(5)}`;
    get('geographic-paper-map').style.width = `${view.width}mm`;
    get('geographic-paper-map').style.height = `${view.height}mm`;
    for (const tile of tiles) {
      const loaded = images.get(tile.key);
      let image;
      if (get('explorer-appearance').value === 'bw') {
        image = document.createElement('canvas'); image.width = 256; image.height = 256;
        const context = image.getContext('2d');
        if (!context) throw new Error('This browser cannot prepare B&W map tiles. Choose Color or retry the vector map.');
        context.drawImage(loaded, 0, 0, 256, 256);
        const pixels = context.getImageData(0, 0, 256, 256);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const gray = Math.round(.2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2]);
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
        }
        context.putImageData(pixels, 0, 0);
      } else image = loaded.cloneNode();
      image.style.left = `${tile.x / view.worldWidth * view.width}mm`;
      image.style.top = `${tile.y / view.worldHeight * view.height}mm`;
      image.style.width = `${256 / view.worldWidth * view.width}mm`;
      image.style.height = `${256 / view.worldHeight * view.height}mm`;
      holder.append(image);
    }
    get('geographic-print-status').textContent = '';
    if (basemap === 'topo') holder.append(rasterFurniture(document, view));
    get('geographic-paper-credit').textContent = basemap === 'topo' ? `${USGS_ACKNOWLEDGMENT} USGS Topo · raster contours; units as labeled · approximate center scale 1:${Math.round(view.scaleDenominator).toLocaleString()} · viewed ${new Date().toISOString().slice(0, 10)}.` : '© OpenStreetMap contributors · openstreetmap.org/copyright · Tile map: fixed names; no practice markings. Vector street data unavailable.';
    return true;
  }
  let pdfUrl, makingPdf = false;
  get('explorer-pdf').onclick = async () => {
    if (makingPdf) return;
    makingPdf = true; get('explorer-pdf').setAttribute('aria-busy', 'true');
    const link = get('explorer-pdf-link'); link.hidden = true;
    try {
      if (!preparePrint()) throw new Error('The current map is not ready. Retry PDF download.');
      const view = geographicView([...center], zoom, get('orientation').value);
      const bytes = await geographicPdf(document, { view, children: [...get('geographic-paper-tiles').children], credit: get('geographic-paper-credit').textContent });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      link.href = pdfUrl; link.download = `map-literacy-${view.orientation}.pdf`; link.hidden = false;
      get('explorer-pdf-status').textContent = `PDF ready: US Letter ${view.orientation}. Save the generated snapshot below, then print it at actual size. Map and text are rendered at 200 dpi; source tile detail is unchanged.`;
      link.click();
    } catch (error) { get('explorer-pdf-status').textContent = error.message || 'PDF could not be prepared. Retry PDF download.'; }
    finally { makingPdf = false; get('explorer-pdf').removeAttribute('aria-busy'); }
  };
  get('explorer-print').onclick = () => {
    // Keep the native print call in the user's click. Do not await hidden image decode.
    let prepared;
    try { prepared = preparePrint(); }
    catch { get('geographic-paper-tiles').replaceChildren(); get('explorer-status').textContent = 'B&W map tiles could not be prepared. Choose Color or retry the vector map.'; return; }
    if (!prepared) {
      get('explorer-status').textContent = 'The current map is still loading or unavailable. Retry map when ready.';
      return;
    }
    document.body.dataset.printTarget = 'geographic';
    get('explorer-status').textContent = 'Opening the browser print dialog…';
    try { window.print(); }
    catch { get('explorer-status').textContent = 'The browser could not open printing. Use its Print command for this map.'; }
  };
  window.addEventListener('beforeprint', () => {
    if (document.body.dataset.printTarget === 'lesson') return;
    if (document.body.dataset.printTarget === 'geographic' || !get('map').querySelector('svg')) {
      document.body.dataset.printTarget = 'geographic';
      get('geographic-print').dataset.orientation = get('orientation').value;
      document.body.dataset.printOrientation = get('orientation').value;
      if (!preparePrint()) get('geographic-print-status').textContent = 'The current map is not ready for this area. Close printing and retry the map.';
    }
  });
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.printTarget;
    delete document.body.dataset.printOrientation;
    get('explorer-status').textContent = 'Print dialog closed. Drag to browse or print again.';
  });
  get('explorer-in').onclick = () => changeZoom(1);
  get('explorer-out').onclick = () => changeZoom(-1);
  get('explorer-world').onclick = () => { zoom = 2; center = project(0, 0, zoom); settle(); };
  get('explorer-retry').onclick = () => { images.clear(); layer.replaceChildren(); settle(); try { if (basemap === 'street') streets.update(geographicView(center, zoom, get('orientation').value), { retry: true }); } catch {} };
  get('explorer-jump').onsubmit = (event) => {
    event.preventDefault();
    try {
      const place = parseLocation(get('explorer-location').value);
      zoom = Math.min(place.zoom, BASEMAPS[basemap].maxZoom); center = project(place.lon, place.lat, zoom); settle(); viewport.focus();
    } catch (error) { get('explorer-status').textContent = error.message; get('explorer-location').focus(); }
  };
  get('explorer-place').oninput = () => {
    get('explorer-search').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(get('explorer-place').value.trim())}`;
  };
  viewport.onkeydown = (event) => {
    if (event.target !== viewport) return;
    const delta = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }[event.key];
    if (event.key === 'Enter' && marking) { event.preventDefault(); settle(); if (streets.ready()) streets.annotate(streets.view().center, marking); }
    else if (delta) { event.preventDefault(); move(...delta); }
    else if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); changeZoom(event.key === '-' ? -1 : 1); }
  };
  viewport.onwheel = (event) => {
    // Focus required so scrolling down the page does not unexpectedly zoom the map.
    if (document.activeElement !== viewport) return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 2) return;
    const rect = viewport.getBoundingClientRect(); changeZoom(event.deltaY < 0 ? 1 : -1, event.clientX - rect.left - viewport.clientLeft, event.clientY - rect.top - viewport.clientTop);
  };
  viewport.onpointerdown = (event) => {
    if (event.button !== 0 || event.target.closest('a')) return;
    viewport.focus(); pointerStart = [event.clientX, event.clientY]; dragged = false; viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
  };
  viewport.onpointermove = (event) => {
    const previous = pointers.get(event.pointerId);
    if (pointerStart && Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) dragged = true;
    if (!previous) return;
    const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(previous[0] - other[0], previous[1] - other[1]);
      const newDistance = Math.hypot(event.clientX - other[0], event.clientY - other[1]);
      if (oldDistance > 0 && Math.abs(Math.log2(newDistance / oldDistance)) > 0.3) {
        const rect = viewport.getBoundingClientRect();
        changeZoom(newDistance > oldDistance ? 1 : -1, (event.clientX + other[0]) / 2 - rect.left - viewport.clientLeft, (event.clientY + other[1]) / 2 - rect.top - viewport.clientTop);
      } else return;
    } else move(previous[0] - event.clientX, previous[1] - event.clientY);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
  };
  const release = (event) => { pointers.delete(event.pointerId); if (dragged) settle(); };
  viewport.onpointerup = release; viewport.onpointercancel = release;
  new ResizeObserver(() => { if (active) settle(); }).observe(viewport);
  for (const kind of ['start', 'end', 'route']) get(`explorer-mark-${kind}`).onclick = () => {
    marking = marking === kind ? '' : kind;
    for (const value of ['start', 'end', 'route']) get(`explorer-mark-${value}`).setAttribute('aria-pressed', String(marking === value));
  };
  viewport.addEventListener('click', (event) => {
    if (basemap !== 'street' || !marking || dragged || !streets.ready() || event.target.closest('a')) return;
    settle();
    const frame = get('explorer-vector').getBoundingClientRect(), view = streets.view();
    const x = event.clientX - frame.left, y = event.clientY - frame.top;
    if (x < 0 || y < 0 || x > frame.width || y > frame.height) return;
    streets.annotate(view.inverse([x / frame.width * view.width, y / frame.height * view.height]), marking);
  });
  get('explorer-appearance').addEventListener('change', () => { layer.dataset.appearance = get('explorer-appearance').value; });
  get('explorer-basemap').onchange = () => {
    const focus = unproject(...center, zoom);
    basemap = get('explorer-basemap').value;
    zoom = Math.min(zoom, BASEMAPS[basemap].maxZoom); center = project(...focus, zoom);
    generation++; images.clear(); layer.replaceChildren(); streets.invalidate();
    delete layer.dataset.offset;
    const topo = basemap === 'topo';
    get('explorer-topo-help').hidden = !topo;
    get('explorer-street-status').hidden = topo;
    get('explorer-vector').hidden = topo;
    for (const id of ['explorer-labels', 'explorer-landmarks', 'explorer-heading', 'explorer-mark-start', 'explorer-mark-end', 'explorer-mark-route', 'explorer-clear']) get(id).disabled = topo;
    const credit = BASEMAPS[basemap]; get('explorer-credit').textContent = credit.credit; get('explorer-credit').href = credit.href;
    settle();
  };
  paint();
  // Orientation/preferences can change the geographic extent without resizing the viewport.
  // Refresh tile coverage and readiness, not just the outline.
  return { updateFrame: settle };
}
