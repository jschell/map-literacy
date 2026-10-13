import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession, resumeLessonSession } from '../src/lesson/session.js';
import { checkedBackup, serializeBackup, readBackup } from '../src/storage/backup.js';
import { canonical } from '../src/storage/records.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));
function example() {
  const controller = createLessonSession(pack); controller.hint(); controller.setAnswer({ type: 'heading', degrees: 359 }); controller.submit();
  const { session, attempts } = controller.snapshot();
  return { backupVersion: 1, exportedAt: new Date().toISOString(), packs: [structuredClone(pack)], sessions: [session], attempts, settings: {} };
}
test('UTF-8 backup roundtrip preserves provenance, revisions, hints and results', async () => {
  const value = example(); const decoded = await readBackup(new Blob([serializeBackup(value)]));
  assert.equal(canonical(decoded), canonical(value));
  decoded.packs[0].title = 'Changed'; assert.equal(value.packs[0].title, pack.title);
});
test('bad references, duplicate IDs, scores and revisions cannot enter backup storage', () => {
  for (const mutate of [
    (v) => v.packs.push(v.packs[0]), (v) => v.sessions.push(v.sessions[0]), (v) => v.attempts.push(v.attempts[0]),
    (v) => { v.packs = []; }, (v) => { v.sessions = []; }, (v) => { v.attempts[0].result.status = 'incorrect'; },
    (v) => { v.sessions[0].packRevision++; }, (v) => { v.sessions[0].answers.heading = crypto.randomUUID(); }
  ]) { const value = example(); mutate(value); assert.throws(() => checkedBackup(value)); }
});
test('backup capabilities, counts, encoding and cancellation fail explicitly', async () => {
  const value = example(); value.backupVersion = 2; assert.throws(() => checkedBackup(value), (e) => e.code === 'unsupported-version');
  value.backupVersion = 1; value.settings = { units: 'metric' }; assert.throws(() => checkedBackup(value), (e) => e.code === 'unsupported-capability');
  value.settings = {}; value.sessions = Array(101).fill(value.sessions[0]); assert.throws(() => checkedBackup(value), (e) => e.code === 'limit-exceeded');
  class OversizedBlob extends Blob { get size() { return 50 * 1024 * 1024 + 1; } arrayBuffer() { throw new Error('Must not read oversized input'); } }
  await assert.rejects(readBackup(new OversizedBlob()), (e) => e.code === 'limit-exceeded');
  await assert.rejects(readBackup(new Blob([new Uint8Array([255])])), (e) => e.code === 'invalid-backup');
  await assert.rejects(readBackup(new Blob(['{'])), (e) => e.code === 'invalid-backup');
  const canceled = new AbortController(); canceled.abort(); await assert.rejects(readBackup(new Blob(['{}']), canceled.signal), (e) => e.code === 'canceled');
});
test('resume retains committed feedback and hints but discards drafts; retry adds an attempt', () => {
  const backup = example(), bundle = { pack: backup.packs[0], session: backup.sessions[0], attempts: backup.attempts };
  const resumed = resumeLessonSession(bundle); assert.equal(resumed.snapshot().phase, 'feedback'); assert.equal(resumed.snapshot().draft, null);
  assert.equal(resumed.hint(), null); assert.throws(() => resumed.submit(), (e) => e.code === 'already-submitted');
  resumed.retry(); resumed.setAnswer({ type: 'heading', degrees: 0 }); assert.equal(resumed.submit().status, 'correct');
  assert.equal(resumed.snapshot().attempts.length, 2); assert.equal(backup.attempts.length, 1);
  resumed.next(); const state = resumed.snapshot();
  const next = resumeLessonSession({ pack, session: state.session, attempts: state.attempts });
  assert.equal(next.snapshot().exercise.id, 'endpoint'); assert.equal(next.snapshot().phase, 'practicing');
  next.end(); const ended = next.snapshot();
  assert.equal(resumeLessonSession({ pack, session: ended.session, attempts: ended.attempts }).snapshot().phase, 'completed');
});

test('resume remains exportable when the local clock precedes the backup clock', () => {
  const value = example(), future = '2029-01-01T00:00:00.000Z';
  value.sessions[0].startedAt = future; value.sessions[0].updatedAt = future; value.attempts[0].submittedAt = future;
  const c = resumeLessonSession({ pack, session: value.sessions[0], attempts: value.attempts }, { now: () => '2026-10-13T00:00:00.000Z' });
  c.retry(); c.setAnswer({ type: 'heading', degrees: 0 }); c.submit();
  const { session, attempts } = c.snapshot();
  assert.equal(checkedBackup({ ...value, sessions: [session], attempts }).attempts[1].submittedAt, future);
});
