import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createExercisePrint } from '../src/print/exercise.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json', import.meta.url)));
const text = (spec) => spec.blocks.map((b) => b.text).join('\n');

test('learner heading/endpoint sheets omit answer criteria and hints; instructor includes them', () => {
  const heading = structuredClone(pack); heading.exercises[0].rubric.expectedDeg = 137;
  heading.exercises[0].hints = ['Private hint: 137 degrees'];
  const learner = createExercisePrint(heading, 'heading', 'learner');
  const instructor = createExercisePrint(heading, 'heading', 'instructor');
  assert.equal(learner.headingDeg, null); assert.ok(!text(learner).includes('137'));
  assert.equal(instructor.headingDeg, 137); assert.ok(text(instructor).includes('Private hint'));
  assert.ok(text(instructor).includes('15°'));
  assert.deepEqual(createExercisePrint(pack, 'endpoint', 'learner').annotations.markers, []);
  const endpoint = createExercisePrint(pack, 'endpoint', 'instructor');
  assert.deepEqual(endpoint.annotations.markers, [{ coordinate: [0, 0], text: 'X' }]);
  assert.ok(text(endpoint).includes('20 m'));
});
test('route/detour sheets use problem endpoints/closures without inventing a unique route', () => {
  const before = JSON.stringify(pack);
  const learner = createExercisePrint(pack, 'detour', 'learner');
  assert.deepEqual(learner.annotations.markers.map((m) => m.text), ['S', 'E']);
  assert.deepEqual(learner.annotations.closedEdges.map((e) => e.id), ['BC']);
  assert.ok(text(learner).includes('Closed edge BC: B → C'));
  assert.ok(!text(learner).includes('Accept any connected'));
  const instructor = createExercisePrint(pack, 'route', 'instructor');
  assert.ok(text(instructor).includes('no single exact-match route answer'));
  assert.ok(text(instructor).includes('Unknown access'));
  assert.equal(JSON.stringify(pack), before);
});
test('print content retains literal long prompts/credits and draft status', () => {
  const p = structuredClone(pack); p.exercises[0].prompt = '<img src=x onerror=alert(1)>' + 'Z'.repeat(1900);
  p.sources[0].attribution = 'Credit '.repeat(280); p.exercises[0].review = 'draft';
  const spec = createExercisePrint(p, 'heading', 'learner');
  assert.equal(spec.draft, true); assert.ok(spec.title.includes('UNREVIEWED DRAFT'));
  assert.ok(text(spec).includes(p.exercises[0].prompt)); assert.ok(text(spec).includes(p.sources[0].attribution));
  assert.ok(spec.blocks.some((b) => b.type === 'answer-space'));
});
test('unknown exercise/audience and off-map answer markers cannot produce misleading sheets', () => {
  assert.throws(() => createExercisePrint(pack, 'missing', 'learner'), /Choose an exercise/);
  assert.throws(() => createExercisePrint(pack, 'heading', 'student'), /learner or instructor/);
  const p = structuredClone(pack); p.bounds = [.0001, .0001, .001, .001]; p.exercises.forEach((e) => { e.review = 'draft'; });
  for (const audience of ['learner', 'instructor']) assert.throws(() => createExercisePrint(p, 'endpoint', audience), /leave this print extent/);
});
