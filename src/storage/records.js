import { validatePack } from '../data/validate-pack.js';
import { PACK_LIMITS } from '../data/pack-schema.js';
import { scoreAnswer } from '../lesson/score.js';
export const STORAGE_LIMITS = Object.freeze({ attemptsPerSession: 1000, bundleBytes: 16 * 1024 * 1024 });
export const storageError = (code, message) => Object.assign(new Error(message), { code });
const fail = (message) => { throw storageError('invalid-record', message); };
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const fields = (value, names) => {
  if (!object(value) || Object.keys(value).length !== names.length || !names.every((key) => Object.hasOwn(value, key))) fail('Record fields do not match version 1.');
};
/** Canonical equality ignores object key insertion order, never array order. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  fail('Records must contain finite JSON values.');
}
export function checkedPack(value) {
  if (!validatePack(value).valid) throw storageError('invalid-pack', 'Choose a validated lesson pack.');
  const copy = structuredClone(value);
  if (new TextEncoder().encode(canonical(copy)).length > PACK_LIMITS.bytes) throw storageError('limit-exceeded', 'Pack exceeds its byte limit.');
  return copy;
}
/** Full revision/reference/result validation before a write transaction is opened. */
export function checkedBundle(value) {
  fields(value, ['pack', 'session', 'attempts']);
  const pack = checkedPack(value.pack), session = value.session, attempts = value.attempts;
  if (!Array.isArray(attempts) || attempts.length > STORAGE_LIMITS.attemptsPerSession) fail('A session may contain at most 1,000 attempts.');
  fields(session, ['id', 'version', 'packId', 'packRevision', 'exerciseOrder', 'index', 'answers', 'hintCounts', 'startedAt', 'updatedAt', 'status']);
  if (!uuid(session.id) || !integer(session.version) || session.packId !== pack.id || session.packRevision !== pack.revision) fail('Session identity or revision is invalid.');
  if (pack.review.status !== 'reviewed') fail('Scored sessions require a reviewed pack.');
  const reviewed = pack.exercises.filter((e) => e.review === 'reviewed').map((e) => e.id);
  if (!reviewed.length || (!Array.isArray(session.exerciseOrder) || session.exerciseOrder.length !== reviewed.length || session.exerciseOrder.some((id, i) => id !== reviewed[i])) || !integer(session.index) || session.index >= reviewed.length) fail('Session exercise order/index is invalid.');
  if (!['active', 'completed'].includes(session.status) || !date(session.startedAt) || !date(session.updatedAt) || session.updatedAt < session.startedAt) fail('Session lifecycle is invalid.');
  if (!object(session.answers) || !object(session.hintCounts) || Object.keys(session.hintCounts).length !== reviewed.length) fail('Session answer/hint maps are invalid.');
  const exercises = new Map(pack.exercises.map((e) => [e.id, e]));
  for (const id of reviewed) if (!Object.hasOwn(session.hintCounts, id) || !integer(session.hintCounts[id]) || session.hintCounts[id] > exercises.get(id).hints.length) fail('Hint count exceeds the authored hints.');
  const ids = new Set(), latest = new Map();
  for (const attempt of attempts) {
    fields(attempt, ['id', 'sessionId', 'packId', 'packRevision', 'exerciseId', 'answer', 'result', 'hintsUsed', 'submittedAt']);
    if (!uuid(attempt.id) || ids.has(attempt.id) || attempt.sessionId !== session.id || attempt.packId !== pack.id || attempt.packRevision !== pack.revision) fail('Attempt identity/revision is invalid.');
    const position = reviewed.indexOf(attempt.exerciseId);
    if (position < 0 || position > session.index || !date(attempt.submittedAt) || attempt.submittedAt < session.startedAt || attempt.submittedAt > session.updatedAt) fail('Attempt exercise/date is invalid.');
    if (!integer(attempt.hintsUsed) || attempt.hintsUsed > session.hintCounts[attempt.exerciseId]) fail('Attempt hint count is invalid.');
    const e = exercises.get(attempt.exerciseId);
    fields(attempt.answer, e.type === 'heading' ? ['type', 'degrees'] : e.type === 'endpoint' ? ['type', 'coordinate'] : e.type === 'profile-value' ? ['type','valueM'] : e.type === 'relative-slope' ? ['type','choice'] : e.type === 'contour-elevation' ? ['type','elevationM'] : ['type', 'edgeIds']);
    if (['route', 'detour'].includes(e.type) && (!Array.isArray(attempt.answer.edgeIds) || attempt.answer.edgeIds.length > 1000 || !attempt.answer.edgeIds.every((id) => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(id)))) fail('Route answers exceed their identifier/edge limits.');
    fields(attempt.result, ['status', 'metrics', 'reasonCode', 'rubricVersion']);
    if (!object(attempt.result.metrics) || Object.keys(attempt.result.metrics).length > 2 || !Object.values(attempt.result.metrics).every((n) => n === null || (typeof n === 'number' && Number.isFinite(n)))) fail('Score metrics must be finite numeric fields.');
    if (typeof attempt.result.status !== 'string' || typeof attempt.result.reasonCode !== 'string' || attempt.result.reasonCode.length > 128 || attempt.result.rubricVersion !== 1) fail('Score record is invalid.');
    const score = scoreAnswer(pack, attempt.exerciseId, attempt.answer);
    if (Object.keys(attempt.result.metrics).some((key) => !Object.hasOwn(score.metrics, key))) fail('Score metric keys do not match the rubric.');
    if (score.status === 'unanswered' || canonical(score) !== canonical(attempt.result)) fail('Attempt result does not match its revision-locked rubric.');
    ids.add(attempt.id); latest.set(attempt.exerciseId, attempt.id);
  }
  if (Object.keys(session.answers).length !== latest.size || [...latest].some(([id, attemptId]) => !Object.hasOwn(session.answers, id) || session.answers[id] !== attemptId)) fail('Session answers must reference the last included attempt per exercise.');
  const bundle = { pack, session, attempts };
  if (new TextEncoder().encode(canonical(bundle)).length > STORAGE_LIMITS.bundleBytes) throw storageError('limit-exceeded', 'Session bundle exceeds 16 MiB.');
  return structuredClone(bundle);
}
