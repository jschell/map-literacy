import { readFile } from 'node:fs/promises';

/** Invented rendering/validation records, NOT acquired USGS geography or elevations. */
export async function terrainOverlayFixture() {
  const grid=JSON.parse(await readFile(new URL('../tests/fixtures/terrain-grids.json',import.meta.url))).plane;
  grid.id='invented-georeferencing-test'; grid.horizontal.crs='EPSG:26910';
  grid.horizontal.origin=[500000,5205164.110030843]; grid.vertical.reference='NAVD88';
  grid.source.kind='usgs-3dep'; grid.source.url='https://example.invalid/synthetic-test-only';
  grid.source.attribution='Invented software test metadata; not an acquired USGS product.';
  const coordinates=[[-123.0002,47],[-123,47],[-122.9998,47]];
  const pack=JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json',import.meta.url)));
  pack.bounds=[-123.001,46.999,-122.999,47.001]; pack.sourceBounds=[...pack.bounds];
  pack.features.features=[{type:'Feature',id:'test-road',geometry:{type:'LineString',coordinates},
    properties:{sourceId:pack.sources[0].id,role:'road',name:'Synthetic alignment road',tags:{highway:'residential'}}}];
  pack.topology={nodes:[],edges:[],restrictions:[],completeness:'complete',exclusions:[]};
  pack.labels=[];pack.exercises=[];pack.print.scaleDenominator=5000;
  const overlay={format:'map-literacy-geographic-contours-v1',coordinateReference:'OGC:CRS84',review:'draft',grid,
    sourceGridSha256:'a'.repeat(64),operation:{id:'EPSG:1188',accuracyM:4,description:'Invented operation metadata for render test',pipeline:'test-only',pyproj:'test',proj:'test',maxRoundTripM:0,verticalConversion:false},
    gridCornerBounds:[-123.001,46.999,-122.999,47.001],skippedCells:0,
    contours:[{levelM:100,lines:[{closed:false,coordinates}],junctions:[],duplicateSegments:0,zeroLengthSegments:0,topologyStatus:'unbranched'}]};
  return {pack,overlay};
}
