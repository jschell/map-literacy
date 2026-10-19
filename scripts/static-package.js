import { PUBLIC_REVIEW_PACKS } from '../src/materials/catalogue.js';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { HOST_HEADERS, META_CSP } from './static-policy.js';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const allowed = (path) => ['index.html', 'styles.css', 'LICENSE', 'NOTICE.txt', '_headers', '.nojekyll', 'tests/fixtures/street-square.json', 'tests/fixtures/terrain-depressions.json', 'tests/fixtures/terrain-landforms.json', 'tests/fixtures/terrain-profiles.json', 'tests/fixtures/terrain-slopes.json', 'tests/fixtures/terrain-hill.json'].includes(path) || PUBLIC_REVIEW_PACKS.includes(path) || /^src\/[a-zA-Z0-9/_-]+\.js$/.test(path);
const notice = 'Map Literacy code: MIT; see LICENSE.\nSynthetic street-square.json, terrain-hill.json, terrain-slopes.json, terrain-profiles.json, terrain-landforms.json and terrain-depressions.json: CC0-1.0, invented geometry/terrain, not real conditions.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nRedmond review draft: OpenStreetMap contributors, ODbL-1.0; source date and lineage in docs/materials/redmond-r1/pack.json. Pilot-v2 drafts: invented CC0-1.0 geometry. All catalogue packs are unapproved review drafts. Imported third-party packs retain their own provenance, licenses and attribution.\n';

async function regular(root, path) {
  const parts = path.split('/'); let target = root;
  for (let i = 0; i < parts.length; i++) {
    target = join(target, parts[i]); const stat = await lstat(target);
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error(`Not a regular release asset: ${path}`);
  }
  return readFile(target);
}
async function filesUnder(root, path) {
  const stat = await lstat(join(root, path));
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Not a release directory: ${path}`);
  const paths = [];
  for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
    const next = `${path}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await filesUnder(root, next));
    else if (entry.isFile()) paths.push(next);
    else throw new Error(`Unsupported release entry: ${next}`);
  }
  return paths.sort();
}

/** Copies an explicit public asset set. Never reads raw packs, local state or credentials. */
export async function buildStatic(root) {
  const paths = ['index.html', 'styles.css', 'LICENSE', 'tests/fixtures/street-square.json', 'tests/fixtures/terrain-depressions.json', 'tests/fixtures/terrain-landforms.json', 'tests/fixtures/terrain-profiles.json', 'tests/fixtures/terrain-slopes.json', 'tests/fixtures/terrain-hill.json', ...PUBLIC_REVIEW_PACKS, ...await filesUnder(root, 'src')].sort();
  const assets = new Map();
  for (const path of paths) {
    if (!allowed(path)) throw new Error(`Unexpected source asset: ${path}`);
    assets.set(path, await regular(root, path));
  }
  assets.set('_headers', Buffer.from(HOST_HEADERS)); assets.set('NOTICE.txt', Buffer.from(notice));
  // Version the entire module graph: changing a leaf must also invalidate unchanged importers.
  const version = sha256(Buffer.from(JSON.stringify([...assets].sort(([a], [b]) => a < b ? -1 : 1).map(([path, bytes]) => [path, sha256(bytes)])))).slice(0, 16);
  for (const [path, bytes] of assets) {
    if (path.startsWith('src/') && path.endsWith('.js')) {
      const source = bytes.toString().replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\.?\/[a-zA-Z0-9_./-]+\.js)\2/g, (_, prefix, quote, target) => `${prefix}${quote}${target}?v=${version}${quote}`);
      assets.set(path, Buffer.from(source));
    }
  }
  assets.set('index.html', Buffer.from(assets.get('index.html').toString()
    .replace('src="src/ui/app.js"', `src="src/ui/app.js?v=${version}"`)
    .replace('href="styles.css"', `href="styles.css?v=${version}"`)));
  const pages = new Map(assets); pages.delete('_headers'); pages.set('.nojekyll', Buffer.from(''));
  const html = pages.get('index.html').toString();
  if (!html.includes('  <meta charset="utf-8">')) throw new Error('Cannot insert Pages CSP before assets.');
  pages.set('index.html', Buffer.from(html.replace('  <meta charset="utf-8">', `  <meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="${META_CSP}">`)));
  const profiles = [['site', assets], ['pages', pages]].map(([directory, entries]) => {
    const files = [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) }));
    return { directory, files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) };
  });
  const manifest = { format: 'map-literacy-static-v1', profiles };
  const output = join(root, 'dist');
  try { const stat = await lstat(output); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('dist must be a regular directory.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const stage = join(root, `.map-literacy-build-${randomUUID()}`), previous = `${stage}-previous`;
  let moved = false, published = false;
  try {
    await mkdir(stage);
    for (const [directory, entries] of [['site', assets], ['pages', pages]]) {
      for (const [path, bytes] of entries) { await mkdir(dirname(join(stage, directory, path)), { recursive: true }); await writeFile(join(stage, directory, path), bytes); }
    }
    await writeFile(join(stage, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    try { await rename(output, previous); moved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await rename(stage, output); published = true;
    return manifest;
  } finally {
    if (moved && !published) await rename(previous, output);
    await rm(stage, { recursive: true, force: true });
    if (published && moved) await rm(previous, { recursive: true, force: true });
  }
}

/** Detect tampering, extra assets and symlinks before previewing an existing package. */
export async function verifyStatic(root) {
  const output = join(root, 'dist');
  const stat = await lstat(output);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('dist must be a regular directory.');
  const manifest = JSON.parse(await regular(output, 'release-manifest.json'));
  if (manifest.format !== 'map-literacy-static-v1' || !Array.isArray(manifest.profiles) || JSON.stringify(manifest.profiles.map((p) => p.directory)) !== '["site","pages"]') throw new Error('Invalid release manifest.');
  for (const profile of manifest.profiles) {
    if (!Array.isArray(profile.files) || profile.files.length > 1000) throw new Error('Invalid release asset list.');
    const site = join(output, profile.directory), all = (await filesUnder(output, profile.directory)).map((path) => path.slice(profile.directory.length + 1));
    const paths = profile.files.map((file) => file.path), special = profile.directory === 'site' ? '_headers' : '.nojekyll';
    if (JSON.stringify(all) !== JSON.stringify(paths) || paths.some((path) => !allowed(path)) || paths.includes(special === '_headers' ? '.nojekyll' : '_headers') || !['index.html', 'styles.css', 'LICENSE', 'NOTICE.txt', special, 'tests/fixtures/street-square.json', 'tests/fixtures/terrain-depressions.json', 'tests/fixtures/terrain-landforms.json', 'tests/fixtures/terrain-profiles.json', 'tests/fixtures/terrain-slopes.json', 'tests/fixtures/terrain-hill.json'].every((path) => paths.includes(path))) throw new Error('Release asset set differs from its manifest.');
    let total = 0;
    for (const file of profile.files) {
      const bytes = await regular(site, file.path); total += bytes.length;
      if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error(`Release hash mismatch: ${file.path}`);
    }
    if (total !== profile.totalBytes) throw new Error('Release totals differ.');
    if (profile.directory === 'site' && (await regular(site, '_headers')).toString() !== HOST_HEADERS) throw new Error('Release header policy differs.');
    if (profile.directory === 'pages' && !(await regular(site, 'index.html')).toString().includes(`<meta http-equiv="Content-Security-Policy" content="${META_CSP}">`)) throw new Error('Pages CSP differs.');
  }
  return manifest;
}
