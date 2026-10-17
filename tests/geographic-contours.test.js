import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainOverlayFixture } from '../scripts/terrain-overlay-fixture.js';
import { validateGeographicContours,createContourOverlayModel } from '../src/terrain/geographic.js';
import { createMapModel } from '../src/map/model.js';
import { auditContourLines } from '../scripts/contour-audit.js';
import { deriveContours } from '../src/terrain/contours.js';
import { stitchContourSegments } from '../src/terrain/contour-lines.js';
import { readFile } from 'node:fs/promises';

test('terrain shares road coordinates on rotated screens and both fixed-scale paper orientations',async()=>{
  const {pack,overlay}=await terrainOverlayFixture(), before=structuredClone(overlay);
  for(const options of [{rotationDeg:90},{paper:true,orientation:'portrait'},{paper:true,orientation:'landscape'}]) {
    const m=createMapModel(pack,options),terrain=createContourOverlayModel(overlay,m);
    assert.deepEqual(terrain.clip,m.clip);
    assert.deepEqual(terrain.paths[0].points,pack.features.features[0].geometry.coordinates.map(m.convert));
    assert.equal(terrain.draft,true);assert.equal(terrain.horizontalAccuracyM,4);
    for(let i=0;i<3;i++) {
      const original=pack.features.features[0].geometry.coordinates[i],round=m.invert(terrain.paths[0].points[i]);
      assert.ok(Math.abs(round[0]-original[0])<1e-9 && Math.abs(round[1]-original[1])<1e-9);
    }
    terrain.clip[0][0]=99; assert.notEqual(m.clip[0][0],99);
  }
  assert.deepEqual(overlay,before);
});

test('draft/operation/reference/coordinate and topology inconsistencies fail explicitly',async()=>{
  const {overlay}=await terrainOverlayFixture();assert.equal(validateGeographicContours(overlay),true);
  const changes=[x=>x.review='reviewed',x=>x.operation.accuracyM=0,x=>x.operation.verticalConversion=true,x=>x.coordinateReference='EPSG:4269',x=>x.grid.horizontal.crs='LOCAL_METRIC',x=>x.contours[0].lines[0].coordinates[0]=[47,-123],x=>x.contours[0].lines[0].closed=true,x=>x.contours[0].topologyStatus='needs-review',x=>x.sourceGridSha256='bad'];
  for(const change of changes){const bad=structuredClone(overlay);change(bad);assert.throws(()=>validateGeographicContours(bad));}
});

test('preparation and display budgets are separate; oversized overlays retain callers input',async()=>{
  const {pack,overlay}=await terrainOverlayFixture(),m=createMapModel(pack);
  overlay.contours[0].lines=Array.from({length:1001},()=>structuredClone(overlay.contours[0].lines[0]));
  const before=structuredClone(overlay);
  assert.equal(validateGeographicContours(overlay),true);
  assert.throws(()=>createContourOverlayModel(overlay,m),/display budget/);assert.deepEqual(overlay,before);
  overlay.contours[0].lines=[{closed:false,coordinates:Array.from({length:10001},(_,i)=>[-123+i*1e-9,47])}];
  assert.throws(()=>createContourOverlayModel(overlay,m),/display budget/);
});

test('source-elevation and edge audit detects lost edges while checking analytic contour vertices',async()=>{
  const grid=JSON.parse(await readFile(new URL('fixtures/terrain-grids.json',import.meta.url))).hill;
  const raw=deriveContours(grid,[85]),lines=stitchContourSegments(raw),audit=auditContourLines(grid,raw,lines);
  assert.ok(audit.verticesChecked>0);assert.ok(audit.maxElevationErrorM<1e-9);
  assert.equal(audit.uniqueEdgesPreserved,true);assert.equal(audit.interiorOpenEndpoints,0);
  lines.contours[0].lines[0].coordinates.splice(1,1);
  assert.throws(()=>auditContourLines(grid,raw,lines),/edge mismatch/);
});
