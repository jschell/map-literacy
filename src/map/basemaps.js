// Provider-owned map imagery, not an elevation grid or a terrain lesson pack.
export const BASEMAPS = Object.freeze({
  street: Object.freeze({ maxZoom: 19, credit: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' }),
  terrain: Object.freeze({ maxZoom: 16, credit: 'USGS terrain layers', href: 'https://www.usgs.gov/programs/national-geospatial-program/national-map' }),
  topo: Object.freeze({ maxZoom: 16, credit: 'USGS The National Map', href: 'https://www.usgs.gov/programs/national-geospatial-program/national-map' })
});
export const USGS_ACKNOWLEDGMENT = 'Map services and data available from U.S. Geological Survey, National Geospatial Program.';
export function tileURL(kind, zoom, x, y) {
  if (!['street', 'topo'].includes(kind) || ![zoom, x, y].every(Number.isInteger) || zoom < 0 || zoom > BASEMAPS[kind].maxZoom || x < 0 || y < 0 || x >= 2 ** zoom || y >= 2 ** zoom) throw new Error('Unsupported map tile.');
  return kind === 'topo' ? `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/${zoom}/${y}/${x}` : `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}
export function rasterFurniture(document, view) {
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text) n.textContent = text; return n; };
  const svg = make('svg', { viewBox: `0 0 ${view.width} ${view.height}`, 'data-raster-furniture': '', 'aria-label': 'North and approximate scale at map center', role: 'img' });
  const x = view.width - 10, y = view.height - 8;
  const target = view.groundWidth * 20 / view.width, power = 10 ** Math.floor(Math.log10(target));
  const distance = [1, 2, 5, 10].map((n) => n * power).filter((n) => n <= target).at(-1);
  const length = distance / view.groundWidth * view.width;
  svg.append(make('rect', { x: x - 5, y: 1, width: 10, height: 17, fill: 'white' }), make('path', { d: `M${x} 15 V6 M${x - 2} 9 L${x} 6 L${x + 2} 9`, fill: 'none', stroke: 'black', 'stroke-width': .5 }), make('text', { x, y: 5, 'text-anchor': 'middle', 'font-size': 3, fill: 'black' }, 'N'));
  svg.append(make('rect', { x: 2, y: y - 6, width: Math.max(24, length + 4), height: 11, fill: 'white' }), make('path', { d: `M4 ${y - 1} v2 M4 ${y} h${length} M${4 + length} ${y - 1} v2`, stroke: 'black', 'stroke-width': .5, fill: 'none' }), make('text', { x: 4, y: y - 2, 'font-size': 3, fill: 'black' }, distance >= 1000 ? `${distance / 1000} km` : `${distance} m`));
  return svg;
}
