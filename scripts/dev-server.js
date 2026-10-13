import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.MAP_LITERACY_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid MAP_LITERACY_PORT.');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
createServer(async (request, response) => {
  response.setHeader('Content-Security-Policy', csp);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (path === '/') path = '/index.html';
    if (!['/index.html', '/styles.css', '/tests/fixtures/street-square.json'].includes(path) && !/^\/src\/[a-zA-Z0-9/_-]+\.js$/.test(path)) { response.writeHead(404); response.end(); return; }
    const target = await realpath(resolve(root, '.' + path));
    if (!target.startsWith(resolve(root) + sep)) { response.writeHead(404); response.end(); return; }
    const bytes = await readFile(target);
    response.writeHead(200, { 'Content-Type': `${mime[extname(target)] ?? 'application/octet-stream'}; charset=utf-8` });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404); response.end(); }
}).listen(port, '127.0.0.1', () => console.log(`Map review: http://127.0.0.1:${port} (loopback only)`));
