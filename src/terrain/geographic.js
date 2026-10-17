import { validateElevationGrid } from './grid.js';
import { CONTOUR_LIMITS } from './contours.js';

const fail = message => { throw new Error(`Invalid geographic contours: ${message}`); };
const coordinate = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= -126 && p[0] <= -120 && p[1] >= 24 && p[1] <= 70;
const count = n => Number.isSafeInteger(n) && n >= 0 && n <= CONTOUR_LIMITS.maxSegments;
const text = s => typeof s === 'string' && s.length > 0 && s.length <= 2000;

/** Draft preparation sidecar, never a supported terrain lesson-pack capability. */
export function validateGeographicContours(input) {
  if (!input || input.format !== 'map-literacy-geographic-contours-v1' || input.coordinateReference !== 'OGC:CRS84' || input.review !== 'draft') fail('format/reference/review');
  validateElevationGrid(input.grid);
  if (input.grid.horizontal.crs !== 'EPSG:26910' || typeof input.sourceGridSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.sourceGridSha256)) fail('grid reference/hash');
  const o=input.operation;
  if (!o || o.id !== 'EPSG:1188' || o.accuracyM !== 4 || o.verticalConversion !== false || !text(o.description) || !text(o.pipeline) || !text(o.pyproj) || !text(o.proj) || !Number.isFinite(o.maxRoundTripM) || o.maxRoundTripM < 0 || o.maxRoundTripM > 1e-6) fail('display operation');
  const b=input.gridCornerBounds;
  if (!Array.isArray(b) || b.length !== 4 || !coordinate(b.slice(0,2)) || !coordinate(b.slice(2)) || b[0] >= b[2] || b[1] >= b[3]) fail('corner bounds');
  if (!Number.isSafeInteger(input.skippedCells) || input.skippedCells < 0 || input.skippedCells > CONTOUR_LIMITS.maxCellLevels || !Array.isArray(input.contours) || !input.contours.length || input.contours.length > CONTOUR_LIMITS.maxLevels) fail('counts');
  let positions=0, edges=0;
  for (let i=0; i<input.contours.length; i++) {
    const c=input.contours[i];
    if (!c || !Number.isFinite(c.levelM) || (i && c.levelM <= input.contours[i-1].levelM) || !Array.isArray(c.lines) || !Array.isArray(c.junctions) || !count(c.duplicateSegments) || !count(c.zeroLengthSegments) || !['unbranched','needs-review'].includes(c.topologyStatus) || (c.topologyStatus === 'needs-review') !== (c.junctions.length > 0)) fail('contour metadata');
    if (c.lines.length > CONTOUR_LIMITS.maxSegments || c.junctions.length > CONTOUR_LIMITS.maxSegments) fail('line/junction budget');
    for (const line of c.lines) {
      if (!line || typeof line.closed !== 'boolean' || !Array.isArray(line.coordinates) || line.coordinates.length < 2) fail('line');
      positions += line.coordinates.length; edges += line.coordinates.length-1;
      if (positions > 2*CONTOUR_LIMITS.maxSegments || edges > CONTOUR_LIMITS.maxSegments) fail('coordinate budget');
      for (const p of line.coordinates) if (!coordinate(p)) fail('coordinate');
      const [start,end]=[line.coordinates[0],line.coordinates.at(-1)];
      if (line.closed !== (start[0] === end[0] && start[1] === end[1])) fail('closure');
    }
    for (const j of c.junctions) if (!j || !coordinate(j.coordinate) || !Number.isSafeInteger(j.degree) || j.degree < 3 || j.degree > CONTOUR_LIMITS.maxSegments) fail('junction');
  }
  return true;
}

/** Share the pack renderer's convert/clip/scale; no independent terrain transform. */
export function createContourOverlayModel(input, mapModel) {
  validateGeographicContours(input);
  const lines=input.contours.flatMap(c=>c.lines.map(line=>({levelM:c.levelM,...line})));
  if (lines.length > 1000 || lines.reduce((n,l)=>n+l.coordinates.length,0) > 10000) throw new Error('Terrain display budget exceeded; reduce extent or contour levels.');
  if (!mapModel || typeof mapModel.convert !== 'function' || !Array.isArray(mapModel.clip)) throw new Error('Expected a shared screen/paper map model.');
  const paths=lines.map((line,index)=>({id:`contour:${index}`,levelM:line.levelM,closed:line.closed,
    points:line.coordinates.map(p=>{
      const result=mapModel.convert(p);
      if (!Array.isArray(result) || result.length!==2 || !result.every(Number.isFinite)) throw new Error('Nonfinite terrain display coordinate.');
      return result;
    })}));
  return {paths,clip:mapModel.clip.map(p=>[...p]),paper:mapModel.paper,draft:true,
    horizontalAccuracyM:input.operation.accuracyM,verticalReference:input.grid.vertical.reference,
    verticalUncertaintyM:input.grid.vertical.uncertaintyM,sourceGridSha256:input.sourceGridSha256,
    needsTopologyReview:input.contours.some(c=>c.topologyStatus==='needs-review')};
}
