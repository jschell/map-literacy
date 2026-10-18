import { deriveTerrainProfile } from './profile.js';

const fail = message => {throw new Error(`Terrain landform: ${message}`);};
/** A bounded longitudinal axis and three transverse sections, not a whole-landscape claim. */
export function deriveLandform(grid, {axis,halfWidthM}) {
  if(!Array.isArray(axis)||axis.length!==2||axis.some(p=>!Array.isArray(p)||p.length!==2||!p.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e9)))fail('two finite metric axis endpoints required');
  const [a,b]=axis.map(p=>[...p]),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<2||length>1000||!Number.isFinite(halfWidthM)||halfWidthM<1||halfWidthM>100)fail('axis length 2–1000 m and half-width 1–100 m required');
  const paths=[[a,b]];
  const profile=path=>{
    const length=Math.hypot(path[1][0]-path[0][0],path[1][1]-path[0][1]);
    const p=deriveTerrainProfile(grid,path,{spacingM:Math.max(.1,length/32)});
    if(p.summary.totalsStatus!=='complete'||p.samples.length>500)fail('complete bounded sections required');
    return p;
  };
  const trend=p=>{
    const rise=p.samples.at(-1).elevationM-p.samples[0].elevationM;
    if(Math.abs(rise)<1)fail('at least 1 m of section relief required');
    const sign=Math.sign(rise);
    if(p.samples.slice(1).some((s,i)=>sign*(s.elevationM-p.samples[i].elevationM)<=1e-9))fail('flat or reversing sections need review');
    return sign;
  };
  const along=profile([a,b]),direction=trend(along),signs=[],relief=[];
  for(const t of [.25,.5,.75]) {
    const center=[a[0]+dx*t,a[1]+dy*t];
    for(const side of [-1,1]) {
      const end=[center[0]-dy/length*halfWidthM*side,center[1]+dx/length*halfWidthM*side];
      const path=[center,end];paths.push(path);const p=profile(path);signs.push(trend(p));relief.push(Math.abs(p.samples.at(-1).elevationM-p.samples[0].elevationM));
    }
  }
  if(signs.some(s=>s!==signs[0]))fail('mixed transverse sections need review');
  return {choice:signs[0]>0?'valley':'ridge',high:direction<0?a:b,low:direction<0?b:a,paths,
    alongFallM:Math.abs(along.samples.at(-1).elevationM-along.samples[0].elevationM),minCrossReliefM:Math.min(...relief)};
}
