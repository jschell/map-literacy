export const GRID_LIMITS = Object.freeze({ maxDimension: 1024, maxSamples: 262144 });
const unitFactors = Object.freeze({ m: 1, ft: .3048, 'us-survey-ft': 1200 / 3937 });
const fail = (message) => { throw new Error(`Invalid elevation grid: ${message}`); };
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const parameter = (value) => value===null || typeof value==='boolean' || (Number.isFinite(value)) || (typeof value==='string' && value.length<=2000) || (Array.isArray(value) && value.length<=8 && value.every(Number.isFinite));
const text = (value, max = 240) => typeof value === 'string' && value.length > 0 && value.length <= max;
export function elevationMeters(value, unit) {
  if (!Number.isFinite(value) || typeof unit!=='string' || !Object.hasOwn(unitFactors, unit) || !Number.isFinite(value * unitFactors[unit])) fail('unsupported elevation or unit');
  return value * unitFactors[unit];
}
/** Separate preparation artifact. This does not enable terrain-v1 lesson-pack imports. */
export function validateElevationGrid(grid) {
  if (!keys(grid, ['format','id','width','height','horizontal','vertical','source','samples']) || grid.format !== 'map-literacy-elevation-grid-v1' || !text(grid.id,80)) fail('format or fields');
  const { width, height, horizontal:h, vertical:v, source:s, samples } = grid;
  if (![width,height].every(n=>Number.isInteger(n)&&n>=2&&n<=GRID_LIMITS.maxDimension) || width*height>GRID_LIMITS.maxSamples || !Array.isArray(samples) || samples.length!==width*height) fail('sample budget or dimensions');
  if (!keys(h,['crs','units','axisOrder','origin','step','registration']) || !['LOCAL_METRIC','EPSG:26910'].includes(h.crs) || h.units!=='m' || h.axisOrder!=='easting,northing' || h.registration!=='sample-center') fail('horizontal reference');
  if (![h.origin,h.step].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)) || h.step[0]<=0 || h.step[1]>=0 || h.origin[0]+h.step[0]===h.origin[0] || h.origin[1]+h.step[1]===h.origin[1] || !Number.isFinite(h.origin[0]+(width-1)*h.step[0]) || !Number.isFinite(h.origin[1]+(height-1)*h.step[1])) fail('north-up center grid');
  for (let axis=0;axis<2;axis++) if (Math.abs(((h.origin[axis]+h.step[axis])-h.origin[axis])/h.step[axis]-1)>1e-6) fail('grid step loses numeric precision at origin');
  if (!keys(v,['units','reference','nodata','uncertaintyM']) || typeof v.units!=='string' || !Object.hasOwn(unitFactors,v.units) || !['synthetic-zero','NAVD88'].includes(v.reference) || v.nodata!==null || !(v.uncertaintyM===null || (Number.isFinite(v.uncertaintyM)&&v.uncertaintyM>=0))) fail('vertical reference, units or uncertainty');
  if (!keys(s,['kind','productId','version','acquiredAt','url','sha256','license','attribution','transforms']) || !['synthetic','usgs-3dep'].includes(s.kind) || !text(s.productId) || !text(s.version) || typeof s.sha256!=='string' || !/^[a-f0-9]{64}$/.test(s.sha256) || !text(s.license) || !text(s.attribution,2000) || !Array.isArray(s.transforms) || s.transforms.length>8) fail('provenance');
  if (typeof s.acquiredAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s.acquiredAt) || !Number.isFinite(Date.parse(s.acquiredAt)) || new Date(s.acquiredAt).toISOString()!==s.acquiredAt) fail('source acquisition timestamp');
  if (s.kind==='synthetic') { if (s.url!==null || h.crs!=='LOCAL_METRIC' || v.reference!=='synthetic-zero') fail('synthetic references'); }
  else {
    if (!text(s.url,2048)) fail('source URL');
    let url; try { url=new URL(s.url); } catch { fail('source URL'); }
    if (url.protocol!=='https:' || url.username || url.password || h.crs!=='EPSG:26910' || v.reference!=='NAVD88') fail('unsupported real source references');
  }
  for (const t of s.transforms) {
    if (!keys(t,['operation','version','parameters']) || !text(t.operation) || !text(t.version) || !t.parameters || typeof t.parameters!=='object' || Array.isArray(t.parameters) || Object.keys(t.parameters).length>32) fail('transform lineage');
    for (const [key,value] of Object.entries(t.parameters)) if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(key) || !parameter(value)) fail('transform parameters');
  }
  for (const sample of samples) if (sample!==null) elevationMeters(sample,v.units);
  return true;
}
/** Freeze a private, validated snapshot; callers cannot change later sample answers. */
export function createElevationGrid(input) {
  validateElevationGrid(input);
  const grid = structuredClone(input);
  const freeze = (value) => { if (value && typeof value==='object') { for (const v of Object.values(value)) freeze(v); Object.freeze(value); } return value; };
  freeze(grid);
  const { width,height,horizontal:h }=grid;
  function coordinate(column,row) {
    if (![column,row].every(Number.isInteger) || column<0 || row<0 || column>=width || row>=height) throw new Error('Grid sample index outside bounds.');
    return [h.origin[0]+column*h.step[0],h.origin[1]+row*h.step[1]];
  }
  function sample(x,y,method='bilinear') {
    if (![x,y].every(Number.isFinite) || !['nearest','bilinear'].includes(method)) throw new Error('Invalid grid sample request.');
    const index = (value,start,step) => {
      const f=(value-start)/step,nearest=Math.round(f),tolerance=32*Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(start))/Math.abs(step);
      return Math.abs(f-nearest)<=Math.min(1e-7,tolerance) ? nearest : f;
    };
    const fx=index(x,h.origin[0],h.step[0]),fy=index(y,h.origin[1],h.step[1]);
    if (fx<0 || fy<0 || fx>width-1 || fy>height-1) return { status:'outside' };
    let terms;
    if (method==='nearest') terms=[[Math.round(fx),Math.round(fy),1]]; // Ties select east/south.
    else {
      const col=Math.min(width-2,Math.floor(fx)),row=Math.min(height-2,Math.floor(fy)),tx=fx-col,ty=fy-row;
      terms=[[col,row,(1-tx)*(1-ty)],[col+1,row,tx*(1-ty)],[col,row+1,(1-tx)*ty],[col+1,row+1,tx*ty]];
    }
    let valueM=0;
    for(const [col,row,weight] of terms) {
      if(weight===0) continue;
      const value=grid.samples[row*width+col]; if(value===null) return { status:'nodata' };
      valueM+=elevationMeters(value,grid.vertical.units)*weight;
    }
    if (!Number.isFinite(valueM)) fail('interpolated value overflow');
    return { status:'value',valueM,verticalReference:grid.vertical.reference,uncertaintyM:grid.vertical.uncertaintyM };
  }
  return Object.freeze({ grid,coordinate,sample });
}
