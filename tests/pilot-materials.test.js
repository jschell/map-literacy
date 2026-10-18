import test from 'node:test';import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{buildPilotMaterials,candidatePaths}from'../scripts/pilot-materials.js';import{validatePack}from'../src/data/validate-pack.js';import{scoreAnswer}from'../src/lesson/score.js';import{createMapModel}from'../src/map/model.js';
const files=buildPilotMaterials(),index=JSON.parse(files['material-index.json']);
test('five draft pilot sets reproduce exact bytes and retain forty locked skill references without observations',async()=>{
 for(const [name,text]of Object.entries(files))assert.equal(await readFile(new URL('../docs/materials/pilot-v1/'+name,import.meta.url),'utf8'),text);
 const structures=new Set();for(const [letter,ref]of Object.entries(index.sets)){
  const text=files[`set-${letter.toLowerCase()}.json`],p=JSON.parse(text);assert.deepEqual(validatePack(p),{valid:true,errors:[]});assert.equal(createHash('sha256').update(text).digest('hex'),ref.sha256);
  assert.equal(p.review.status,'draft');assert.equal(p.review.reviewedAt,null);assert.equal(p.exercises.length,8);
  for(const type of ['heading','endpoint','route','detour'])assert.equal(p.exercises.filter(e=>e.type===type).length,2);
  assert.deepEqual(ref.exercises,p.exercises.map(e=>({id:e.id,skill:e.type})));structures.add(`${p.topology.nodes.length}/${p.topology.edges.length}`);
 }
 assert.equal(structures.size,5);const capture=JSON.parse(files['capture-template.json']);assert.deepEqual(capture.participants,[]);assert.deepEqual(capture.items,[]);assert.equal(capture.materialsApproved,null);assert.equal(capture.conditionsComparable,null);
});
test('all authored route alternatives score by topology and closures while published packs remain unreviewed',()=>{
 for(const letter of Object.keys(index.sets)){
  const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]),answers=JSON.parse(files[`answers-${letter.toLowerCase()}.json`]);
  // Test-only review state exercises the existing rubric oracle; no approved pack is generated.
  const oracle=structuredClone(p);oracle.review.status='reviewed';oracle.review.reviewedAt='2026-10-18T00:00:00.000Z';for(const e of oracle.exercises)e.review='reviewed';
  for(const e of p.exercises){const a=answers.answers.find(a=>a.id===e.id);
   const options=e.type==='heading'?[{type:e.type,degrees:a.rubric.expectedDeg}]:e.type==='endpoint'?[{type:e.type,coordinate:a.rubric.expected}]:a.witnesses.map(edgeIds=>({type:e.type,edgeIds}));
   for(const answer of options){assert.equal(scoreAnswer(p,e.id,answer).status,'needs-review');assert.equal(scoreAnswer(oracle,e.id,answer).status,'correct');}
   if(e.type==='detour'){const blockedPath=candidatePaths(p,e.rubric.startNodeId,e.rubric.endNodeId).find(path=>path.some(id=>e.scenario.closedEdgeIds.includes(id)));assert.ok(blockedPath);assert.equal(scoreAnswer(oracle,e.id,{type:'detour',edgeIds:blockedPath}).status,'incorrect');assert.equal(e.scenario.closedEdgeIds.length,2);for(const edges of a.witnesses)assert.ok(edges.every(id=>!e.scenario.closedEdgeIds.includes(id)));}
  }
 }
});
test('pilot road clues and references fit labeled and partial Letter maps in both orientations',()=>{
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]);for(const orientation of ['portrait','landscape'])for(const variant of ['labeled','partial']){const m=createMapModel(p,{paper:true,orientation,variant});assert.equal(m.suppressedLabels,0);assert.equal(m.labels.length,p.labels.length);}}
});

test('pilot labels stay upright and all clues survive the checked narrow screen widths',()=>{
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]);assert.ok(p.labels.every(l=>l.rotationDeg>=-90&&l.rotationDeg<=90));for(const screenWidth of [336,640,1000]){const m=createMapModel(p,{screenWidth,screenHeight:Math.max(320,Math.min(560,screenWidth*.56))});assert.equal(m.suppressedLabels,0);assert.equal(m.labels.length,p.labels.length);}}
});
test('invented roads have no unmarked intersections between nonincident edges',()=>{
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]),r=p.sources[0].transforms[0].parameters;
  for(let i=0;i<r.roads.length;i++)for(let j=i+1;j<r.roads.length;j++){const x=r.roads[i],y=r.roads[j];if([...x].some(n=>y.includes(n)))continue;const[a,b]=[...x].map(n=>r.pointsM[n]),[c,d]=[...y].map(n=>r.pointsM[n]);
   const boxesOverlap=[0,1].every(k=>Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]))<=Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k])));
   assert.ok(!boxesOverlap||turn(a,b,c)*turn(a,b,d)>0||turn(c,d,a)*turn(c,d,b)>0,`${letter}: ${x}/${y} unmarked crossing`);
  }
 }
});
