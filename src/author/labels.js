import { validatePack } from '../data/validate-pack.js';
import { PACK_LIMITS } from '../data/pack-schema.js';

function checked(pack) {
  const report = validatePack(pack);
  if (!report.valid) throw Object.assign(new Error('Pack validation failed.'), { errors: report.errors });
  return pack;
}

/** Pure edit: provenance/topology stay intact; any published review must be repeated. */
export function editLabel(pack, { label = null, removeId = null } = {}) {
  checked(pack);
  if (pack.revision === Number.MAX_SAFE_INTEGER) throw new Error('Pack revision limit reached.');
  if ((label === null) === (removeId === null)) throw new Error('Choose one label edit or removal.');
  const next = structuredClone(pack);
  if (removeId !== null) {
    const index = next.labels.findIndex((l) => l.id === removeId);
    if (index < 0) throw new Error('Label no longer exists.');
    next.labels.splice(index, 1);
  } else {
    if (!label || !Array.isArray(label.anchor) || label.anchor.length !== 2 || !label.anchor.every(Number.isFinite)) throw new Error('Enter a finite longitude and latitude.');
    const [lon, lat] = label.anchor, [west, south, east, north] = pack.bounds;
    if (lon < west || lon > east || lat < south || lat > north) throw new Error('Label anchor must stay inside the lesson extent.');
    const index = next.labels.findIndex((l) => l.id === label.id);
    if (index < 0) next.labels.push(structuredClone(label));
    else next.labels[index] = structuredClone(label);
  }
  return restoreLabels(pack, next.labels);
}

/** Undo restores label content as another draft revision, never reuses an exported revision. */
export function restoreLabels(pack, labels) {
  checked(pack);
  if (pack.revision === Number.MAX_SAFE_INTEGER) throw new Error('Pack revision limit reached.');
  const next = structuredClone(pack); next.labels = structuredClone(labels);
  next.revision++;
  next.review = { status: 'draft', reviewedAt: null, note: 'Labels edited locally; geography, labels and exercises require review before use.' };
  for (const exercise of next.exercises) exercise.review = 'draft';
  return checked(next);
}

/** Standalone pack download, not a progress backup or persistent save. */
export function serializePack(pack) {
  checked(pack);
  let json = JSON.stringify(pack, null, 2) + '\n';
  if (new TextEncoder().encode(json).byteLength > PACK_LIMITS.bytes) json = JSON.stringify(pack) + '\n';
  if (new TextEncoder().encode(json).byteLength > PACK_LIMITS.bytes) throw new Error('Export exceeds the lesson-pack import byte limit.');
  return json;
}
