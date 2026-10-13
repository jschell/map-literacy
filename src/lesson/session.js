import { validatePack } from '../data/validate-pack.js';
import { scoreAnswer } from './score.js';
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

/** Revision-locked memory session. Durability belongs to the storage adapter in Plan 05. */
export function createLessonSession(value, { id = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  if (!validatePack(value).valid) fail('invalid-pack', 'Choose a validated lesson pack.');
  const pack = structuredClone(value);
  const order = pack.review.status === 'reviewed' ? pack.exercises.filter((e) => e.review === 'reviewed').map((e) => e.id) : [];
  if (!order.length) fail('no-reviewed-exercises', 'No reviewed exercises are available.');
  const startedAt = now();
  const session = { id: id(), version: 0, packId: pack.id, packRevision: pack.revision, exerciseOrder: order, index: 0, answers: Object.create(null), hintCounts: Object.fromEntries(order.map((exerciseId) => [exerciseId, 0])), startedAt, updatedAt: startedAt, status: 'active' };
  const attempts = []; let phase = 'practicing', draft = null;
  const exercise = () => pack.exercises.find((e) => e.id === order[session.index]);
  const active = () => { if (session.status !== 'active') fail('session-ended', 'Start a new session.'); };
  const touch = () => { session.version += 1; session.updatedAt = now(); };
  return {
    snapshot: () => structuredClone({ session, attempts, phase, draft, exercise: exercise() }),
    setAnswer(answer) { active(); if (phase !== 'practicing') fail('feedback-active', 'Retry before changing the answer.'); draft = structuredClone(answer); },
    reset() { active(); if (phase !== 'practicing') fail('feedback-active', 'Retry before resetting the draft.'); draft = null; },
    hint() {
      active(); const e = exercise(), count = session.hintCounts[e.id] ?? 0;
      if (count >= e.hints.length) return null;
      session.hintCounts[e.id] = count + 1; touch(); return e.hints[count];
    },
    submit() {
      active(); if (phase !== 'practicing') fail('already-submitted', 'This answer was submitted. Retry for another attempt.');
      const e = exercise(), score = scoreAnswer(pack, e.id, draft);
      if (score.status === 'unanswered') return score;
      if (attempts.length >= 1000) fail('attempt-limit', 'This memory session has reached 1,000 attempts. End it before starting another.');
      const attempt = { id: id(), sessionId: session.id, packId: pack.id, packRevision: pack.revision, exerciseId: e.id, answer: structuredClone(draft), result: score, hintsUsed: session.hintCounts[e.id] ?? 0, submittedAt: now() };
      attempts.push(attempt); session.answers[e.id] = attempt.id; phase = 'feedback'; touch(); return structuredClone(score);
    },
    retry() { active(); if (phase !== 'feedback') fail('no-feedback', 'Submit an answer before retrying.'); draft = null; phase = 'practicing'; touch(); },
    next() {
      active(); if (phase !== 'feedback') fail('no-feedback', 'Submit an answer before continuing.');
      if (session.index === order.length - 1) { session.status = 'completed'; phase = 'completed'; }
      else { session.index += 1; draft = null; phase = 'practicing'; }
      touch();
    },
    end() { active(); session.status = 'completed'; phase = 'completed'; draft = null; touch(); }
  };
}
