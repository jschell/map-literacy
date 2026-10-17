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
