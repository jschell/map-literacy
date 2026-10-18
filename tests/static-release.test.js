import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { buildStatic, verifyStatic } from '../scripts/static-package.js';
import { createStaticServer } from '../scripts/static-server.js';
import { RESPONSE_HEADERS, META_CSP } from '../scripts/static-policy.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'map-release-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['src/ui', 'tests/fixtures', 'data/raw', 'node_modules']) await mkdir(join(root, directory), { recursive: true });
  const assets = {
    'index.html': '<!doctype html>\n<head>\n  <meta charset="utf-8">\n<script type="module" src="src/ui/app.js"></script></head>',
    'styles.css': 'body { color: black; }', 'LICENSE': 'MIT fixture',
    'src/ui/app.js': 'export const loaded = true;', 'tests/fixtures/street-square.json': '{}', 'tests/fixtures/terrain-hill.json': '{}', 'tests/fixtures/terrain-slopes.json': '{}', 'tests/fixtures/terrain-profiles.json': '{}',
    'data/raw/home.json': 'excluded raw data', '.env': 'excluded configuration', 'node_modules/index.js': 'excluded dependency'
  };
  for (const [path, content] of Object.entries(assets)) await writeFile(join(root, path), content);
  return root;
}

test('static packages reproduce bytes, omit private/tooling files and retain licenses', async (t) => {
  const root = await fixture(t), first = await buildStatic(root);
  const manifest = await readFile(join(root, 'dist/release-manifest.json'));
  assert.deepEqual(await verifyStatic(root), first);
  assert.deepEqual(await buildStatic(root), first);
  assert.deepEqual(await readFile(join(root, 'dist/release-manifest.json')), manifest);
  for (const profile of first.profiles) {
    assert.ok(profile.files.some((file) => file.path === 'LICENSE'));
    assert.ok(profile.files.some((file) => file.path === 'NOTICE.txt'));
    assert.ok(!profile.files.some((file) => /data\/|node_modules|\.env|scripts\//.test(file.path)));
  }
  const html = await readFile(join(root, 'dist/pages/index.html'), 'utf8');
  assert.ok(html.indexOf(META_CSP) < html.indexOf('<script'));
  assert.ok(!html.includes('frame-ancestors'));
});

test('hash changes and unexpected public files fail verification', async (t) => {
  const root = await fixture(t); await buildStatic(root);
  await writeFile(join(root, 'dist/site/styles.css'), 'changed');
  await assert.rejects(verifyStatic(root), /hash mismatch/);
  await buildStatic(root); await writeFile(join(root, 'dist/pages/.env'), 'unexpected');
  await assert.rejects(verifyStatic(root), /asset set/);
});

test('source and output symlinks are rejected; failed source validation preserves previous package', async (t) => {
  const root = await fixture(t); await buildStatic(root);
  const before = await readFile(join(root, 'dist/release-manifest.json'));
  await symlink(join(root, '.env'), join(root, 'src/ui/private.js'));
  await assert.rejects(buildStatic(root), /Unsupported release entry/);
  assert.deepEqual(await readFile(join(root, 'dist/release-manifest.json')), before);
  await rm(join(root, 'src/ui/private.js'));
  await rename(join(root, 'dist'), join(root, 'retained-dist')); await symlink(join(root, 'retained-dist'), join(root, 'dist'));
  await assert.rejects(buildStatic(root), /regular directory/);
  await assert.rejects(verifyStatic(root), /regular directory/);
});

test('preview serves correct MIME/headers and blocks traversal, internal files and HTML fallbacks', async (t) => {
  const root = await fixture(t); await buildStatic(root);
  const server = createStaticServer(join(root, 'dist/site')); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, mime] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/src/ui/app.js', 'text/javascript'], ['/tests/fixtures/street-square.json', 'application/json'], ['/tests/fixtures/terrain-hill.json', 'application/json'], ['/LICENSE', 'text/plain']]) {
    const response = await fetch(base + path); assert.equal(response.status, 200); assert.ok(response.headers.get('content-type').startsWith(mime));
    for (const [key, value] of Object.entries(RESPONSE_HEADERS)) assert.equal(response.headers.get(key), value);
  }
  assert.equal((await (await fetch(base + '/styles.css', { method: 'HEAD' })).text()).length, 0);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  for (const path of ['/.env', '/_headers', '/release-manifest.json', '/data/raw/home.json', '/missing.js', '/src/%2e%2e/%2e%2e/.env', '/%ZZ']) assert.equal((await fetch(base + path)).status, 404);
  await symlink(join(root, '.env'), join(root, 'dist/site/src/ui/escape.js'));
  assert.equal((await fetch(base + '/src/ui/escape.js')).status, 404);
});

test('GitHub Pages preview resolves only the selected project prefix without added CSP headers', async (t) => {
  const root = await fixture(t); await buildStatic(root);
  const server = createStaticServer(join(root, 'dist/pages'), { basePath: '/map-literacy/', headers: {} });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/map-literacy/'); assert.equal(response.status, 200); assert.equal(response.headers.get('content-security-policy'), null);
  assert.ok((await response.text()).includes(META_CSP));
  assert.equal((await fetch(base + '/map-literacy/src/ui/app.js')).status, 200);
  assert.equal((await fetch(base + '/src/ui/app.js')).status, 404);
});

test('changing a leaf module invalidates cached root, importer, leaf and stylesheet URLs', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'index.html'), '<head>\n  <meta charset="utf-8">\n<link rel="stylesheet" href="styles.css"><script type="module" src="src/ui/app.js"></script></head>');
  await writeFile(join(root, 'src/ui/app.js'), "import { value } from './leaf.js'; export const loaded = value;");
  await writeFile(join(root, 'src/ui/leaf.js'), "export const value = 'old';");
  await buildStatic(root);
  const firstHtml = await readFile(join(root, 'dist/pages/index.html'), 'utf8'), firstApp = await readFile(join(root, 'dist/pages/src/ui/app.js'), 'utf8');
  const oldVersion = firstHtml.match(/app\.js\?v=([a-f0-9]{16})/)[1];
  assert.ok(firstApp.includes(`./leaf.js?v=${oldVersion}`));
  assert.ok(firstHtml.includes(`styles.css?v=${oldVersion}`));
  assert.equal(await readFile(join(root, 'src/ui/app.js'), 'utf8'), "import { value } from './leaf.js'; export const loaded = value;");
  await writeFile(join(root, 'src/ui/leaf.js'), "export const value = 'new';");
  await buildStatic(root); await verifyStatic(root);
  const nextHtml = await readFile(join(root, 'dist/pages/index.html'), 'utf8'), nextApp = await readFile(join(root, 'dist/pages/src/ui/app.js'), 'utf8');
  const newVersion = nextHtml.match(/app\.js\?v=([a-f0-9]{16})/)[1];
  assert.notEqual(newVersion, oldVersion);
  assert.ok(nextApp.includes(`./leaf.js?v=${newVersion}`));
  assert.ok(nextHtml.includes(`styles.css?v=${newVersion}`));
});
