/** Compare original OSM records, not simplified drawing features. No pack mutation. */
export function compareSources(before, after) {
  const index = (raw) => {
    if (!raw || !Array.isArray(raw.elements) || raw.elements.length > 100000) throw new Error('Expected bounded OSM elements.');
    const map = new Map();
    for (const element of raw.elements) {
      const id = element.id;
      if (!['node', 'way', 'relation'].includes(element.type)
        || !(typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id) || typeof id === 'number' && Number.isSafeInteger(id) && id > 0)) throw new Error('Invalid OSM identity.');
      const key = `${element.type}:${id}`;
      if (map.has(key)) throw new Error('Duplicate OSM identity.');
      map.set(key, element);
    }
    return map;
  };
  const canonical = (v, depth = 0) => {
    if (depth > 32) throw new Error('Source nesting exceeds comparison limit.');
    if (Array.isArray(v)) return '[' + v.map((item) => canonical(item, depth + 1)).join(',') + ']';
    if (v !== null && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
    return JSON.stringify(v);
  };
  const a = index(before), b = index(after);
  return {
    added: [...b.keys()].filter((key) => !a.has(key)).sort(),
    removed: [...a.keys()].filter((key) => !b.has(key)).sort(),
    changed: [...b.keys()].filter((key) => a.has(key) && canonical(a.get(key)) !== canonical(b.get(key))).sort(),
    sourceBefore: before.osm3s?.timestamp_osm_base ?? null,
    sourceAfter: after.osm3s?.timestamp_osm_base ?? null,
  };
}
