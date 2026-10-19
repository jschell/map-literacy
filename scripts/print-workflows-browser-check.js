import assert from 'node:assert/strict';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {createStaticServer} from './static-server.js';
import {REVIEW_MATERIALS} from '../src/materials/catalogue.js';

function samplesFromPdf(bytes) {
  const text=bytes.toString('latin1');
  return [...text.matchAll(/\d+ 0 obj\n<< \/Type \/XObject \/Subtype \/Image \/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceGray \/BitsPerComponent 8 (\/Filter \/FlateDecode )?\/Length (\d+) >>\nstream\n/g)].map(match=>{
    const start=match.index+match[0].length,payload=bytes.subarray(start,start+Number(match[4]));
    return {width:+match[1],height:+match[2],payload,flate:Boolean(match[3])};
  });
}
/** Exercise new workflows under the actual Pages project prefix/meta CSP, on an isolated test origin. */
export async function checkPrintWorkflows(parent,output) {
  const server=createStaticServer(fileURLToPath(new URL('../dist/pages/',import.meta.url)),{basePath:'/map-literacy/',headers:{}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/map-literacy/`,page=await parent.context().newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const savedPrefs=()=>page.waitForFunction(()=>document.getElementById('preferences-status').textContent.includes('View preferences saved in this browser.'));
  const stored=()=>page.evaluate(async()=>{
    const url=new URL('src/storage/indexeddb.js',document.baseURI);url.search=new URL(document.querySelector('script[type=module]').src).search;
    const {openStorage}=await import(url.href),db=await openStorage();try{return await db.loadSettings();}finally{db.close();}
  });
  const load=async id=>{const old=await page.locator('#map').getAttribute('data-load-version');await page.locator(`#${id}`).click();await page.waitForFunction(value=>(document.getElementById('map').dataset.loadVersion??null)!==value,old);};
  const download=async(name,whole=true)=>{
    const event=page.waitForEvent('download');await page.locator(whole?'#lesson-whole-pdf':'#lesson-pdf').click();const file=await event;
    await file.saveAs(new URL(name,output).pathname);const bytes=await readFile(await file.path());
    const images=samplesFromPdf(bytes);assert.equal(images.length,(bytes.toString('latin1').match(/\/Type \/Page\b/g)??[]).length);
    assert.equal(await page.locator('#pdf-preview-page option').count(),images.length,'PDF preview count matches downloaded pages');
    return {bytes,images,filename:file.suggestedFilename()};
  };
  async function checkPreviewPage(index,images) {
    await page.locator('#pdf-preview-page').selectOption(String(index));
    await page.waitForFunction(({pageNumber,total})=>document.getElementById('pdf-preview-status').textContent.includes(`Page ${pageNumber} of ${total}`),{pageNumber:index+1,total:images.length});
    const visible=await page.locator('#pdf-preview-canvas').evaluate(async canvas=>{
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,gray=new Uint8Array(canvas.width*canvas.height);
      for(let i=0,j=0;i<gray.length;i++,j+=4){if(data[j]!==data[j+1]||data[j]!==data[j+2]||data[j+3]!==255)throw new Error('Preview is not the exact opaque grayscale page');gray[i]=data[j];}
      return {width:canvas.width,height:canvas.height,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',gray)),v=>v.toString(16).padStart(2,'0')).join('')};
    });
    const image=images[index],raw=image.flate?inflateSync(image.payload):image.payload;
    assert.deepEqual(visible,{width:image.width,height:image.height,hash:createHash('sha256').update(raw).digest('hex')},'preview pixels equal the image bytes embedded in the PDF');
  }
  try {
    await page.goto(base);
    const legacy={singleton:'singleton',settingsVersion:1,version:0,values:{labels:'labeled',mapRotationDeg:0,printScale:1000,orientation:'portrait'}};
    await page.evaluate(async legacy=>{
      const url=new URL('src/storage/indexeddb.js',document.baseURI);url.search=new URL(document.querySelector('script[type=module]').src).search;
      const {openStorage}=await import(url.href),db=await openStorage();try{await db.saveSettings(legacy);}finally{db.close();}
    },legacy);
    await page.reload();await page.waitForFunction(()=>!document.getElementById('explorer-orientation').disabled);
    assert.equal(await page.locator('#explorer-orientation').inputValue(),'portrait');assert.equal(await page.locator('#orientation').inputValue(),'portrait');
    assert.deepEqual(await stored(),legacy,'opening retains the exact v1 stored record');
    await page.locator('#explorer-orientation').selectOption('landscape');await savedPrefs();
    assert.equal((await stored()).settingsVersion,2);assert.equal((await stored()).values.orientation,'portrait');
    await page.locator('#nav-review').click();await load('profile-demo');
    assert.equal(await page.locator('#explorer-orientation').inputValue(),'landscape','profile defaults do not change geographic paper');
    await page.locator('#orientation').selectOption('landscape');await savedPrefs();
    await page.locator('#nav-explore').click();await page.locator('#explorer-orientation').selectOption('portrait');await savedPrefs();
    await page.waitForFunction(()=>!document.getElementById('explorer-print').disabled);
    await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.evaluate(()=>document.body.dataset.printTarget),'geographic');assert.equal(await page.locator('#geographic-print').getAttribute('data-orientation'),'portrait');
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
    await page.locator('#nav-review').click();await load('demo');
    assert.equal(await page.locator('#orientation').inputValue(),'landscape');assert.equal(await page.locator('#explorer-orientation').inputValue(),'portrait');
    await page.reload();await page.waitForFunction(()=>!document.getElementById('explorer-orientation').disabled);await load('demo');
    assert.equal(await page.locator('#orientation').inputValue(),'landscape');assert.equal(await page.locator('#explorer-orientation').inputValue(),'portrait');
    await page.locator('#print-output').selectOption('learner');await page.locator('#print-preview summary').click();
    await page.locator('.browser-preview-page').first().waitFor();
    assert.equal(await page.locator('.browser-preview-page').count(),1+await page.locator('#exercise-pages .exercise-page').count());
    assert.ok((await page.locator('#print-preview-content').textContent()).includes('Source credits'));
    assert.equal(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size;}),true);
    await page.locator('#lesson-start').click();await page.locator('#answer-heading').fill('75');await page.locator('#rotate').click();
    await page.locator('#pdf-preview summary').first().click();
    const matrix=[];
    for(const orientation of ['portrait','landscape'])for(const audience of ['learner','instructor']) {
      await page.locator('#orientation').selectOption(orientation);await page.locator('#print-output').selectOption(audience);
      const {bytes,images,filename}=await download(`whole-street-${audience}-${orientation}.pdf`);
      assert.equal(images.length,8);assert.match(filename,new RegExp(`whole-lesson-${audience}-${orientation}\\.pdf$`));
      for(const dimensions of bytes.toString('latin1').matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g))assert.deepEqual([+dimensions[1],+dimensions[2]],orientation==='portrait'?[612,792]:[792,612]);
      const text=[];
      for(let i=0;i<images.length;i++) {
        await page.locator('#pdf-preview-page').selectOption(String(i));
        await page.waitForFunction(({number,total})=>document.getElementById('pdf-preview-status').textContent.includes(`Page ${number} of ${total}`),{number:i+1,total:images.length});
        text.push(await page.locator('#pdf-preview-text').textContent());
      }
      assert.match(text[1],/Face true north/);assert.match(text[3],/Locate A/);assert.match(text[5],/Draw|connected/);assert.match(text[7],/closure/i);
      assert.equal(text.join('\n').includes('Expected true heading'),audience==='instructor');assert.equal(text.join('\n').includes('Expected endpoint'),audience==='instructor');
      assert.ok(text.every((value,index)=>value.includes(`Page ${index+1} of ${images.length}`)),'page text uses the document-wide footer');
      assert.equal(text.filter(t=>/^Source credits$/m.test(t)).length,4);
      await checkPreviewPage(0,images);await checkPreviewPage(7,images);
      assert.equal(await page.locator('#answer-heading').inputValue(),'75','export does not change a learner draft');assert.equal(await page.locator('#map .heading-arrow').count(),0);
      assert.equal(await page.locator('#print-exercise').inputValue(),'heading','whole output does not change the current question');
      matrix.push({orientation,audience,pages:images.length});
    }
    const selectedAfterWhole=await download('selected-after-whole-instructor.pdf',false);assert.equal(selectedAfterWhole.images.length,2);assert.equal(await page.locator('#pdf-preview-scope').inputValue(),'selected');
    await page.locator('#variant').selectOption('partial');
    await page.evaluate(()=>{
      window.wholeOriginalUrl=URL.createObjectURL;
      URL.createObjectURL=function(blob){const result=window.wholeOriginalUrl.call(URL,blob);if(blob.type==='image/svg+xml')setTimeout(()=>{const control=document.getElementById('print-output');control.value='learner';control.dispatchEvent(new Event('change',{bubbles:true}));},0);return result;};
    });
    await page.locator('#lesson-whole-pdf').click();await page.waitForFunction(()=>!document.getElementById('lesson-whole-pdf').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#lesson-pdf-link').isVisible(),false);assert.equal(await page.locator('#pdf-preview-text').textContent(),'');assert.equal(await page.locator('#pdf-preview-canvas').getAttribute('width'),'0');
    await page.evaluate(()=>{URL.createObjectURL=window.wholeOriginalUrl;});
    await page.locator('#lesson-end').click();await page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('Saved in this browser'));
    await page.locator('#material-catalogue summary').click();assert.equal(await page.locator('#material-catalogue-list li').count(),6);
    for(const entry of REVIEW_MATERIALS) {
      const before=await page.locator('#map').getAttribute('data-load-version');await page.locator(`[data-material-id="${entry.id}"]`).click();
      await page.waitForFunction(value=>document.getElementById('map').dataset.loadVersion!==value,before);
      assert.equal(await page.locator('#lesson-start').isDisabled(),true);assert.match(await page.locator('#status').textContent(),/Unreviewed draft/i);
      const source=await page.request.get(new URL(entry.path,base).href);assert.equal(source.status(),200);
      assert.deepEqual(await source.body(),await readFile(new URL('../'+entry.path,import.meta.url)),'published draft bytes preserve provenance and revisions');
    }
    await page.locator('[data-material-id="redmond-cleveland-brown-draft"]').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Redmond'));
    await page.locator('#variant').selectOption('labeled');await page.locator('#print-output').selectOption('learner');await page.locator('#scale').selectOption('1000');
    const redmond=await download('whole-redmond-draft-learner.pdf');assert.equal(redmond.images.length,8);
    await page.locator('#pdf-preview-page').selectOption('7');await page.waitForFunction(()=>document.getElementById('pdf-preview-status').textContent.includes('Page 8 of 8'));
    assert.match(await page.locator('#pdf-preview-text').textContent(),/OpenStreetMap|ODbL/);assert.match(await page.locator('#pdf-preview-text').textContent(),/draft/i);
    await load('profile-demo');await page.locator('#orientation').selectOption('landscape');await page.locator('#print-output').selectOption('learner');
    const profile=await download('whole-profile-learner-landscape.pdf');assert.ok(profile.images.length>=8&&profile.images.length<=12);
    await page.locator('#pdf-preview-page').selectOption(String(profile.images.length-1));await page.waitForFunction(total=>document.getElementById('pdf-preview-status').textContent.includes(`Page ${total} of ${total}`),profile.images.length);
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#pdf-preview').screenshot({path:new URL('pdf-all-pages-mobile.png',output).pathname});
    const budgetPack=JSON.parse(await readFile(new URL('../tests/fixtures/street-square.json',import.meta.url)));
    budgetPack.id='whole-budget-test';budgetPack.review={status:'draft',reviewedAt:null,note:'Rendering budget test only'};
    budgetPack.exercises=Array.from({length:33},(_,index)=>({...structuredClone(budgetPack.exercises[0]),id:`heading-${index}`,review:'draft'}));
    const previous=await page.locator('#map').getAttribute('data-load-version');
    await page.locator('#import').setInputFiles({name:'whole-budget.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(budgetPack))});
    await page.waitForFunction(value=>document.getElementById('map').dataset.loadVersion!==value,previous);
    await page.locator('#print-output').selectOption('learner');await page.locator('#lesson-whole-pdf').click();
    await page.waitForFunction(()=>document.getElementById('lesson-pdf-status').textContent.includes('more than 64 pages'));
    assert.equal(await page.locator('#lesson-pdf-link').isVisible(),false);assert.equal(await page.locator('#lesson-pdf').isEnabled(),true,'selected-question export remains available after a whole-document budget failure');
    assert.deepEqual(errors,[]);
    return {wholeBudgetGuard:true,selectedAfterWhole:true,legacySettingsPreserved:true,independentOrientations:true,wholeLesson:matrix,previewPixelsMatchPdf:true,allPageNavigation:true,sourceCredits:true,browserAllPages:true,staleInstructorExportRejected:true,draftCatalogue:6,redmondPages:8,profilePages:profile.images.length,pagesPrefixAndMetaCsp:true};
  } finally {await page.close();server.close();}
}
