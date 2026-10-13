import { PACK_LIMITS } from './pack-schema.js';
import { validatePack } from './validate-pack.js';

export class PackImportError extends Error {
  constructor(code, message, errors = []) {
    super(message); this.name = 'PackImportError'; this.code = code; this.errors = errors;
  }
}

/** Read a Blob/File without side effects. Persistence belongs to a later adapter. */
export async function readImport(file, signal) {
  const canceled = () => { if (signal?.aborted) throw new PackImportError('canceled', 'Import canceled.'); };
  canceled();
  if (!(file instanceof Blob)) throw new PackImportError('invalid-import', 'Expected a File or Blob.');
  if (file.size > PACK_LIMITS.bytes) throw new PackImportError('limit-exceeded', 'Pack exceeds byte limit.');
  const bytes = await file.arrayBuffer();
  canceled();
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new PackImportError('invalid-import', 'Expected UTF-8 JSON.'); }
  const report = validatePack(value);
  canceled();
  if (!report.valid) throw new PackImportError(report.errors[0].code, 'Pack validation failed.', report.errors);
  return value;
}
