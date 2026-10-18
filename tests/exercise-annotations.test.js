import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exerciseAnnotations} from '../src/lesson/annotations.js';
import {createExercisePrint} from '../src/print/exercise.js';
const pack = JSON.parse(await readFile(new URL('fixtures/street-square.json',import.meta.url)));
test('endpoint clues use every reference without consulting the answer', () => {
  const exercise = structuredClone(pack.exercises.find(e=>e.type==='endpoint'));
  Object.defineProperty(exercise,'rubric',{get(){throw new Error('Answer key read');}});
  const clues = exerciseAnnotations(pack,exercise);
  assert.deepEqual(clues.markers.map(m=>m.text),pack.topology.nodes.map(n=>n.id));
  assert.ok(!clues.markers.some(m=>m.text==='X'));
});
test('screen and learner print share source identities and scenario-only closure clues', () => {
  const before = JSON.stringify(pack);
  for (const exercise of pack.exercises) {
    const screen = exerciseAnnotations(pack,exercise);
    assert.deepEqual(screen,createExercisePrint(pack,exercise.id,'learner').annotations);
    assert.deepEqual(screen.closedEdges.map(e=>e.id),exercise.scenario?.closedEdgeIds??[]);
  }
  assert.equal(JSON.stringify(pack),before);
});
test('reference display does not invent junctions where disconnected roads cross', () => {
  const {markers}=exerciseAnnotations(pack,pack.exercises[1]);
  assert.ok(!markers.some(m=>m.coordinate[0]===.0005 && m.coordinate[1]===.0005));
  const source = structuredClone(pack); source.sources[0].kind='osm';
  assert.deepEqual(exerciseAnnotations(source,source.exercises[1]).markers,[],'real source IDs are not invented teaching references');
});
