import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTerrainSlopeFixture,buildTerrainLessonFixture} from '../scripts/terrain-lesson-fixture.js';
import {validatePack} from '../src/data/validate-pack.js';
import {slopeComparison} from '../src/terrain/lesson-pack.js';
import {scoreAnswer} from '../src/lesson/score.js';
import {createExercisePrint} from '../src/print/exercise.js';
import {createLessonSession,resumeLessonSession} from '../src/lesson/session.js';
import {checkedBundle} from '../src/storage/records.js';
import {serializeBackup,readBackup} from '../src/storage/backup.js';

test('slope capability validates references and rejects missing capability, unknown vertices, zero/equal spans and unequal rises',()=>{
 const p=buildTerrainSlopeFixture();assert.deepEqual(validatePack(p),{valid:true,errors:[]});assert.equal(validatePack(buildTerrainLessonFixture()).valid,true);
 for(const change of [p=>p.capabilities.pop(),p=>p.capabilities.reverse(),p=>p.capabilities.push('terrain-slopes-v1'),p=>p.exercises[0].rubric.spanA.fromVertex=100000,p=>p.exercises[0].rubric.spanA.toFeatureId='missing',p=>p.exercises[0].rubric.spanA.toFeatureId='contour-1',p=>p.exercises[0].rubric.spanA.toFeatureId='contour-3',p=>p.exercises[0].rubric.spanB={...p.exercises[0].rubric.spanA}]) {const q=structuredClone(p);change(q);assert.equal(validatePack(q).valid,false);}
});
test('analytic slope answers derive equal rise / local metric run, including axis swaps and ties',()=>{
 const p=buildTerrainSlopeFixture();assert.deepEqual(p.exercises.map(e=>slopeComparison(p,e).choice),['A','B','equal']);
 const {a,b}=slopeComparison(p,p.exercises[0]);assert.ok(Math.abs(a.runM-5)<1e-9);assert.equal(b.runM,10);assert.equal(a.riseM,5);assert.equal(b.riseM,5);
 for(const [i,choice]of ['A','B','equal'].entries()) {assert.equal(scoreAnswer(p,`slope-${i+1}`,{type:'relative-slope',choice}).status,'correct');}
 assert.equal(scoreAnswer(p,'slope-1',{type:'relative-slope',choice:'B'}).status,'incorrect');
 for(const choice of ['',null,1,'a','A,B'])assert.equal(scoreAnswer(p,'slope-1',{type:'relative-slope',choice}).status,'unanswered');
 p.review.status='draft';p.review.reviewedAt=null;assert.equal(scoreAnswer(p,'slope-1',{type:'relative-slope',choice:'A'}).status,'needs-review');
});
test('slope sessions and backups preserve choices and reject fabricated scores and extra answer fields',async()=>{
 const pack=buildTerrainSlopeFixture(),c=createLessonSession(pack);c.hint();c.setAnswer({type:'relative-slope',choice:'A'});c.submit();const {session,attempts}=c.snapshot();
 const bundle=checkedBundle({pack,session,attempts});assert.equal(resumeLessonSession(bundle).snapshot().phase,'feedback');
 const b=await readBackup(new Blob([serializeBackup({backupVersion:1,exportedAt:session.updatedAt,packs:[pack],sessions:[session],attempts,settings:{}})]));assert.equal(b.attempts[0].answer.choice,'A');
 for(const change of [b=>b.attempts[0].answer.choice='B',b=>b.attempts[0].answer.degrees=0]){const q=structuredClone(bundle);change(q);assert.throws(()=>checkedBundle(q));}
});
test('slope learner output gives spans without the answer; instructor criteria are derived',()=>{
 const p=buildTerrainSlopeFixture(),a=createExercisePrint(p,'slope-1','learner'),b=createExercisePrint(p,'slope-1','instructor');
 assert.deepEqual(a.annotations.spans.map(s=>s.text),['A','B']);assert.equal(a.blocks.some(b=>b.text.includes('Expected comparison')),false);assert.ok(b.blocks.some(b=>b.text.includes('Expected comparison: A is steeper')));
});
