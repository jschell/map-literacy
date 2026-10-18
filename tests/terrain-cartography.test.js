import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexContour, contourLabelCandidates } from '../src/terrain/cartography.js';
import { createExercisePrint } from '../src/print/exercise.js';
import { createMapModel } from '../src/map/model.js';
import { buildTerrainLessonFixture, buildTerrainProfileFixture } from '../scripts/terrain-lesson-fixture.js';

test('index spacing uses synthetic zero, including negative and fractional elevations',()=>{
  for(const [level,interval,want] of [[75,5,true],[80,5,false],[0,5,true],[-25,5,true],[-20,5,false],[2.5,.5,true],[3,.5,false]])assert.equal(isIndexContour(level,interval),want);
});
test('contour labels respect blank output, clipping, marker exclusion and rotation',()=>{
  const pack=buildTerrainProfileFixture();
  for(const rotationDeg of [0,90,180,270])for(const options of [{screenWidth:320,screenHeight:320},{paper:true,orientation:'portrait'},{paper:true,orientation:'landscape'}]) {
    const model=createMapModel(pack,{...options,rotationDeg}),labels=contourLabelCandidates(model);
    assert.ok(labels.length>0);assert.ok(labels.every(l=>/^\d+ m$/.test(l.text)));
    assert.deepEqual(contourLabelCandidates({...model,variant:'blank'}),[]);
    assert.deepEqual(contourLabelCandidates(model,[[0,0,model.width,model.height]]),[]);
    for(const l of labels)assert.ok(l.point[0]>0&&l.point[0]<model.width&&l.point[1]>0&&l.point[1]<model.height);
  }
});
test('elevation questions keep numeric contour labels hidden by default without changing geometry',()=>{
  const p=buildTerrainLessonFixture(),a=createMapModel(p),b=createMapModel(buildTerrainProfileFixture());
  assert.equal(createExercisePrint(p,'elevation-1','learner').annotations.contourElevations,false);
  assert.equal(createExercisePrint(p,'elevation-1','instructor').annotations.contourElevations,true);
  assert.equal(a.contourLabelsAllowed,false);assert.equal(b.contourLabelsAllowed,true);
  assert.deepEqual(a.paths.map(p=>p.d),b.paths.map(p=>p.d));assert.deepEqual(a.paths.map(p=>p.contourLevelM),[80,85,90]);
});


test('collinear contour segmentation does not remove readable labels',()=>{
 const p=buildTerrainProfileFixture(),a=createMapModel(p,{screenWidth:320,screenHeight:320}),b=createMapModel(p,{screenWidth:320,screenHeight:320});
 for(const path of b.paths)path.lines=path.lines.map(line=>line.flatMap((point,i)=>i===line.length-1?[point]:Array.from({length:20},(_,j)=>point.map((v,k)=>v+(line[i+1][k]-v)*j/20))));
 const labels=contourLabelCandidates(b);assert.ok(labels.length>0);assert.equal(labels.length,contourLabelCandidates(a).length);
});
