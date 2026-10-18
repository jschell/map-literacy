import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTerrainFixtures} from '../scripts/terrain-fixtures.js';
import {deriveTerrainProfile} from '../src/terrain/profile.js';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const grids=()=>JSON.parse(buildTerrainFixtures()['terrain-grids.json']);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('flat, plane, hill and valley profiles have analytic distances, ascent/descent and reversal',()=>{
 const g=grids();
 const flat=deriveTerrainProfile(g.flat,[[1000,2000],[1020,1960]],{spacingM:100});near(flat.summary.distanceM,Math.hypot(20,40));near(flat.summary.ascentM,0);assert.equal(flat.summary.totalsStatus,'complete');
 const plane=deriveTerrainProfile(g.plane,[[1000,2000],[1020,1960]],{spacingM:100});near(plane.summary.ascentM,12);near(plane.summary.descentM,0);near(plane.summary.netChangeM,12);
 const hill=deriveTerrainProfile(g.hill,[[1000,1960],[1040,1960]],{spacingM:100});near(hill.summary.ascentM,20);near(hill.summary.descentM,20);near(hill.summary.maxElevationM,100);
 const valley=deriveTerrainProfile(g.valley,[[1000,1960],[1040,1960]],{spacingM:100});near(valley.summary.ascentM,20);near(valley.summary.descentM,20);near(valley.summary.minElevationM,100);
 const bent=deriveTerrainProfile(g.plane,[[1000,2000],[1020,1960],[1020,2000]],{spacingM:100});near(bent.summary.ascentM,12);near(bent.summary.descentM,8);near(bent.summary.netChangeM,4);
 const reverse=deriveTerrainProfile(g.plane,[[1020,1960],[1000,2000]],{spacingM:7});near(reverse.summary.descentM,12);near(reverse.summary.netChangeM,-12);
});
test('cellwise quadratic extrema survive coarse spacing and refinement',()=>{
 const g=grids().plane;g.width=2;g.height=2;g.horizontal.origin=[0,1];g.horizontal.step=[1,-1];g.samples=[0,4,2,1];
 for(const spacingM of [100,1,.2]) {
  const p=deriveTerrainProfile(g,[[0,1],[1,0]],{spacingM});near(p.summary.maxElevationM,1.8);near(p.summary.ascentM,1.8);near(p.summary.descentM,.8);
  assert.ok(p.samples.some(p=>Math.abs(p.coordinate[0]-.6)<1e-8));
 }
});
test('waypoints, self-returning paths, sample spacing, source immutability and vertical units',()=>{
 const g=grids(),before=structuredClone(g.feet),path=[[1000,2000],[1020,2000],[1000,2000]];
 const p=deriveTerrainProfile(g.feet,path,{spacingM:7});near(p.summary.distanceM,40);near(p.summary.ascentM,4*.3048);near(p.summary.descentM,4*.3048);near(p.summary.netChangeM,0);
 assert.ok(p.samples.some(p=>p.distanceM===20));for(let i=1;i<p.samples.length;i++)assert.ok(p.samples[i].distanceM-p.samples[i-1].distanceM<=7+1e-9);
 g.feet.samples[0]=999;path[0][0]=999;assert.equal(p.samples[0].elevationM,10*.3048);assert.deepEqual(p.grid.source,before.source);
 const survey=deriveTerrainProfile(g.surveyFeet,[[1000,2000],[1020,1960]],{spacingM:100});near(survey.summary.ascentM,12*1200/3937);
});
test('nodata between valid boundaries is explicit and totals never bridge gaps',()=>{
 const g=grids().plane;g.width=2;g.height=2;g.horizontal.origin=[0,1];g.horizontal.step=[1,-1];g.samples=[0,null,null,10];
 const p=deriveTerrainProfile(g,[[0,1],[1,0]],{spacingM:100});assert.equal(p.samples[0].status,'value');assert.equal(p.samples.at(-1).status,'value');assert.ok(p.samples.some(p=>p.status==='nodata'));
 assert.equal(p.summary.totalsStatus,'partial');assert.equal(p.summary.netChangeM,null);near(p.summary.ascentM,0);near(p.summary.coveredDistanceM,0);near(p.summary.missingDistanceM,Math.SQRT2);
 const outside=deriveTerrainProfile(grids().flat,[[990,2000],[1030,2000]],{spacingM:100});assert.ok(outside.summary.outsideSamples>0);assert.equal(outside.summary.totalsStatus,'partial');near(outside.summary.coveredDistanceM,20);near(outside.summary.missingDistanceM,20);
 const missing=grids().flat;missing.samples.fill(null);const all=deriveTerrainProfile(missing,[[1000,2000],[1020,2000]],{spacingM:100});assert.equal(all.summary.minElevationM,null);assert.equal(all.summary.maxElevationM,null);
});
test('profile budgets and malformed paths fail before unbounded sampling',()=>{
 const g=grids().flat;
 const huge=structuredClone(g);huge.samples.fill(1e308);const flatHuge=deriveTerrainProfile(huge,[[1000,2000],[1020,2000]],{spacingM:100});assert.equal(flatHuge.summary.ascentM,0);
 for(const path of [[],[[0,0]],[[0,0],[0,0]],[[0,0],[NaN,0]],Array(1025).fill([0,0]),[[0,0],[10000001,0]]])assert.throws(()=>deriveTerrainProfile(g,path,{spacingM:1}));
 for(const spacingM of [0,-1,Infinity,10001,1e-20])assert.throws(()=>deriveTerrainProfile(g,[[1000,2000],[1020,2000]],{spacingM}));
});
test('profile CLI hashes actual inputs, preserves draft provenance and refuses overwrite',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'terrain-profile-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const grid=join(dir,'grid.json'),request=join(dir,'request.json'),out=join(dir,'out.json');const bytes=JSON.stringify(grids().plane);await writeFile(grid,bytes);await writeFile(request,JSON.stringify({format:'map-literacy-profile-request-v1',path:[[1000,2000],[1020,1960]],spacingM:10}));
 const run=()=>spawnSync(process.execPath,['scripts/derive-terrain-profile.js',grid,request,out],{encoding:'utf8'});
 assert.equal(run().status,0);const text=await readFile(out,'utf8'),p=JSON.parse(text);near(p.summary.ascentM,12);assert.equal(p.reviewStatus,'draft');assert.equal(p.inputHashes.gridFileSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.notEqual(run().status,0);assert.equal(await readFile(out,'utf8'),text);
 await writeFile(request,JSON.stringify({format:'unknown',path:[],spacingM:1}));assert.notEqual(run().status,0);
 await writeFile(request,' '.repeat(256*1024+1));const oversized=run();assert.notEqual(oversized.status,0);assert.match(oversized.stderr,/byte budget/);assert.equal(await readFile(out,'utf8'),text);
});
