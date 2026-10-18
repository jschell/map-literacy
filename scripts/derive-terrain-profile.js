import { open, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deriveTerrainProfile } from '../src/terrain/profile.js';
const args = process.argv.slice(2);
if (args.length !== 3) throw new Error('Use: node scripts/derive-terrain-profile.js GRID.json REQUEST.json OUTPUT.json');
async function read(path, limit) {
  const handle = await open(path, 'r');
  const buffer = Buffer.alloc(limit + 1); let used = 0;
  try {
    while (used <= limit) {
      const { bytesRead } = await handle.read(buffer, used, buffer.length - used, null);
      if (!bytesRead) break;
      used += bytesRead;
      if (used > limit) throw new Error('Profile input exceeds its byte budget.');
    }
  } finally { await handle.close(); }
  const bytes = buffer.subarray(0, used);
  return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
}

const grid = await read(args[0], 32 * 1024 * 1024), request = await read(args[1], 256 * 1024);
if (!request.value || Object.keys(request.value).sort().join(',') !== 'format,path,spacingM' || request.value.format !== 'map-literacy-profile-request-v1') throw new Error('Unsupported profile request.');
const profile = deriveTerrainProfile(grid.value, request.value.path, { spacingM: request.value.spacingM });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
profile.inputHashes = { gridFileSha256: hash(grid.bytes), requestFileSha256: hash(request.bytes) };
const text = JSON.stringify(profile, null, 2) + '\n';
if (Buffer.byteLength(text) > 8 * 1024 * 1024) throw new Error('Profile output exceeds 8 MiB.');
await writeFile(args[2], text, { flag: 'wx' });
console.log(`Draft profile: ${profile.samples.length} samples; ${profile.summary.totalsStatus} totals. Existing files are never overwritten.`);
