import test from 'node:test';import assert from 'node:assert/strict';
import {buildTerrainDepressionFixture} from '../scripts/terrain-depression-fixture.js';import {buildTerrainLessonFixture} from '../scripts/terrain-lesson-fixture.js';
import {deriveDepressionTicks} from '../src/terrain/depressions.js';import {deriveContourLines} from '../src/terrain/contour-lines.js';import {createElevationGrid} from '../src/terrain/grid.js';import {createMapModel} from '../src/map/model.js';
import {validatePack} from '../src/data/validate-pack.js';import {scoreAnswer} from '../src/lesson/score.js';import {createExercisePrint} from '../src/print/exercise.js';import {distanceM} from '../src/geo/distance.js';
const levels=[105,110,115];
test('depression rings produce inward lower ticks independent of winding and large coordinate origin',()=>{
 const p=buildTerrainDepressionFixture(),g=p.terrain.grid,result=deriveContourLines(g,levels),ticks=deriveDepressionTicks(g,result),sampler=createElevationGrid(g);
 assert.equal(ticks.length,35);for(const t of ticks){assert.ok(sampler.sample(...t.to).valueM<t.levelM);assert.ok(Math.abs(Math.hypot(t.to[0]-t.from[0],t.to[1]-t.from[1])-2)<1e-9);}
 const reversed=structuredClone(result);for(const c of reversed.contours)for(const l of c.lines)l.coordinates.reverse();const r=deriveDepressionTicks(g,reversed);assert.equal(r.length,ticks.length);for(const t of r)assert.ok(sampler.sample(...t.to).valueM<t.levelM);
 const shifted=structuredClone(g);shifted.horizontal.origin=shifted.horizontal.origin.map(v=>v+1e8);assert.equal(deriveDepressionTicks(shifted,deriveContourLines(shifted,levels)).length,35);
});
test('closure does not turn hills, missing evidence, open lines or uncertainty into depressions',()=>{
 const p=buildTerrainDepressionFixture(),g=p.terrain.grid,lines=deriveContourLines(g,levels);
 const hill=structuredClone(g);hill.samples=hill.samples.map(v=>200-v);assert.throws(()=>deriveDepressionTicks(hill,deriveContourLines(hill,[85,90,95])));
 for(const change of [g=>g.vertical.uncertaintyM=null,g=>g.vertical.uncertaintyM=1,g=>g.samples[4*9+5]=null]){const q=structuredClone(g);change(q);assert.throws(()=>deriveDepressionTicks(q,lines));}
 const open=structuredClone(lines);open.contours[0].lines[0].closed=false;assert.throws(()=>deriveDepressionTicks(g,open));
 const ambiguous=structuredClone(lines);ambiguous.contours[0].topologyStatus='needs-review';assert.throws(()=>deriveDepressionTicks(g,ambiguous));
 assert.equal(createMapModel(buildTerrainLessonFixture()).depressionTicks.length,0);
});
test('depression capability, inward scoring and learner/instructor separation are strict',()=>{
 const p=buildTerrainDepressionFixture();assert.deepEqual(validatePack(p),{valid:true,errors:[]});
 for(const change of [p=>p.capabilities.reverse(),p=>p.capabilities.push('terrain-depressions-v1'),p=>p.terrain.grid.vertical.uncertaintyM=null]){const q=structuredClone(p);change(q);assert.equal(validatePack(q).valid,false);}
 const hill=buildTerrainLessonFixture();hill.capabilities.push('terrain-depressions-v1');assert.equal(validatePack(hill).valid,false);
 for(const [i,elevationM]of [110,105].entries())assert.equal(scoreAnswer(p,`depression-${i+1}`,{type:'contour-elevation',elevationM}).status,'correct');assert.equal(scoreAnswer(p,'depression-1',{type:'contour-elevation',elevationM:120}).status,'incorrect');
 const l=createExercisePrint(p,'depression-1','learner'),i=createExercisePrint(p,'depression-1','instructor');assert.deepEqual(l.annotations.markers.map(m=>m.text),['115 m','A']);assert.deepEqual(i.annotations.markers.map(m=>m.text),['115 m','A: 110 m']);assert.match(l.summary,/decrease inward/);assert.equal(l.blocks.some(b=>b.text.includes('Expected contour A elevation')),false);
});
test('screen rotation and Letter orientations retain ground tick geometry and fixed paper scale',()=>{
 const p=buildTerrainDepressionFixture();for(const options of [{rotationDeg:90},{rotationDeg:270},{paper:true,orientation:'portrait'},{paper:true,orientation:'landscape'}]) {
 const m=createMapModel(p,options);assert.equal(m.depressionTicks.length,35);for(const t of m.depressionTicks){assert.ok(Math.abs(distanceM(t.from,t.to)-2)<1e-5);const a=m.convert(t.from),b=m.convert(t.to);assert.ok(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])/m.metersToUnits-2)<1e-5);} }
});
