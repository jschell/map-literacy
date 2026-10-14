// Web Mercator is for geographic browsing only; lesson/print models retain their projection.
export const TILE_SIZE = 256;
export const MAX_LATITUDE = 85.0511287798066;
export const TILE_ORIGIN = 'https://tile.openstreetmap.org';
export const wrap = (value, size) => ((value % size) + size) % size;
export function project(lon, lat, zoom) {
  const size = TILE_SIZE * 2 ** zoom;
  const radians = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat)) * Math.PI / 180;
  return [(lon + 180) / 360 * size, (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * size];
}
export function unproject(x, y, zoom) {
  const size = TILE_SIZE * 2 ** zoom;
  return [wrap(x, size) / size * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(size, y)) / size))) * 180 / Math.PI];
}
export function parseLocation(text) {
  let values;
  if (/^https:\/\//i.test(text.trim())) {
    const url = new URL(text.trim());
    if (!['openstreetmap.org', 'www.openstreetmap.org'].includes(url.hostname)) throw new Error('Paste an OpenStreetMap map link or latitude, longitude.');
    const match = /^#map=(\d+)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)(?:&.*)?$/.exec(url.hash);
    if (!match) throw new Error('The link needs #map=zoom/latitude/longitude.');
    values = [Number(match[2]), Number(match[3]), Number(match[1])];
  } else {
    const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
    if (!match) throw new Error('Enter latitude, longitude (for example 47.674, -122.122) or an OpenStreetMap map link.');
    values = [Number(match[1]), Number(match[2]), 15];
  }
  const [lat, lon, zoom] = values;
  if (!values.every(Number.isFinite) || Math.abs(lat) > MAX_LATITUDE || Math.abs(lon) > 180 || zoom < 2 || zoom > 19) throw new Error('Use latitude within ±85.0511°, longitude within ±180°, and zoom 2–19.');
  return { lat, lon, zoom };
}
export function visibleTiles(center, zoom, width, height) {
  const n = 2 ** zoom, left = center[0] - width / 2, top = center[1] - height / 2;
  const tiles = [];
  for (let y = Math.max(0, Math.floor(top / TILE_SIZE)); y <= Math.min(n - 1, Math.floor((top + height - 1) / TILE_SIZE)); y++) {
    for (let x = Math.floor(left / TILE_SIZE); x <= Math.floor((left + width - 1) / TILE_SIZE); x++) {
      tiles.push({ key: `${zoom}/${x}/${y}`, url: `${TILE_ORIGIN}/${zoom}/${wrap(x, n)}/${y}.png`, x: x * TILE_SIZE - left, y: y * TILE_SIZE - top });
    }
  }
  return tiles;
}
