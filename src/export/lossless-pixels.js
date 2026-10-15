/** Compress exact composited samples; unsupported compression falls back to raw PDF samples. */
export async function losslessPixels(rgba, width, height, { grayscale = false, Compression = globalThis.CompressionStream } = {}) {
  const channels = grayscale ? 1 : 3, length = width * height * channels;
  if (!(rgba instanceof Uint8ClampedArray) || ![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 4000) || rgba.length !== width * height * 4 || length > 20 * 1024 * 1024) throw new Error('Invalid lossless page samples.');
  const raw = new Uint8Array(length);
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3] / 255;
    const r = Math.round(rgba[i] * alpha + 255 * (1 - alpha)), g = Math.round(rgba[i + 1] * alpha + 255 * (1 - alpha)), b = Math.round(rgba[i + 2] * alpha + 255 * (1 - alpha));
    if (grayscale) raw[j++] = Math.round(.2126 * r + .7152 * g + .0722 * b);
    else { raw[j++] = r; raw[j++] = g; raw[j++] = b; }
  }
  if (typeof Compression === 'function') {
    try {
      const stream = new Blob([raw]).stream().pipeThrough(new Compression('deflate'));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      if (bytes.length < raw.length) return { bytes, encoding: 'flate', grayscale };
    } catch { /* Keep exact samples if compression is unavailable or fails. */ }
  }
  return { bytes: raw, encoding: 'raw', grayscale };
}
