import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

function firstPageSamples(bytes) {
  const text = bytes.toString('latin1');
  const match = /4 0 obj\n<< \/Type \/XObject \/Subtype \/Image \/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceGray \/BitsPerComponent 8 (?:\/Filter \/FlateDecode )?\/Length (\d+) >>\nstream\n/.exec(text);
  assert.ok(match, 'first page has exact grayscale samples');
  const start = match.index + match[0].length, payload = bytes.subarray(start, start + Number(match[3]));
  const pixels = match[0].includes('/FlateDecode') ? inflateSync(payload) : payload;
  assert.equal(pixels.length, Number(match[1]) * Number(match[2]));
  return { width: Number(match[1]), height: Number(match[2]), pixels };
}
export async function checkLessonPdf(page, base, output) {
  await page.goto(base); await page.locator('#terrain-demo').click();
  await page.waitForFunction(()=>!document.getElementById('lesson-pdf').disabled);
  const download = async (name) => {
    const event = page.waitForEvent('download'); await page.locator('#lesson-pdf').click();
    const file = await event; const bytes = await readFile(await file.path());
    await file.saveAs(new URL(name, output).pathname);
    assert.equal(await page.locator('#lesson-pdf-link').isVisible(), true);
    return bytes;
  };
  const measurements = [];
  for (const orientation of ['portrait', 'landscape']) {
    await page.locator('#orientation').selectOption(orientation);
    for (const audience of ['map', 'learner', 'instructor']) {
      await page.locator('#print-output').selectOption(audience);
      const bytes = await download(`lesson-download-${audience}-${orientation}.pdf`), text = bytes.toString('latin1');
      const dimensions = [...text.matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)];
      assert.equal(dimensions.length, audience === 'map' ? 1 : 2);
      for (const d of dimensions) assert.deepEqual([+d[1], +d[2]], orientation === 'portrait' ? [612,792] : [792,612]);
      const { width, height, pixels } = firstPageSamples(bytes);
      assert.deepEqual([width,height],orientation==='portrait'?[2550,3300]:[3300,2550]);
      const mmHeight = orientation === 'portrait' ? 208.5 : 145, meters = orientation === 'portrait' ? 20 : 50;
      const u = 300 / 25.4, x0 = Math.round(15*u), y0 = Math.round((10+mmHeight-6)*u);
      const capY = Math.round(y0-u), runs = []; let start = null;
      for (let x=x0-4; x<=x0+meters*u+4; x++) {
        if (pixels[capY*width+x]<128) { if(start===null) start=x; }
        else if(start!==null) {runs.push([start,x-1]); start=null;}
      }
      assert.equal(runs.length,2,'scale bar has two clear end ticks');
      const centers = runs.map(([a,b])=>(a+b)/2), measuredMm=(centers[1]-centers[0])/u;
      assert.ok(Math.abs(measuredMm-meters)<.1, `scale bar ${measuredMm} mm matches ${meters} mm`);
      measurements.push({orientation,audience,barMm:measuredMm,expectedMm:meters});
    }
  }
  // Long prose and an unbroken source token must paginate rather than clip.
  const longBytes = Buffer.from(await page.evaluate(async () => {
    const url = new URL('src/export/lesson-pdf.js', document.baseURI);
    url.search = new URL(document.querySelector('script[type=module]').src).search;
    const { lessonPdf } = await import(url.href);
    return Array.from(await lessonPdf(document, {
      svg: document.querySelector('#paper-map svg'), model: { paper: true, orientation: 'landscape', width: 259.4, height: 145 },
      title: 'Long source pagination check', summary: 'Draft synthetic test', footer: 'Synthetic CC0 test', packId: 'long-source-test', revision: 1,
      spec: { kind: 'Learner worksheet', blocks: [
        { type: 'paragraph', text: 'Literal teaching text retained across pages. '.repeat(200) },
        { type: 'credit', text: 'https://example.invalid/' + 'source'.repeat(200) },
        { type: 'credit', text: 'END OF LONG SOURCE CREDIT' }
      ] }
    }));
  }));
  const longCount = (longBytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
  assert.ok(longCount >= 3 && longCount < 10);
  await writeFile(new URL('lesson-download-long-source.pdf', output), longBytes);
  // A changed view invalidates the ready link; a failed encoding can be retried.
  await page.locator('#print-output').selectOption('learner');
  assert.equal(await page.locator('#lesson-pdf-link').isVisible(),false);
  await page.evaluate(()=>{window.originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('simulated encoding failure');};});
  await page.locator('#lesson-pdf').click();
  await page.waitForFunction(()=>document.getElementById('lesson-pdf-status').textContent.includes('simulated encoding failure'));
  assert.equal(await page.locator('#lesson-pdf').isEnabled(),true);
  await page.evaluate(()=>{URL.createObjectURL=window.originalCreateObjectURL;});
  await download('lesson-download-retry.pdf');
  // A pending export must not publish a snapshot after the user changes the view.
  await page.evaluate(()=>{
    window.originalCreateObjectURL=URL.createObjectURL;
    URL.createObjectURL=function(blob){
      const url=window.originalCreateObjectURL.call(URL,blob);
      if(blob.type==='image/svg+xml')setTimeout(()=>{const select=document.getElementById('print-output');select.value='map';select.dispatchEvent(new Event('change',{bubbles:true}));},0);
      return url;
    };
  });
  await page.locator('#lesson-pdf').click();
  await page.waitForFunction(()=>!document.getElementById('lesson-pdf').hasAttribute('aria-busy'));
  assert.equal(await page.locator('#lesson-pdf-link').isVisible(),false);
  await page.evaluate(()=>{URL.createObjectURL=window.originalCreateObjectURL;});
  await page.locator('#demo').click(); await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Synthetic street'));
  await page.locator('#preferences-defaults').click();
  await download('lesson-download-street-map.pdf');
  return {documents:6,longTextPages:longCount,measurements,encodingRetry:true,staleResultRejected:true,streetMap:true};
}
