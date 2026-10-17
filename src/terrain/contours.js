import { createElevationGrid, elevationMeters } from './grid.js';

export const CONTOUR_LIMITS = Object.freeze({ maxLevels:64, maxCellLevels:2000000, maxSegments:131072 });
/** Unsmoothed marching-squares segments in the grid's metric CRS; not a lesson pack. */
export function deriveContours(input, levelsM) {
  const reader=createElevationGrid(input),g=reader.grid;
  if (!Array.isArray(levelsM) || !levelsM.length || levelsM.length>CONTOUR_LIMITS.maxLevels || !levelsM.every((v,i)=>Number.isFinite(v)&&(!i||v>levelsM[i-1]))) throw new Error('Contour levels must be finite, increasing and unique.');
  if ((g.width-1)*(g.height-1)*levelsM.length>CONTOUR_LIMITS.maxCellLevels) throw new Error('Contour processing budget exceeded.');
  const values=g.samples.map(v=>v===null?null:elevationMeters(v,g.vertical.units));
  const contours=levelsM.map(levelM=>({levelM,segments:[]}));let skippedCells=0,total=0;
  for(let r=0;r<g.height-1;r++) for(let c=0;c<g.width-1;c++) {
    const z=[values[r*g.width+c],values[r*g.width+c+1],values[(r+1)*g.width+c+1],values[(r+1)*g.width+c]];
    if(z.some(v=>v===null)){skippedCells++;continue;}
    const coords=[reader.coordinate(c,r),reader.coordinate(c+1,r),reader.coordinate(c+1,r+1),reader.coordinate(c,r+1)];
    for(const contour of contours) {
      const l=contour.levelM,high=z.map(v=>v>=l),edges=[];
      for(let e=0;e<4;e++) if(high[e]!==high[(e+1)%4])edges.push(e);
      if(!edges.length)continue;
      let pairs;
      if(edges.length===2)pairs=[edges];
      else {
        // Scaled asymptotic determinant avoids overflow. Exact saddles use TL–BR connectivity.
        const scale=Math.max(...z.map(v=>Math.abs(v)),Math.abs(l),1),d=z.map(v=>v/scale-l/scale);
        const q=d[0]*d[2]-d[1]*d[3];
        pairs=q>=0?[[0,1],[2,3]]:[[0,3],[1,2]];
      }
      const point=e=>{
        // Canonical endpoint order makes shared edges reproduce the same coordinates.
        let a=e,b=(e+1)%4;if(a>b || e===2)[a,b]=[b,a];
        const scale=Math.max(Math.abs(z[a]),Math.abs(z[b]),Math.abs(l),1);
        const t=(l/scale-z[a]/scale)/(z[b]/scale-z[a]/scale);
        return coords[a].map((v,i)=>v+t*(coords[b][i]-v));
      };
      for(const pair of pairs){const segment=pair.map(point);if(segment[0].every((v,i)=>v===segment[1][i]))continue;
        if(!segment.flat().every(Number.isFinite))throw new Error('Nonfinite contour coordinate.');
        if(++total>CONTOUR_LIMITS.maxSegments)throw new Error('Contour output budget exceeded.');
        contour.segments.push(segment);
      }
    }
  }
  return {format:'map-literacy-contour-segments-v1',gridId:g.id,horizontalCrs:g.horizontal.crs,verticalReference:g.vertical.reference,units:'m',method:'marching-squares-asymptotic-v1',skippedCells,contours};
}
