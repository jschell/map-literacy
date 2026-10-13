import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scoreAnswer } from '../src/lesson/score.js';
import { EARTH_RADIUS_M } from '../src/geo/distance.js';
const packs = JSON.parse(await readFile(new URL('fixtures/packs.json', import.meta.url)));
const expected = JSON.parse(await readFile(new URL('fixtures/expected.json', import.meta.url)));
for (const fixture of expected.lessonCases.filter((c) => c.statuses)) {
  test(`published scoring fixture: ${fixture.id}`, () => {
    const answers = fixture.distancesM?.map((m) => ({ type: 'endpoint', coordinate: [0, m / EARTH_RADIUS_M * 180 / Math.PI] }))
      ?? fixture.answers.map((a) => fixture.exercise === 'heading' ? { type: 'heading', degrees: a } : { type: fixture.exercise, edgeIds: a });
    assert.deepEqual(answers.map((answer) => scoreAnswer(packs[fixture.pack], fixture.exercise, answer).status), fixture.statuses);
  });
}
test('missing, malformed and bounded answers cannot become correct', () => {
  for (const answer of [null, {}, { type: 'heading', degrees: NaN }, { type: 'heading', degrees: 360 }]) assert.equal(scoreAnswer(packs.base, 'heading', answer).status, 'unanswered');
  for (const coordinate of [[Infinity, 0], [0, 91], [0], '0,0']) assert.equal(scoreAnswer(packs.base, 'endpoint', { type: 'endpoint', coordinate }).status, 'unanswered');
  assert.equal(scoreAnswer(packs.base, 'route', { type: 'route', edgeIds: Array(1001).fill('AB') }).status, 'unanswered');
  assert.equal(scoreAnswer(packs.base, 'route', { type: 'route', edgeIds: [] }).reasonCode, 'wrong-endpoint');
});
test('crossing geometry and reversed roads never create graph connections', () => {
  const pack = structuredClone(packs.base), exercise = pack.exercises.find((e) => e.id === 'route');
  exercise.rubric.startNodeId = 'E'; exercise.rubric.endNodeId = 'H';
  assert.equal(scoreAnswer(pack, 'route', { type: 'route', edgeIds: ['EF', 'GH'] }).reasonCode, 'disconnected');
  exercise.rubric.startNodeId = 'B'; exercise.rubric.endNodeId = 'A';
  assert.equal(scoreAnswer(pack, 'route', { type: 'route', edgeIds: ['AB'] }).reasonCode, 'disconnected');
});
test('distance objective is inclusive and scenario does not mutate source records', () => {
  const pack = structuredClone(packs.base), exercise = pack.exercises.find((e) => e.id === 'route');
  exercise.rubric.objective = 'max-distance'; exercise.rubric.maxDistanceM = pack.topology.edges[0].lengthM + pack.topology.edges[1].lengthM;
  const answer = { type: 'route', edgeIds: ['AB', 'BC'] }, before = JSON.stringify(pack);
  assert.equal(scoreAnswer(pack, 'route', answer).status, 'correct');
  assert.equal(JSON.stringify(pack), before);
  exercise.rubric.maxDistanceM -= 0.001;
  assert.equal(scoreAnswer(pack, 'route', answer).reasonCode, 'distance-exceeded');
  assert.equal(scoreAnswer(packs.base, 'detour', { type: 'detour', edgeIds: answer.edgeIds }).reasonCode, 'closed-edge');
  assert.equal(packs.base.topology.edges[1].access, 'allowed');
});
test('draft and partial topology stay review-only, even for apparently valid answers', () => {
  assert.equal(scoreAnswer(packs['incomplete-relation'], 'route', { type: 'route', edgeIds: ['AD', 'DC'] }).status, 'needs-review');
  const pack = structuredClone(packs.base); pack.exercises[0].review = 'draft';
  assert.equal(scoreAnswer(pack, 'heading', { type: 'heading', degrees: 0 }).status, 'needs-review');
  pack.review.status = 'draft'; pack.review.reviewedAt = null;
  assert.equal(scoreAnswer(pack, 'endpoint', { type: 'endpoint', coordinate: [0, 0] }).status, 'needs-review');
});
test('scoring has no view or hint dependency and rejects invalid pack/exercise references', () => {
  const before = JSON.stringify(packs.base);
  const score = scoreAnswer(packs.base, 'heading', { type: 'heading', degrees: 359 });
  assert.deepEqual(score, { status: 'correct', metrics: { angularErrorDeg: 1 }, reasonCode: 'within-tolerance', rubricVersion: 1 });
  assert.equal(JSON.stringify(packs.base), before);
  assert.throws(() => scoreAnswer(packs.base, 'missing', null), (e) => e.code === 'missing-exercise');
  assert.throws(() => scoreAnswer(packs['bad-reference'], 'route', null), (e) => e.code === 'invalid-pack');
});
