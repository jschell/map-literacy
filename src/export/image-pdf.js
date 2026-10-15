const encode = (text) => new TextEncoder().encode(text);
/** One RGB JPEG page. All PDF syntax is generated here; no user strings enter it. */
export function imagePdf(jpeg, pixelWidth, pixelHeight, orientation) {
  if (!(jpeg instanceof Uint8Array) || jpeg.length < 4 || jpeg.length > 20 * 1024 * 1024 || jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg.at(-2) !== 255 || jpeg.at(-1) !== 217) throw new Error('Invalid PDF page image.');
  if (![pixelWidth, pixelHeight].every((n) => Number.isInteger(n) && n > 0 && n <= 4000) || !['portrait', 'landscape'].includes(orientation)) throw new Error('Invalid PDF page dimensions.');
  const [width, height] = orientation === 'landscape' ? [792, 612] : [612, 792];
  const chunks = [], offsets = [0]; let length = 0;
  const append = (value) => { const bytes = typeof value === 'string' ? encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, content) => { offsets[id] = length; append(`${id} 0 obj\n${content}\nendobj\n`); };
  append('%PDF-1.4\n'); append(Uint8Array.from([37, 226, 227, 207, 211, 10]));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append('\nendstream\nendobj\n');
  const drawing = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  object(5, `<< /Length ${encode(drawing).length} >>\nstream\n${drawing}endstream`);
  const xref = length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { result.set(chunk, at); at += chunk.length; }
  return result;
}
