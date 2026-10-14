export function geographicFixture(query) {
  const match = /\((-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){3})\)/.exec(query);
  if (!match) throw new Error('Unexpected geographic query.');
  const [s, w, n, e] = match[1].split(',').map(Number), lon = (w + e) / 2, lat = (s + n) / 2, dx = (e - w) / 2, dy = (n - s) / 2;
  const way = (id, name, coordinates, tags = {}) => ({ type: 'way', id, nodes: coordinates.map((_, i) => id * 10 + i), geometry: coordinates.map(([lon, lat]) => ({ lon, lat })), tags: { highway: 'residential', ...(name ? { name } : {}), ...tags } });
  return { version: 0.6, osm3s: { timestamp_osm_base: '2026-10-01T00:00:00Z' }, elements: [
    way(1, 'First Avenue', [[lon - dx * 2, lat - dy * .35], [lon, lat - dy * .35], [lon + dx * 2, lat - dy * .35]]),
    way(2, 'Second Avenue', [[lon - dx * 2, lat + dy * .35], [lon, lat + dy * .35], [lon + dx * 2, lat + dy * .35]], { highway: 'primary' }),
    way(3, 'Cedar Road', [[lon - dx * .4, lat - dy * 2], [lon - dx * .4, lat], [lon - dx * .4, lat + dy * 2]], { bridge: 'yes', layer: '1' }),
    way(4, 'Pine Lane', [[lon + dx * .45, lat - dy * 2], [lon + dx * .45, lat], [lon + dx * .45, lat + dy * 2]]),
    way(5, null, [[lon - dx * .9, lat + dy * .75], [lon + dx * .9, lat + dy * .75]]),
    { type: 'node', id: 10, lon, lat, tags: { amenity: 'school', name: 'Example School' } }
  ] };
}
