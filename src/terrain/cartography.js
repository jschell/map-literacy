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
    const segments = path.lines.flatMap(line => line.slice(1).map((p,i) => {
      const a=model.convert(line[i]), b=model.convert(p);
      return {point:[(a[0]+b[0])/2,(a[1]+b[1])/2],length:Math.hypot(a[0]-b[0],a[1]-b[1])};
    })).sort((a,b)=>b.length-a.length);
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
