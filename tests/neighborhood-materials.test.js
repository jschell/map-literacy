import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePack} from '../src/data/validate-pack.js';
import {scoreAnswer} from '../src/lesson/score.js';
import {createMapModel} from '../src/map/model.js';
const bytes=await readFile(new URL('../docs/materials/redmond-r1/pack.json',import.meta.url));
const pack=JSON.parse(bytes),manifest=JSON.parse(await readFile(new URL('../docs/materials/redmond-r1/instructor-manifest.json',import.meta.url)));
test('Redmond material retains hash-locked source lineage and cannot claim reviewed route or learner results',()=>{
 assert.deepEqual(validatePack(pack),{valid:true,errors:[]});
 assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.packSha256);
 assert.equal(pack.sources[0].sha256,'103fa2e3a00e1c178393314137ea3f9f96e3c1545a8f294c8fd0301bb9ae7564');
 assert.equal(pack.sources[0].sourceAt,'2026-10-13T01:22:16.000Z');
 assert.equal(pack.review.status,'draft');assert.equal(pack.topology.completeness,'partial');
 assert.equal(pack.topology.edges.length,60);assert.ok(pack.topology.edges.every(e=>e.access==='unknown'));
 assert.ok(pack.exercises.every(e=>e.review==='draft'&&['heading','endpoint'].includes(e.type)));
 for(const e of pack.exercises){const answer=e.type==='heading'?{type:e.type,degrees:e.rubric.expectedDeg}:{type:e.type,coordinate:e.rubric.expected};assert.equal(scoreAnswer(pack,e.id,answer).status,'needs-review');}
 assert.equal(manifest.review.independentContent,'pending');assert.equal(manifest.review.learnerTransfer,'pending');
 assert.ok(Math.abs(pack.exercises[0].rubric.expectedDeg-18.9489)<.001);assert.ok(Math.abs(pack.exercises[1].rubric.expectedDeg-111.0319)<.001);
});
test('Redmond practice keeps required references and street clues in both Letter orientations and partial views',()=>{
 for(const orientation of ['portrait','landscape'])for(const variant of ['labeled','partial']) {
  const m=createMapModel(pack,{paper:true,orientation,variant});
  assert.equal(m.suppressedLabels,0);
  assert.deepEqual(new Set(m.labels.map(l=>l.text)),new Set(['A','B','C','D','161st Ave NE','Cleveland St','Brown St']));
 }
});
