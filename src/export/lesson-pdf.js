import { renderProfileChart } from '../terrain/profile-chart.js';
import { imagePagesPdf } from './image-pdf.js';
import { losslessPixels } from './lossless-pixels.js';

const DPI = 300, U = DPI / 25.4, PT = DPI / 72;
/** Snapshot presentation attributes before yielding; no external stylesheet is needed in the SVG image. */
function frozenSvg(document, svg, width, height) {
  const copy = svg.cloneNode(true);
  const originals = [svg, ...svg.querySelectorAll('*')], copies = [copy, ...copy.querySelectorAll('*')];
  const properties = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'paint-order', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'opacity'];
  originals.forEach((node, i) => {
    const style = document.defaultView.getComputedStyle(node);
    for (const property of properties) copies[i].setAttribute(property, style.getPropertyValue(property));
  });
  copy.setAttribute('width', `${width}mm`); copy.setAttribute('height', `${height}mm`);
  return new XMLSerializer().serializeToString(copy);
}
async function loadSvg(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Lesson map image timed out. Retry PDF download.')), 10000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Lesson map image could not be prepared.')); };
      image.src = url;
    });
    return { image, url };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}

/** Lay out literal text synchronously, before image decoding can yield to a changed view. */
function planLesson(document, {svg,model,title,summary,footer,spec,packId,revision,questionNumber}) {
  if(!model.paper || !['portrait','landscape'].includes(model.orientation) || !svg)throw new Error('Choose an available lesson print layout.');
  const [sheetWidth,sheetHeight]=model.orientation==='portrait'?[215.9,279.4]:[279.4,215.9];
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('This browser cannot prepare PDF images.');
  const font=(pt,bold=false)=>{ctx.font=`${bold?'bold ':''}${pt*PT}px Arial`;};
  const wrap=(text,width)=>{
    const lines=[];
    for(const paragraph of text.split('\n')) {
      let line='';
      for(const word of paragraph.split(/\s+/)) {
        if(!word)continue;
        const next=line?`${line} ${word}`:word;
        if(ctx.measureText(next).width<=width*U){line=next;continue;}
        if(line){lines.push(line);line='';}
        for(const character of word){if(line && ctx.measureText(line+character).width>width*U){lines.push(line);line='';}line+=character;}
      }
      lines.push(line);
    }
    return lines;
  };
  const mapSvg=frozenSvg(document,svg,model.width,model.height);
  const chartSvg=spec?.profile?new XMLSerializer().serializeToString(renderProfileChart(document,spec.profile,{paper:true})):null;
  const kind=spec?.kind??'Map only', question=spec?`Question ${questionNumber??''}${spec.exerciseId?` · ${spec.exerciseId}`:''}`.trim():'Map only';
  const textPages=[];let entries,y;
  const next=()=>{if(textPages.length>=63)throw new Error('Lesson exceeds 64 PDF pages.');entries=[];textPages.push(entries);y=25;};
  const blocks=spec?.blocks??[];
  if(blocks.length)next();
  for(const [index,block] of blocks.entries()) {
    if(block.type==='profile-chart'){if(y+70>sheetHeight-25)next();entries.push({chart:true,y});y+=74;continue;}
    if(block.type==='answer-space'){if(y+40>sheetHeight-25)next();entries.push({rule:true,y:y+40});y+=44;continue;}
    const bold=block.type==='heading',pt=bold?12:10,step=bold?6:5;
    font(pt,bold);const lines=wrap(block.text,sheetWidth-20);
    const reserve=chartSvg && blocks[index+1]?.type==='answer-space'?44:10;
    if(bold && y+Math.min(lines.length,2)*step+reserve>sheetHeight-25)next();
    for(const text of lines){if(y+step>sheetHeight-25)next();entries.push({text,y,pt,bold});y+=step;}
    y+=3;
  }
  const mapLines=[];y=10+model.height+4;
  const add=(text,pt,bold,step,gap)=>{font(pt,bold);const lines=wrap(text,model.width);mapLines.push({lines,y,pt,bold,step});y+=lines.length*step+gap;};
  add(title,11,true,5,2);add(summary,10,false,4.5,3);
  const plainFooter=footer.replace(/ · Page 1 of \d+/,'');
  add(plainFooter,8,false,3.5,0);
  if(y>sheetHeight-24)throw new Error('Map title or source credits do not fit. Use a worksheet or a shorter pack title.');
  return {orientation:model.orientation,sheetWidth,sheetHeight,model:{width:model.width,height:model.height},mapSvg,chartSvg,mapLines,textPages,kind,question,packId,revision,exerciseId:spec?.exerciseId??null,questionNumber,
    mapText:[title,summary,plainFooter].join('\n'),wrap,font};
}

/** One bounded document, composed from selected-question or whole-lesson snapshots.
 * Encoded page samples are shared by PDF output and its page-by-page preview. */
export async function prepareLessonPdf(document, snapshots, {signal}={}) {
  const inputs=Array.isArray(snapshots)?snapshots:[snapshots];
  if(!inputs.length || inputs.length>64)throw new Error('Choose between 1 and 64 lesson questions.');
  const plans=inputs.map(snapshot=>planLesson(document,snapshot));
  const orientation=plans[0].orientation;
  if(plans.some(plan=>plan.orientation!==orientation))throw new Error('Choose one Letter orientation for the document.');
  const count=plans.reduce((sum,plan)=>sum+1+plan.textPages.length,0);
  if(count>64)throw new Error('Lesson exceeds 64 PDF pages. Export selected questions instead.');
  const canvas=document.createElement('canvas');canvas.width=Math.round(plans[0].sheetWidth*U);canvas.height=Math.round(plans[0].sheetHeight*U);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('This browser cannot prepare PDF images.');
  const font=(pt,bold=false)=>{ctx.font=`${bold?'bold ':''}${pt*PT}px Arial`;};
  const draw=(lines,x,y,step)=>lines.forEach((line,i)=>ctx.fillText(line,x*U,(y+i*step)*U));
  const clear=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='black';ctx.textBaseline='top';};
  const pages=[];let totalBytes=0;
  const image=async(svg,x,y,w,h)=>{signal?.throwIfAborted();const loaded=await loadSvg(svg);try{signal?.throwIfAborted();ctx.drawImage(loaded.image,x*U,y*U,w*U,h*U);}finally{URL.revokeObjectURL(loaded.url);}};
  const save=async(plan,contentText)=>{
    const label=`${plan.kind} · ${plan.packId} revision ${plan.revision} · ${plan.question} · Page ${pages.length+1} of ${count}`;
    font(8);plan.font(8);const footerLines=plan.wrap(label,plan.sheetWidth-20);
    if(footerLines.length>4)throw new Error('Lesson identifier is too long for the PDF footer.');
    draw(footerLines,10,plan.sheetHeight-18,3.5);
    signal?.throwIfAborted();
    const encoded=await losslessPixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,{grayscale:true});
    signal?.throwIfAborted();totalBytes+=encoded.bytes.length;
    if(totalBytes>64*1024*1024)throw new Error('PDF exceeds 64 MiB; export selected questions instead.');
    pages.push({payload:encoded.bytes,pixelWidth:canvas.width,pixelHeight:canvas.height,encoding:encoded.encoding,grayscale:encoded.grayscale,label,contentText:`${contentText}\n${label}`,exerciseId:plan.exerciseId});
  };
  for(const plan of plans) {
    clear();await image(plan.mapSvg,10,10,plan.model.width,plan.model.height);
    for(const block of plan.mapLines){font(block.pt,block.bold);draw(block.lines,10,block.y,block.step);}
    await save(plan,plan.mapText);
    for(const entries of plan.textPages) {
      clear();font(11,true);draw([`Map Literacy - ${plan.kind}`],10,10,5);
      for(const item of entries) {
        if(item.chart)await image(plan.chartSvg,10,item.y,180,70);
        else if(item.rule){ctx.strokeStyle='#888';ctx.lineWidth=.25*U;ctx.beginPath();ctx.moveTo(10*U,item.y*U);ctx.lineTo((plan.sheetWidth-10)*U,item.y*U);ctx.stroke();}
        else {font(item.pt,item.bold);draw([item.text],10,item.y,5);}
      }
      await save(plan,entries.map(item=>item.chart?'Elevation profile from S to E; axes use different scales.':item.rule?'Space for handwritten answer.':item.text).join('\n'));
    }
  }
  return {bytes:imagePagesPdf(pages,orientation),pages,orientation};
}

/** Compatibility entry point used by existing callers. */
export async function lessonPdf(document,snapshot) {return (await prepareLessonPdf(document,snapshot)).bytes;}

/** Decode exactly the grayscale samples embedded in the PDF, one page at a time. */
export async function pdfPreviewSamples(page) {
  if(page.encoding==='raw')return page.payload;
  if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decode PDF previews. Download the PDF to inspect every page.');
  const bytes=new Uint8Array(await new Response(new Blob([page.payload]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  if(bytes.length!==page.pixelWidth*page.pixelHeight)throw new Error('PDF preview samples are incomplete.');
  return bytes;
}
