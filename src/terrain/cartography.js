/** Synthetic lesson convention: every fifth interval from synthetic zero is an index. */
export function isIndexContour(levelM, intervalM) {
  const n = levelM / (5 * intervalM);
  return Math.abs(n - Math.round(n)) <= 1e-9;
}

/** One upright label on a long segment; reject edges, markers and label collisions. */
export function contourLabelCandidates(model, blocked = []) {
  if (!model.contourIntervalM || model.variant === 'blank') return [];
  const font = model.paper ? 3 : 13, gap = font * .7;
  const boxes = [...blocked], labels = [];
  for (const path of model.paths) {
    if (path.contourLevelM === undefined) continue;
    const text = `${Number(path.contourLevelM.toFixed(4))} m`, width = text.length * font * .65;
    const segments = path.lines.flatMap(line => {
      const points=line.map(p=>model.convert(p)),runs=[];
      let a=points[0],b=points[1];
      const append=()=>runs.push({point:[(a[0]+b[0])/2,(a[1]+b[1])/2],length:Math.hypot(a[0]-b[0],a[1]-b[1])});
      for(const c of points.slice(2)) {
        const u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],norm=Math.hypot(...u)*Math.hypot(...v);
        // Merge only label-placement runs; preserve every source/rendered vertex.
        if(norm>0&&u[0]*v[0]+u[1]*v[1]>0&&Math.abs(u[0]*v[1]-u[1]*v[0])<=norm*1e-5)b=c;
        else {append();a=b;b=c;}
      }
      append();return runs;
    }).sort((a,b)=>b.length-a.length);
    for (const {point:[x,y],length} of segments) {
      const box=[x-width/2-gap,y-font/2-gap,x+width/2+gap,y+font/2+gap];
      if(length < width || box[0]<0 || box[1]<0 || box[2]>model.width || box[3]>model.height || boxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])) continue;
      if(![[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]].every(p=>{
        // Test the full label box against the rotated clipping polygon.
        let inside=false;for(let i=0,j=model.clip.length-1;i<model.clip.length;j=i++) {
          const a=model.clip[i],b=model.clip[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        }return inside;
      }))continue;
      labels.push({text,point:[x,y],fontSize:font,featureId:path.id});boxes.push(box);break;
    }
  }
  return labels;
}
