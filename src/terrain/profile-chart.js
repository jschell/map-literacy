const NS='http://www.w3.org/2000/svg';
export const PROFILE_CHART_SIZE=Object.freeze({width:180,height:70});
/** Literal, self-contained SVG. Independent axes are explicitly labeled, never a terrain silhouette at equal scale. */
export function renderProfileChart(document,profile,{paper=false}={}) {
  const node=(tag,attrs={},text=null)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==null)n.textContent=text;return n;};
  const s=profile.summary;if(s.totalsStatus!=='complete'||!profile.samples.length)throw new Error('A lesson chart needs a complete profile.');
  const font=paper?3:Math.max(3,13*180/Math.min(900,document.getElementById('profile-chart')?.clientWidth||600));
  const compact=font>4,top=compact?Math.max(25,2*font+8):14,bottom=compact?top+45:53,height=compact?bottom+4*font+10:70;
  const svg=node('svg',{viewBox:`0 0 180 ${height}`,class:paper?'paper-profile':'screen-profile',role:'img','aria-label':`Elevation profile from S to E; horizontal distance ${Number(s.distanceM.toFixed(2))} metres. Axes use different scales.`});
  if(paper) {svg.setAttribute('width','180mm');svg.setAttribute('height','70mm');}
  svg.append(node('rect',{width:180,height,fill:'white'}));svg.append(node('title',{},'Elevation versus horizontal distance from S'));
  let lo=s.minElevationM,hi=s.maxElevationM;if(hi-lo<1e-6){lo-=1;hi+=1;}
  const format=n=>{const text=String(Number(n.toFixed(2)));return text.length<=7?text:n.toExponential(1);};
  const left=Math.max(18,font*.62*Math.max(...Array.from({length:5},(_,i)=>format(lo+(hi-lo)*i/4).length))+5),right=175;
  const x=d=>left+(right-left)*d/s.distanceM,y=z=>bottom-(bottom-top)*(z-lo)/(hi-lo),label=(x,y,text,anchor='start')=>svg.append(node('text',{x,y,fill:'black','font-family':'Arial, sans-serif','font-size':font,'text-anchor':anchor},text));
  for(let i=0;i<=4;i++) {
    const d=s.distanceM*i/4,z=lo+(hi-lo)*i/4;
    svg.append(node('path',{d:`M${x(d)},${top} V${bottom} M${left},${y(z)} H${right}`,fill:'none',stroke:'#ddd','stroke-width':.2}));
    label(x(d),bottom+font+2,format(d),i===4?'end':i===0?'start':'middle');label(left-3,y(z)+1,format(z),'end');
  }
  svg.append(node('path',{d:`M${left},${top} V${bottom} H${right}`,fill:'none',stroke:'black','stroke-width':.3}));
  svg.append(node('path',{d:profile.samples.map((p,i)=>`${i?'L':'M'}${x(p.distanceM)},${y(p.elevationM)}`).join(' '),class:'profile-curve',fill:'none',stroke:'black','stroke-width':.6,'stroke-linejoin':'round'}));
  label(left,compact?font+2:7,'Elevation (m)');label(96.5,compact?bottom+2*font+5:64,'Horizontal distance from S (m)','middle');label(left,compact?top-4:12,'S');label(right,compact?top-4:12,'E','end');label(96.5,compact?bottom+3*font+8:69,'Axes use different scales.','middle');
  return svg;
}
