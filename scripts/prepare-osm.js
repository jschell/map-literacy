import { access, mkdir, mkdtemp, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { prepareOSM } from '../src/data/prepare-osm.js';
import { fetchOSM, SOURCE_BYTE_LIMIT } from '../src/data/acquire-osm.js';
import { buildRoadQuery } from '../src/data/osm-query.js';

const [mode, ...args] = process.argv.slice(2);
const values = {};
let stage;
let reservation;
try {
  if (!['import', 'fetch'].includes(mode) || args.length % 2) throw new Error('Usage: npm run osm:prepare -- import|fetch --config config.json --out new-directory [--input source.osm.json]');
  for (let i = 0; i < args.length; i += 2) {
    if (!['--config', '--out', '--input'].includes(args[i]) || Object.hasOwn(values, args[i])) throw new Error('Unknown or repeated option.');
    values[args[i]] = args[i + 1];
  }
  if (!values['--config'] || !values['--out'] || (mode === 'import') !== Boolean(values['--input'])) throw new Error('Provide config/out and input only for import mode.');
  const destination = resolve(values['--out']);
  try { await access(destination); throw new Error('Output already exists; reuse cached artifacts or choose a new revision directory.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if ((await stat(values['--config'])).size > 16384) throw new Error('Configuration exceeds 16 KiB.');
  const config = JSON.parse(await readFile(values['--config'], 'utf8'));
  const allowed = ['id', 'title', 'revision', 'bounds', 'sourceBounds', 'endpoint', 'query', 'fetchedAt'];
  if (!config || Array.isArray(config) || typeof config !== 'object' || Object.keys(config).some((k) => !allowed.includes(k))) throw new Error('Invalid configuration fields.');
  const query = buildRoadQuery(config.sourceBounds);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  let prepared;
  try {
    let bytes;
    if (mode === 'fetch') {
      if (config.query !== undefined || config.fetchedAt !== undefined) throw new Error('Fetch mode creates its own query and retrieval time.');
      bytes = await fetchOSM({ endpoint: config.endpoint, query, signal: controller.signal });
      config.query = query; config.fetchedAt = new Date().toISOString();
    } else {
      if ((await stat(values['--input'])).size > SOURCE_BYTE_LIMIT) throw new Error('Input exceeds source byte limit.');
      if (typeof config.query !== 'string' || !config.query.trim() || typeof config.fetchedAt !== 'string') throw new Error('Import requires recorded original query and retrieval time; do not invent provenance.');
      bytes = new Uint8Array(await readFile(values['--input']));
    }
    if (controller.signal.aborted) throw Object.assign(new Error('Canceled'), { code: 'canceled' });
    prepared = await prepareOSM(bytes, config);
    if (controller.signal.aborted) throw Object.assign(new Error('Canceled'), { code: 'canceled' });
    await mkdir(dirname(destination), { recursive: true });
    stage = await mkdtemp(join(dirname(destination), '.map-literacy-prepare-'));
    await writeFile(join(stage, 'source.osm.json'), prepared.sourceBytes);
    for (const [name, data] of Object.entries({ 'pack.json': prepared.pack, 'review-report.json': prepared.report, 'acquisition.json': config })) await writeFile(join(stage, name), JSON.stringify(data, null, 2) + '\n');
    if (controller.signal.aborted) throw Object.assign(new Error('Canceled'), { code: 'canceled' });
    // Atomically reserve a new empty directory; concurrent runs cannot overwrite it.
    await mkdir(destination); reservation = destination;
    await rename(stage, destination); stage = null;
    reservation = null;
    console.log(JSON.stringify({ directory: destination, id: prepared.pack.id, revision: prepared.pack.revision, status: 'draft', issues: prepared.report.issues.length }));
  } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
} catch (error) {
  console.error(JSON.stringify({ code: error.code ?? 'prepare-failed', message: error.message, retryAfterMs: error.retryAfterMs ?? null, errors: error.errors ?? [] }));
  process.exitCode = 1;
} finally {
  if (stage) await rm(stage, { recursive: true, force: true });
  if (reservation) await rmdir(reservation).catch(() => {}); // Only remove our still-empty reservation.
}
