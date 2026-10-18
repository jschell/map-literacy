import { createElevationGrid } from './grid.js';
const fail=message=>{throw new Error(`Depression contours: ${message}`);};
const inside=(p,ring)=>{
 let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++) {const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;
};
/** Strict synthetic local-side checks. Never infer a depression from closure alone. */
export function deriveDepressionTicks(grid, connected) {
 const sampler=createElevationGrid(grid),h=grid.horizontal,cell=Math.min(h.step[0],-h.step[1]);
 if(grid.source.kind!=='synthetic'||grid.vertical.uncertaintyM!==0||cell<1||cell>100)fail('exact synthetic grids with 1–100 m cells required');
 const ticks=[];let ringIndex=0;
 for(const c of connected.contours)for(const line of c.lines) {
  const ring=line.coordinates;
  if(c.topologyStatus!=='unbranched'||!line.closed||ring.length<4)fail('unambiguous closed rings required');
  const origin=ring[0];
  const area=ring.slice(1).reduce((s,p,i)=>s+(ring[i][0]-origin[0])*(p[1]-origin[1])-(p[0]-origin[0])*(ring[i][1]-origin[1]),0);
  if(Math.abs(area)<1e-6)fail('nonzero ring area required');
  const sign=Math.sign(area),segments=[];let total=0;
  const check=(p,n,length)=>{
   const inner=[p[0]+n[0]*length,p[1]+n[1]*length],outer=[p[0]-n[0]*cell*.1,p[1]-n[1]*cell*.1];
   if(!inside(inner,ring)||inside(outer,ring))fail('ambiguous ring side');
   const a=sampler.sample(...inner),b=sampler.sample(...outer);
   if(a.status!=='value'||b.status!=='value'||!(a.valueM<c.levelM-1e-7&&b.valueM>c.levelM+1e-7))fail('complete lower-inside/higher-outside evidence required');
   return inner;
  };
  for(let i=1;i<ring.length;i++) {
   const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
   const n=[-dy/length*sign,dx/length*sign];check([(a[0]+b[0])/2,(a[1]+b[1])/2],n,cell*.1);
   segments.push({a,b,n,length,start:total});total+=length;
  }
  const count=Math.max(4,Math.ceil(total/cell)),tickLength=cell*.2;
  if(count>500||ticks.length+count>4000)fail('tick budget exceeded');
  let made=0;
  for(let i=0;i<count;i++) {
   const distance=(i+.37)/count*total,s=segments.find(s=>distance<s.start+s.length),t=(distance-s.start)/s.length;
   if(t<1e-6||t>1-1e-6)continue;
   const from=[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],to=check(from,s.n,tickLength);
   ticks.push({ringIndex,levelM:c.levelM,from,to});made++;
  }
  if(made<4)fail('not enough unambiguous ticks');ringIndex++;
 }
 if(!ringIndex)fail('depression rings required');return ticks;
}
