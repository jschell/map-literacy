import { validateElevationGrid } from './grid.js';
import { deriveContourLines } from './contour-lines.js';
import { createProjection } from '../geo/projection.js';
import { distanceM } from '../geo/distance.js';

const fail = message => { throw new Error(`Terrain pack: ${message}`); };
const fields = (v, names) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...names].sort().join(',');
const inside = (p,b) => p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];

/** First scored terrain capability: small analytic synthetic grids, no real-data approval. */
export function validateTerrainPack(pack) {
  const t=pack.terrain;
  if(!fields(t,['format','grid','frame','intervalM','contours'])||t.format!=='synthetic-contours-v1')fail('unsupported payload');
  validateElevationGrid(t.grid);
  const g=t.grid,h=g.horizontal;
  if(g.source.kind!=='synthetic'||h.crs!=='LOCAL_METRIC'||g.vertical.units!=='m'||g.width>32||g.height>32)fail('only bounded synthetic metre grids are supported');
  if(!fields(t.frame,['center','origin'])||!Array.isArray(t.frame.center)||t.frame.center.length!==2||!t.frame.center.every(Number.isFinite)||Math.abs(t.frame.center[0])>180||Math.abs(t.frame.center[1])>70)fail('frame center');
  const origin=[h.origin[0]+(g.width-1)*h.step[0]/2,h.origin[1]+(g.height-1)*h.step[1]/2];
  if(!Array.isArray(t.frame.origin)||t.frame.origin.length!==2||!t.frame.origin.every((v,i)=>v===origin[i]))fail('frame origin must be grid center');
  if(!Number.isFinite(t.intervalM)||t.intervalM<=0||t.intervalM>1000)fail('contour interval');
  if(!Array.isArray(t.contours)||!t.contours.length||t.contours.length>1000||t.contours.some(c=>!fields(c,['featureId','levelM'])||typeof c.featureId!=='string'||!Number.isFinite(c.levelM)))fail('contour references');
  const levels=[...new Set(t.contours.map(c=>c.levelM))].sort((a,b)=>a-b);
  if(levels.length<2||levels.length>8||levels.some((v,i)=>i&&Math.abs(v-levels[i-1]-t.intervalM)>1e-9))fail('2–8 consecutive contour levels required');
  if(pack.sources.length!==1||pack.sources[0].id!==g.id)fail('one grid-bound synthetic source required');
  const s=pack.sources[0];
  if(s.kind!=='synthetic'||s.sha256!==g.source.sha256||s.license!==g.source.license||s.attribution!==g.source.attribution||s.version!==g.source.version||s.fetchedAt!==g.source.acquiredAt)fail('source provenance differs from grid');
  if(pack.labels.length||pack.topology.nodes.length||pack.topology.edges.length||pack.topology.restrictions.length||pack.topology.exclusions.length||pack.topology.completeness!=='complete')fail('terrain-only packs have no authored labels or route graph');
  const projection=createProjection(t.frame.center),convert=p=>projection.inverse([p[0]-origin[0],p[1]-origin[1]]);
  for(const c of [0,g.width-1])for(const r of [0,g.height-1])if(!inside(convert([h.origin[0]+c*h.step[0],h.origin[1]+r*h.step[1]]),pack.sourceBounds))fail('grid leaves source bounds');
  const derived=deriveContourLines(g,levels);
  if(derived.contours.some(c=>c.topologyStatus!=='unbranched'))fail('ambiguous contour junctions need review');
  const expected=derived.contours.flatMap(c=>c.lines.map(line=>({levelM:c.levelM,coordinates:line.coordinates.map(convert)})));
  if(expected.length!==t.contours.length||pack.features.features.length!==expected.length)fail('contour geometry is missing or duplicated');
  const ids=new Set();
  for(let i=0;i<expected.length;i++) {
    const f=pack.features.features[i],c=t.contours[i],e=expected[i];
    if(ids.has(c.featureId)||f.id!==c.featureId||c.levelM!==e.levelM||f.properties.role!=='contour'||f.properties.sourceId!==g.id||f.geometry.type!=='LineString'||f.geometry.coordinates.length!==e.coordinates.length)fail('contour identity/level/geometry mismatch');
    ids.add(c.featureId);
    for(let j=0;j<e.coordinates.length;j++)if(distanceM(f.geometry.coordinates[j],e.coordinates[j])>1e-6||!inside(f.geometry.coordinates[j],pack.bounds))fail('contours must reproduce the grid and fit the lesson extent');
  }
  for(const x of pack.exercises) {
    if(x.type!=='contour-elevation'||x.scenario!==null||x.sourceIds.length!==1||x.sourceIds[0]!==g.id)fail('unsupported terrain exercise/scenario/source');
    const target=t.contours.find(c=>c.featureId===x.rubric.featureId),reference=t.contours.find(c=>c.featureId===x.rubric.referenceFeatureId);
    if(!target||!reference||target.levelM===reference.levelM||x.rubric.toleranceM>=t.intervalM/4)fail('distinct reference/target levels and bounded tolerance required');
  }
  return true;
}

export const contourLevel = (pack,id) => pack.terrain.contours.find(c=>c.featureId===id).levelM;

/** Reference elevations are visible; the learner's target answer is not printed. */
export function terrainExerciseAnnotations(pack,exercise,instructor=false) {
  if(exercise?.type!=='contour-elevation')return null;
  const anchor=(id,reference=false)=>{const points=pack.features.features.find(f=>f.id===id).geometry.coordinates;return points[reference?0:Math.floor((points.length-1)/2)];};
  return {closedEdges:[],markers:[
    {coordinate:anchor(exercise.rubric.referenceFeatureId,true),text:`${contourLevel(pack,exercise.rubric.referenceFeatureId)} m`},
    {coordinate:anchor(exercise.rubric.featureId),text:instructor?`A: ${contourLevel(pack,exercise.rubric.featureId)} m`:'A'}
  ]};
}
