import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTOUR_METADATA, contourMetadataRequests, readContourMetadata, summarizeContours } from '../src/map/contour-metadata.js';
const feature = (contourunits,contourinterval) => ({ attributes: { contourunits,contourinterval } });
const responses = (features) => [25,26,33,34].map((id,i)=>({ id, data:{features:i<2?features:[]} }));
test('contour summary preserves mixed intervals and units without inferring a uniform grid', () => {
  const uniform = summarizeContours(responses([feature(1,40)])); assert.match(uniform.text,/40 ft/); assert.equal(uniform.values.length,1);
  const mixed = summarizeContours(responses([feature(1,40),feature(1,20)])); assert.deepEqual(mixed.values,[{unit:'ft',interval:20},{unit:'ft',interval:40}]); assert.match(mixed.text,/vary within this area/);
  const units = summarizeContours(responses([feature(1,20),feature(2,10)])); assert.equal(units.mixedUnits,true); assert.match(units.text,/elevation units vary/);
  for (const features of [[],[feature(99,40)],[feature(1,null)],[feature(1,'40')],[feature(1,0)],[feature(1,-10)],[feature(2,Infinity)]]) assert.throws(()=>summarizeContours(responses(features)));
  for (const patch of [{error:{code:500}},{exceededTransferLimit:true},{exceededTransferLimit:'false'},{features:Array(33).fill(feature(1,20))}]) {
    const r=responses([feature(1,20)]);Object.assign(r[3].data,patch);assert.throws(()=>summarizeContours(r));
  }
  assert.throws(()=>summarizeContours(responses([feature(1,20)]).slice(0,3)));
});
test('queries cover all rendered contour geometry layers using exactly the current envelope', () => {
  const bbox=[-13555000,6000000,-13552000,6002000],requests=contourMetadataRequests(bbox);
  assert.deepEqual(requests.map(r=>r.id),[25,26,33,34]);
  for(const {url} of requests) { const p=new URL(url).searchParams;assert.equal(p.get('geometry'),bbox.join(','));assert.equal(p.get('inSR'),'3857');assert.equal(p.get('returnGeometry'),'false');assert.equal(p.get('returnDistinctValues'),'true');assert.equal(p.get('resultRecordCount'),'32'); }
  assert.throws(()=>contourMetadataRequests([1,2,0,3]));
});
test('metadata response budgets handle chunked bodies, invalid UTF-8 and server errors', async () => {
  const response=(body,headers={})=>new Response(body,{headers:{'content-type':'application/json',...headers}});
  assert.deepEqual(await readContourMetadata(response('{"features":[]}')),{features:[]});
  await assert.rejects(readContourMetadata(response(new Uint8Array([255]))));
  await assert.rejects(readContourMetadata(new Response('down',{status:503})));
  await assert.rejects(readContourMetadata(response('{}',{'content-length':String(CONTOUR_METADATA.maxBytes+1)})));
  let canceled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536));},cancel(){canceled=true;}});
  await assert.rejects(readContourMetadata(response(stream)),/limit/);assert.equal(canceled,true);
});
