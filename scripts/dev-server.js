import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.js';
const root = process.env.MAP_LITERACY_ASSET_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.MAP_LITERACY_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid MAP_LITERACY_PORT.');
createStaticServer(root).listen(port, '127.0.0.1', () => console.log(`Map review: http://127.0.0.1:${port} (loopback only)`));
