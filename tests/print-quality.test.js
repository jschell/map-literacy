import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { monochrome, printTone } from '../src/print/monochrome.js';
import { losslessPixels } from '../src/export/lossless-pixels.js';
import { imagePdf } from '../src/export/image-pdf.js';

test('print tone keeps pale lines, white/black endpoints and monotonic tone order', () => {
  assert.equal(printTone(0), 0); assert.equal(printTone(255), 255);
  for (let i = 1; i < 255; i++) { assert.ok(printTone(i) < 255 && printTone(i) > 0); assert.ok(printTone(i) >= printTone(i - 1)); }
  for (const i of [235, 240, 250, 254]) assert.equal(printTone(i), i);
  assert.ok(255 - printTone(185) >= (255 - 185) * 1.35);
  const rgba = new Uint8ClampedArray([185,185,185,255, 250,250,250,125]);
  monochrome(rgba, 'print'); assert.deepEqual([...rgba], [155,155,155,255,250,250,250,125]);
  assert.throws(() => monochrome(rgba, 'threshold'));
});
test('lossless color/gray compression and no-compression fallback preserve exact samples', async () => {
  const rgba = new Uint8ClampedArray(64 * 64 * 4);
  for (let i = 0; i < rgba.length; i += 4) { rgba[i] = i % 256; rgba[i + 1] = 185; rgba[i + 2] = 245; rgba[i + 3] = 255; }
  for (const grayscale of [false, true]) {
    const fallback = await losslessPixels(rgba, 64, 64, { grayscale, Compression: null });
    const rawPdf = Buffer.from(imagePdf(fallback.bytes, 64, 64, 'portrait', fallback));
    assert.ok(!rawPdf.toString('latin1').includes('/Filter'));
    const streamStart = rawPdf.indexOf(Buffer.from('stream\n')) + 7;
    assert.deepEqual(rawPdf.subarray(streamStart, streamStart + fallback.bytes.length), Buffer.from(fallback.bytes));
    const result = await losslessPixels(rgba, 64, 64, { grayscale });
    assert.equal(result.encoding, 'flate'); assert.deepEqual(inflateSync(result.bytes), Buffer.from(fallback.bytes));
    const pdf = imagePdf(result.bytes, 64, 64, 'landscape', result), text = Buffer.from(pdf).toString('latin1');
    assert.ok(text.includes('/FlateDecode')); assert.ok(text.includes(grayscale ? '/DeviceGray' : '/DeviceRGB'));
    assert.ok(!text.includes('/DCTDecode'));
  }
  const transparent = await losslessPixels(new Uint8ClampedArray([0,0,0,0]), 1, 1, { Compression: null });
  assert.deepEqual([...transparent.bytes], [255,255,255]);
  await assert.rejects(losslessPixels(rgba, 65, 64));
});
