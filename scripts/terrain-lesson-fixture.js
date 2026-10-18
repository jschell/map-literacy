import { buildTerrainFixtures } from './terrain-fixtures.js';
import { deriveContourLines } from '../src/terrain/contour-lines.js';
import { createProjection } from '../src/geo/projection.js';

/** Fully invented analytic lesson, explicitly unrelated to the real DEM benchmark. */
export function buildTerrainLessonFixture() {
  const grid=JSON.parse(buildTerrainFixtures()['terrain-grids.json']).hill;
  const origin=[1020,1960],center=[0,0],projection=createProjection(center);
  const convert=p=>projection.inverse([p[0]-origin[0],p[1]-origin[1]]);
  const result=deriveContourLines(grid,[80,85,90]);
  const contours=[],features=[];
  for(const c of result.contours)for(const line of c.lines) {
    const id=`contour-${features.length+1}`;contours.push({featureId:id,levelM:c.levelM});
    features.push({type:'Feature',id,geometry:{type:'LineString',coordinates:line.coordinates.map(convert)},properties:{sourceId:grid.id,role:'contour',name:`Contour ${features.length+1}`,tags:{}}});
  }
  const corners=[convert([-30+origin[0],-50+origin[1]]),convert([30+origin[0],50+origin[1]])];
  const bounds=[corners[0][0],corners[0][1],corners[1][0],corners[1][1]];
  const date='2026-10-17T00:00:00.000Z';
  return {schemaVersion:2,id:'synthetic-terrain-hill',title:'Synthetic hill — contour elevations',revision:1,module:'topographic',capabilities:['terrain-contours-v1'],
    review:{status:'reviewed',reviewedAt:date,note:'Analytic synthetic hill and 80/85/90 m contours checked against the source equation. Technical fixture review, not learning-effectiveness evidence.'},
    bounds,sourceBounds:[bounds[0]-.00001,bounds[1]-.00001,bounds[2]+.00001,bounds[3]+.00001],
    sources:[{id:grid.id,kind:'synthetic',url:null,query:null,fetchedAt:grid.source.acquiredAt,sourceAt:null,version:grid.source.version,sha256:grid.source.sha256,license:grid.source.license,attribution:grid.source.attribution,
      transforms:grid.source.transforms.map(t=>({name:t.operation,version:t.version,parameters:t.parameters}))}],
    features:{type:'FeatureCollection',features},topology:{nodes:[],edges:[],restrictions:[],completeness:'complete',exclusions:[]},labels:[],
    exercises:[85,90].map((level,index)=>({id:`elevation-${index+1}`,type:'contour-elevation',review:'reviewed',sourceIds:[grid.id],scenario:null,
      prompt:`This is a synthetic hill: elevation increases toward its center. Each inner contour rises 5 m from the labeled reference. What is the elevation of contour A, in metres?`,
      hints:['Start with the labeled reference elevation.','Count the contour intervals toward A; elevations increase toward the hill center.'],
      rubric:{featureId:contours.find(c=>c.levelM===level).featureId,referenceFeatureId:contours.find(c=>c.levelM===level-5).featureId,toleranceM:.01}})),
    print:{paper:'letter',orientation:'portrait',marginMm:10,scaleDenominator:1000,labelMinPt:8,mapRotationDeg:0},extensions:{},
    terrain:{format:'synthetic-contours-v1',grid,frame:{center,origin},intervalM:5,contours}};
}

/** Same analytic hill, a separate revision-locked lesson and explicit optional capability. */
export function buildTerrainSlopeFixture() {
  const p=buildTerrainLessonFixture();p.id='synthetic-terrain-slopes';p.title='Synthetic hill — relative slope';p.capabilities.push('terrain-slopes-v1');
  const projection=createProjection(p.terrain.frame.center);
  const vertex=(level,axis,sign)=>{
    const id=p.terrain.contours.find(c=>c.levelM===level).featureId;
    const points=p.features.features.find(f=>f.id===id).geometry.coordinates;
    let index=0;points.forEach((v,i)=>{if(sign*projection.project(v)[axis]>sign*projection.project(points[index])[axis]+1e-7)index=i;});
    return {id,index};
  };
  const span=(axis,sign)=>{const a=vertex(80,axis,sign),b=vertex(85,axis,sign);return {fromFeatureId:a.id,fromVertex:a.index,toFeatureId:b.id,toVertex:b.index};};
  p.exercises=[[span(0,1),span(1,1)],[span(1,1),span(0,1)],[span(0,1),span(0,-1)]].map(([spanA,spanB],i)=>({
    id:`slope-${i+1}`,type:'relative-slope',review:'reviewed',sourceIds:[p.terrain.grid.id],scenario:null,
    prompt:'On this synthetic hill, A and B each span one 5 m contour interval. Compare average slope magnitude between each pair of end ticks: which span is steeper, or are they equal? Use straight horizontal ground distance, not the direction the line points.',
    hints:['Both spans have the same 5 m elevation change.','For equal rise, the shorter horizontal distance has the steeper average slope. Equal distances give equal slopes.'],rubric:{spanA,spanB}
  }));
  p.review.note='Analytic hill: each span rises 5 m; east/west runs are 5 m, north run 10 m. Average grade magnitudes are 1 and 0.5. Synthetic instructional fixture, not traversability or learning-effectiveness evidence.';
  return p;
}

export function buildTerrainProfileFixture() {
 const p=buildTerrainLessonFixture();p.id='synthetic-terrain-profiles';p.title='Synthetic hill — elevation profiles';p.capabilities.push('terrain-profiles-v1');
 const full=[[1000,1960],[1040,1960]],bent=[[1000,1960],[1020,1960],[1020,1940]];
 p.exercises=[['ascent',full],['descent',bent],['net-change',bent],['net-change',[...bent].reverse()]].map(([quantity,path],i)=>({
  id:`profile-${i+1}`,type:'profile-value',review:'reviewed',sourceIds:[p.terrain.grid.id],scenario:null,
  prompt:quantity==='ascent'?'Read the profile from S to E. How many metres of total ascent are there? Add upward changes; do not subtract descent.':quantity==='descent'?'Read the profile from S to E. How many metres of total descent are there? Report descent as a positive number.':'Read the profile from S to E. What is the signed net elevation change in metres? Subtract the starting elevation from the ending elevation; a decrease is negative.',
  hints:quantity==='net-change'?['Read the elevation at S and at E.','Net change is E minus S, regardless of rises and falls between them.']:['Read the chart in order from S to E.',quantity==='ascent'?'Add the upward changes only.':'Add the magnitudes of the downward changes only.'],
  rubric:{path,spacingM:5,quantity,toleranceM:.01}
 }));
 p.review.note='Analytic hill transects: full crossing 80–100–80 m gives 20 m ascent; bent 80–100–90 m gives 10 m descent and +10 m net; reversed bent gives -10 m net. Technical fixture review, not learning-effectiveness evidence.';
 return p;
}
