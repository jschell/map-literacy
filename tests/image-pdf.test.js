import test from 'node:test';
import assert from 'node:assert/strict';
import { imagePdf } from '../src/export/image-pdf.js';
// Binary marker bytes exercise PDF stream/offset accounting; browser tests supply real JPEGs.
const jpeg = Uint8Array.from([255, 216, 0, 128, 10, 255, 217]);
test('generated single-page PDF has exact Letter dimensions and byte-correct cross references', () => {
  for (const [orientation, size] of [['landscape', '792 612'], ['portrait', '612 792']]) {
    const bytes = imagePdf(jpeg, 2200, 1700, orientation), text = new TextDecoder('latin1').decode(bytes);
    assert.ok(text.includes(`/MediaBox [0 0 ${size}]`));
    assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 1);
    const xrefAt = Number(text.match(/startxref\n(\d+)/)[1]);
    assert.equal(new TextDecoder().decode(bytes.slice(xrefAt, xrefAt + 4)), 'xref');
    const rows = text.slice(xrefAt).split('\n').slice(3, 8);
    rows.forEach((row, i) => { const offset = Number(row.slice(0, 10)); assert.equal(new TextDecoder().decode(bytes.slice(offset, offset + 7)), `${i + 1} 0 obj`); });
    assert.ok(text.includes('/Length 7')); assert.ok(text.includes('/ColorSpace /DeviceRGB'));
  }
});
test('PDF encoder rejects unsupported sizes, orientation and non-JPEG input', () => {
  for (const args of [[jpeg, 1, 1, 'auto'], [jpeg, 4001, 1, 'portrait'], [jpeg, 1.2, 1, 'portrait'], [new Uint8Array(0), 1, 1, 'portrait'], [new Uint8Array([0,0,0,0]), 1, 1, 'portrait']]) assert.throws(() => imagePdf(...args));
});

test('multi-page encoder preserves binary streams, Letter geometry and all object references', async () => {
  const { imagePagesPdf } = await import('../src/export/image-pdf.js');
  for (const orientation of ['portrait', 'landscape']) {
    const bytes = imagePagesPdf([{ payload: jpeg, pixelWidth: 20, pixelHeight: 30 }, { payload: new Uint8Array([0, 10, 255, 128]), pixelWidth: 2, pixelHeight: 2, encoding: 'raw', grayscale: true }], orientation);
    const text = new TextDecoder('latin1').decode(bytes);
    assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 2);
    assert.equal((text.match(new RegExp(`/MediaBox \\[0 0 ${orientation === 'portrait' ? '612 792' : '792 612'}\\]`, 'g')) ?? []).length, 2);
    const xrefAt = Number(text.match(/startxref\n(\d+)/)[1]);
    const rows = text.slice(xrefAt).split('\n').slice(3, 11);
    rows.forEach((row, i) => { const at = Number(row.slice(0, 10)); assert.ok(new TextDecoder().decode(bytes.slice(at, at + 12)).startsWith(`${i + 1} 0 obj\n`)); });
    assert.ok(text.includes('/Count 2')); assert.ok(text.includes('/DeviceGray'));
  }
  for (const pages of [[], Array(65).fill({}), [{ payload: jpeg, pixelWidth: 1, pixelHeight: 1, encoding: 'raw' }]]) assert.throws(() => imagePagesPdf(pages, 'portrait'));
});
