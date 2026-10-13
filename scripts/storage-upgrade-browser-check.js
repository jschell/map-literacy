/** Upgrade fixtures use real IndexedDB; production still implements version 1 only. */
export async function checkStorageUpgrades(page) {
  return page.evaluate(async () => {
    const { openStorage } = await import('/src/storage/indexeddb.js');
    const { canonical } = await import('/src/storage/records.js');
    const { createLessonSession } = await import('/src/lesson/session.js');
    const pack = await (await fetch('/tests/fixtures/street-square.json')).json();
    const prefix = `map-literacy-upgrade-test-${crypto.randomUUID()}`;
    const names = [], connections = new Set();
    const assert = (value, message) => { if (!value) throw new Error(`Upgrade check: ${message}`); };
    const rejected = async (promise, code) => {
      try { await promise; } catch (error) { assert(error.code === code, `expected ${code}, got ${error.code}`); return; }
      throw new Error(`Expected ${code}`);
    };
    const requestDone = (request) => new Promise((resolve, reject) => {
      request.onsuccess = () => { connections.add(request.result); resolve(request.result); };
      request.onerror = () => reject(request.error);
    });
    const read = (db, store, key) => new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const name = (suffix) => { const value = `${prefix}-${suffix}`; names.push(value); return value; };
    let storage;
    try {
      const validName = name('valid');
      storage = await openStorage({ name: validName });
      const controller = createLessonSession(pack);
      controller.hint(); controller.setAnswer({ type: 'heading', degrees: 0 }); controller.submit();
      const { session, attempts } = controller.snapshot(); const bundle = { pack, session, attempts };
      await storage.commit(bundle);
      const before = await storage.exportBackup(); storage.close();
      // A raw connection deliberately stays open, like an older tab that ignores versionchange.
      const blocker = await requestDone(indexedDB.open(validName));
      const cancel = new AbortController(); let blocked = 0;
      let pendingRequest;
      const futureFactory = { open(dbName) { pendingRequest = indexedDB.open(dbName, 2); return pendingRequest; } };
      let notifyBlocked;
      const didBlock = new Promise((resolve) => { notifyBlocked = resolve; });
      const pending = openStorage({ name: validName, factory: futureFactory, signal: cancel.signal, onBlocked: (event) => {
        assert(event.code === 'migration-blocked', 'blocked notification'); blocked++; notifyBlocked();
      } });
      const canceled = rejected(pending, 'canceled');
      await didBlock; cancel.abort(); await canceled;
      const abortedRequest = new Promise((resolve, reject) => {
        pendingRequest.addEventListener('error', () => { assert(pendingRequest.error.name === 'AbortError', 'canceled queued upgrade aborts'); resolve(); });
        pendingRequest.addEventListener('success', () => { pendingRequest.result.close(); reject(new Error('Canceled upgrade unexpectedly succeeded')); });
      });
      blocker.close(); await abortedRequest;
      assert(blocked === 1, 'one blocked notification');
      // Unsupported migrations are rejected before mutating an existing database.
      await rejected(openStorage({ name: validName, factory: futureFactory }), 'unsupported-version');
      storage = await openStorage({ name: validName });
      assert(canonical(await storage.exportBackup({ exportedAt: before.exportedAt })) === canonical(before), 'canceled/unsupported upgrade retains every record');
      storage.close();
      // A future migration fixture queues destructive changes then fails. This tests
      // rollback semantics, not a supported version-2 production migration.
      const failing = indexedDB.open(validName, 2);
      failing.onupgradeneeded = () => {
        const db = failing.result, tx = failing.transaction;
        db.createObjectStore('future'); db.deleteObjectStore('settings');
        tx.objectStore('packs').clear(); tx.objectStore('sessions').clear();
        const clear = tx.objectStore('attempts').clear();
        clear.onsuccess = () => tx.abort();
      };
      await new Promise((resolve, reject) => {
        failing.onerror = () => { assert(failing.error.name === 'AbortError', 'migration failure aborts'); resolve(); };
        failing.onsuccess = () => { failing.result.close(); reject(new Error('Failing migration unexpectedly succeeded')); };
      });
      storage = await openStorage({ name: validName });
      assert(canonical(await storage.exportBackup({ exportedAt: before.exportedAt })) === canonical(before), 'failed migration restores schema and all records');
      storage.close();
      // A partial first initialization must roll back and be safe to retry.
      const initialName = name('initialization');
      const brokenFactory = { open(...args) {
        const request = indexedDB.open(...args);
        request.addEventListener('upgradeneeded', () => {
          const db = request.result, create = db.createObjectStore.bind(db);
          db.createObjectStore = (store, options) => {
            if (store === 'attempts') throw new DOMException('Injected initialization failure', 'UnknownError');
            return create(store, options);
          };
        });
        return request;
      } };
      await rejected(openStorage({ name: initialName, factory: brokenFactory }), 'storage-unavailable');
      storage = await openStorage({ name: initialName });
      await storage.commit(bundle);
      assert(canonical(await storage.loadSession(session.id)) === canonical(bundle), 'failed initialization retries cleanly');
      storage.close();
      // Reject missing stores, wrong keys, and unsafe/missing indexes before use.
      for (const variant of ['missing-store', 'wrong-key', 'missing-index', 'wrong-index', 'unique-index', 'multi-index', 'auto-increment', 'extra-store']) {
        const malformedName = name(variant), request = indexedDB.open(malformedName, 1);
        const marker = { singleton: 'singleton', evidence: variant };
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('packs', { keyPath: ['id', 'revision'] });
          db.createObjectStore('sessions', { keyPath: variant === 'wrong-key' ? 'other' : 'id', autoIncrement: variant === 'auto-increment' });
          const attemptsStore = db.createObjectStore('attempts', { keyPath: 'id' });
          if (variant !== 'missing-index') attemptsStore.createIndex('sessionId', variant === 'wrong-index' ? 'other' : 'sessionId', { unique: variant === 'unique-index', multiEntry: variant === 'multi-index' });
          db.createObjectStore('settings', { keyPath: 'singleton' }).add(marker);
          if (variant !== 'missing-store') db.createObjectStore('meta', { keyPath: 'name' });
          if (variant === 'extra-store') db.createObjectStore('extra');
        };
        const raw = await requestDone(request); raw.close();
        await rejected(openStorage({ name: malformedName }), 'invalid-schema');
        const retained = await requestDone(indexedDB.open(malformedName));
        assert(canonical(await read(retained, 'settings', 'singleton')) === canonical(marker), `${variant} preserves original data`);
        retained.close();
      }
      return { blockedCancellation: 'passed', unsupportedUpgrade: 'passed', migrationRollback: 'passed', initializationRetry: 'passed', incompatibleSchemas: 8 };
    } finally {
      storage?.close(); for (const db of connections) db.close();
      // Only unique fixture databases are deleted. The app never deletes data as recovery.
      for (const testName of names) await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(testName); request.onsuccess = resolve; request.onerror = () => reject(request.error);
      });
    }
  });
}
