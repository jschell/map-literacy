import { createHash } from 'node:crypto';
import { buildTerrainLessonFixture } from './terrain-lesson-fixture.js';
import { createProjection } from '../src/geo/projection.js';
import { deriveContourLines } from '../src/terrain/contour-lines.js';

export function buildTerrainLandformFixture() {
 const p=buildTerrainLessonFixture(),recipe='landforms-v1: z=140-x/2+(y<=40?abs(y-20)-30:10-abs(y-60)); x,y=0..80 by 10 m';
 const g=p.terrain.grid;g.id='landforms';g.width=9;g.height=9;g.horizontal.origin=[0,80];g.horizontal.step=[10,-10];
 g.samples=Array.from({length:81},(_,i)=>{const x=i%9*10,y=80-Math.floor(i/9)*10;return 140-x/2+(y<=40?Math.abs(y-20)-30:10-Math.abs(y-60));});
 g.source.productId='analytic-landforms';g.source.version='recipe-v1';g.source.sha256=createHash('sha256').update(recipe).digest('hex');g.source.transforms=[{operation:'generate-analytic-landforms',version:'1',parameters:{recipe}}];
 p.id='synthetic-terrain-landforms';p.title='Synthetic landforms — ridge and valley';p.capabilities=['terrain-contours-v1','terrain-landforms-v1'];
 p.review.note='Analytic piecewise-linear ridge/valley and transverse/longitudinal sections checked numerically. Technical fixture review; independent curriculum/transfer review remains pending.';
 const center=[0,0],origin=[40,40],projection=createProjection(center),convert=q=>projection.inverse([q[0]-40,q[1]-40]);
 const lo=convert([0,0]),hi=convert([80,80]);p.bounds=[lo[0]-1e-10,lo[1]-1e-10,hi[0]+1e-10,hi[1]+1e-10];p.sourceBounds=[lo[0]-.00001,lo[1]-.00001,hi[0]+.00001,hi[1]+.00001];
 p.sources=[{id:g.id,kind:'synthetic',url:null,query:null,fetchedAt:g.source.acquiredAt,sourceAt:null,version:g.source.version,sha256:g.source.sha256,license:g.source.license,attribution:g.source.attribution,transforms:g.source.transforms.map(t=>({name:t.operation,version:t.version,parameters:t.parameters}))}];
 const contours=[],features=[];
 for(const c of deriveContourLines(g,[80,90,100,110,120,130,140]).contours)for(const line of c.lines) {
  const id=`contour-${features.length+1}`;contours.push({featureId:id,levelM:c.levelM});features.push({type:'Feature',id,geometry:{type:'LineString',coordinates:line.coordinates.map(convert)},properties:{sourceId:g.id,role:'contour',name:`Contour ${features.length+1}`,tags:{}}});
 }
 p.features.features=features;p.terrain={format:'synthetic-contours-v1',grid:g,frame:{center,origin},intervalM:10,contours};
 p.exercises=[{axis:[[20,20],[60,20]],halfWidthM:10},{axis:[[20,60],[60,60]],halfWidthM:10},{axis:[[60,20],[20,20]],halfWidthM:10},{axis:[[60,60],[20,60]],halfWidthM:5}].map((rubric,i)=>({id:`landform-${i+1}`,type:'terrain-form',review:'reviewed',sourceIds:[g.id],scenario:null,
 prompt:'At A on the marked H–L axis, is the landform a ridge or a valley? H is higher and L is lower. Read the contour elevations on both sides, rather than relying on screen direction.',
 hints:['Locate H and L to establish downhill along the axis.','A valley has higher ground on both sides; a ridge has lower ground on both sides.','Valley contour bends point uphill; ridge bends point downhill.'],rubric}));
 return p;
}
