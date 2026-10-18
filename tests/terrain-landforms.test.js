import test from 'node:test';import assert from 'node:assert/strict';
import {buildTerrainLandformFixture} from '../scripts/terrain-landform-fixture.js';
import {deriveLandform} from '../src/terrain/landforms.js';import {validatePack} from '../src/data/validate-pack.js';import {scoreAnswer} from '../src/lesson/score.js';import {createExercisePrint} from '../src/print/exercise.js';
import {createLessonSession,resumeLessonSession} from '../src/lesson/session.js';import {checkedBundle} from '../src/storage/records.js';import {serializeBackup,readBackup} from '../src/storage/backup.js';

test('landform pack validates regenerated geometry and ordered capability without changing older packs',()=>{
 const p=buildTerrainLandformFixture();assert.deepEqual(validatePack(p),{valid:true,errors:[]});
 for(const change of [p=>p.capabilities.pop(),p=>p.capabilities.reverse(),p=>p.capabilities.push('terrain-landforms-v1'),p=>p.exercises[0].rubric.axis[1]=p.exercises[0].rubric.axis[0],p=>p.exercises[0].rubric.axis[0][0]=-10,p=>p.exercises[0].rubric.halfWidthM=100,p=>p.exercises.push(...Array.from({length:13},(_,i)=>({...structuredClone(p.exercises[0]),id:`extra-${i}`}))),p=>p.exercises[0].rubric.expected='valley']) {
  const q=structuredClone(p);change(q);assert.equal(validatePack(q).valid,false);
 }
});
test('ridge and valley answers derive from all complete monotone sections independent of endpoint order',()=>{
 const p=buildTerrainLandformFixture();assert.deepEqual(p.exercises.map(e=>deriveLandform(p.terrain.grid,e.rubric).choice),['valley','ridge','valley','ridge']);
 for(const e of p.exercises){const f=deriveLandform(p.terrain.grid,e.rubric);assert.equal(f.alongFallM,20);assert.ok(f.minCrossReliefM>=5);assert.equal(f.high[0],20);assert.equal(f.low[0],60);assert.equal(f.paths.length,7);}
 const rotated=structuredClone(p.terrain.grid);rotated.samples=rotated.samples.map((_,i)=>140-(80-Math.floor(i/9)*10)/2+Math.abs(i%9*10-20)-30);assert.equal(deriveLandform(rotated,{axis:[[20,20],[20,60]],halfWidthM:10}).choice,'valley');
 const before=JSON.stringify(p),derived=deriveLandform(p.terrain.grid,p.exercises[0].rubric);derived.paths[0][0][0]=999;assert.equal(JSON.stringify(p),before);
 const g=structuredClone(p.terrain.grid);g.samples=g.samples.map(v=>v/.3048);g.vertical.units='ft';assert.equal(deriveLandform(g,p.exercises[0].rubric).choice,'valley');
});
test('missing, outside, flat, reversing and mixed sections cannot become scored terrain answers',()=>{
 const p=buildTerrainLandformFixture(),r=p.exercises[0].rubric;
 for(const change of [g=>g.samples[6*9+4]=null,g=>g.samples.fill(100),g=>g.samples=g.samples.map((_,i)=>100-(i%9)*5+(8-Math.floor(i/9))*5),g=>g.samples[6*9+4]+=40,g=>g.samples[5*9+4]-=30]) {const g=structuredClone(p.terrain.grid);change(g);assert.throws(()=>deriveLandform(g,r));}
 for(const rubric of [{axis:[[0,0],[0,1]],halfWidthM:10},{axis:[[20,20],[60,20]],halfWidthM:101},{axis:[[-10,20],[60,20]],halfWidthM:10}])assert.throws(()=>deriveLandform(p.terrain.grid,rubric));
});
test('landform scoring, backups and print preserve derived answers and learner separation',async()=>{
 const p=buildTerrainLandformFixture();for(const [i,choice]of ['valley','ridge','valley','ridge'].entries())assert.equal(scoreAnswer(p,`landform-${i+1}`,{type:'terrain-form',choice}).status,'correct');
 assert.equal(scoreAnswer(p,'landform-1',{type:'terrain-form',choice:'ridge'}).status,'incorrect');for(const choice of ['',null,'A',2])assert.equal(scoreAnswer(p,'landform-1',{type:'terrain-form',choice}).status,'unanswered');
 const c=createLessonSession(p);c.hint();c.setAnswer({type:'terrain-form',choice:'valley'});c.submit();const {session,attempts}=c.snapshot(),bundle=checkedBundle({pack:p,session,attempts});assert.equal(resumeLessonSession(bundle).snapshot().phase,'feedback');
 const b=await readBackup(new Blob([serializeBackup({backupVersion:1,exportedAt:session.updatedAt,packs:[p],sessions:[session],attempts,settings:{}})]));assert.equal(b.attempts[0].answer.choice,'valley');
 for(const change of [b=>b.attempts[0].answer.choice='ridge',b=>b.attempts[0].answer.valueM=10]){const q=structuredClone(bundle);change(q);assert.throws(()=>checkedBundle(q));}
 const l=createExercisePrint(p,'landform-1','learner'),i=createExercisePrint(p,'landform-1','instructor');assert.deepEqual(l.annotations.markers.map(m=>m.text),['H','L','A']);assert.equal(l.blocks.some(b=>b.text.includes('Expected landform')),false);assert.ok(i.blocks.some(b=>b.text.includes('Expected landform: valley')));
 p.review.status='draft';p.review.reviewedAt=null;assert.equal(scoreAnswer(p,'landform-1',{type:'terrain-form',choice:'valley'}).status,'needs-review');
});
