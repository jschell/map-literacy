import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession } from '../src/lesson/session.js';
import { createAutosave, forkSessionBundle, findStoredVersion } from '../src/storage/autosave.js';
import { canonical } from '../src/storage/records.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));
const bundle = (c) => { const { session, attempts } = c.snapshot(); return { pack, session, attempts }; };
test('Saved occurs after commit completion; failures retain the lease for retry', async () => {
  let resolve, reject, calls = [], changes = [], events = [];
  const writer = createAutosave({ storage: { commit(value, options) { calls.push(options.expectedVersion); return new Promise((r, j) => { resolve = r; reject = j; }); } }, onChange: (s) => changes.push(s.state), emit: (name) => events.push(name) });
  const c = createLessonSession(pack); writer.bind(bundle(c));
  const pending = writer.save(); await Promise.resolve(); assert.equal(writer.snapshot().state, 'saving'); assert.deepEqual(events, []);
  assert.equal(writer.save(), pending); assert.throws(() => writer.bind(bundle(c)), (e) => e.code === 'save-pending');
  reject(Object.assign(new Error('Quota'), { code: 'storage-full' })); await assert.rejects(pending); assert.equal(writer.snapshot().state, 'error');
  const retry = writer.save(); await Promise.resolve(); resolve({ sessionId: c.snapshot().session.id, version: 0 }); await retry;
  assert.equal(writer.snapshot().state, 'saved'); assert.deepEqual(calls, [null, null]);
  c.hint(); const hint = writer.save(bundle(c)); await Promise.resolve(); assert.equal(calls.at(-1), 0); resolve({ sessionId: c.snapshot().session.id, version: 1 }); await hint;
  assert.deepEqual(events, ['save-failed', 'save-completed', 'save-completed']); assert.ok(changes.includes('saving'));
});
test('conflicting progress forks with new IDs while retaining rubric results and hints', async () => {
  const c = createLessonSession(pack); c.hint(); c.setAnswer({ type: 'heading', degrees: 359 }); c.submit(); const original = bundle(c), copy = forkSessionBundle(original);
  assert.notEqual(copy.session.id, original.session.id); assert.notEqual(copy.attempts[0].id, original.attempts[0].id);
  assert.equal(copy.session.answers.heading, copy.attempts[0].id); assert.deepEqual(copy.attempts[0].result, original.attempts[0].result); assert.equal(copy.attempts[0].hintsUsed, 1);
  assert.equal(await findStoredVersion({ loadSession: async () => structuredClone(original) }, original), original.session.version);
  assert.equal(await findStoredVersion({ loadSession: async () => null }, original), null);
  await assert.rejects(findStoredVersion({ loadSession: async () => copy }, original), (e) => e.code === 'conflict');
  assert.equal(canonical(original), canonical(bundle(c)));
});

test('preflight failure reports not-saved and a pending writer rejects a different snapshot', async () => {
  let resolve; const c = createLessonSession(pack);
  const writer = createAutosave({ storage: { commit() { return new Promise((r) => { resolve = r; }); } } }); writer.bind(bundle(c));
  const pending = writer.save(); await Promise.resolve(); c.hint();
  await assert.rejects(writer.save(bundle(c)), (e) => e.code === 'save-pending');
  resolve({ sessionId: c.snapshot().session.id, version: 0 }); await pending;
  const invalid = bundle(c); invalid.session.packRevision++;
  await assert.rejects(writer.save(invalid), (e) => e.code === 'invalid-record'); assert.equal(writer.snapshot().state, 'error'); assert.equal(writer.snapshot().savedVersion, 0);
});
