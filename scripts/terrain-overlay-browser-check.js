import assert from 'node:assert/strict';
import { terrainOverlayFixture } from './terrain-overlay-fixture.js';

export async function checkTerrainOverlay(page) {
  const fixture=await terrainOverlayFixture();
  const result=await page.evaluate(async({pack,overlay})=>{
    const {createMapModel}=await import('./src/map/model.js');
    const {renderMap}=await import('./src/map/render.js');
    const cases=[];
    for(const options of [{rotationDeg:90},{paper:true,orientation:'portrait'},{paper:true,orientation:'landscape'}]) {
      const m=createMapModel(pack,options),svg=renderMap(document,m,{terrain:overlay});
      document.body.append(svg);
      const line=svg.querySelector('.terrain-contour'), road=svg.querySelector('[data-feature-id="test-road"]');
      const expected=overlay.contours[0].lines[0].coordinates.map(m.convert);
      const actual=[...line.getAttribute('d').matchAll(/[ML]([^ML]+)/g)].map(x=>x[1].split(',').map(Number));
      const matches=JSON.stringify(actual)===JSON.stringify(expected);
      const style=getComputedStyle(line);
      cases.push({matches,road:!!road,clip:!!line.closest('g[clip-path]'),visible:style.stroke==='rgb(107, 107, 107)'&&style.fill==='none',draft:svg.querySelector('.terrain-overlay title').textContent.includes('Draft contours'),note:svg.querySelector('.terrain-review-note').textContent==='Draft terrain; 4 m operation'});
      svg.remove();
    }
    const before=document.querySelectorAll('svg').length;
    let rejected=false;try{renderMap(document,createMapModel(pack),{terrain:{...overlay,review:'reviewed'}});}catch{rejected=true;}
    return {cases,rejected,unchanged:document.querySelectorAll('svg').length===before};
  },fixture);
  assert.equal(result.cases.length,3);
  for(const c of result.cases)for(const v of Object.values(c))assert.equal(v,true);
  assert.equal(result.rejected,true);assert.equal(result.unchanged,true);
  return {sharedScreenAndPaper:true,clippedMonochromeSvg:true,draftAndAccuracy:true,invalidRetainsDocument:true};
}
