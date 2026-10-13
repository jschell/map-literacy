import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { makePerfPack } from '../scripts/perf-pack.js';
import { validatePack } from '../src/data/validate-pack.js';
import { readImport } from '../src/data/read-pack.js';

for (const profile of ['display-ceiling', 'graph-ceiling']) {
  test(`${profile} is a reproducible, importable boundary stress pack`, async () => {
    const { pack, sourceBytes } = makePerfPack(profile), json = JSON.stringify(pack);
    assert.equal(validatePack(pack).valid, true);
    assert.ok(Buffer.byteLength(json) <= 10 * 1024 * 1024);
    assert.equal(pack.sources[0].sha256, createHash('sha256').update(sourceBytes).digest('hex'));
    assert.equal(JSON.stringify(makePerfPack(profile).pack), json);
    assert.equal((await readImport(new Blob([json]))).id, pack.id);
    if (profile === 'display-ceiling') {
      assert.equal(pack.features.features.length, 10000); assert.equal(pack.labels.length, 2000);
      assert.equal(pack.features.features.reduce((sum, f) => sum + f.geometry.coordinates.length, 0) + pack.labels.length, 100000);
      const over = structuredClone(pack); over.features.features[0].geometry.coordinates.push([0, 0]);
      assert.ok(validatePack(over).errors.some((e) => e.code === 'limit-exceeded'));
    } else {
      assert.equal(pack.topology.nodes.length, 19998); assert.equal(pack.topology.edges.length, 40000); assert.equal(pack.topology.restrictions.length, 5000);
      assert.equal(2 + pack.topology.nodes.length + pack.topology.edges.length * 2, 100000);
    }
  });
}
