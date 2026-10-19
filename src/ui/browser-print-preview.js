/** Native print preview retains every authored question/credit page at physical proportions. */
export function browserPrintPreview(document,container,orientation) {
  const pages=[document.getElementById('print-sheet'),...document.getElementById('exercise-pages').children];
  container.dataset.orientation=orientation;container.replaceChildren();
  for(const [index,page] of pages.entries()) {
    const figure=document.createElement('figure'),caption=document.createElement('figcaption'),frame=document.createElement('div'),paper=document.createElement('div');
    figure.className='browser-preview-page';
    const audience=document.getElementById('print-output').selectedOptions[0].textContent, question=document.getElementById('print-output').value==='map'?'Map only':document.getElementById('print-exercise').selectedOptions[0].textContent;
    caption.textContent=`${audience} · ${question} · Browser print page ${index+1} of ${pages.length} · Letter ${orientation}`;
    frame.className='browser-preview-frame';paper.className='browser-preview-paper';paper.dataset.orientation=orientation;
    const copy=page.cloneNode(true);copy.classList.add('browser-preview-copy');
    const rename=new Map();for(const element of [copy,...copy.querySelectorAll('[id]')])if(element.id){rename.set(element.id,`preview-${index}-${element.id}`);element.classList.add(`preview-${element.id}`);element.id=`preview-${index}-${element.id}`;}
    for(const element of copy.querySelectorAll('*'))for(const attribute of [...element.attributes]) {
      let value=attribute.value;
      for(const [old,id] of rename)value=value.replaceAll(`url(#${old})`,`url(#${id})`);
      if(value!==attribute.value)element.setAttribute(attribute.name,value);
    }
    paper.append(copy);frame.append(paper);figure.append(caption,frame);container.append(figure);
  }
  fitBrowserPreview(container);
}
export function fitBrowserPreview(container) {
  if(!container.clientWidth)return;
  for(const frame of container.querySelectorAll('.browser-preview-frame')) {
    const page=frame.firstElementChild,scale=Math.min(1,frame.clientWidth/page.offsetWidth);
    page.style.transform=`scale(${scale})`;frame.style.height=`${page.offsetHeight*scale}px`;
  }
}
