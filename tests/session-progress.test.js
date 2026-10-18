import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLessonSession,resumeLessonSession} from '../src/lesson/session.js';
import {sessionProgress,recordedCoverage,progressText} from '../src/lesson/progress.js';
import {serializeBackup,checkedBackup} from '../src/storage/backup.js';
import {scoreAnswer} from '../src/lesson/score.js';
import {answerFeedback} from '../src/lesson/feedback.js';
const pack=JSON.parse(await readFile(new URL('fixtures/street-square.json',import.meta.url)));
const answers=[{type:'heading',degrees:180},{type:'endpoint',coordinate:[0,0]},{type:'route',edgeIds:['AB','BC']},{type:'detour',edgeIds:['AB','BC']}];
function backup(controller) {const {session,attempts}=controller.snapshot();return {backupVersion:1,exportedAt:'2026-10-18T21:00:00.000Z',packs:[pack],sessions:[session],attempts,settings:{}};}

test('legacy completed lifecycle means ended, with exact derived coverage and preserved bytes',()=>{
 const c=createLessonSession(pack);
 for(const answer of answers.slice(0,3)){c.setAnswer(answer);c.submit();c.next();}
 c.end();assert.equal(c.snapshot().phase,'ended');
 const before=serializeBackup(backup(c)), restored=checkedBackup(JSON.parse(before));
 const r=resumeLessonSession({pack:restored.packs[0],session:restored.sessions[0],attempts:restored.attempts});
 const p=sessionProgress(r.snapshot());assert.equal(p.label,'Ended early');assert.deepEqual(p.coverage,{answered:3,total:4});assert.equal(p.correct,2);
 assert.equal(r.snapshot().session.status,'completed','v1 lifecycle remains closed and immutable');
 assert.equal(serializeBackup(backup(r)),before,'no record/schema migration or rewritten history');
 assert.throws(()=>r.resume(),e=>e.code==='session-ended');
});
test('all answered is separate from accuracy; retries count once using the latest attempt',()=>{
 const c=createLessonSession(pack);
 c.setAnswer({type:'heading',degrees:0});c.submit();c.retry();c.setAnswer(answers[0]);c.submit();c.next();
 for(const answer of answers.slice(1)){c.setAnswer(answer);c.submit();c.next();}
 const p=sessionProgress(c.snapshot());assert.deepEqual(p.coverage,{answered:4,total:4});assert.equal(p.correct,2);assert.equal(p.incorrect,2);assert.equal(c.snapshot().attempts.length,5);
 assert.equal(p.label,'All questions answered');assert.match(progressText(p),/4\/4 answered/);assert.match(progressText(p),/does not establish mastery/);
});
test('pause retains a resumable v1 active record, clears drafts and preserves retry phase',()=>{
 const c=createLessonSession(pack);c.setAnswer(answers[0]);c.submit();c.retry();c.setAnswer({type:'heading',degrees:90});
 const version=c.snapshot().session.version;c.pause();assert.equal(c.snapshot().phase,'paused');assert.equal(c.snapshot().draft,null);assert.equal(c.snapshot().session.status,'active');assert.equal(c.snapshot().session.version,version);
 assert.throws(()=>c.hint(),e=>e.code==='session-paused');c.resume();assert.equal(c.snapshot().phase,'practicing');assert.equal(c.snapshot().attempts.length,1);
 c.pause();const file=checkedBackup(JSON.parse(serializeBackup(backup(c))));const r=resumeLessonSession({pack:file.packs[0],session:file.sessions[0],attempts:file.attempts});
 assert.equal(r.snapshot().phase,'feedback','explicit restore resumes the last committed answer, not an unfinished retry');
 c.end();assert.equal(c.snapshot().phase,'ended');
});
test('missing coverage or attempt links never infer completion from lifecycle',()=>{
 assert.equal(recordedCoverage({status:'completed'}),null);
 const c=createLessonSession(pack);c.setAnswer(answers[0]);c.submit();const state=c.snapshot();state.attempts=[];state.session.status='completed';
 assert.equal(sessionProgress(state).coverage,null);assert.match(progressText(sessionProgress(state)),/no completion or accuracy/);
});
test('feedback uses units, actions and honest boundary rounding without changing metrics',()=>{
 const e=pack.exercises[0],score=scoreAnswer(pack,e.id,{type:e.type,degrees:15.01}),before=JSON.stringify(score);
 const text=answerFeedback(e,score);assert.match(text,/Try again/);assert.match(text,/just beyond/);assert.match(text,/15°/);assert.ok(!text.includes('angularErrorDeg'));assert.match(text,/Retry/);assert.equal(JSON.stringify(score),before);
 const route=pack.exercises[3],closed=answerFeedback(route,scoreAnswer(pack,route.id,answers[3]));assert.match(closed,/closed edge/);assert.match(closed,/cross/);
});

test('legacy last-item position never stands in for missing earlier answer links',()=>{
 const c=createLessonSession(pack);for(const answer of answers){c.setAnswer(answer);c.submit();if(answer!==answers.at(-1))c.next();}
 const state=c.snapshot();delete state.session.answers.heading;state.attempts=state.attempts.filter(a=>a.exerciseId!=='heading');
 const r=resumeLessonSession({pack,session:state.session,attempts:state.attempts});r.next();
 assert.equal(r.snapshot().phase,'ended');assert.equal(sessionProgress(r.snapshot()).label,'Ended early');
});
