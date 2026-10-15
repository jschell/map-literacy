/** Physical millimetres; PDF has no browser chrome to reserve space for. */
export function pdfPageLayout(view, footerLines) {
  if (!['landscape', 'portrait'].includes(view.orientation) || ![view.width, view.height, view.scaleDenominator].every((n) => Number.isFinite(n) && n > 0) || !Number.isInteger(footerLines) || footerLines < 1 || footerLines > 6) throw new Error('Invalid PDF layout.');
  const [sheetWidth, sheetHeight] = view.orientation === 'landscape' ? [279.4, 215.9] : [215.9, 279.4];
  const margin = 8, gap = 3, lineHeight = 10 * 25.4 / 72;
  const availableWidth = sheetWidth - margin * 2, availableHeight = sheetHeight - margin * 2 - gap - footerLines * lineHeight;
  const factor = Math.min(availableWidth / view.width, availableHeight / view.height);
  const width = view.width * factor, height = view.height * factor;
  return { sheetWidth, sheetHeight, margin, lineHeight, factor, width, height, x: (sheetWidth - width) / 2, y: margin, footerY: margin + height + gap, footerWidth: availableWidth, scaleDenominator: view.scaleDenominator / factor };
}
export function pdfScaleCredit(credit, view, layout) {
  // Replace only the application's generated topo scale statement, never source labels.
  return credit.replace(`approximate center scale 1:${Math.round(view.scaleDenominator).toLocaleString()}`, `approximate center scale 1:${Math.round(layout.scaleDenominator).toLocaleString()} at actual size`);
}
