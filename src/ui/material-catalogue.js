import {REVIEW_MATERIALS,materialLinks} from '../materials/catalogue.js';
export function createMaterialCatalogue(onOpen) {
  const container=document.getElementById('material-catalogue-list');
  for(const entry of REVIEW_MATERIALS) {
    const item=document.createElement('li'),title=document.createElement('h3'),basis=document.createElement('p'),limits=document.createElement('p'),actions=document.createElement('div'),open=document.createElement('button');
    title.textContent=`${entry.title} · revision ${entry.revision}`;basis.textContent=`DRAFT — independent curriculum approval pending. ${entry.basis}`;limits.textContent=entry.limits;
    actions.className='controls';open.type='button';open.textContent='Open draft for map/PDF review';open.dataset.materialId=entry.id;open.addEventListener('click',()=>onOpen(entry));actions.append(open);
    const links=materialLinks(entry);
    for(const [name,url] of Object.entries(links)){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent=name==='learner'?'Learner notes ↗':'Instructor notes and answers ↗';actions.append(link);}
    const pack=document.createElement('a');pack.href=entry.path;pack.download=entry.path.split('/').at(-1);pack.textContent='Download draft pack';actions.append(pack);
    item.append(title,basis,limits,actions);container.append(item);
  }
}
