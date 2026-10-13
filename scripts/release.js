import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { buildStatic, verifyStatic } from './static-package.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const action = process.argv[2];
if (!['build', 'preview', 'browser'].includes(action) || process.argv.length !== 3) throw new Error('Use release.js build, preview or browser.');
if (action !== 'preview') {
  const manifest = await buildStatic(root);
  console.log(`Static packages: ${manifest.profiles.map((p) => `${p.directory}: ${p.files.length} assets, ${p.totalBytes} bytes`).join('; ')}. dist/release-manifest.json records hashes.`);
}
await verifyStatic(root);
if (action !== 'build') {
  const env = { ...process.env, MAP_LITERACY_ASSET_ROOT: join(root, 'dist', 'site'), MAP_LITERACY_RELEASE_CHECK: action === 'browser' ? '1' : '0' };
  if (action === 'browser') delete env.MAP_LITERACY_URL; // Always test the package, not an external development server.
  const child = spawn(process.execPath, [join(root, 'scripts', action === 'preview' ? 'dev-server.js' : 'browser-check.js')], {
    stdio: 'inherit', env
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
