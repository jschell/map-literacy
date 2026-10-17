import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createElevationGrid, validateElevationGrid, elevationMeters, GRID_LIMITS } from '../src/terrain/grid.js';
import { validatePack } from '../src/data/validate-pack.js';
const grids=JSON.parse(await readFile(new URL('fixtures/terrain-grids.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('analytic hill, valley, flat and rectangular plane retain known elevations and axes',()=>{
  const hill=createElevationGrid(grids.hill),valley=createElevationGrid(grids.valley),flat=createElevationGrid(grids.flat),plane=createElevationGrid(grids.plane);
  assert.deepEqual(plane.coordinate(2,1),[1020,1980]);
  assert.equal(hill.sample(1020,1960).valueM,100);assert.equal(hill.sample(1000,2000).valueM,60);
  assert.equal(valley.sample(1020,2000).valueM,100);assert.equal(valley.sample(1000,2000).valueM,120);
  assert.equal(flat.sample(1005,1990).valueM,100);
  near(plane.sample(1005,1990).valueM,13); // Quarter of the 10/12/14/16 planar cell.
  near(plane.sample(1020,1960).valueM,22); // Exact southeast boundary.
  near(plane.sample(1005,1990,'nearest').valueM,16); // East/south tie policy.
  assert.deepEqual(plane.sample(999.99,2000),{status:'outside'});assert.deepEqual(plane.sample(1000,2000.01),{status:'outside'});
  assert.throws(()=>plane.sample(NaN,0));assert.throws(()=>plane.coordinate(3,0));
});
test('nodata is neither zero nor an interpolated bridge across missing terrain',()=>{
  const grid=createElevationGrid(grids.nodata);
  assert.deepEqual(grid.sample(1010,1980),{status:'nodata'});assert.deepEqual(grid.sample(1005,1990),{status:'nodata'});
  assert.equal(grid.sample(1000,2000).valueM,10,'zero-weight unknown neighbor must not mask a known sample');
  const missing=structuredClone(grids.flat);missing.samples.fill(null);assert.deepEqual(createElevationGrid(missing).sample(1010,1980),{status:'nodata'});
});
test('international feet, US survey feet and unknown uncertainty stay explicit',()=>{
  near(elevationMeters(10,'ft'),3.048);near(elevationMeters(3937,'us-survey-ft'),1200);
  assert.notEqual(elevationMeters(1000,'ft'),elevationMeters(1000,'us-survey-ft'));
  near(createElevationGrid(grids.feet).sample(1005,1990).valueM,3.9624);
  near(createElevationGrid(grids.surveyFeet).sample(1000,2000).valueM,12000/3937);
  const input=structuredClone(grids.flat);input.vertical.uncertaintyM=null;
  assert.equal(createElevationGrid(input).sample(1000,2000).uncertaintyM,null);assert.throws(()=>elevationMeters(1,'feet'));
});
test('grid validation rejects geographic, rotated, unsupported, ambiguous and oversized inputs',()=>{
  for(const mutate of [
    g=>g.format='future',g=>g.horizontal.crs='EPSG:4326',g=>g.horizontal.axisOrder='northing,easting',g=>g.horizontal.step[1]=20,g=>g.horizontal.registration='pixel-corner',g=>g.vertical.reference='unknown',g=>g.vertical.nodata=-9999,g=>g.vertical.uncertaintyM=-1,g=>g.vertical.units='feet',g=>g.vertical.units=['m'],g=>g.source.sha256=[g.source.sha256],g=>g.samples.pop(),g=>g.samples[0]=Infinity,g=>g.width=1025,g=>{g.width=1024;g.height=1024;},g=>g.source.sha256='missing',g=>g.source.acquiredAt='2026-02-30T00:00:00.000Z',g=>g.source.kind='hillshade',g=>g.source.transforms[0].parameters.bad={nested:1},g=>g.extra='unsupported',
  ]) {const input=structuredClone(grids.flat);mutate(input);assert.throws(()=>validateElevationGrid(input));}
  assert.equal(GRID_LIMITS.maxSamples,262144);
  const real=structuredClone(grids.flat);real.horizontal.crs='EPSG:26910';real.vertical.reference='NAVD88';real.source.kind='usgs-3dep';real.source.url='https://example.org/declared-source.tif';
  assert.equal(validateElevationGrid(real),true,'declared supported metadata does not prove upstream bytes or content review');
  real.source.url='http://example.org/a.tif';assert.throws(()=>validateElevationGrid(real));
});
test('validated sampling snapshots and exact synthetic provenance are reproducible and isolated',async()=>{
  const bytes=await readFile(new URL('fixtures/terrain-recipe.json',import.meta.url)),hash=createHash('sha256').update(bytes).digest('hex');
  for(const input of Object.values(grids)) {assert.equal(input.source.sha256,hash);assert.equal(validateElevationGrid(input),true);}
  const input=structuredClone(grids.plane),before=JSON.stringify(input),reader=createElevationGrid(input);
  assert.equal(JSON.stringify(input),before);input.samples[0]=999;input.horizontal.origin[0]=0;
  assert.equal(reader.sample(1000,2000).valueM,10);assert.throws(()=>{reader.grid.samples[0]=999;});
  assert.equal(validatePack(grids.hill).valid,false,'standalone elevation artifacts are not lesson packs');
});

test('fractional georeferencing round-trips boundary samples without extrapolation',()=>{
  const input=structuredClone(grids.plane);input.horizontal.origin=[500000.1,5300000.2];input.horizontal.step=[.3,-.7];
  const reader=createElevationGrid(input);
  for(let r=0;r<3;r++) for(let c=0;c<3;c++) assert.equal(reader.sample(...reader.coordinate(c,r)).valueM,10+2*c+4*r);
  assert.deepEqual(reader.sample(500000.09,5300000.2),{status:'outside'});
  const imprecise=structuredClone(input);imprecise.horizontal.step[0]=1e-9;assert.throws(()=>createElevationGrid(imprecise));
  input.horizontal.origin[0]=1e30;assert.throws(()=>createElevationGrid(input));
});
