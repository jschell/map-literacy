// EPSG:3857 uses the WGS84 semi-major axis, not the mean Earth radius.
const MERCATOR_RADIUS_M = 6378137;

const origin = Math.PI * MERCATOR_RADIUS_M;
export const TERRAIN_LIMITS = Object.freeze({ minZoom: 13, maxZoom: 16, maxBytes: 8 * 1024 * 1024, timeoutMs: 20000 });
/** One common EPSG:3857 envelope and exact Letter aspect for every source layer. */
export function terrainRequest(view, { relief = false, roads = 'streets' } = {}) {
  if (!Number.isInteger(view.zoom) || view.zoom < 13 || view.zoom > 16 || !['portrait', 'landscape'].includes(view.orientation) || !Array.isArray(view.center) || view.center.length !== 2 || !view.center.every(Number.isFinite) || typeof relief !== 'boolean' || !['streets','sparse'].includes(roads)) throw new Error('Terrain detail needs zoom 13–16.');
  const [lon, lat] = view.center;
  if (Math.abs(lon) >= 180 || Math.abs(lat) > 85) throw new Error('Terrain view is outside the supported map extent.');
  const x = lon / 180 * origin, y = MERCATOR_RADIUS_M * Math.asinh(Math.tan(lat * Math.PI / 180));
  const width = view.worldWidth * origin * 2 / (256 * 2 ** view.zoom), height = view.worldHeight * origin * 2 / (256 * 2 ** view.zoom);
  const bbox = [x - width / 2, y - height / 2, x + width / 2, y + height / 2];
  if (bbox.some((n) => !Number.isFinite(n) || Math.abs(n) > origin)) throw new Error('Terrain view cannot cross the map edge.');
  if (![view.worldWidth, view.worldHeight].every((n) => Number.isFinite(n) && n > 0 && n <= 640)) throw new Error('Invalid terrain view dimensions.');
  const pixels = view.orientation === 'landscape' ? [1980, 1530] : [1530, 1980];
  if (Math.abs(width / height - pixels[0] / pixels[1]) > 1e-9) throw new Error('Terrain view must match the Letter aspect ratio.');
  const common = { bbox: bbox.join(','), bboxSR: '3857', imageSR: '3857', size: pixels.join(','), dpi: '200', format: 'png32', transparent: 'true', f: 'image' };
  const layer = (id, endpoint, parameters = {}) => ({ id, url: `${endpoint}?${new URLSearchParams({ ...common, ...parameters })}` });
  const layers = [
    layer('water', 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/export'),
    // Index labels plus normal/depression index and intermediate lines. No supplemental clutter.
    layer('contours', 'https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer/export', { layers: 'show:21,25,26,29,33,34' }),
    layer('roads', 'https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/export', { layers: roads === 'streets' ? 'show:16,17,18,20,21,24,29,30,31,32,33,37' : 'show:16,17,18,24,29,30,37' })
  ];
  if (relief) layers.unshift(layer('relief', 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage', { renderingRule: JSON.stringify({ rasterFunction: 'Hillshade Gray' }), pixelType: 'U8', interpolation: 'RSP_BilinearInterpolation' }));
  return { key: JSON.stringify([bbox, pixels, relief, roads]), bbox, pixels, layers, roads };
}

/** Response byte budget applies before image decode, including chunked responses. */
export async function boundedTerrainImage(response) {
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/png')) throw new Error('Terrain source did not return a PNG image.');
  if (Number(response.headers.get('content-length')) > TERRAIN_LIMITS.maxBytes) { await response.body?.cancel(); throw new Error('Terrain image exceeds the download limit.'); }
  const reader = response.body?.getReader(); if (!reader) throw new Error('Terrain image has no response body.');
  let length = 0; const chunks = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > TERRAIN_LIMITS.maxBytes) throw new Error('Terrain image exceeds the download limit.'); chunks.push(value); }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  if (!length) throw new Error('Terrain image is empty.');
  return new Blob(chunks, { type: 'image/png' });
}
