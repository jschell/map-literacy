import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { RESPONSE_HEADERS } from './static-policy.js';

/** Local preview only; callers bind loopback. Unknown paths never fall back to HTML. */
export function createStaticServer(root, { basePath = '/', headers = RESPONSE_HEADERS } = {}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('Invalid static base path.');
  root = resolve(root);
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain' };
  return createServer(async (request, response) => {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    try {
      let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (!path.startsWith(basePath)) { response.writeHead(404); response.end(); return; }
      path = '/' + path.slice(basePath.length);
      if (path === '/') path = '/index.html';
      if (!['/index.html', '/styles.css', '/LICENSE', '/NOTICE.txt', '/tests/fixtures/street-square.json', '/tests/fixtures/terrain-depressions.json', '/tests/fixtures/terrain-landforms.json', '/tests/fixtures/terrain-profiles.json', '/tests/fixtures/terrain-slopes.json', '/tests/fixtures/terrain-hill.json'].includes(path) && !/^\/src\/[a-zA-Z0-9/_-]+\.js$/.test(path)) { response.writeHead(404); response.end(); return; }
      const target = await realpath(resolve(root, '.' + path));
      if (!target.startsWith(root + sep)) { response.writeHead(404); response.end(); return; }
      const bytes = await readFile(target);
      response.writeHead(200, { 'Content-Type': `${mime[extname(target)] ?? 'text/plain'}; charset=utf-8` });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404); response.end(); }
  });
}
