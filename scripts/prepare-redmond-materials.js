// Reproduce a bounded draft teaching packet from the retained, hash-locked checkpoint.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {validatePack} from '../src/data/validate-pack.js';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/prepare-redmond-materials.js retained-bundle fresh-output-directory');
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected={
 'source.osm.json':'103fa2e3a00e1c178393314137ea3f9f96e3c1545a8f294c8fd0301bb9ae7564',
 'pack.json':'88a97e78335faf1419ecb7fd1035d2347f06a23f15343fa24daa1f5784937302',
 'acquisition.json':'7f3dbf35b8b9078b3b80fca7d99ded0a43ca98e83c48353c8f76d4e05253344e',
 'review-report.json':'8887a05783903585e278686b4d71e4268bd56b35ec3d67a59cc9ca1c8db7608c'
};
const bytes={};for(const [name,h]of Object.entries(expected)){bytes[name]=await readFile(join(input,name));if(hash(bytes[name])!==h)throw Error(`Checkpoint hash mismatch: ${name}`);}
const p=JSON.parse(bytes['pack.json']),raw=JSON.parse(bytes['source.osm.json']);
const ways=[6379332,6442223,6501235,428044625,1300842594,1300842595,1300842596,1301688983].map(id=>`way:${id}`),selected=new Set(ways);
p.id='redmond-cleveland-brown-draft';p.title='Redmond — orient and locate (draft)';p.revision=1;
p.bounds=[-122.1263,47.67345,-122.1246,47.67465];p.print={...p.print,orientation:'portrait',scaleDenominator:1000};
p.review={status:'draft',reviewedAt:null,note:'Source-backed material draft. Independent content, route/access/restriction, device and learner review pending. Reference markers are authored map points, not physical landmarks.'};
p.features.features=p.features.features.filter(f=>selected.has(f.id));
p.topology.edges=p.topology.edges.filter(e=>selected.has(e.featureId));
const nodeIds=new Set(p.topology.edges.flatMap(e=>[e.from,e.to]));p.topology.nodes=p.topology.nodes.filter(n=>nodeIds.has(n.id));
p.topology.restrictions=[];p.topology.completeness='partial';
p.topology.exclusions=p.topology.exclusions.filter(e=>e.objectIds.some(id=>selected.has(id)));
p.topology.exclusions.push({id:'material-scope',objectIds:ways,reason:'Display subset only. Other ways and all untranslated restrictions remain in retained raw source/report. Access stays unknown; no approved route or detour. Renderer clips full original way geometry to the focus extent.'});
const markers={A:2459700408,B:53196765,C:12048793289,D:53196764};
const points=Object.fromEntries(Object.entries(markers).map(([name,id])=>{const n=raw.elements.find(n=>n.type==='node'&&n.id===id);if(!n)throw Error(`Missing marker node ${id}`);return[name,[n.lon,n.lat]];}));
for(const [name,coordinate]of Object.entries(points))p.features.features.push({type:'Feature',id:`reference:${name}`,geometry:{type:'Point',coordinates:coordinate},properties:{sourceId:'osm-source',role:'landmark',name,tags:{'map-literacy:reference':'authored map marker, not a physical landmark','map-literacy:source-node':String(markers[name])}}});
p.labels=[
 ['161st',1300842596,'161st Ave NE',[-122.12583,47.67431]],
 ['cleveland',6501235,'Cleveland St',[-122.12543,47.67399]],
 ['brown',6442223,'Brown St',[-122.12509,47.67368]],
 ...Object.keys(points).map(name=>[`reference-${name}`,`reference:${name}`,name,points[name]])
].map(([id,feature,text,anchor],i)=>({id:`label:${id}`,featureId:typeof feature==='number'?`way:${feature}`:feature,text,anchor,rotationDeg:0,visibleIn:'partial',priority:i>=3?100:80}));
function bearing(a,b){const rad=x=>x*Math.PI/180,la=rad(a[1]),lb=rad(b[1]),dl=rad(b[0]-a[0]);return(Math.atan2(Math.sin(dl)*Math.cos(lb),Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dl))*180/Math.PI+360)%360;}
const common={review:'draft',sourceIds:['osm-source'],scenario:null};
p.exercises=[
 {id:'orient-ac',type:'heading',prompt:'On the map, face from reference A toward C. Give the straight-line true bearing, clockwise from north; do not follow the road curve.',hints:['Use the north arrow. North is geographic, even when the screen is rotated.'],rubric:{expectedDeg:bearing(points.A,points.C),toleranceDeg:15}},
 {id:'orient-ab',type:'heading',prompt:'Face directly from reference A toward B. Give the true bearing clockwise from north, then explain why it is not exactly east.',hints:['Use the straight line between the markers rather than the screen edge.'],rubric:{expectedDeg:bearing(points.A,points.B),toleranceDeg:15}},
 {id:'locate-b',type:'endpoint',prompt:'Locate the map reference at Brown Street and Cleveland Street. Mark it and name the two street clues you used.',hints:['Use both street names and the connected lines.'],rubric:{expected:points.B,toleranceM:10}},
 {id:'locate-a',type:'endpoint',prompt:'Locate the map reference at 161st Avenue Northeast and Cleveland Street. Mark it and explain how it differs from the Brown Street junction.',hints:['Read the complete street name and compare both junctions.'],rubric:{expected:points.A,toleranceM:10}}
].map(e=>({...common,...e}));
const recipe={version:1,focusBounds:p.bounds,wayIds:ways,markerNodes:markers,labelPolicy:'Authored abbreviations and A–D map references; partial retains required clues; blank is reconstruction only.',routePolicy:'Unknown access/partial topology retained; no scored route/detour or independent approval.'};
p.sources[0].transforms.push({name:'prepare-redmond-materials',version:'1',parameters:recipe});
const result=validatePack(p);if(!result.valid)throw Error(JSON.stringify(result.errors));
const packText=JSON.stringify(p,null,2)+'\n';
const manifest={status:'draft',packId:p.id,revision:p.revision,packSha256:hash(packText),checkpointFiles:expected,sourceAt:p.sources[0].sourceAt,recipe,counts:{roadFeatures:ways.length,referenceMarkers:4,nodes:p.topology.nodes.length,edges:p.topology.edges.length,unknownAccessEdges:p.topology.edges.filter(e=>e.access==='unknown').length,exercises:p.exercises.length},review:{technicalSourceReplay:'passed',independentContent:'pending',routeAccessRestrictions:'pending',paperDevice:'pending',learnerTransfer:'pending'},answers:p.exercises.map(e=>({id:e.id,type:e.type,rubric:e.rubric})),note:'Instructor/technical manifest contains answers. Do not distribute with learner sheets. Source observations are from 2026-10-13, not current field verification.'};
await mkdir(resolve(output));
await writeFile(join(output,'pack.json'),packText);await writeFile(join(output,'instructor-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output:resolve(output),...manifest.counts,packSha256:manifest.packSha256}));
