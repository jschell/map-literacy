import test from 'node:test';import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{buildPilotMaterials,candidatePaths}from'../scripts/pilot-materials.js';import{validatePack}from'../src/data/validate-pack.js';import{scoreAnswer}from'../src/lesson/score.js';import{createMapModel}from'../src/map/model.js';
for(const revision of [1,2]){
const files=buildPilotMaterials({revision}),index=JSON.parse(files['material-index.json']);
const materialTest=(name,fn)=>test(`revision ${revision}: ${name}`,fn);
materialTest('five draft pilot sets reproduce exact bytes and retain forty locked skill references without observations',async()=>{
 for(const [name,text]of Object.entries(files))assert.equal(await readFile(new URL(`../docs/materials/pilot-v${revision}/${name}`,import.meta.url),'utf8'),text);
 const structures=new Set();for(const [letter,ref]of Object.entries(index.sets)){
  const text=files[`set-${letter.toLowerCase()}.json`],p=JSON.parse(text);assert.deepEqual(validatePack(p),{valid:true,errors:[]});assert.equal(createHash('sha256').update(text).digest('hex'),ref.sha256);
  assert.equal(p.review.status,'draft');assert.equal(p.review.reviewedAt,null);assert.equal(p.exercises.length,8);
  for(const type of ['heading','endpoint','route','detour'])assert.equal(p.exercises.filter(e=>e.type===type).length,2);
  assert.deepEqual(ref.exercises,p.exercises.map(e=>({id:e.id,skill:e.type})));structures.add(`${p.topology.nodes.length}/${p.topology.edges.length}`);
 }
 assert.equal(structures.size,5);const capture=JSON.parse(files['capture-template.json']);assert.deepEqual(capture.participants,[]);assert.deepEqual(capture.items,[]);assert.equal(capture.materialsApproved,null);assert.equal(capture.conditionsComparable,null);
});
materialTest('all authored route alternatives score by topology and closures while published packs remain unreviewed',()=>{
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
materialTest('pilot road clues and references fit labeled and partial Letter maps in both orientations',()=>{
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]);for(const orientation of ['portrait','landscape'])for(const variant of ['labeled','partial']){const m=createMapModel(p,{paper:true,orientation,variant});assert.equal(m.suppressedLabels,0);assert.equal(m.labels.length,p.labels.length);}}
});

materialTest('pilot labels stay upright and all clues survive the checked narrow screen widths',()=>{
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]);assert.ok(p.labels.every(l=>l.rotationDeg>=-90&&l.rotationDeg<=90));for(const screenWidth of [336,640,1000]){const m=createMapModel(p,{screenWidth,screenHeight:Math.max(320,Math.min(560,screenWidth*.56))});assert.equal(m.suppressedLabels,0);assert.equal(m.labels.length,p.labels.length);}}
});
materialTest('invented roads have no unmarked intersections between nonincident edges',()=>{
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const letter of Object.keys(index.sets)){const p=JSON.parse(files[`set-${letter.toLowerCase()}.json`]),r=p.sources[0].transforms[0].parameters;
  for(let i=0;i<r.roads.length;i++)for(let j=i+1;j<r.roads.length;j++){const x=r.roads[i],y=r.roads[j];if([...x].some(n=>y.includes(n)))continue;const[a,b]=[...x].map(n=>r.pointsM[n]),[c,d]=[...y].map(n=>r.pointsM[n]);
   const boxesOverlap=[0,1].every(k=>Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]))<=Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k])));
   assert.ok(!boxesOverlap||turn(a,b,c)*turn(a,b,d)>0||turn(c,d,a)*turn(c,d,b)>0,`${letter}: ${x}/${y} unmarked crossing`);
  }
 }
});

}

test('revision 2 removes the identified transfer endpoint and ordered-route repeats without claiming equivalence',()=>{
 for(const revision of [1,2]){
  const f=buildPilotMaterials({revision}),priorPrompts=new Set(),priorRoutes=new Set();let endpointRepeats=0,routeRepeats=0;
  for(const letter of ['a','b','c','d','e']){const p=JSON.parse(f[`set-${letter}.json`]);for(const e of p.exercises){
   if(e.type==='endpoint'){if(['d','e'].includes(letter)&&priorPrompts.has(e.prompt))endpointRepeats++;priorPrompts.add(e.prompt);}
   if(e.type==='route'){const pair=`${e.rubric.startNodeId}->${e.rubric.endNodeId}`;if(['d','e'].includes(letter)&&priorRoutes.has(pair))routeRepeats++;priorRoutes.add(pair);}
  }}
  assert.equal(endpointRepeats,revision===1?2:0);assert.equal(routeRepeats,revision===1?1:0);
  if(revision===2){const index=JSON.parse(f['material-index.json']),b=index.comparison.find(x=>x.set==='B'),c=index.comparison.find(x=>x.set==='C');assert.deepEqual(b.routeMinimumEdges,c.routeMinimumEdges);assert.ok(b.headingDegrees.every((v,i)=>Math.abs(v-c.headingDegrees[i])<5));assert.equal(index.approval.conditionsComparable,null);}
 }
});

test('revision 2 changes only the six identified questions and preserves all revision-1 map geometry',()=>{
 const before=buildPilotMaterials(),after=buildPilotMaterials({revision:2}),counts=[];
 for(const letter of ['a','b','c','d','e']){const a=JSON.parse(before[`set-${letter}.json`]),b=JSON.parse(after[`set-${letter}.json`]);assert.equal(a.revision,1);assert.equal(b.revision,2);for(const field of ['features','topology','labels','bounds','print'])assert.deepEqual(b[field],a[field]);counts.push(a.exercises.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(b.exercises[i])).length);}
 assert.deepEqual(counts,[0,0,3,2,1]);assert.throws(()=>buildPilotMaterials({revision:3}));
});
