export const SOURCE_BYTE_LIMIT = 32 * 1024 * 1024;

export class SourceError extends Error {
  constructor(code, message, retryAfterMs = null) {
    super(message); this.name = 'SourceError'; this.code = code; this.retryAfterMs = retryAfterMs;
  }
}

/** One identified request; no automatic retry, failover or background polling. */
export async function fetchOSM({ endpoint, query, signal, timeoutMs = 30000, fetchImpl = fetch }) {
  let url;
  try { url = new URL(endpoint); } catch { throw new SourceError('invalid-source', 'Invalid endpoint.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new SourceError('invalid-source', 'Use an HTTPS endpoint without credentials or fragment.');
  if (typeof query !== 'string' || query.length === 0 || query.length > 2000) throw new SourceError('invalid-query', 'Expected bounded query text.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) throw new SourceError('invalid-timeout', 'Timeout must be 1–60 seconds.');
  if (signal?.aborted) throw new SourceError('canceled', 'Source request canceled.');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let response;
  try {
    response = await fetchImpl(url.href, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'map-literacy/0.1 (https://github.com/jschell/map-literacy)' },
      body: new URLSearchParams({ data: query }).toString(), signal: controller.signal });
    if (!response.ok) {
      let retryAfterMs = null;
      if (response.status === 429 || response.status === 406 || response.status === 503) {
        const value = response.headers.get('retry-after');
        const seconds = value !== null && /^\d+$/.test(value) ? Number(value) * 1000 : value ? Date.parse(value) - Date.now() : 0;
        retryAfterMs = Math.max(30000, Number.isFinite(seconds) ? seconds : 30000);
      }
      throw new SourceError(`http-${response.status}`, 'Source request failed; no extract saved.', retryAfterMs);
    }
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > SOURCE_BYTE_LIMIT) throw new SourceError('source-too-large', 'Source exceeds byte limit.');
    if (!response.body) throw new SourceError('empty-source', 'No source body.');
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        if (controller.signal.aborted) throw new SourceError(timedOut ? 'timeout' : 'canceled', 'Source request stopped.');
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > SOURCE_BYTE_LIMIT) throw new SourceError('source-too-large', 'Source exceeds byte limit.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    if (controller.signal.aborted) throw new SourceError(timedOut ? 'timeout' : 'canceled', 'Source request stopped.');
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    if (signal?.aborted) throw new SourceError('canceled', 'Source request canceled.');
    if (timedOut) throw new SourceError('timeout', 'Source request timed out.');
    if (error instanceof SourceError) throw error;
    throw new SourceError('network-failed', 'Source request could not complete.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); await response?.body?.cancel().catch(() => {}); }
}
