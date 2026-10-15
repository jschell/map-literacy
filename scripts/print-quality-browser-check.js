import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

/** Known synthetic cartography, not real terrain or evidence of physical print performance. */
export async function checkPrintQuality(page, base) {
  const data = await page.evaluate(async (base) => {
    const { monochrome, printTone } = await import(new URL('src/print/monochrome.js', base));
    const { losslessPixels } = await import(new URL('src/export/lossless-pixels.js', base));
    const { imagePdf } = await import(new URL('src/export/image-pdf.js', base));
    const asBase64 = (bytes) => { let text = ''; for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(text); };
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 496;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f8f8f8'; ctx.fillRect(0, 0, 640, 496);
    ctx.fillStyle = '#dddddd'; for (let x = 20; x < 600; x += 90) ctx.fillRect(x, 24, 44, 32);
    ctx.strokeStyle = 'rgb(190,160,120)'; ctx.lineWidth = 1;
    for (let y = 70; y < 460; y += 24) { ctx.beginPath(); ctx.moveTo(10, y); ctx.bezierCurveTo(160, y - 50, 420, y + 70, 630, y); ctx.stroke(); }
    ctx.strokeStyle = '#888888'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 10); ctx.lineTo(550, 470); ctx.stroke();
    ctx.fillStyle = '#555555'; ctx.font = '12px Arial'; ctx.fillText('SYNTHETIC CONTOURS · 100 m', 260, 250);
    ctx.font = '10px Arial'; ctx.fillText('Fine lines and text · no real geography', 30, 475);
    const levels = [80,128,160,185,200,220,235,240,245,250,254];
    ctx.fillStyle = 'white'; ctx.fillRect(390, 295, 240, 135);
    for (const [i, value] of levels.entries()) { ctx.strokeStyle = `rgb(${value},${value},${value})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(400, 310.5 + i * 10); ctx.lineTo(620, 310.5 + i * 10); ctx.stroke(); }
    const source = ctx.getImageData(0, 0, 640, 496), outputs = {};
    const started = performance.now();
    for (const profile of ['standard', 'print']) {
      const copy = new ImageData(new Uint8ClampedArray(source.data), 640, 496); monochrome(copy.data, profile);
      const tile = document.createElement('canvas'); tile.width = 640; tile.height = 496; tile.getContext('2d').putImageData(copy, 0, 0);
      const sheet = document.createElement('canvas'); sheet.width = 2200; sheet.height = 1700;
      const p = sheet.getContext('2d'); p.fillStyle = 'white'; p.fillRect(0, 0, 2200, 1700); p.drawImage(tile, 130, 64, 1940, 1500);
      p.font = '22px Arial'; p.fillStyle = 'black'; p.fillText('Synthetic print-quality fixture — source detail unchanged', 70, 1630);
      const samples = p.getImageData(0, 0, 2200, 1700).data;
      if (profile === 'print') {
        const encoded = await losslessPixels(samples, 2200, 1700, { grayscale: true });
        const retainedAtOutput = levels.filter((_, i) => samples[(Math.round(64 + (310.5 + i * 10) * 1500 / 496) * 2200 + Math.round(130 + 500 * 1940 / 640)) * 4] < 255).length;
        outputs.print = { retainedAtOutput, pdf: asBase64(imagePdf(encoded.bytes, 2200, 1700, 'landscape', encoded)), raw: asBase64(Uint8Array.from({ length: samples.length / 4 }, (_, i) => samples[i * 4])) };
      } else {
        const jpegBlob = await new Promise((resolve) => sheet.toBlob(resolve, 'image/jpeg', .95));
        const jpeg = new Uint8Array(await jpegBlob.arrayBuffer()), image = new Image(), url = URL.createObjectURL(jpegBlob);
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
        const decoded = document.createElement('canvas'); decoded.width = 2200; decoded.height = 1700; const d = decoded.getContext('2d'); d.drawImage(image, 0, 0);
        const recovered = d.getImageData(0, 0, 2200, 1700).data; let sum = 0, max = 0;
        for (let i = 0; i < samples.length; i += 4) { const error = Math.abs(samples[i] - recovered[i]); sum += error; max = Math.max(max, error); }
        URL.revokeObjectURL(url);
        const retainedAtOutput = levels.filter((_, i) => recovered[(Math.round(64 + (310.5 + i * 10) * 1500 / 496) * 2200 + Math.round(130 + 500 * 1940 / 640)) * 4] < 255).length;
        outputs.standard = { retainedAtOutput, pdf: asBase64(imagePdf(jpeg, 2200, 1700, 'landscape')), meanAbsoluteError: sum / (2200 * 1700), maxError: max };
      }
    }
    const retained = levels.filter((v) => printTone(v) < 255).length;
    const sourceGray = Math.round(.2126 * 190 + .7152 * 160 + .0722 * 120), after = printTone(sourceGray);
    return { outputs, metrics: { fixture: 'synthetic-colored-contours-and-gray-lines-v1', sourcePixels: [640,496], pagePixels: [2200,1700], inkGrayBefore: sourceGray, inkGrayAfter: after, backgroundGray: 248, contrastBefore: 248 - sourceGray, contrastAfter: 248 - after, contrastGainPercent: 100 * ((248 - after) / (248 - sourceGray) - 1), thinLevelsRetained: retained, renderedThinLinesRetained: outputs.print.retainedAtOutput, jpegThinLinesRetained: outputs.standard.retainedAtOutput, thinLevelsTested: levels.length, jpegMeanAbsoluteError: outputs.standard.meanAbsoluteError, jpegMaxError: outputs.standard.maxError, elapsedMs: Math.round(performance.now() - started) } };
  }, base);
  const bytes = Buffer.from(data.outputs.print.pdf, 'base64'), text = bytes.toString('latin1');
  const start = bytes.indexOf(Buffer.from('stream\n')) + 7, length = Number(text.match(/\/Filter \/FlateDecode \/Length (\d+)/)[1]);
  const pixels = inflateSync(bytes.subarray(start, start + length));
  assert.deepEqual(pixels, Buffer.from(data.outputs.print.raw, 'base64'), 'PDF compression must add zero sample error');
  assert.ok(data.metrics.contrastGainPercent >= 25); assert.equal(data.metrics.thinLevelsRetained, data.metrics.thinLevelsTested); assert.equal(data.metrics.renderedThinLinesRetained, data.metrics.thinLevelsTested);
  assert.ok(data.metrics.jpegMeanAbsoluteError > 0);
  const report = { ...data.metrics, losslessMeanAbsoluteError: 0, losslessMaxError: 0, jpegPdfBytes: Buffer.from(data.outputs.standard.pdf, 'base64').length, losslessPdfBytes: bytes.length, spatialResolutionImproved: false };
  for (const kind of ['standard', 'print']) await writeFile(new URL(`../artifacts/browser/print-quality-${kind}.pdf`, import.meta.url), Buffer.from(data.outputs[kind].pdf, 'base64'));
  await writeFile(new URL('../artifacts/browser/print-quality-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  return report;
}
