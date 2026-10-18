const encode = (text) => new TextEncoder().encode(text);
/** One fixed image page. All PDF syntax is generated here; no user strings enter it. */
export function imagePdf(payload, pixelWidth, pixelHeight, orientation, { encoding = 'jpeg', grayscale = false } = {}) {
  return imagePagesPdf([{ payload, pixelWidth, pixelHeight, encoding, grayscale }], orientation);
}

/** Bounded image document. No imported text enters PDF syntax. */
export function imagePagesPdf(pages, orientation) {
  if (!['portrait', 'landscape'].includes(orientation) || !Array.isArray(pages) || !pages.length || pages.length > 64) throw new Error('Invalid PDF document.');
  let total = 0;
  for (const { payload, pixelWidth, pixelHeight, encoding = 'jpeg', grayscale = false } of pages) {
    if (!(payload instanceof Uint8Array) || !payload.length || payload.length > 20 * 1024 * 1024 || ![pixelWidth, pixelHeight].every(n => Number.isInteger(n) && n > 0 && n <= 4000) || !['jpeg', 'flate', 'raw'].includes(encoding) || typeof grayscale !== 'boolean') throw new Error('Invalid PDF page image.');
    if (encoding === 'jpeg' && (grayscale || payload.length < 4 || payload[0] !== 255 || payload[1] !== 216 || payload.at(-2) !== 255 || payload.at(-1) !== 217)) throw new Error('Invalid JPEG page image.');
    if (encoding === 'raw' && payload.length !== pixelWidth * pixelHeight * (grayscale ? 1 : 3)) throw new Error('Invalid raw image length.');
    total += payload.length;
    if (total > 64 * 1024 * 1024) throw new Error('PDF exceeds 64 MiB; choose a smaller lesson.');
  }
  const [width, height] = orientation === 'landscape' ? [792, 612] : [612, 792];
  const chunks = [], offsets = [0]; let length = 0;
  const append = (value) => { const bytes = typeof value === 'string' ? encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, content) => { offsets[id] = length; append(`${id} 0 obj\n${content}\nendobj\n`); };
  append('%PDF-1.4\n'); append(Uint8Array.from([37, 226, 227, 207, 211, 10]));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  for (const [i, { payload, pixelWidth, pixelHeight, encoding = 'jpeg', grayscale = false }] of pages.entries()) {
    const id = 3 + i * 3;
    const colorSpace = grayscale ? '/DeviceGray' : '/DeviceRGB', filter = encoding === 'jpeg' ? '/Filter /DCTDecode ' : encoding === 'flate' ? '/Filter /FlateDecode ' : '';
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    offsets[id + 1] = length;
    append(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace ${colorSpace} /BitsPerComponent 8 ${filter}/Length ${payload.length} >>\nstream\n`);
    append(payload); append('\nendstream\nendobj\n');
    const drawing = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
    object(id + 2, `<< /Length ${encode(drawing).length} >>\nstream\n${drawing}endstream`);
  }
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { result.set(chunk, at); at += chunk.length; }
  return result;
}
