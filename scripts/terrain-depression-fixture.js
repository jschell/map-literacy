import { createHash } from 'node:crypto';
import { buildTerrainLessonFixture } from './terrain-lesson-fixture.js';
import { createProjection } from '../src/geo/projection.js';
import { deriveContourLines } from '../src/terrain/contour-lines.js';
export function buildTerrainDepressionFixture() {
 const p=buildTerrainLessonFixture(),g=p.terrain.grid,recipe='depressions-v1: z=100+5*(abs(column-4)+abs(row-4)); 9x9; origin=[0,80]; step=[10,-10]';
 g.id='depression';g.width=9;g.height=9;g.horizontal.origin=[0,80];g.horizontal.step=[10,-10];g.samples=Array.from({length:81},(_,i)=>100+5*(Math.abs(i%9-4)+Math.abs(Math.floor(i/9)-4)));
 g.source.productId='analytic-depression';g.source.version='recipe-v1';g.source.sha256=createHash('sha256').update(recipe).digest('hex');g.source.transforms=[{operation:'generate-analytic-depression',version:'1',parameters:{recipe}}];
 p.id='synthetic-terrain-depressions';p.title='Synthetic basin — depression contours';p.capabilities=['terrain-contours-v1','terrain-depressions-v1'];
 p.review.note='Analytic basin with elevations decreasing inward. Every segment midpoint and tick checks lower inside and higher outside; technical fixture review, not independent curriculum/real-source approval.';
 const center=[0,0],origin=[40,40],projection=createProjection(center),convert=q=>projection.inverse([q[0]-40,q[1]-40]);
 const lo=convert([0,0]),hi=convert([80,80]);p.bounds=[lo[0]-1e-10,lo[1]-1e-10,hi[0]+1e-10,hi[1]+1e-10];p.sourceBounds=[lo[0]-.00001,lo[1]-.00001,hi[0]+.00001,hi[1]+.00001];
 p.sources=[{id:g.id,kind:'synthetic',url:null,query:null,fetchedAt:g.source.acquiredAt,sourceAt:null,version:g.source.version,sha256:g.source.sha256,license:g.source.license,attribution:g.source.attribution,transforms:g.source.transforms.map(t=>({name:t.operation,version:t.version,parameters:t.parameters}))}];
 const contours=[],features=[];
 for(const c of deriveContourLines(g,[105,110,115]).contours)for(const line of c.lines) {
  const id=`contour-${features.length+1}`;contours.push({featureId:id,levelM:c.levelM});features.push({type:'Feature',id,geometry:{type:'LineString',coordinates:line.coordinates.map(convert)},properties:{sourceId:g.id,role:'contour',name:`Contour ${features.length+1}`,tags:{}}});
 }
 p.features.features=features;p.terrain={format:'synthetic-contours-v1',grid:g,frame:{center,origin},intervalM:5,contours};
 p.exercises=[110,105].map((level,i)=>({id:`depression-${i+1}`,type:'contour-elevation',review:'reviewed',sourceIds:[g.id],scenario:null,
 prompt:'This synthetic basin has inward ticks on its depression contours. Elevations decrease toward the center. With a 5 m contour interval, what is the elevation of contour A in metres?',
 hints:['The short ticks point toward the lower, inside ground.','Start at the labeled reference; subtract one 5 m interval for each contour crossed inward.'],
 rubric:{featureId:contours.find(c=>c.levelM===level).featureId,referenceFeatureId:contours.find(c=>c.levelM===level+5).featureId,toleranceM:.01}}));return p;
}
