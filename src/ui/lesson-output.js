import {prepareLessonPdf,pdfPreviewSamples} from '../export/lesson-pdf.js';

/** PDF preparation owns one bounded cache; preview and download share its exact pages. */
export function createLessonOutput({getSnapshot,getWholeSnapshots,updateView}) {
  const get=id=>document.getElementById(id);
  let generation=0,busy=false,controller=null,prepared=null,url=null,previewGeneration=0;
  function available() {
    const snapshot=getSnapshot(),whole=Boolean(snapshot?.spec);
    get('lesson-pdf').disabled=busy||!snapshot;
    get('lesson-whole-pdf').disabled=busy||!whole;
    get('pdf-preview-prepare').disabled=busy||!snapshot||(get('pdf-preview-scope').value==='whole'&&!whole);
  }
  function invalidate() {
    generation++;previewGeneration++;controller?.abort();prepared=null;
    if(url)URL.revokeObjectURL(url);url=null;
    get('lesson-pdf-link').hidden=true;get('lesson-pdf-link').removeAttribute('href');
    get('pdf-preview-content').hidden=true;get('pdf-preview-canvas').width=0;get('pdf-preview-canvas').height=0;
    get('pdf-preview-text').textContent='';get('pdf-preview-page').replaceChildren();
    get('pdf-preview-status').textContent='Prepare a PDF preview to inspect every page, including questions and source credits.';
    get('lesson-pdf-status').textContent='Download selected output, or choose Learner worksheet / Instructor guide for a whole-lesson PDF. Print PDFs at actual size.';
    available();
  }
  async function showPage(index) {
    if(!prepared)return;
    const selected=prepared,token=++previewGeneration,record=selected.result.pages[index];
    try {
      const samples=await pdfPreviewSamples(record);
      if(token!==previewGeneration||prepared!==selected)return;
      const canvas=get('pdf-preview-canvas');canvas.width=record.pixelWidth;canvas.height=record.pixelHeight;
      const image=new ImageData(record.pixelWidth,record.pixelHeight);
      for(let i=0,j=0;i<samples.length;i++,j+=4)image.data[j]=image.data[j+1]=image.data[j+2]=samples[i],image.data[j+3]=255;
      canvas.getContext('2d').putImageData(image,0,0);
      canvas.setAttribute('aria-label',record.label);
      get('pdf-preview-text').textContent=record.contentText;
      get('pdf-preview-page').value=String(index);
      get('pdf-preview-prev').disabled=index===0;get('pdf-preview-next').disabled=index===selected.result.pages.length-1;
      get('pdf-preview-status').textContent=`${selected.scope==='whole'?'Whole lesson':'Selected output'} · ${record.label} · Letter ${selected.result.orientation}. This is the exact page image in the PDF.`;
      get('pdf-preview-content').hidden=false;
    } catch(error){if(token===previewGeneration)get('pdf-preview-status').textContent=error.message;}
  }
  async function prepare(scope,download) {
    if(busy)return;
    updateView();const snapshot=getSnapshot();if(!snapshot||(scope==='whole'&&!snapshot.spec))return;
    get('pdf-preview-scope').value=scope;
    if(prepared&&prepared.scope!==scope)invalidate();
    const token=generation;controller=new AbortController();busy=true;available();
    const button=get(scope==='whole'?'lesson-whole-pdf':'lesson-pdf');button.setAttribute('aria-busy','true');
    get('lesson-pdf-status').textContent=`Preparing ${scope==='whole'?'whole lesson':'selected output'} PDF…`;
    try {
      if(!prepared||prepared.scope!==scope) {
        const stage=document.createElement('div');stage.className='pdf-render-stage';document.body.append(stage);
        let pending;
        try {pending=prepareLessonPdf(document,scope==='whole'?getWholeSnapshots(stage):snapshot,{signal:controller.signal});}
        finally {stage.remove();}
        const result=await pending;if(token!==generation)return;
        prepared={scope,result};
        if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));
      }
      if(token!==generation)return;
      const safe=text=>text.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60),link=get('lesson-pdf-link');
      link.href=url;link.download=`map-literacy-${safe(snapshot.packId)}-r${snapshot.revision}-${scope==='whole'?'whole-lesson':safe(snapshot.spec?.exerciseId??'map')}-${snapshot.spec?.audience??'map'}-${snapshot.model.orientation}.pdf`;link.hidden=false;
      get('lesson-pdf-status').textContent=`PDF ready: Letter ${snapshot.model.orientation}, 1:${snapshot.model.scaleDenominator.toLocaleString()}. ${scope==='whole'?'Whole lesson':'Selected output'} · ${snapshot.spec?.kind??'Map only'} · ${prepared.result.pages.length} ${prepared.result.pages.length===1?'page':'pages'}. Print at actual size / 100%. Lossless 300 dpi.`;
      get('pdf-preview-page').replaceChildren(...prepared.result.pages.map((page,index)=>new Option(`${index+1}: ${page.label}`,String(index))));
      await showPage(0);
      if(token===generation&&download)link.click();
    } catch(error) {
      if(token===generation){prepared=null;if(url)URL.revokeObjectURL(url);url=null;get('lesson-pdf-link').hidden=true;get('pdf-preview-content').hidden=true;get('lesson-pdf-status').textContent=`PDF not prepared: ${error.message} Retry the download.`;}
    } finally {busy=false;button.removeAttribute('aria-busy');controller=null;available();}
  }
  get('lesson-pdf').addEventListener('click',()=>prepare('selected',true));
  get('lesson-whole-pdf').addEventListener('click',()=>prepare('whole',true));
  get('pdf-preview-prepare').addEventListener('click',()=>prepare(get('pdf-preview-scope').value,false));
  get('pdf-preview-scope').addEventListener('change',invalidate);
  get('pdf-preview-page').addEventListener('change',()=>showPage(Number(get('pdf-preview-page').value)));
  get('pdf-preview-prev').addEventListener('click',()=>showPage(Number(get('pdf-preview-page').value)-1));
  get('pdf-preview-next').addEventListener('click',()=>showPage(Number(get('pdf-preview-page').value)+1));
  available();return {invalidate,available};
}
