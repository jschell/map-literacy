import { distanceM } from '../geo/distance.js';
export const GEOGRAPHIC_ENDPOINT = 'https://overpass-api.de/api/interpreter';
export const GEOGRAPHIC_BYTE_LIMIT = 8 * 1024 * 1024;
export function geographicQuery(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some((n) => !Number.isFinite(n)) || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -70 || bounds[3] > 70 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3] || distanceM(bounds.slice(0, 2), bounds.slice(2)) > 10000) throw new Error('Zoom in for a street map (area under 10 km, latitude within ±70°, no dateline crossing).');
  const [w, s, e, n] = bounds, box = `${s},${w},${n},${e}`;
  return `[out:json][timeout:20][maxsize:33554432];\n/* map-literacy https://github.com/jschell/map-literacy */\n(way[highway][highway!~"^(footway|steps|corridor|platform)$"][service!=parking_aisle](${box});way[highway~"^(footway|steps)$"][name](${box});way[waterway](${box});way[natural=water](${box});way[leisure=park](${box});node[amenity~"^(school|library|hospital|police|fire_station)$"](${box}););out body geom;`;
}
export function parseGeographicSource(raw) {
  if (!raw || raw.version !== 0.6 || !Array.isArray(raw.elements) || raw.elements.length > 5000 || raw.remark) throw new Error('Incomplete or oversized street source; zoom in or retry.');
  const features = [], seen = new Set(); let coordinates = 0;
  for (const item of raw.elements) {
    if (!['node', 'way'].includes(item.type) || !Number.isSafeInteger(item.id) || item.id <= 0) throw new Error('Invalid source identity.');
    const id = `${item.type}:${item.id}`;
    if (seen.has(id)) throw new Error('Duplicate source identity.'); seen.add(id);
    const tags = item.tags ?? {};
    if (!tags || Array.isArray(tags) || typeof tags !== 'object' || Object.entries(tags).some(([k, v]) => k.length > 200 || typeof v !== 'string' || v.length > 2000)) throw new Error('Invalid source tags.');
    const geometry = item.type === 'node' ? [[item.lon, item.lat]] : item.geometry?.map((point) => [point.lon, point.lat]);
    if (!geometry || geometry.length < (item.type === 'node' ? 1 : 2) || geometry.some((p) => !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) throw new Error('Source geometry is missing or invalid.');
    if ((coordinates += geometry.length) > 40000) throw new Error('Too much street geometry; zoom in.');
    if (item.type === 'way' && (!Array.isArray(item.nodes) || item.nodes.length !== geometry.length || item.nodes.some((id) => !Number.isSafeInteger(id) || id <= 0))) throw new Error('Invalid source node reference.');
    if (item.type === 'way' && tags.highway && tags.area === 'yes') continue;
    const role = tags.highway ? 'road' : tags.waterway || tags.natural === 'water' ? 'water' : tags.leisure === 'park' ? 'park' : 'landmark';
    features.push({ id, role, name: tags.name?.trim().replace(/\s+/g, ' ') || null, tags: { ...tags }, geometry, nodeIds: item.nodes ? [...item.nodes] : [] });
  }
  if (features.length > 2500) throw new Error('Too much map context; zoom in.');
  if (features.filter((f) => f.role === 'road').length > 1500) throw new Error('Too many roads; zoom in.');
  return features;
}
export async function acquireGeographicSource(bounds, { signal, fetchImpl = fetch, endpoint = GEOGRAPHIC_ENDPOINT } = {}) {
  const query = geographicQuery(bounds), fetchedAt = new Date().toISOString();
  const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }), signal, credentials: 'omit', redirect: 'error' });
  if (!response.ok) {
    const error = new Error(`Street source unavailable (${response.status}). Retry map after a pause.`);
    if ([429, 503, 504].includes(response.status)) {
      const value = response.headers.get('retry-after');
      const delay = value && /^\d+$/.test(value) ? Number(value) * 1000 : value ? Date.parse(value) - Date.now() : 0;
      error.retryMs = Math.max(30000, Number.isFinite(delay) ? delay : 30000);
    }
    throw error;
  }
  if (!response.body) throw new Error('Empty street source.');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > GEOGRAPHIC_BYTE_LIMIT) throw new Error('Street source too large; zoom in.'); chunks.push(value); } }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes), parsed = JSON.parse(raw.replace(/^\uFEFF/, '')), features = parseGeographicSource(parsed);
  const sourceAt = parsed.osm3s?.timestamp_osm_base ?? null;
  if (sourceAt !== null && (typeof sourceAt !== 'string' || !Number.isFinite(Date.parse(sourceAt)))) throw new Error('Invalid source timestamp.');
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
  return { features, raw, provenance: { endpoint, query, bounds: [...bounds], fetchedAt, sourceAt, sha256, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors', transform: 'map-literacy-geographic-v1' } };
}
