import { createHash } from 'node:crypto';
import { stitchContourSegments } from '../src/terrain/contour-lines.js';
import { deriveContours } from '../src/terrain/contours.js';
import { auditContourLines } from './contour-audit.js';

const [path, levelsText, ...extra] = process.argv.slice(2);
if (!path || !levelsText || extra.length) throw new Error('Usage: node scripts/derive-contour-lines.js GRID.json LEVELS_COMMA_SEPARATED');
// Read at most the bound plus one byte, even if the file grows after opening.
const { open } = await import('node:fs/promises');
const file = await open(path, 'r');
let bytes;
try {
  const limit = 32 * 1024 * 1024;
  if ((await file.stat()).size > limit) throw new Error('Grid input byte budget exceeded.');
  const buffer = Buffer.alloc(limit + 1);
  let length = 0;
  while (length < buffer.length) {
    const { bytesRead } = await file.read(buffer, length, buffer.length - length);
    if (!bytesRead) break;
    length += bytesRead;
  }
  if (length > limit) throw new Error('Grid input byte budget exceeded.');
  bytes = buffer.subarray(0, length);
} finally { await file.close(); }
const grid = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
const levels = levelsText.split(',').map(s => s.trim() ? Number(s) : NaN);
const raw = deriveContours(grid, levels), lines = stitchContourSegments(raw);
const audit = auditContourLines(grid, raw, lines);
const output = JSON.stringify({ grid, sourceGridSha256: createHash('sha256').update(bytes).digest('hex'), lines, audit });
if (Buffer.byteLength(output) > 64 * 1024 * 1024) throw new Error('Contour output byte budget exceeded.');
process.stdout.write(output + '\n');
