import { readFile, stat } from 'node:fs/promises';
import { readImport } from '../src/data/read-pack.js';
import { PACK_LIMITS } from '../src/data/pack-schema.js';

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  console.error('Usage: npm run validate -- path/to/pack.json'); process.exitCode = 2;
} else {
  try {
    if ((await stat(path)).size > PACK_LIMITS.bytes) throw Object.assign(new Error('Pack exceeds byte limit.'), { code: 'limit-exceeded' });
    const p = await readImport(new Blob([await readFile(path)]));
    console.log(JSON.stringify({ valid: true, id: p.id, revision: p.revision }));
  } catch (error) {
    console.error(JSON.stringify({ valid: false, code: error.code ?? 'read-failed', message: error.message, errors: error.errors ?? [] }));
    process.exitCode = 1;
  }
}
