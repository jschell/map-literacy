import { readFile, stat } from 'node:fs/promises';
import { compareSources } from '../src/data/compare-sources.js';
import { SOURCE_BYTE_LIMIT } from '../src/data/acquire-osm.js';

const paths = process.argv.slice(2);
try {
  if (paths.length !== 2) throw new Error('Usage: npm run osm:compare -- before/source.osm.json after/source.osm.json');
  const snapshots = [];
  for (const path of paths) {
    if ((await stat(path)).size > SOURCE_BYTE_LIMIT) throw new Error('Source exceeds byte limit.');
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)));
    if (raw.remark !== undefined) throw new Error('Incomplete/error response is not a comparison snapshot.');
    snapshots.push(raw);
  }
  console.log(JSON.stringify(compareSources(...snapshots), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
