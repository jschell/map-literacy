import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession } from '../src/lesson/session.js';
import { checkedBundle, checkedPack, canonical } from '../src/storage/records.js';
import { openStorage } from '../src/storage/indexeddb.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));
function bundle() {
  const c = createLessonSession(pack); c.hint(); c.setAnswer({ type: 'heading', degrees: 359 }); c.submit(); c.retry(); c.setAnswer({ type: 'heading', degrees: 0 }); c.submit();
  const { session, attempts } = c.snapshot(); return { pack: structuredClone(pack), session, attempts };
}
test('stored bundles preserve revision, retries, hint counts and immutable JSON values', () => {
  const original = bundle(), result = checkedBundle(original);
  assert.equal(canonical(result), canonical(original));
  original.attempts[0].answer.degrees = 180;
  assert.equal(result.attempts[0].answer.degrees, 359);
  assert.equal(canonical({ a: 1, b: [2, 3] }), canonical({ b: [2, 3], a: 1 }));
  assert.notEqual(canonical([1, 2]), canonical([2, 1]));
});
test('tampered score, pack revision, hints, references and ordering reject before storage', () => {
  const mutations = [
    (v) => { v.attempts[0].result.status = 'incorrect'; },
    (v) => { v.session.packRevision++; },
    (v) => { v.attempts[0].hintsUsed = 2; },
    (v) => { v.session.answers.heading = crypto.randomUUID(); },
    (v) => { v.session.exerciseOrder.reverse(); },
    (v) => { v.attempts[1].id = v.attempts[0].id; },
    (v) => { v.attempts.reverse(); },
    (v) => { v.session.updatedAt = 'bad date'; },
    (v) => { v.session.index = 0.5; },
    (v) => { v.attempts[0].result.metrics.angularErrorDeg = NaN; },
    (v) => { v.attempts[0].answer.extra = 'unsupported'; }
  ];
  for (const mutate of mutations) { const v = bundle(); mutate(v); assert.throws(() => checkedBundle(v), (e) => e.code === 'invalid-record'); }
});
test('unanswered attempts, drafts, invalid packs and per-session limits fail explicitly', () => {
  const v = bundle(); v.attempts[0].answer = null;
  assert.throws(() => checkedBundle(v), (e) => e.code === 'invalid-record');
  const draft = bundle(); draft.pack.review.status = 'draft'; draft.pack.review.reviewedAt = null;
  assert.throws(() => checkedBundle(draft), (e) => e.code === 'invalid-record');
  assert.throws(() => checkedPack({}), (e) => e.code === 'invalid-pack');
  const large = bundle(); large.attempts = Array(1001).fill(large.attempts[0]);
  assert.throws(() => checkedBundle(large), (e) => e.code === 'invalid-record');
});
test('unavailable, denied/quota and canceled opens are distinguishable without deleting data', async () => {
  await assert.rejects(openStorage({ factory: null }), (e) => e.code === 'storage-unavailable');
  await assert.rejects(openStorage({ factory: { open() { throw new DOMException('Quota', 'QuotaExceededError'); } } }), (e) => e.code === 'storage-full');
  const c = new AbortController(); c.abort();
  await assert.rejects(openStorage({ factory: { open() { throw new Error('Must not open'); } }, signal: c.signal }), (e) => e.code === 'canceled');
});
