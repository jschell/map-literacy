import { project, unproject, parseLocation, visibleTiles, wrap, DEFAULT_VIEW, pageFrame } from '../map/explorer.js';

/** Default geographic preview; never installs or modifies a lesson pack. */
export function createExplorer() {
  const get = (id) => document.getElementById(id);
  const viewport = get('explorer-map'), layer = get('explorer-tiles');
  let active = true, zoom = DEFAULT_VIEW.zoom, center = project(DEFAULT_VIEW.lon, DEFAULT_VIEW.lat, zoom), timer, generation = 0, lastView;
  const images = new Map(), pointers = new Map();
  const size = () => [viewport.clientWidth, viewport.clientHeight];
  function normalize() {
    const world = 256 * 2 ** zoom;
    center = [wrap(center[0], world), Math.max(0, Math.min(world, center[1]))];
  }
  function updateFrame() {
    if (viewport.clientWidth === 0 || viewport.clientHeight === 0) return;
    const orientation = get('orientation').value;
    const frame = pageFrame(...size(), orientation);
    lastView = { orientation, frame, width: viewport.clientWidth, height: viewport.clientHeight, center: [...center], zoom };
    const outline = get('explorer-frame');
    outline.style.width = `${frame.width}px`; outline.style.height = `${frame.height}px`;
    outline.dataset.orientation = orientation;
    get('explorer-frame-label').textContent = `US Letter · ${orientation} · print area`;
  }
  function describe() {
    updateFrame();
    const [lon, lat] = unproject(...center, zoom);
    get('explorer-position').textContent = `Center: ${lat.toFixed(5)}, ${lon.toFixed(5)} · Zoom ${zoom}`;
    get('explorer-link').href = `https://www.openstreetmap.org/#map=${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`;
    get('explorer-out').disabled = zoom === 2; get('explorer-in').disabled = zoom === 19;
  }
  function paint() {
    // Print hides the geographic preview; do not request tiles for a hidden viewport.
    if (!active || viewport.clientWidth === 0 || viewport.clientHeight === 0 || matchMedia('print').matches) return;
    clearTimeout(timer); normalize(); describe();
    layer.style.transform = '';
    const current = ++generation, [width, height] = size();
    const tiles = visibleTiles(center, zoom, width, height), keys = new Set(tiles.map((tile) => tile.key));
    for (const [key, img] of images) if (!keys.has(key)) { img.remove(); images.delete(key); }
    for (const tile of tiles) {
      let img = images.get(tile.key);
      if (!img) {
        img = document.createElement('img'); img.alt = ''; img.draggable = false;
        images.set(tile.key, img); layer.append(img); img.src = tile.url;
      }
      img.style.left = `${tile.x}px`; img.style.top = `${tile.y}px`;
      img.onload = img.onerror = () => {
        if (current !== generation) return;
        const failed = [...images.values()].some((image) => image.complete && image.naturalWidth === 0);
        get('explorer-status').textContent = failed ? 'Some map tiles could not load. Check your connection, then Retry map tiles.' : 'Drag to browse. Zoom for street detail.';
      };
    }
    const loaded = [...images.values()].every((image) => image.complete && image.naturalWidth > 0);
    const failed = [...images.values()].some((image) => image.complete && image.naturalWidth === 0);
    get('explorer-status').textContent = failed ? 'Some map tiles could not load. Check your connection, then Retry map tiles.' : loaded ? 'Drag to browse. Zoom for street detail.' : 'Loading visible map tiles…';
  }
  function move(dx, dy) {
    if (!active) return;
    center[0] += dx; center[1] += dy;
    // Immediate visual drag; only request the settled visible view, without prefetch.
    const transform = layer.dataset.offset ? JSON.parse(layer.dataset.offset) : [0, 0];
    transform[0] -= dx; transform[1] -= dy;
    layer.dataset.offset = JSON.stringify(transform);
    layer.style.transform = `translate(${transform[0]}px, ${transform[1]}px)`;
    describe(); clearTimeout(timer); timer = setTimeout(settle, 180);
  }
  function settle() { delete layer.dataset.offset; paint(); }
  function changeZoom(delta, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    if (!active) return;
    const next = Math.max(2, Math.min(19, zoom + delta));
    if (next === zoom) return;
    const factor = 2 ** (next - zoom);
    center = [(center[0] + x - viewport.clientWidth / 2) * factor - x + viewport.clientWidth / 2,
      (center[1] + y - viewport.clientHeight / 2) * factor - y + viewport.clientHeight / 2];
    zoom = next; settle();
  }
  function preparePrint() {
    // beforeprint may run after print CSS hides the viewer: retain its last visible geometry.
    updateFrame();
    if (!lastView) return;
    const { orientation, frame, width, height, center: printCenter, zoom: printZoom } = lastView;
    const output = get('geographic-print'), crop = get('geographic-paper-tiles');
    output.dataset.orientation = orientation;
    const sheetWidth = orientation === 'portrait' ? 195.9 : 259.4;
    const sheetHeight = orientation === 'portrait' ? 259.4 : 195.9;
    const ratio = frame.width / frame.height;
    const mapWidth = Math.min(sheetWidth, (sheetHeight - 10) * ratio), mapHeight = mapWidth / ratio;
    get('geographic-paper-map').style.width = `${mapWidth}mm`;
    get('geographic-paper-map').style.height = `${mapHeight}mm`;
    crop.style.width = `${frame.width}px`; crop.style.height = `${frame.height}px`;
    crop.style.transform = `scale(${mapWidth * 96 / 25.4 / frame.width})`;
    const tiles = visibleTiles(printCenter, printZoom, width, height);
    const copies = [];
    for (const tile of tiles) {
      if (tile.x + 256 <= (width - frame.width) / 2 || tile.x >= (width + frame.width) / 2 ||
          tile.y + 256 <= (height - frame.height) / 2 || tile.y >= (height + frame.height) / 2) continue;
      const image = images.get(tile.key)?.cloneNode();
      if (!image) continue;
      image.style.left = `${tile.x - (width - frame.width) / 2}px`;
      image.style.top = `${tile.y - (height - frame.height) / 2}px`;
      copies.push(image);
    }
    crop.replaceChildren(...copies);
    const [lon, lat] = unproject(...printCenter, printZoom);
    get('geographic-paper-credit').textContent = `© OpenStreetMap contributors · openstreetmap.org/copyright · ${lat.toFixed(5)}, ${lon.toFixed(5)} · Zoom ${printZoom}`;
    output.dataset.center = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  }
  let printing = false;
  get('explorer-print').onclick = async () => {
    if (printing) return;
    printing = true; get('explorer-print').disabled = true;
    let timeout;
    try {
      settle(); preparePrint();
      const ready = Promise.all([...get('geographic-paper-tiles').children].map((image) => image.decode()));
      await Promise.race([ready, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 10000); })]);
      document.body.dataset.printTarget = 'geographic';
      window.print();
    } catch {
      get('explorer-status').textContent = 'Map tiles could not finish loading for print. Retry map tiles, then Print this map.';
    } finally { clearTimeout(timeout); printing = false; get('explorer-print').disabled = false; }
  };
  window.addEventListener('beforeprint', () => {
    if (document.body.dataset.printTarget === 'lesson' || document.body.dataset.printTarget === 'geographic') return;
    if (!get('map').querySelector('svg')) {
      document.body.dataset.printTarget = 'geographic'; preparePrint();
    }
  });
  window.addEventListener('afterprint', () => { delete document.body.dataset.printTarget; });
  get('explorer-in').onclick = () => changeZoom(1);
  get('explorer-out').onclick = () => changeZoom(-1);
  get('explorer-world').onclick = () => { zoom = 2; center = project(0, 0, zoom); settle(); };
  get('explorer-retry').onclick = () => { images.clear(); layer.replaceChildren(); settle(); };
  get('explorer-jump').onsubmit = (event) => {
    event.preventDefault();
    try {
      const place = parseLocation(get('explorer-location').value);
      zoom = place.zoom; center = project(place.lon, place.lat, zoom); settle(); viewport.focus();
    } catch (error) { get('explorer-status').textContent = error.message; get('explorer-location').focus(); }
  };
  get('explorer-place').oninput = () => {
    get('explorer-search').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(get('explorer-place').value.trim())}`;
  };
  viewport.onkeydown = (event) => {
    if (event.target !== viewport) return;
    const delta = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }[event.key];
    if (delta) { event.preventDefault(); move(...delta); }
    else if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); changeZoom(event.key === '-' ? -1 : 1); }
  };
  viewport.onwheel = (event) => {
    // Focus required so scrolling down the page does not unexpectedly zoom the map.
    if (document.activeElement !== viewport) return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 2) return;
    const rect = viewport.getBoundingClientRect(); changeZoom(event.deltaY < 0 ? 1 : -1, event.clientX - rect.left, event.clientY - rect.top);
  };
  viewport.onpointerdown = (event) => {
    if (event.button !== 0 || event.target.closest('a')) return;
    viewport.focus(); viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
  };
  viewport.onpointermove = (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(previous[0] - other[0], previous[1] - other[1]);
      const newDistance = Math.hypot(event.clientX - other[0], event.clientY - other[1]);
      if (oldDistance > 0 && Math.abs(Math.log2(newDistance / oldDistance)) > 0.3) {
        const rect = viewport.getBoundingClientRect();
        changeZoom(newDistance > oldDistance ? 1 : -1, (event.clientX + other[0]) / 2 - rect.left, (event.clientY + other[1]) / 2 - rect.top);
      } else return;
    } else move(previous[0] - event.clientX, previous[1] - event.clientY);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
  };
  const release = (event) => { pointers.delete(event.pointerId); settle(); };
  viewport.onpointerup = release; viewport.onpointercancel = release;
  new ResizeObserver(() => { if (active) settle(); }).observe(viewport);
  paint();
  return { updateFrame };
}
