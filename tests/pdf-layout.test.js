import test from 'node:test';
import assert from 'node:assert/strict';
import { geographicView } from '../src/map/geographic.js';
import { project } from '../src/map/explorer.js';
import { pdfPageLayout, pdfScaleCredit } from '../src/export/pdf-layout.js';

test('PDF map fills the available Letter area without distortion, cropping or footer overlap', () => {
  for (const orientation of ['landscape', 'portrait']) for (const count of [1, 2, 3]) {
    const view = geographicView(project(-122.122, 47.674, 15), 15, orientation), box = pdfPageLayout(view, count);
    assert.ok(box.factor > 1.1, 'download is larger than the browser-chrome-sized native map');
    assert.ok(Math.abs(box.width / box.height - view.width / view.height) < 1e-10);
    assert.ok(box.x >= 8 - 1e-10 && box.x + box.width <= box.sheetWidth - 8 + 1e-10);
    assert.ok(box.footerY + count * box.lineHeight <= box.sheetHeight - 8 + 1e-10);
    assert.ok(Math.abs(box.width - box.footerWidth) < 1e-8 || Math.abs(box.footerY + count * box.lineHeight - (box.sheetHeight - 8)) < 1e-8, 'one available dimension is filled');
    assert.ok(Math.abs(box.scaleDenominator * box.width / 1000 - view.groundWidth) < 1e-8);
  }
});
test('PDF topo scale follows enlargement while source names and native-view scale stay intact', () => {
  const view = geographicView(project(-122.122, 47.674, 15), 15, 'landscape'), original = view.scaleDenominator, box = pdfPageLayout(view, 2);
  const credit = `USGS Topo · approximate center scale 1:${Math.round(original).toLocaleString()} · viewed today`;
  assert.ok(pdfScaleCredit(credit, view, box).includes(`1:${Math.round(original / box.factor).toLocaleString()} at actual size`));
  assert.equal(view.scaleDenominator, original);
  assert.equal(pdfScaleCredit('© OpenStreetMap contributors', view, box), '© OpenStreetMap contributors');
  assert.throws(() => pdfPageLayout({ ...view, scaleDenominator: 0 }, 2));
  for (const n of [0, 7, NaN]) assert.throws(() => pdfPageLayout(view, n));
});
