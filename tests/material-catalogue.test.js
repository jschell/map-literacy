import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {REVIEW_MATERIALS,PUBLIC_REVIEW_PACKS,materialLinks} from '../src/materials/catalogue.js';import {validatePack} from '../src/data/validate-pack.js';
test('public catalogue binds the existing draft revisions, local notes and source credits without approving scoring',async()=>{
  assert.equal(REVIEW_MATERIALS.length,6);assert.equal(new Set(PUBLIC_REVIEW_PACKS).size,6);
  for(const entry of REVIEW_MATERIALS) {
    const pack=JSON.parse(await readFile(new URL('../'+entry.path,import.meta.url)));
    assert.equal(validatePack(pack).valid,true);assert.equal(pack.id,entry.id);assert.equal(pack.revision,entry.revision);
    assert.equal(pack.review.status,'draft');assert.ok(pack.exercises.every(e=>e.review==='draft'));
    for(const file of [entry.learner,entry.instructor])assert.ok((await readFile(new URL('../'+file,import.meta.url))).length>0);
    for(const link of Object.values(materialLinks(entry)))assert.ok(link.startsWith('https://github.com/jschell/map-literacy/blob/main/docs/materials/'));
    assert.ok(pack.sources.every(source=>source.attribution&&source.license));
  }
});
