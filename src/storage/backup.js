import { checkedSettings } from './settings.js';
import { checkedBundle, checkedPack, canonical, storageError } from './records.js';
export const BACKUP_LIMITS = Object.freeze({ bytes: 50 * 1024 * 1024, packs: 20, sessions: 100, attempts: 10000 });
const fail = (message) => { throw storageError('invalid-backup', message); };
const key = (packId, revision) => JSON.stringify([packId, revision]);
/** Validate every record/reference before returning a detached envelope. */
export function checkedBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 6 || !['backupVersion','exportedAt','packs','sessions','attempts','settings'].every((k) => Object.hasOwn(value, k))) fail('Expected a version-1 progress backup.');
  if (value.backupVersion !== 1) throw storageError('unsupported-version', 'Backup version is unsupported.');
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) || new Date(value.exportedAt).toISOString() !== value.exportedAt) fail('Backup date is invalid.');
  for (const name of ['packs', 'sessions', 'attempts']) if (!Array.isArray(value[name]) || value[name].length > BACKUP_LIMITS[name]) throw storageError('limit-exceeded', `Backup exceeds its ${name} limit. Export individual sessions instead.`);
  if (!value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) fail('Expected preference record or empty settings object.');
  const settings = Object.keys(value.settings).length ? checkedSettings(value.settings) : {};
  const packs = value.packs.map(checkedPack), byPack = new Map();
  for (const pack of packs) { const id = key(pack.id, pack.revision); if (byPack.has(id)) fail('Duplicate pack revision.'); byPack.set(id, pack); }
  const sessions = new Map(), attempts = new Map(), bySession = new Map();
  for (const session of value.sessions) {
    if (!session || typeof session.id !== 'string' || sessions.has(session.id)) fail('Duplicate/invalid session ID.');
    sessions.set(session.id, session); bySession.set(session.id, []);
  }
  for (const attempt of value.attempts) {
    if (!attempt || typeof attempt.id !== 'string' || attempts.has(attempt.id) || !sessions.has(attempt.sessionId)) fail('Duplicate/orphan attempt ID.');
    attempts.set(attempt.id, attempt); bySession.get(attempt.sessionId).push(attempt);
  }
  const validated = [];
  for (const session of sessions.values()) {
    const pack = byPack.get(key(session.packId, session.packRevision));
    if (!pack) fail('Session pack revision is absent.');
    validated.push(checkedBundle({ pack, session, attempts: bySession.get(session.id) }));
  }
  const result = { backupVersion: 1, exportedAt: value.exportedAt, packs, sessions: validated.map((b) => b.session), attempts: validated.flatMap((b) => b.attempts), settings };
  if (new TextEncoder().encode(canonical(result)).length > BACKUP_LIMITS.bytes) throw storageError('limit-exceeded', 'Progress backup exceeds 50 MiB. Export individual sessions instead.');
  return result;
}
export async function readBackup(file, signal) {
  const canceled = () => { if (signal?.aborted) throw storageError('canceled', 'Backup import canceled.'); };
  canceled();
  if (!(file instanceof Blob)) fail('Expected a UTF-8 JSON file.');
  if (file.size > BACKUP_LIMITS.bytes) throw storageError('limit-exceeded', 'Progress backup exceeds 50 MiB.');
  const bytes = await file.arrayBuffer(); canceled();
  let value; try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail('Expected UTF-8 JSON.'); }
  const result = checkedBackup(value); canceled(); return result;
}
export function serializeBackup(value) { return canonical(checkedBackup(value)); }
