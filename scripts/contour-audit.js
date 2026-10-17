import { createElevationGrid } from '../src/terrain/grid.js';

/** Compare stitched edges with raw geometry and independently sample their elevations. */
export function auditContourLines(grid, raw, connected) {
  const reader=createElevationGrid(grid), h=grid.horizontal;
  const key=segment=>JSON.stringify([...segment].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
  let maxElevationErrorM=0, verticesChecked=0, boundaryOpenEndpoints=0, interiorOpenEndpoints=0;
  for (let i=0;i<raw.contours.length;i++) {
    const expected=new Set(raw.contours[i].segments.map(key)),actual=new Set();
    for (const line of connected.contours[i].lines) {
      for (let j=0;j<line.coordinates.length;j++) {
        const p=line.coordinates[j],value=reader.sample(...p);
        if(value.status!=='value') throw new Error('Contour vertex lacks a source elevation.');
        maxElevationErrorM=Math.max(maxElevationErrorM,Math.abs(value.valueM-raw.contours[i].levelM));verticesChecked++;
        if(j) {const k=key([line.coordinates[j-1],p]);if(actual.has(k))throw new Error('Repeated stitched edge.');actual.add(k);}
      }
      if(!line.closed)for(const p of [line.coordinates[0],line.coordinates.at(-1)]) {
        const c=(p[0]-h.origin[0])/h.step[0],r=(p[1]-h.origin[1])/h.step[1];
        if(Math.min(Math.abs(c),Math.abs(c-grid.width+1),Math.abs(r),Math.abs(r-grid.height+1))<1e-7)boundaryOpenEndpoints++;
        else interiorOpenEndpoints++;
      }
    }
    if(actual.size!==expected.size||[...expected].some(k=>!actual.has(k)))throw new Error('Stitched/raw contour edge mismatch.');
  }
  return {verticesChecked,maxElevationErrorM,boundaryOpenEndpoints,interiorOpenEndpoints,uniqueEdgesPreserved:true};
}
