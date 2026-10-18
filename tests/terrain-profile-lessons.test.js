import test from 'node:test';import assert from 'node:assert/strict';
import {buildTerrainProfileFixture,buildTerrainLessonFixture,buildTerrainSlopeFixture} from '../scripts/terrain-lesson-fixture.js';
import {validatePack} from '../src/data/validate-pack.js';import {profileAnswer,deriveLessonProfile} from '../src/terrain/lesson-pack.js';import {scoreAnswer} from '../src/lesson/score.js';import {createExercisePrint} from '../src/print/exercise.js';
import {createLessonSession,resumeLessonSession} from '../src/lesson/session.js';import {checkedBundle} from '../src/storage/records.js';import {serializeBackup,readBackup} from '../src/storage/backup.js';
test('profile lesson capability validates complete bounded paths and rejects gaps, missing capability and tampering',()=>{
 const p=buildTerrainProfileFixture();assert.deepEqual(validatePack(p),{valid:true,errors:[]});assert.equal(validatePack(buildTerrainLessonFixture()).valid,true);assert.equal(validatePack(buildTerrainSlopeFixture()).valid,true);
 for(const change of [p=>p.capabilities.pop(),p=>p.capabilities.reverse(),p=>p.exercises[0].rubric.path[0][0]=990,p=>p.exercises[0].rubric.path[1]=p.exercises[0].rubric.path[0],p=>p.exercises[0].rubric.spacingM=1e-10,p=>p.exercises[0].rubric.quantity='maximum',p=>p.exercises[0].rubric.expectedM=20,p=>p.terrain.grid.samples[12]=null,p=>p.exercises=Array(17).fill(p.exercises[0])]){const q=structuredClone(p);change(q);assert.equal(validatePack(q).valid,false);}
});
test('profile answers derive ascent, positive descent and signed net change; missing/invalid and draft states stay explicit',()=>{
 const p=buildTerrainProfileFixture();assert.deepEqual(p.exercises.map(e=>profileAnswer(p,e)),[20,10,10,-10]);
 for(const [i,valueM]of [20.01,9.99,10,-10].entries())assert.equal(scoreAnswer(p,`profile-${i+1}`,{type:'profile-value',valueM}).status,'correct');
 assert.equal(scoreAnswer(p,'profile-3',{type:'profile-value',valueM:20}).status,'incorrect');for(const valueM of [NaN,Infinity,'20',null])assert.equal(scoreAnswer(p,'profile-1',{type:'profile-value',valueM}).status,'unanswered');
 p.review.status='draft';p.review.reviewedAt=null;assert.equal(scoreAnswer(p,'profile-1',{type:'profile-value',valueM:20}).status,'needs-review');
});
test('profile session backup preserves numeric answers and rejects fabricated results and extra fields',async()=>{
 const pack=buildTerrainProfileFixture(),c=createLessonSession(pack);c.hint();c.setAnswer({type:'profile-value',valueM:20});c.submit();const {session,attempts}=c.snapshot(),bundle=checkedBundle({pack,session,attempts});
 assert.equal(resumeLessonSession(bundle).snapshot().phase,'feedback');const b=await readBackup(new Blob([serializeBackup({backupVersion:1,exportedAt:session.updatedAt,packs:[pack],sessions:[session],attempts,settings:{}})]));assert.equal(b.attempts[0].answer.valueM,20);
 for(const change of [p=>p.attempts[0].answer.valueM=0,p=>p.attempts[0].answer.elevationM=20]){const q=structuredClone(bundle);change(q);assert.throws(()=>checkedBundle(q));}
});
test('profile sheets share derived chart data and S/E path, with answer criteria only for instructors',()=>{
 const p=buildTerrainProfileFixture(),a=createExercisePrint(p,'profile-1','learner'),b=createExercisePrint(p,'profile-1','instructor');assert.deepEqual(a.profile,deriveLessonProfile(p,p.exercises[0]));assert.ok(a.blocks.some(b=>b.type==='profile-chart'));assert.deepEqual(a.annotations.markers.map(m=>m.text),['S','E']);assert.equal(a.annotations.lines[0].length,2);assert.equal(a.blocks.some(b=>b.text.includes('Expected ascent')),false);assert.ok(b.blocks.some(b=>b.text.includes('Expected ascent: 20 m')));
 const loop=structuredClone(p);loop.exercises[0].rubric.path.push([...loop.exercises[0].rubric.path[0]]);assert.equal(validatePack(loop).valid,true);assert.deepEqual(createExercisePrint(loop,'profile-1','learner').annotations.markers.map(m=>m.text),['S/E']);
});
