/** Pointwise curve: preserve white and pale lines; deepen midtones without spatial filtering. */
export function printTone(gray) {
  if (!Number.isFinite(gray) || gray < 0 || gray > 255) throw new Error('Invalid grayscale value.');
  if (gray <= 128) return Math.round(gray * .75);
  if (gray <= 200) return Math.round(96 + (gray - 128) * 74 / 72);
  if (gray <= 235) return Math.round(170 + (gray - 200) * 65 / 35);
  return Math.round(gray);
}
export function monochrome(rgba, contrast = 'standard') {
  if (!(rgba instanceof Uint8ClampedArray) || rgba.length % 4 || !['standard', 'print'].includes(contrast)) throw new Error('Invalid monochrome input.');
  for (let i = 0; i < rgba.length; i += 4) {
    const gray = Math.round(.2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2]);
    rgba[i] = rgba[i + 1] = rgba[i + 2] = contrast === 'print' ? printTone(gray) : gray;
  }
  return rgba;
}
