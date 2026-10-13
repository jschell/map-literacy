/** Real Chromium IndexedDB transactions; no fake IndexedDB/runtime dependency. */
export async function checkStorage(page) {
  return page.evaluate(async () => {
    const { openStorage } = await import('/src/storage/indexeddb.js');
    const { canonical } = await import('/src/storage/records.js');
    const { createLessonSession } = await import('/src/lesson/session.js');
    const pack = await (await fetch('/tests/fixtures/street-square.json')).json();
    const name = `map-literacy-test-${crypto.randomUUID()}`;
    const assert = (condition, message) => { if (!condition) throw new Error(`Storage check: ${message}`); };
    const rejects = async (operation, code) => { try { await operation(); } catch (e) { assert(e.code === code, `expected ${code}, got ${e.code}`); return; } throw new Error(`Expected rejection: ${code}`); };
    const bundle = (controller) => { const { session, attempts } = controller.snapshot(); return { pack, session, attempts }; };
    let first, second;
    try {
      first = await openStorage({ name }); second = await openStorage({ name });
      assert((await first.savePack(pack)).inserted, 'first pack insertion');
      assert(!(await second.savePack(JSON.parse(canonical(pack)))).inserted, 'same content/key reordering is idempotent');
      const altered = structuredClone(pack); altered.title += ' changed';
      await rejects(() => first.savePack(altered), 'revision-conflict');
      assert(canonical(await first.loadPack(pack.id, pack.revision)) === canonical(pack), 'revision conflict retains original');
      const c = createLessonSession(pack);
      await first.commit(bundle(c)); const initial = bundle(c);
      c.hint(); c.setAnswer({ type: 'heading', degrees: 359 }); c.submit();
      const answer = bundle(c); await first.commit(answer, { expectedVersion: 0 });
      await rejects(() => second.commit(initial, { expectedVersion: 0 }), 'conflict');
      assert(canonical(await second.loadSession(answer.session.id)) === canonical(answer), 'complete session/attempt roundtrip');
      const removed = structuredClone(answer); removed.session.version++; removed.attempts = []; removed.session.answers = {};
      await rejects(() => first.commit(removed, { expectedVersion: answer.session.version }), 'conflict');
      const retries = createLessonSession(pack);
      for (const degrees of [1, 2, 3]) { retries.setAnswer({ type: 'heading', degrees }); retries.submit(); if (degrees < 3) retries.retry(); }
      const history = bundle(retries); await first.commit(history);
      assert(canonical(await first.loadSession(history.session.id)) === canonical(history), 'retry order survives reload');
      const reordered = structuredClone(history); [reordered.attempts[0], reordered.attempts[1]] = [reordered.attempts[1], reordered.attempts[0]]; reordered.session.version++;
      await rejects(() => first.commit(reordered, { expectedVersion: history.session.version }), 'conflict');
      // Both writers have the same old version; exactly one transaction may commit.
      const left = structuredClone(answer), right = structuredClone(answer);
      left.session.version++; right.session.version++; left.session.status = 'completed'; right.session.status = 'completed';
      const race = await Promise.allSettled([first.commit(left, { expectedVersion: answer.session.version }), second.commit(right, { expectedVersion: answer.session.version })]);
      assert(race.filter((r) => r.status === 'fulfilled').length === 1 && race.find((r) => r.status === 'rejected').reason.code === 'conflict', 'concurrent version lease');
      first.close(); second.close();
      first = await openStorage({ name });
      assert((await first.loadSession(answer.session.id)).session.status === 'completed', 'close/reopen retains committed progress');
      const bad = structuredClone(answer); bad.attempts[0].result.status = 'incorrect';
      await rejects(() => first.commit(bad, { expectedVersion: left.session.version }), 'invalid-record');
      assert((await first.loadSession(answer.session.id)).attempts[0].result.status === 'correct', 'bad result retains old records');
      // Abort AFTER a pack request succeeds; successful request must not be called Saved.
      const signal = new AbortController();
      const factory = { open(...args) {
        const request = indexedDB.open(...args);
        request.addEventListener('success', () => {
          const db = request.result, original = db.transaction.bind(db);
          db.transaction = (...args) => {
            const tx = original(...args), originalStore = tx.objectStore.bind(tx);
            tx.objectStore = (key) => {
              const store = originalStore(key);
              if (key === 'packs') {
                const add = store.add.bind(store);
                store.add = (...args) => { const r = add(...args); r.addEventListener('success', () => signal.abort(), { once: true }); return r; };
              }
              return store;
            };
            return tx;
          };
        });
        return request;
      } };
      second = await openStorage({ name, factory });
      const next = structuredClone(pack); next.revision++;
      await rejects(() => second.savePack(next, { signal: signal.signal }), 'canceled');
      assert(await first.loadPack(next.id, next.revision) === null, 'abort after request rolls back pack');
      second.close();
      // Attempt ID conflict occurs after queued session writes; all three stores roll back.
      const nextPack = structuredClone(pack); nextPack.revision += 2;
      const other = createLessonSession(nextPack); other.setAnswer({ type: 'heading', degrees: 0 }); other.submit();
      const collision = { ...bundle(other), pack: nextPack }; collision.attempts[0].id = answer.attempts[0].id; collision.session.answers.heading = answer.attempts[0].id;
      await rejects(() => first.commit(collision), 'conflict');
      assert(await first.loadSession(collision.session.id) === null, 'late conflict rolls back new session');
      assert(await first.loadPack(nextPack.id, nextPack.revision) === null, 'late conflict rolls back new pack too');
      // Verify versionchange closes our connection and reports reload-needed.
      let changed = false;
      second = await openStorage({ name, onVersionChange: () => { changed = true; } }); first.close();
      const upgrade = indexedDB.open(name, 2);
      await new Promise((resolve, reject) => { upgrade.onsuccess = resolve; upgrade.onerror = () => reject(upgrade.error); });
      assert(changed, 'versionchange notification'); upgrade.result.close();
      await rejects(() => second.loadSession(answer.session.id), 'storage-unavailable');
      await rejects(() => openStorage({ name }), 'storage-unavailable');
      return { transactions: 'passed', conflicts: 'passed', abortRollback: 'passed', versionChange: 'passed' };
    } finally {
      first?.close(); second?.close();
      // Only a unique disposable test database is removed. Application recovery never deletes data.
      await new Promise((resolve, reject) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = resolve; r.onerror = () => reject(r.error); });
    }
  });
}
