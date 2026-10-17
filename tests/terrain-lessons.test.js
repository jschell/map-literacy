import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTerrainLessonFixture } from '../scripts/terrain-lesson-fixture.js';
import { validatePack } from '../src/data/validate-pack.js';
import { scoreAnswer } from '../src/lesson/score.js';
import { createLessonSession,resumeLessonSession } from '../src/lesson/session.js';
import { checkedBundle } from '../src/storage/records.js';
import { serializeBackup,readBackup } from '../src/storage/backup.js';
import { createExercisePrint } from '../src/print/exercise.js';
import { createMapModel } from '../src/map/model.js';

test('versioned synthetic terrain validates and tampered geometry/levels/sources/capabilities fail',()=>{
  const pack=buildTerrainLessonFixture();assert.deepEqual(validatePack(pack),{valid:true,errors:[]});
  const changes=[p=>p.schemaVersion=1,p=>p.capabilities=['terrain-v1'],p=>p.terrain.grid.source.kind='usgs-3dep',p=>p.terrain.contours[0].levelM++,p=>p.features.features[0].geometry.coordinates[0][0]+=.00001,p=>p.sources[0].sha256='b'.repeat(64),p=>p.terrain.extra=true,p=>p.terrain.grid.width=33,p=>p.terrain.intervalM=2,p=>p.terrain.contours[1].featureId=p.terrain.contours[0].featureId,p=>p.exercises[0].rubric.referenceFeatureId=p.exercises[0].rubric.featureId];
  for(const change of changes){const p=structuredClone(pack);change(p);assert.equal(validatePack(p).valid,false);}
});

test('contour elevation scoring uses derived levels, inclusive tolerance and explicit draft/missing states',()=>{
  const p=buildTerrainLessonFixture();
  for(const elevationM of [85,85.01,84.99])assert.equal(scoreAnswer(p,'elevation-1',{type:'contour-elevation',elevationM}).status,'correct');
  assert.equal(scoreAnswer(p,'elevation-1',{type:'contour-elevation',elevationM:75}).status,'incorrect');
  for(const answer of [null,{type:'heading',degrees:85},{type:'contour-elevation',elevationM:'85'},{type:'contour-elevation',elevationM:NaN}])assert.equal(scoreAnswer(p,'elevation-1',answer).status,'unanswered');
  p.review.status='draft';p.review.reviewedAt=null;
  assert.equal(scoreAnswer(p,'elevation-1',{type:'contour-elevation',elevationM:85}).status,'needs-review');
  assert.throws(()=>createLessonSession(p),e=>e.code==='no-reviewed-exercises');
});

test('terrain sessions/backups preserve hints/revision/results and reject fabricated scores',async()=>{
  const pack=buildTerrainLessonFixture(),c=createLessonSession(pack);c.hint();c.setAnswer({type:'contour-elevation',elevationM:85});c.submit();
  const {session,attempts}=c.snapshot(),bundle=checkedBundle({pack,session,attempts});
  const text=serializeBackup({backupVersion:1,exportedAt:session.updatedAt,packs:[pack],sessions:[session],attempts,settings:{}});
  const backup=await readBackup(new Blob([text]));assert.equal(backup.packs[0].schemaVersion,2);assert.deepEqual(backup.attempts,attempts);
  const resumed=resumeLessonSession(bundle);assert.equal(resumed.snapshot().session.hintCounts['elevation-1'],1);resumed.next();resumed.setAnswer({type:'contour-elevation',elevationM:90});assert.equal(resumed.submit().status,'correct');
  const bad=structuredClone(bundle);bad.attempts[0].answer.elevationM=75;assert.throws(()=>checkedBundle(bad));
  const extra=structuredClone(bundle);extra.attempts[0].answer.edgeIds=[];assert.throws(()=>checkedBundle(extra));
});

test('learner maps omit target answer while instructor sheets share revision and derived geometry',()=>{
  const p=buildTerrainLessonFixture(),learner=createExercisePrint(p,'elevation-1','learner'),instructor=createExercisePrint(p,'elevation-1','instructor');
  assert.deepEqual(learner.annotations.markers.map(m=>m.text),['80 m','A']);
  assert.deepEqual(instructor.annotations.markers.map(m=>m.text),['80 m','A: 85 m']);
  assert.ok(!learner.blocks.some(b=>b.text.includes('Expected contour A elevation')));
  assert.ok(instructor.blocks.some(b=>b.text.includes('Expected contour A elevation: 85 m')));
  for(const orientation of ['portrait','landscape']) {const m=createMapModel(p,{paper:true,orientation});assert.equal(m.paths.length,3);assert.ok(m.paths.every(path=>path.role==='contour'));assert.equal(m.packId,p.id);}
});
