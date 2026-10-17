import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveContours, CONTOUR_LIMITS } from '../src/terrain/contours.js';
import { deriveContourLines, stitchContourSegments } from '../src/terrain/contour-lines.js';
const grids = JSON.parse(await readFile(new URL('fixtures/terrain-grids.json', import.meta.url)));
const result = segments => ({ ...deriveContours(grids.flat, [100]), contours: [{ levelM: 100, segments }] });
const stitch = segments => stitchContourSegments(result(segments)).contours[0];
const edgeKeys = segments => segments.map(s => JSON.stringify([...s].sort((a,b) => a[0]-b[0] || a[1]-b[1]))).sort();
const lineEdges = lines => lines.flatMap(l => l.coordinates.slice(1).map((p,i) => [l.coordinates[i],p]));

test('analytic plane and valley join into bounded open lines without losing segments', () => {
  for (const grid of [grids.plane, grids.valley]) {
    const levels = grid === grids.plane ? [13,17] : [115];
    const raw = deriveContours(grid, levels), out = deriveContourLines(grid, levels);
    for (let i=0; i<raw.contours.length; i++) {
      const c=out.contours[i];
      assert.equal(c.topologyStatus, 'unbranched');
      assert.ok(c.lines.length); assert.ok(c.lines.every(l => !l.closed));
      assert.deepEqual(edgeKeys(lineEdges(c.lines)), edgeKeys(raw.contours[i].segments));
    }
  }
});

test('hill produces a single closed ring with analytic diamond vertices', () => {
  const c = deriveContourLines(grids.hill, [85]).contours[0];
  assert.equal(c.lines.length,1); assert.equal(c.lines[0].closed,true);
  const coords=c.lines[0].coordinates;
  assert.deepEqual(coords[0],coords.at(-1));
  assert.equal(new Set(coords.slice(0,-1).map(JSON.stringify)).size,coords.length-1);
  for(const [x,y] of coords) assert.ok(Math.abs(Math.abs((x-1000)/10-2)+Math.abs((2000-y)/20-2)-1.5)<1e-9);
});

test('reversed duplicates and plateau coincidences are removed without changing input', () => {
  const raw=result([[[0,0],[1,0]],[[1,0],[0,0]],[[1,0],[2,0]],[[2,0],[2,0]]]);
  const before=structuredClone(raw), c=stitchContourSegments(raw).contours[0];
  assert.equal(c.duplicateSegments,1); assert.equal(c.zeroLengthSegments,1);
  assert.deepEqual(c.lines,[{closed:false,coordinates:[[0,0],[1,0],[2,0]]}]);
  assert.deepEqual(raw,before);
  c.lines[0].coordinates[0][0]=99; assert.deepEqual(raw,before);
  const g={...structuredClone(grids.flat),width:3,height:3,samples:[-1,0,-1,-1,0,-1,-1,0,-1]};
  const plateau=deriveContourLines(g,[0]).contours[0];
  assert.equal(plateau.duplicateSegments,2); assert.equal(plateau.lines.length,1);
});

test('junctions stop traversal and retain all edges instead of choosing a branch', () => {
  const segments=[[[0,0],[1,0]],[[1,0],[2,0]],[[1,0],[1,1]],[[1,0],[1,-1]]];
  const c=stitch(segments);
  assert.equal(c.topologyStatus,'needs-review');
  assert.deepEqual(c.junctions,[{coordinate:[1,0],degree:4}]);
  assert.equal(c.lines.length,4);
  assert.deepEqual(edgeKeys(lineEdges(c.lines)),edgeKeys(segments));
});

test('near endpoints and geometric crossings do not create connections', () => {
  const c=stitch([[[0,0],[1,0]],[[1+1e-12,0],[2,0]],[[.5,-1],[.5,1]]]);
  assert.equal(c.lines.length,3); assert.deepEqual(c.junctions,[]);
  assert.equal(c.topologyStatus,'unbranched');
});

test('touching rings retain the ambiguous junction and saddle choices retain every edge', () => {
  const c=stitch([[[0,0],[1,0]],[[1,0],[1,1]],[[1,1],[0,0]],[[0,0],[-1,0]],[[-1,0],[-1,-1]],[[-1,-1],[0,0]]]);
  assert.equal(c.topologyStatus,'needs-review'); assert.equal(c.junctions[0].degree,4);
  assert.equal(c.lines.length,2); assert.ok(c.lines.every(l=>l.closed));
  for(const samples of [[3,-1,-1,3],[1,-3,-3,1],[1,-1,-1,1]]) {
    const g={...structuredClone(grids.flat),width:2,height:2,samples};
    const raw=deriveContours(g,[0]), lines=deriveContourLines(g,[0]).contours[0];
    assert.equal(lines.lines.length,2);
    assert.deepEqual(edgeKeys(lineEdges(lines.lines)),edgeKeys(raw.contours[0].segments));
  }
});

test('long chains are traversed iteratively without truncation', () => {
  const segments=Array.from({length:20000},(_,i)=>[[i,0],[i+1,0]]);
  const c=stitch(segments);
  assert.equal(c.lines.length,1); assert.equal(c.lines[0].coordinates.length,20001);
  assert.deepEqual(c.lines[0].coordinates.at(-1),[20000,0]);
});

test('ordering and segment direction do not change canonical line output', () => {
  const segments=[[[0,0],[1,0]],[[1,0],[1,1]],[[1,1],[0,0]],[[3,0],[4,0]],[[4,0],[5,0]],[[4,0],[4,1]]];
  const expected=stitch(segments);
  for(let offset=0;offset<segments.length;offset++) {
    const permuted=[...segments.slice(offset),...segments.slice(0,offset)].reverse().map(s=>[s[1],s[0]]);
    assert.deepEqual(stitch(permuted),expected);
  }
});

test('nodata gaps stay open, flat/empty levels stay empty, and metadata survives', () => {
  const g={...structuredClone(grids.plane),width:5,height:5,samples:Array.from({length:25},(_,i)=>10+2*(i%5)+4*Math.floor(i/5))};
  g.samples[2*g.width+2]=null;
  const raw=deriveContours(g,[22]), out=deriveContourLines(g,[22]);
  assert.equal(out.skippedCells,4); assert.equal(out.gridId,g.id);
  assert.equal(out.horizontalCrs,g.horizontal.crs); assert.equal(out.verticalReference,g.vertical.reference);
  assert.deepEqual(edgeKeys(lineEdges(out.contours[0].lines)),edgeKeys(raw.contours[0].segments));
  assert.equal(out.contours[0].lines.length,2);
  assert.ok(out.contours[0].lines.every(l=>!l.closed));
  assert.deepEqual(deriveContourLines(grids.flat,[99,100,101]).contours.map(c=>c.lines),[[],[],[]]);
});

test('malformed and over-budget segment results fail before topology traversal', () => {
  for(const input of [null,{}, {...result([]),skippedCells:-1}, {...result([]),horizontalCrs:'EPSG:4326'}, result([[[NaN,0],[1,0]]]), result([[[0],[1,0]]]), {...result([]),contours:[{levelM:1,segments:[]},{levelM:1,segments:[]}]}]) assert.throws(()=>stitchContourSegments(input),/Invalid contour/);
  const tooMany=result(Array(CONTOUR_LIMITS.maxSegments+1).fill([[0,0],[1,0]]));
  assert.throws(()=>stitchContourSegments(tooMany),/budget/);
  const manyLevels={...result([]),contours:Array.from({length:65},(_,i)=>({levelM:i,segments:[]}))};
  assert.throws(()=>stitchContourSegments(manyLevels),/budget/);
});
