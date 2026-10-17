import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveContours } from '../src/terrain/contours.js';
const grids=JSON.parse(await readFile(new URL('fixtures/terrain-grids.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const cell=z=>({...structuredClone(grids.flat),width:2,height:2,samples:z});
test('analytic plane contours satisfy exact elevation equation with rectangular metric cells',()=>{
  const out=deriveContours(grids.plane,[13,17]);assert.equal(out.skippedCells,0);
  for(const contour of out.contours){assert.ok(contour.segments.length);for(const seg of contour.segments)for(const [x,y]of seg)near(10+2*(x-1000)/10+4*(2000-y)/20,contour.levelM);}
  assert.deepEqual(deriveContours(grids.flat,[99,100,101]).contours.map(c=>c.segments),[[],[],[]]);
});
test('hill closes at expected diamond vertices and valley contours occupy the expected columns',()=>{
  const hill=deriveContours(grids.hill,[85]).contours[0].segments,counts=new Map();
  for(const seg of hill)for(const p of seg){near(Math.abs((p[0]-1000)/10-2)+Math.abs((2000-p[1])/20-2),1.5);const k=p.join(',');counts.set(k,(counts.get(k)||0)+1);}
  assert.ok(hill.length);assert.ok([...counts.values()].every(n=>n===2),'closed hill has degree two at each segment endpoint');
  for(const seg of deriveContours(grids.valley,[115]).contours[0].segments)for(const p of seg)assert.ok(p[0]===1005||p[0]===1035);
});
test('nodata cells are omitted, units convert before derivation, and no partial output escapes limits',()=>{
  const holes=deriveContours(grids.nodata,[13]);assert.equal(holes.skippedCells,4);assert.deepEqual(holes.contours[0].segments,[]);
  const feet=deriveContours(grids.feet,[13*.3048]),metres=deriveContours(grids.plane,[13]);
  for(let i=0;i<feet.contours[0].segments.length;i++) for(let j=0;j<2;j++)for(let k=0;k<2;k++)near(feet.contours[0].segments[i][j][k],metres.contours[0].segments[i][j][k]);
  for(const levels of [[],[1,1],[2,1],[NaN],Array.from({length:65},(_,i)=>i)])assert.throws(()=>deriveContours(grids.flat,levels));
  const checker={...structuredClone(grids.flat),width:300,height:300,samples:Array.from({length:90000},(_,i)=>(Math.floor(i/300)+i%300)%2)};assert.throws(()=>deriveContours(checker,[.5]),/output budget/);
  const big={...structuredClone(grids.flat),width:512,height:512,samples:Array(512*512).fill(1)};assert.throws(()=>deriveContours(big,Array.from({length:8},(_,i)=>i)),/processing budget/);
});
test('saddle determinant chooses connectivity and exact vertex/plateau cases stay finite',()=>{
  // Row-major order TL TR BL BR; positive determinant connects the TL–BR high regions.
  const positive=deriveContours(cell([3,-1,-1,3]),[0]).contours[0].segments;
  assert.equal(positive.length,2);assert.equal(positive[0][0][1],2000);assert.equal(positive[0][1][0],1010);
  const negative=deriveContours(cell([1,-3,-3,1]),[0]).contours[0].segments;
  assert.equal(negative[0][0][1],2000);assert.equal(negative[0][1][0],1000);
  const tie=deriveContours(cell([1,-1,-1,1]),[0]).contours[0].segments;assert.equal(tie[0][0][1],2000);assert.equal(tie[0][1][0],1010);
  for(const z of [[0,1,1,1],[0,-1,-1,1],[0,0,-1,-1]])for(const seg of deriveContours(cell(z),[0]).contours[0].segments){assert.ok(seg.flat().every(Number.isFinite));assert.notDeepEqual(seg[0],seg[1]);}
});
