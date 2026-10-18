import { renderProfileChart } from '../terrain/profile-chart.js';
import { imagePagesPdf } from './image-pdf.js';
import { losslessPixels } from './lossless-pixels.js';

const DPI = 300, U = DPI / 25.4, PT = DPI / 72;
/** Snapshot presentation attributes before yielding; no external stylesheet is needed in the SVG image. */
function frozenSvg(document, svg, width, height) {
  const copy = svg.cloneNode(true);
  const originals = [svg, ...svg.querySelectorAll('*')], copies = [copy, ...copy.querySelectorAll('*')];
  const properties = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'paint-order', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'opacity'];
  originals.forEach((node, i) => {
    const style = document.defaultView.getComputedStyle(node);
    for (const property of properties) copies[i].setAttribute(property, style.getPropertyValue(property));
  });
  copy.setAttribute('width', `${width}mm`); copy.setAttribute('height', `${height}mm`);
  return new XMLSerializer().serializeToString(copy);
}
async function loadSvg(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Lesson map image timed out. Retry PDF download.')), 10000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Lesson map image could not be prepared.')); };
      image.src = url;
    });
    return { image, url };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}

/** Fixed physical map geometry, plus separately paginated literal teaching text. */
export async function lessonPdf(document, { svg, model, title, summary, footer, spec, packId, revision }) {
  if (!model.paper || !['portrait', 'landscape'].includes(model.orientation) || !svg) throw new Error('Choose an available lesson print layout.');
  // Freeze everything before image decode/compression can yield to view changes.
  const snapshot = frozenSvg(document, svg, model.width, model.height);
  const chartSnapshot=spec?.profile?new XMLSerializer().serializeToString(renderProfileChart(document,spec.profile,{paper:true})):null;
  const blocks = spec ? spec.blocks.map(b => ({ ...b })) : [];
  const kind = spec?.kind;
  const [sheetWidth, sheetHeight] = model.orientation === 'portrait' ? [215.9, 279.4] : [279.4, 215.9];
  const canvas = document.createElement('canvas'); canvas.width = Math.round(sheetWidth * U); canvas.height = Math.round(sheetHeight * U);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot prepare PDF images.');
  const pages = []; let totalBytes = 0;
  const clear = () => { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'black'; ctx.textBaseline = 'top'; };
  const font = (pt, bold = false) => { ctx.font = `${bold ? 'bold ' : ''}${pt * PT}px Arial`; };
  const wrap = (text, width) => {
    const lines = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= width * U) { line = next; continue; }
        if (line) { lines.push(line); line = ''; }
        for (const character of word) {
          if (line && ctx.measureText(line + character).width > width * U) { lines.push(line); line = ''; }
          line += character;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const draw = (lines, x, y, step) => lines.forEach((line, i) => ctx.fillText(line, x * U, (y + i * step) * U));
  const save = async () => {
    if (pages.length >= 64) throw new Error('Lesson exceeds 64 PDF pages.');
    const encoded = await losslessPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { grayscale: true });
    totalBytes += encoded.bytes.length;
    if (totalBytes > 64 * 1024 * 1024) throw new Error('PDF exceeds 64 MiB; choose a smaller lesson.');
    pages.push({ payload: encoded.bytes, pixelWidth: canvas.width, pixelHeight: canvas.height, ...encoded });
  };
  clear();
  const { image, url } = await loadSvg(snapshot);
  try { ctx.drawImage(image, 10 * U, 10 * U, model.width * U, model.height * U); }
  finally { URL.revokeObjectURL(url); }
  let y = 10 + model.height + 4;
  font(11, true); const titles = wrap(title, model.width); draw(titles, 10, y, 5); y += titles.length * 5 + 2;
  font(10); const summaries = wrap(summary, model.width); draw(summaries, 10, y, 4.5); y += summaries.length * 4.5 + 3;
  // Page count is added to text-page footers after text pagination; no browser-generated chrome.
  font(8); const credits = wrap(footer.replace(/ · Page 1 of \d+/, ''), model.width);
  if (y + credits.length * 3.5 > sheetHeight - 10) throw new Error('Map title or source credits do not fit. Use a worksheet or a shorter pack title.');
  draw(credits, 10, y, 3.5); await save();
  if (blocks.length) {
    // Layout text first, then paint so every page receives an accurate total.
    const textPages = [[]]; let content = textPages[0]; y = 25;
    const next = () => { if (textPages.length >= 63) throw new Error('Lesson exceeds 64 PDF pages.'); content = []; textPages.push(content); y = 25; };
    for (const [blockIndex, block] of blocks.entries()) {
      if(block.type==='profile-chart') {
        if(y+70>sheetHeight-25)next();content.push({chart:true,y});y+=74;continue;
      }
      if (block.type === 'answer-space') {
        if (y + 40 > sheetHeight - 25) next();
        content.push({ rule: true, y: y + 40 }); y += 44; continue;
      }
      const bold = block.type === 'heading', pt = bold ? 12 : 10, step = bold ? 6 : 5;
      font(pt, bold);
      const lines = wrap(block.text, sheetWidth - 20);
      const reserve=chartSnapshot && blocks[blockIndex+1]?.type==='answer-space'?44:10;
      if (bold && y + Math.min(lines.length, 2) * step + reserve > sheetHeight - 25) next();
      for (const text of lines) {
        if (y + step > sheetHeight - 25) next();
        content.push({ text, y, pt, bold }); y += step;
      }
      y += 3;
    }
    for (const [i, entries] of textPages.entries()) {
      clear(); font(11, true); draw([`Map Literacy - ${kind}`], 10, 10, 5);
      for (const item of entries) {
        if(item.chart) {
          const {image,url}=await loadSvg(chartSnapshot);
          try{ctx.drawImage(image,10*U,item.y*U,180*U,70*U);}finally{URL.revokeObjectURL(url);}
        }
        else if (item.rule) { ctx.strokeStyle = '#888'; ctx.lineWidth = .25 * U; ctx.beginPath(); ctx.moveTo(10 * U, item.y * U); ctx.lineTo((sheetWidth - 10) * U, item.y * U); ctx.stroke(); }
        else { font(item.pt, item.bold); draw([item.text], 10, item.y, 5); }
      }
      font(8); const label = `${kind} · ${packId} revision ${revision} · Page ${i + 2} of ${textPages.length + 1}`;
      const lines = wrap(label, sheetWidth - 20);
      if (lines.length > 4) throw new Error('Lesson identifier is too long for the PDF footer.');
      draw(lines, 10, sheetHeight - 18, 3.5); await save();
    }
  }
  return imagePagesPdf(pages, model.orientation);
}
