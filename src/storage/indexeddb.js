import {recordedCoverage} from '../lesson/progress.js';
import { checkedSettings } from './settings.js';
import { checkedBackup } from './backup.js';
import { canonical, checkedBundle, checkedPack, storageError } from './records.js';
export const DATABASE_VERSION = 1;
const normalize = (error) => typeof error?.code === 'string' ? error : error?.name === 'VersionError' ? storageError('unsupported-version', 'Stored database version is newer than this app supports. Use a compatible app; existing data was retained.') : storageError(error?.name === 'QuotaExceededError' ? 'storage-full' : 'storage-unavailable', error?.message ?? 'Browser storage is unavailable.');

function checkSchema(db) {
  const stores = { packs: ['id', 'revision'], sessions: 'id', attempts: 'id', settings: 'singleton', meta: 'name' };
  if (db.version !== DATABASE_VERSION) throw storageError('unsupported-version', 'Stored database version is unsupported. Use a compatible app; existing data was retained.');
  if (db.objectStoreNames.length !== Object.keys(stores).length || Object.keys(stores).some((name) => !db.objectStoreNames.contains(name))) throw storageError('invalid-schema', 'Stored database structure is incompatible. Existing data was retained; use a compatible app or restore a backup in a separate browser profile.');
  const tx = db.transaction(Object.keys(stores), 'readonly');
  for (const [name, keyPath] of Object.entries(stores)) {
    const store = tx.objectStore(name);
    if (canonical(store.keyPath) !== canonical(keyPath) || store.autoIncrement || store.indexNames.length !== (name === 'attempts' ? 1 : 0)) throw storageError('invalid-schema', 'Stored database keys or indexes are incompatible. Existing data was retained.');
    if (name === 'attempts') {
      if (!store.indexNames.contains('sessionId')) throw storageError('invalid-schema', 'Stored attempt index is missing. Existing data was retained.');
      const index = store.index('sessionId');
      if (index.keyPath !== 'sessionId' || index.unique || index.multiEntry) throw storageError('invalid-schema', 'Stored attempt index is incompatible. Existing data was retained.');
    }
  }
}

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
    request.onupgradeneeded = (event) => {
      if (canceled) { request.transaction.abort(); return; }
      const db = request.result;
      try {
        if (event.oldVersion !== 0 || db.version !== DATABASE_VERSION) throw storageError('unsupported-version', 'No migration is implemented for this database version. Existing data was retained.');
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
      try { checkSchema(db); } catch (error) { db.close(); reject(normalize(error)); return; }
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
        importBackup(value, { signal } = {}) {
          let backup; try { backup = checkedBackup(value); } catch (e) { return Promise.reject(e); }
          return transaction(['packs', 'sessions', 'attempts', 'meta', 'settings'], 'readwrite', ({ tx, read, abort, result }) => {
            if (Object.keys(backup.settings).length) { const store = tx.objectStore('settings'); read(store.get('singleton'), (old) => { if (old && canonical(old) !== canonical(backup.settings)) { abort(storageError('conflict', 'Backup preferences conflict with existing preferences.')); return; } if (!old) store.add(backup.settings); }); }
            for (const [name, records] of [['packs', backup.packs], ['sessions', backup.sessions], ['attempts', backup.attempts]]) {
              const store = tx.objectStore(name);
              for (const record of records) read(store.get(name === 'packs' ? [record.id, record.revision] : record.id), (old) => {
                if (old && canonical(old) !== canonical(record)) { abort(storageError('conflict', `Backup conflicts with an existing ${name} record. No records were imported.`)); return; }
                if (!old) store.add(record);
              });
            }
            for (const session of backup.sessions) {
              const order = { name: `attempt-order:${session.id}`, version: session.version, ids: backup.attempts.filter((a) => a.sessionId === session.id).map((a) => a.id) };
              const meta = tx.objectStore('meta');
              read(meta.get(order.name), (old) => {
                if (old && canonical(old) !== canonical(order)) { abort(storageError('conflict', 'Backup attempt order conflicts with existing progress.')); return; }
                if (!old) meta.add(order);
              });
            }
            result({ packs: backup.packs.length, sessions: backup.sessions.length, attempts: backup.attempts.length });
          }, signal);
        },
        exportBackup({ sessionId, signal, exportedAt = new Date().toISOString() } = {}) {
          if (sessionId !== undefined) return api.loadSession(sessionId, { signal }).then((bundle) => {
            if (!bundle) throw storageError('missing-session', 'The selected session is not stored.');
            return checkedBackup({ backupVersion: 1, exportedAt, packs: [bundle.pack], sessions: [bundle.session], attempts: bundle.attempts, settings: {} });
          });
          return transaction(['packs', 'sessions', 'attempts', 'meta', 'settings'], 'readonly', ({ tx, read, result }) => {
            const records = {}, orders = new Map(); let remaining = 4, orderRemaining = 0;
            function finish() {
              if (remaining || orderRemaining) return;
              const settings = records.settings.length ? checkedSettings(records.settings[0]) : {};
              const attempts = new Map(records.attempts.map((a) => [a.id, a])), ordered = [];
              for (const session of records.sessions) {
                const order = orders.get(session.id);
                if (!order || order.version !== session.version || !Array.isArray(order.ids) || order.ids.length > 1000 || new Set(order.ids).size !== order.ids.length) throw storageError('invalid-record', 'Stored attempt order is invalid.');
                for (const id of order.ids) { if (!attempts.has(id) || attempts.get(id).sessionId !== session.id) throw storageError('invalid-record', 'Stored attempt reference is invalid.'); ordered.push(attempts.get(id)); }
              }
              if (ordered.length !== records.attempts.length) throw storageError('invalid-record', 'Stored attempts are not fully referenced.');
              result({ backupVersion: 1, exportedAt, packs: records.packs, sessions: records.sessions, attempts: ordered, settings });
            }
            for (const [name, count] of [['packs', 21], ['sessions', 101], ['attempts', 10001], ['settings', 1]]) read(tx.objectStore(name).getAll(undefined, count), (values) => {
              if (name !== 'settings' && values.length === count) throw storageError('limit-exceeded', `Too many ${name} for a full backup. Export individual sessions instead.`);
              records[name] = values; remaining--;
              if (name === 'sessions') {
                orderRemaining = values.length;
                for (const session of values) read(tx.objectStore('meta').get(`attempt-order:${session.id}`), (order) => { orders.set(session.id, order); orderRemaining--; finish(); });
              }
              finish();
            });
          }, signal).then(checkedBackup);
        },
        loadSettings({ signal } = {}) {
          return transaction(['settings'], 'readonly', ({ tx, read, result }) => { read(tx.objectStore('settings').get('singleton'), (record) => result(record ?? null)); }, signal);
        },
        saveSettings(value, { expectedVersion = null, signal } = {}) {
          let record; try { record = checkedSettings(value); } catch (e) { return Promise.reject(e); }
          return transaction(['settings'], 'readwrite', ({ tx, read, abort, result }) => {
            const store = tx.objectStore('settings'); read(store.get('singleton'), (old) => {
              if ((old ? old.version : null) !== expectedVersion || (old && record.version !== old.version + 1) || (!old && record.version !== 0)) { abort(storageError('conflict', 'Preferences changed in another tab. Reload saved preferences before saving.')); return; }
              if (old && ![1,2].includes(old.settingsVersion)) { abort(storageError('unsupported-version', 'Stored preference version is unsupported.')); return; }
              store.put(record); result({ version: record.version });
            });
          }, signal);
        },
        listSessions({ afterId, signal } = {}) {
          return transaction(['sessions','packs'], 'readonly', ({ tx, read, result }) => {
            const range = afterId === undefined ? undefined : IDBKeyRange.lowerBound(afterId, true);
            read(tx.objectStore('sessions').getAll(range, 101), (records) => {
              const values = records.slice(0, 100).map((s) => {
                if (typeof s.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id) || typeof s.packId !== 'string' || s.packId.length > 128 || !Number.isSafeInteger(s.packRevision) || s.packRevision < 0 || !Number.isSafeInteger(s.version) || s.version < 0 || typeof s.updatedAt !== 'string' || s.updatedAt.length > 32 || !Number.isFinite(Date.parse(s.updatedAt)) || !['active', 'completed'].includes(s.status)) throw storageError('invalid-record', 'Stored session summary is invalid.');
                return { id: s.id, packId: s.packId, packRevision: s.packRevision, version: s.version, status: s.status, updatedAt: s.updatedAt, coverage: recordedCoverage(s) };
              });
              if (!values.length) { result({sessions:[],next:null}); return; }
              let remaining=values.length;
              for (const s of values) read(tx.objectStore('packs').get([s.packId,s.packRevision]),pack=>{
                s.title=typeof pack?.title==='string' ? pack.title : null;
                if (--remaining===0) result({ sessions: values, next: records.length > 100 ? values.at(-1).id : null });
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
