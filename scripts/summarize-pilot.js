import { stat, readFile } from 'node:fs/promises';
import { summarizePilot } from './pilot-analysis.js';
if (process.argv.length !== 3) throw new Error('Usage: node scripts/summarize-pilot.js pilot-data/observations.json');
const path = process.argv[2];
if ((await stat(path)).size > 2 * 1024 * 1024) throw new Error('Pilot record exceeds 2 MiB.');
console.log(JSON.stringify(summarizePilot(JSON.parse(await readFile(path, 'utf8'))), null, 2));
