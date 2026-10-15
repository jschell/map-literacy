export const RESPONSE_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: https://tile.openstreetmap.org https://basemap.nationalmap.gov; connect-src 'self' https://overpass-api.de; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store'
});
export const HOST_HEADERS = `/*\n${Object.entries(RESPONSE_HEADERS).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`;
export const META_CSP = RESPONSE_HEADERS['Content-Security-Policy'].replace("; frame-ancestors 'none'", '');
