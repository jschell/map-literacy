import { canonical, checkedBundle, checkedPack, storageError } from './records.js';
export const DATABASE_VERSION = 1;
const normalize = (error) => typeof error?.code === 'string' ? error : storageError(error?.name === 'QuotaExceededError' ? 'storage-full' : 'storage-unavailable', error?.message ?? 'Browser storage is unavailable.');

/** No UI side effects. A successful write resolves only on transaction completion. */
export function openStorage({ factory = globalThis.indexedDB, name = 'map-literacy', signal, onBlocked = () => {}, onVersionChange = () => {} } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(storageError('canceled', 'Storage open canceled.')); return; }
    if (!factory) { reject(storageError('storage-unavailable', 'IndexedDB is unavailable.')); return; }
    let request, canceled = false, upgradeError = null;
    const cancel = () => { canceled = true; reject(storageError('canceled', 'Storage open canceled.')); };
    const clean = () => signal?.removeEventListener('abort', cancel);
    signal?.addEventListener('abort', cancel, { once: true });
    try { request = factory.open(name, DATABASE_VERSION); } catch (error) { clean(); reject(normalize(error)); return; }
    request.onblocked = () => { if (!canceled) onBlocked({ code: 'migration-blocked', message: 'Close other tabs using this database to continue.' }); };
    request.onupgradeneeded = () => {
      if (canceled) { request.transaction.abort(); return; }
      const db = request.result;
      try {
        // Version 1 creates stores atomically. Later versions need explicit upgrade migrations.
        db.createObjectStore('packs', { keyPath: ['id', 'revision'] });
        db.createObjectStore('sessions', { keyPath: 'id' });
        db.createObjectStore('attempts', { keyPath: 'id' }).createIndex('sessionId', 'sessionId');
        db.createObjectStore('settings', { keyPath: 'singleton' });
        db.createObjectStore('meta', { keyPath: 'name' });
      } catch (error) { upgradeError = error; request.transaction.abort(); }
    };
    request.onerror = () => { clean(); if (!canceled) reject(normalize(upgradeError ?? request.error)); };
    request.onsuccess = () => {
      clean(); const db = request.result;
      if (canceled) { db.close(); return; }
      let closed = false;
      const close = () => { closed = true; db.close(); };
      db.onversionchange = () => { close(); onVersionChange({ code: 'reload-needed', message: 'Database version changed. Reload this page.' }); };
      function transaction(stores, mode, operation, signal) {
        return new Promise((resolve, reject) => {
          if (signal?.aborted) { reject(storageError('canceled', 'Storage operation canceled.')); return; }
          if (closed) { reject(storageError('storage-unavailable', 'Storage is closed. Reload or reopen it.')); return; }
          let tx, error = null, value;
          try { tx = db.transaction(stores, mode); } catch (e) { reject(normalize(e)); return; }
          const abort = (e) => { error = e; try { tx.abort(); } catch { /* A completed transaction cannot be undone. */ } };
          const cancel = () => abort(storageError('canceled', 'Storage operation canceled.'));
          const cleanup = () => signal?.removeEventListener('abort', cancel);
          signal?.addEventListener('abort', cancel, { once: true });
          tx.oncomplete = () => { cleanup(); resolve(value); };
          tx.onabort = () => { cleanup(); reject(normalize(error ?? tx.error)); };
          tx.onerror = () => { /* Abort handler reports the final transaction failure. */ };
          const read = (request, callback) => { request.onsuccess = () => { try { callback(request.result); } catch (e) { abort(e); } }; };
          try { operation({ tx, read, abort, result: (v) => { value = v; } }); } catch (e) { abort(e); }
        });
      }
      const api = {
        close,
        savePack(value, { signal } = {}) {
          let pack; try { pack = checkedPack(value); } catch (e) { return Promise.reject(e); }
          return transaction(['packs'], 'readwrite', ({ tx, read, abort, result }) => {
            const store = tx.objectStore('packs');
            read(store.get([pack.id, pack.revision]), (existing) => {
              if (existing && canonical(existing) !== canonical(pack)) { abort(storageError('revision-conflict', 'This pack revision already contains different content.')); return; }
              if (!existing) store.add(pack);
              result({ packId: pack.id, revision: pack.revision, inserted: !existing });
            });
          }, signal);
        },
        commit(value, { expectedVersion = null, signal } = {}) {
          let bundle;
          try { bundle = checkedBundle(value); if (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)) throw storageError('invalid-record', 'Expected version is invalid.'); }
          catch (e) { return Promise.reject(e); }
          return transaction(['packs', 'sessions', 'attempts', 'meta'], 'readwrite', ({ tx, read, abort, result }) => {
            const packs = tx.objectStore('packs'), sessions = tx.objectStore('sessions'), attempts = tx.objectStore('attempts');
            const { pack, session, attempts: incoming } = bundle;
            read(packs.get([pack.id, pack.revision]), (existingPack) => {
              if (existingPack && canonical(existingPack) !== canonical(pack)) { abort(storageError('revision-conflict', 'Pack content differs from its stored revision.')); return; }
              if (!existingPack) packs.add(pack);
              read(sessions.get(session.id), (old) => {
                if ((!old && expectedVersion !== null) || (old && old.version !== expectedVersion)) { abort(storageError('conflict', 'Session changed in another tab. Reload or start a new session.')); return; }
                if (old && canonical(old) === canonical(session)) { /* Idempotent retry still checks every immutable attempt. */ }
                else if (old && (session.version <= old.version || old.status === 'completed' || session.index < old.index || session.updatedAt < old.updatedAt || ['id', 'packId', 'packRevision', 'exerciseOrder', 'startedAt'].some((key) => canonical(old[key]) !== canonical(session[key])) || Object.keys(old.hintCounts).some((key) => session.hintCounts[key] < old.hintCounts[key]))) {
                  abort(storageError('conflict', 'Session update would overwrite immutable or newer progress.')); return;
                }
                read(attempts.index('sessionId').getAll(session.id, 1001), (prior) => {
                  const incomingIds = new Set(incoming.map((a) => a.id));
                  if (prior.some((a) => !incomingIds.has(a.id))) { abort(storageError('conflict', 'Submitted attempts cannot be removed.')); return; }
                  if (old && canonical(old) === canonical(session) && prior.length !== incoming.length) { abort(storageError('conflict', 'Adding attempts requires a new session version.')); return; }
                  read(tx.objectStore('meta').get(`attempt-order:${session.id}`), (order) => {
                    if (old && (!order || order.version !== old.version || !Array.isArray(order.ids) || order.ids.length !== prior.length || order.ids.some((id, i) => incoming[i]?.id !== id))) { abort(storageError('conflict', 'Prior attempt order cannot be changed.')); return; }
                    tx.objectStore('meta').put({ name: `attempt-order:${session.id}`, version: session.version, ids: incoming.map((a) => a.id) });
                    for (const attempt of incoming) read(attempts.get(attempt.id), (existing) => {
                      if (existing && canonical(existing) !== canonical(attempt)) { abort(storageError('conflict', 'Attempt ID already has different content.')); return; }
                      if (!existing) attempts.add(attempt);
                    });
                    sessions.put(session); result({ sessionId: session.id, version: session.version });
                  });
                });
              });
            });
          }, signal);
        },
        loadPack(id, revision, { signal } = {}) {
          return transaction(['packs'], 'readonly', ({ tx, read, result }) => {
            read(tx.objectStore('packs').get([id, revision]), (pack) => result(pack ? checkedPack(pack) : null));
          }, signal);
        },
        loadSession(id, { signal } = {}) {
          return transaction(['packs', 'sessions', 'attempts', 'meta'], 'readonly', ({ tx, read, result, abort }) => {
            read(tx.objectStore('sessions').get(id), (session) => {
              if (!session) { result(null); return; }
              read(tx.objectStore('packs').get([session.packId, session.packRevision]), (pack) => {
                read(tx.objectStore('attempts').index('sessionId').getAll(id, 1001), (attempts) => {
                  read(tx.objectStore('meta').get(`attempt-order:${session.id}`), (order) => {
                    if (!order || order.version !== session.version || !Array.isArray(order.ids) || order.ids.length !== attempts.length || new Set(order.ids).size !== attempts.length) { abort(storageError('invalid-record', 'Stored attempt order is invalid.')); return; }
                    const byId = new Map(attempts.map((a) => [a.id, a]));
                    try { result(checkedBundle({ pack, session, attempts: order.ids.map((id) => byId.get(id)) })); } catch (e) { abort(e); }
                  });
                });
              });
            });
          }, signal);
        }
      };
      resolve(api);
    };
  });
}
