import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession } from '../src/lesson/session.js';
const packs = JSON.parse(await readFile(new URL('fixtures/packs.json', import.meta.url)));
const options = () => { let n = 0; return { id: () => `id-${++n}`, now: () => '2026-10-13T00:00:00.000Z' }; };
test('revision lock, deterministic order, hints, reset and retry preserve prior attempts', () => {
  const pack = structuredClone(packs.base), c = createLessonSession(pack, options());
  pack.revision++; pack.exercises[0].rubric.expectedDeg = 90;
  assert.deepEqual(c.snapshot().session.exerciseOrder, ['heading', 'endpoint', 'route', 'detour']);
  assert.equal(c.hint(), 'North is 0 degrees.'); assert.equal(c.hint(), null);
  c.setAnswer({ type: 'heading', degrees: 0 }); assert.equal(c.submit().status, 'correct');
  assert.throws(() => c.submit(), (e) => e.code === 'already-submitted');
  assert.throws(() => c.reset(), (e) => e.code === 'feedback-active');
  c.retry(); c.setAnswer({ type: 'heading', degrees: 90 }); c.reset();
  assert.equal(c.submit().status, 'unanswered'); assert.equal(c.snapshot().attempts.length, 1);
  c.setAnswer({ type: 'heading', degrees: 16 }); assert.equal(c.submit().status, 'incorrect');
  const state = c.snapshot(); assert.equal(state.attempts[0].packRevision, packs.base.revision); assert.equal(state.attempts[1].hintsUsed, 1);
  state.attempts[0].result.status = 'incorrect'; assert.equal(c.snapshot().attempts[0].result.status, 'correct');
});
test('all four exercises complete with valid alternatives and retain explicit attempt records', () => {
  const c = createLessonSession(packs.base, options());
  for (const answer of [{ type: 'heading', degrees: 359 }, { type: 'endpoint', coordinate: [0, 0] }, { type: 'route', edgeIds: ['AB', 'BC'] }, { type: 'detour', edgeIds: ['AD', 'DC'] }]) {
    c.setAnswer(answer); assert.equal(c.submit().status, 'correct'); c.next();
  }
  assert.equal(c.snapshot().session.status, 'completed'); assert.equal(c.snapshot().attempts.length, 4);
  assert.equal(new Set(c.snapshot().attempts.map((a) => a.id)).size, 4);
  assert.throws(() => c.retry(), (e) => e.code === 'session-ended');
});
test('draft and empty content cannot start scored sessions; transitions cannot skip submission', () => {
  assert.throws(() => createLessonSession(packs['no-exercises']), (e) => e.code === 'no-reviewed-exercises');
  const pack = structuredClone(packs.base); pack.review.status = 'draft'; pack.review.reviewedAt = null;
  assert.throws(() => createLessonSession(pack), (e) => e.code === 'no-reviewed-exercises');
  pack.review.status = 'reviewed'; pack.review.reviewedAt = packs.base.review.reviewedAt; pack.exercises[0].review = 'draft';
  const c = createLessonSession(pack, options()); assert.equal(c.snapshot().exercise.id, 'endpoint');
  assert.throws(() => c.next(), (e) => e.code === 'no-feedback'); c.end(); assert.equal(c.snapshot().phase, 'completed');
});
