export const CONTOUR_METADATA = Object.freeze({ layers: Object.freeze([25,26,33,34]), maxRows: 32, maxBytes: 128 * 1024, timeoutMs: 10000 });
export const UNVERIFIED_CONTOURS = 'Contour units/interval unverified';
/** Query each rendered geometry layer; label layers repeat the same source features. */
export function contourMetadataRequests(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) throw new Error('Invalid contour metadata extent.');
  const params = new URLSearchParams({ f: 'json', geometry: bbox.join(','), geometryType: 'esriGeometryEnvelope', inSR: '3857', spatialRel: 'esriSpatialRelIntersects', where: '1=1', outFields: 'contourunits,contourinterval', returnGeometry: 'false', returnDistinctValues: 'true', resultRecordCount: String(CONTOUR_METADATA.maxRows), orderByFields: 'contourunits,contourinterval' });
  return CONTOUR_METADATA.layers.map((id) => ({ id, url: `https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer/${id}/query?${params}` }));
}
export async function readContourMetadata(response) {
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('json')) throw new Error('Contour metadata unavailable.');
  if (Number(response.headers.get('content-length')) > CONTOUR_METADATA.maxBytes) { await response.body?.cancel(); throw new Error('Contour metadata exceeds limit.'); }
  const reader = response.body?.getReader(); if (!reader) throw new Error('Contour metadata unavailable.');
  let length = 0; const chunks = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > CONTOUR_METADATA.maxBytes) throw new Error('Contour metadata exceeds limit.'); chunks.push(value); }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
/** Source attributes only: no conversion from label pixels, Z values or a generic layer description. */
export function summarizeContours(results) {
  if (!Array.isArray(results) || results.length !== CONTOUR_METADATA.layers.length || new Set(results.map((r) => r.id)).size !== results.length || results.some((r) => !CONTOUR_METADATA.layers.includes(r.id))) throw new Error('Incomplete contour metadata layers.');
  const pairs = new Map();
  for (const { data } of results) {
    if (!data || data.error || (data.exceededTransferLimit !== undefined && data.exceededTransferLimit !== false) || !Array.isArray(data.features) || data.features.length > CONTOUR_METADATA.maxRows) throw new Error('Incomplete contour metadata results.');
    for (const feature of data.features) {
      const a = feature?.attributes, unit = a?.contourunits, interval = a?.contourinterval;
      if (![1,2].includes(unit) || !Number.isFinite(interval) || interval <= 0 || interval > 10000) throw new Error('Unknown contour units or interval.');
      pairs.set(`${unit}/${interval}`, { unit: unit === 1 ? 'ft' : 'm', interval });
    }
  }
  const values = [...pairs.values()].sort((a,b) => a.unit.localeCompare(b.unit) || a.interval-b.interval);
  if (!values.length || values.length > 8) throw new Error('No bounded contour interval summary.');
  const mixedUnits = new Set(values.map((v) => v.unit)).size > 1;
  const text = `Source contour interval${values.length > 1 ? 's' : ''}: ${values.map((v) => `${v.interval} ${v.unit}`).join(', ')}${values.length > 1 ? ' (vary within this area)' : ''}${mixedUnits ? '; elevation units vary' : `; elevations in ${values[0].unit}`}.`;
  return { kind: 'reported', values, mixedUnits, text, credit: text };
}
