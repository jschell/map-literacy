import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/prepare-osm.js', import.meta.url));

test('CLI writes a reproducible complete bundle and rejects existing output', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'map-literacy-test-'));
  try {
    const source = JSON.stringify({ version: 0.6, generator: 'synthetic-test', elements: [
      { type: 'node', id: 1, lat: 0, lon: 0 }, { type: 'node', id: 2, lat: 0, lon: 0.001 },
      { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'residential', oneway: 'yes' } },
    ] }, null, 2) + '\n';
    const config = { id: 'cli-fixture', title: 'Synthetic test only', bounds: [-0.001, -0.001, 0.002, 0.002], sourceBounds: [-0.002, -0.002, 0.003, 0.003], endpoint: 'https://example.com', query: 'synthetic-test', fetchedAt: '2026-10-13T00:00:00.000Z' };
    const input = join(temp, 'input.json'), configPath = join(temp, 'config.json'), out = join(temp, 'bundle');
    await writeFile(input, source); await writeFile(configPath, JSON.stringify(config));
    const args = [script, 'import', '--input', input, '--config', configPath, '--out', out];
    await execute(process.execPath, args);
    assert.equal(await readFile(join(out, 'source.osm.json'), 'utf8'), source);
    assert.equal(JSON.parse(await readFile(join(out, 'pack.json'), 'utf8')).review.status, 'draft');
    assert.deepEqual((await readdir(out)).sort(), ['acquisition.json', 'pack.json', 'review-report.json', 'source.osm.json']);
    await assert.rejects(execute(process.execPath, args), (e) => e.code === 1 && e.stderr.includes('already exists'));
    const second = join(temp, 'replay');
    await execute(process.execPath, [...args.slice(0, -1), second]);
    assert.equal(await readFile(join(out, 'pack.json'), 'utf8'), await readFile(join(second, 'pack.json'), 'utf8'));
    assert.equal(await readFile(join(out, 'review-report.json'), 'utf8'), await readFile(join(second, 'review-report.json'), 'utf8'));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('invalid source/provenance writes no final or temporary bundle', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'map-literacy-test-'));
  try {
    const config = { id: 'bad', title: 'Bad source', bounds: [0, 0, 0.001, 0.001], sourceBounds: [0, 0, 0.001, 0.001], endpoint: 'https://example.com' };
    const source = join(temp, 'input.json'), path = join(temp, 'config.json');
    await writeFile(source, '{}'); await writeFile(path, JSON.stringify(config));
    await assert.rejects(execute(process.execPath, [script, 'import', '--input', source, '--config', path, '--out', join(temp, 'bundle')]));
    assert.deepEqual((await readdir(temp)).sort(), ['config.json', 'input.json']);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
