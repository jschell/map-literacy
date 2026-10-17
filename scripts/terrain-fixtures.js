import { createHash } from 'node:crypto';

export function buildTerrainFixtures() {
  const recipe = { version:1, license:'CC0-1.0', note:'Invented numeric grids, no real geography.', origin:[1000,2000], step:[10,-20], formulas:{ flat:'100',hill:'100 - 10*(abs(column-2)+abs(row-2))',valley:'100 + 10*abs(column-2)',plane:'10 + 2*column + 4*row',nodata:'plane, center sample null',feet:'plane in international feet',surveyFeet:'plane in US survey feet' } };
  const sourceBytes=JSON.stringify(recipe,null,2)+'\n',hash=createHash('sha256').update(sourceBytes).digest('hex');
  const make = (id,width,height,formula,units='m') => ({
    format:'map-literacy-elevation-grid-v1',id,width,height,
    horizontal:{crs:'LOCAL_METRIC',units:'m',axisOrder:'easting,northing',origin:recipe.origin,step:recipe.step,registration:'sample-center'},
    vertical:{units,reference:'synthetic-zero',nodata:null,uncertaintyM:0},
    source:{kind:'synthetic',productId:'analytic-grids',version:'recipe-v1',acquiredAt:'2026-10-16T00:00:00.000Z',url:null,sha256:hash,license:'CC0-1.0',attribution:'Invented Map Literacy terrain fixtures; no geographic source.',transforms:[{operation:'generate-analytic-grid',version:'1',parameters:{recipeFile:'terrain-recipe.json',case:id}} ]},
    samples:Array.from({length:width*height},(_,i)=>formula(i%width,Math.floor(i/width)))
  });
  const plane=(c,r)=>10+2*c+4*r;
  const grids={flat:make('flat',3,3,()=>100),hill:make('hill',5,5,(c,r)=>100-10*(Math.abs(c-2)+Math.abs(r-2))),valley:make('valley',5,5,(c)=>100+10*Math.abs(c-2)),plane:make('plane',3,3,plane),nodata:make('nodata',3,3,(c,r)=>c===1&&r===1?null:plane(c,r)),feet:make('feet',3,3,plane,'ft'),surveyFeet:make('surveyFeet',3,3,plane,'us-survey-ft')};
  return { 'terrain-recipe.json':sourceBytes,'terrain-grids.json':JSON.stringify(grids,null,2)+'\n' };
}
