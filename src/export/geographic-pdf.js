import { imagePdf } from './image-pdf.js';

async function svgImage(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Map image timed out. Retry PDF download.')), 10000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Map image could not be prepared. Retry PDF download.')); };
      image.src = url;
    });
    return { image, url };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
/** Frozen prepared map -> raster PDF with a physical Letter MediaBox, independent of print CSS. */
export async function geographicPdf(document, { view, children, credit }) {
  const dpi = 200, units = dpi / 25.4;
  const [sheetWidth, sheetHeight] = view.orientation === 'landscape' ? [279.4, 215.9] : [215.9, 279.4];
  const canvas = document.createElement('canvas'); canvas.width = Math.round(sheetWidth * units); canvas.height = Math.round(sheetHeight * units);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot prepare PDF images.');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const x = (sheetWidth - view.width) / 2, y = 15;
  // Freeze SVG/placements synchronously; prepared raster nodes remain immutable even if browsing replaces them.
  const overlays = [], rasters = []; 
  ctx.save(); ctx.beginPath(); ctx.rect(x * units, y * units, view.width * units, view.height * units); ctx.clip();
  for (const child of children) {
    if (child.localName === 'svg') {
      const copy = child.cloneNode(true); copy.setAttribute('width', `${view.width}mm`); copy.setAttribute('height', `${view.height}mm`);
      overlays.push(new XMLSerializer().serializeToString(copy));
    }
    else {
      const left = parseFloat(child.style.left), top = parseFloat(child.style.top), width = parseFloat(child.style.width), height = parseFloat(child.style.height);
      if (![left, top, width, height].every(Number.isFinite)) throw new Error('Invalid map image placement.');
      rasters.push({ child, left, top, width, height });
    }
  }
  for (const { child, left, top, width, height } of rasters) {
    if (child.localName === 'img' && (!child.complete || !child.naturalWidth)) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Map image timed out. Retry PDF download.')), 10000);
        child.onload = () => { clearTimeout(timer); resolve(); };
        child.onerror = () => { clearTimeout(timer); reject(new Error('Map image is not ready. Retry PDF download.')); };
      });
    }
    ctx.drawImage(child, (x + left) * units, (y + top) * units, width * units, height * units);
  }
  for (const svg of overlays) {
    const { image, url } = await svgImage(svg);
    try { ctx.drawImage(image, x * units, y * units, view.width * units, view.height * units); }
    finally { URL.revokeObjectURL(url); }
  }
  ctx.restore();
  ctx.fillStyle = 'black'; ctx.font = `${8 * dpi / 72}px Arial`; ctx.textBaseline = 'top';
  const maxWidth = (sheetWidth - 30) * units, words = credit.split(/\s+/); let line = '', baseline = (y + view.height + 3) * units;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { ctx.fillText(line, 15 * units, baseline); baseline += 10 * dpi / 72; line = word; } else line = next;
  }
  if (baseline + 10 * dpi / 72 > (sheetHeight - 15) * units) throw new Error('Map attribution does not fit this PDF page.');
  ctx.fillText(line, 15 * units, baseline);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .95));
  if (!blob) throw new Error('PDF page image could not be encoded.');
  return imagePdf(new Uint8Array(await blob.arrayBuffer()), canvas.width, canvas.height, view.orientation);
}
