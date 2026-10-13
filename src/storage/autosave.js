import { checkedBundle, canonical, storageError } from './records.js';
/** One revision-locked session writer; failed snapshots stay in memory for retry/export. */
export function createAutosave({ storage, onChange = () => {}, emit = () => {} }) {
  let current = null, expectedVersion = null, savedVersion = null, state = 'idle', error = null, running = null, job = null;
  const snapshot = () => ({ state, error, savedVersion, version: current?.session.version ?? null });
  const notify = () => onChange(snapshot());
  return {
    snapshot,
    markConflict(message) { if (!running) { state = 'conflict'; error = storageError('conflict', message); notify(); } },
    bind(bundle, version = null) {
      if (running) throw storageError('save-pending', 'Wait for the pending save.');
      current = checkedBundle(bundle); expectedVersion = version; savedVersion = version;
      state = version === current.session.version ? 'saved' : 'idle'; error = null; notify();
    },
    save(bundle = current) {
      if (running) return bundle === current || canonical(bundle) === canonical(current) ? running : Promise.reject(storageError('save-pending', 'Wait for the pending save before changing progress.'));
      try { current = checkedBundle(bundle); } catch (e) { error = e; state = 'error'; notify(); emit('save-failed', { jobId: crypto.randomUUID(), recordId: bundle?.session?.id ?? current?.session.id, code: e.code ?? 'invalid-record' }); return Promise.reject(e); }
      const captured = current, jobId = crypto.randomUUID(); job = jobId;
      state = 'saving'; error = null; notify();
      running = Promise.resolve().then(() => storage.commit(captured, { expectedVersion })).then((result) => {
        expectedVersion = result.version; savedVersion = result.version; state = 'saved'; error = null;
        emit('save-completed', { jobId, recordId: result.sessionId, version: result.version });
        return result;
      }, (e) => {
        error = e; state = e.code === 'conflict' || e.code === 'revision-conflict' ? 'conflict' : 'error';
        emit('save-failed', { jobId, recordId: captured.session.id, code: e.code ?? 'storage-unavailable' });
        throw e;
      }).finally(() => { running = null; if (job === jobId) notify(); });
      return running;
    }
  };
}
export function forkSessionBundle(value) {
  const bundle = checkedBundle(value), ids = new Map();
  bundle.session.id = crypto.randomUUID(); bundle.session.version = 0;
  for (const attempt of bundle.attempts) { const previous = attempt.id; attempt.id = crypto.randomUUID(); attempt.sessionId = bundle.session.id; ids.set(previous, attempt.id); }
  for (const key of Object.keys(bundle.session.answers)) bundle.session.answers[key] = ids.get(bundle.session.answers[key]);
  return checkedBundle(bundle);
}
/** Used only for explicit restore, never as a last-writer-wins update. */
export async function findStoredVersion(storage, bundle) {
  const old = await storage.loadSession(bundle.session.id);
  if (!old) return null;
  if (canonical(old) !== canonical(checkedBundle(bundle))) throw storageError('conflict', 'A different version of this session is stored. Reload it or save as a new session.');
  return old.session.version;
}
