import { EARTH_RADIUS_M } from './distance.js';
const rad = (v) => v * Math.PI / 180;
const deg = (v) => v * 180 / Math.PI;
const clamp = (v) => Math.max(-1, Math.min(1, v));

/** Spherical azimuthal equidistant, local meters east/north. */
export function createProjection(center) {
  if (!Array.isArray(center) || center.length !== 2) throw new Error('Expected [longitude, latitude] projection center.');
  const [longitude, latitude] = center;
  if (!center.every(Number.isFinite) || Math.abs(longitude) > 180 || Math.abs(latitude) > 70) throw new Error('Unsupported projection center.');
  const lambda0 = rad(longitude), phi0 = rad(latitude);
  const sin0 = Math.sin(phi0), cos0 = Math.cos(phi0);
  return {
    center: [...center],
    project([lon, lat]) {
      const phi = rad(lat), delta = rad(lon) - lambda0;
      const cosC = clamp(sin0 * Math.sin(phi) + cos0 * Math.cos(phi) * Math.cos(delta));
      const c = Math.acos(cosC);
      const k = c < 1e-8 ? 1 : c / Math.sin(c);
      return [EARTH_RADIUS_M * k * Math.cos(phi) * Math.sin(delta),
        EARTH_RADIUS_M * k * (cos0 * Math.sin(phi) - sin0 * Math.cos(phi) * Math.cos(delta))];
    },
    inverse([x, y]) {
      const rho = Math.hypot(x, y);
      if (rho < 1e-8) return [...center];
      const c = rho / EARTH_RADIUS_M, sinC = Math.sin(c), cosC = Math.cos(c);
      return [deg(lambda0 + Math.atan2(x * sinC, rho * cos0 * cosC - y * sin0 * sinC)),
        deg(Math.asin(clamp(cosC * sin0 + y * sinC * cos0 / rho)))];
    },
  };
}

export function boundsPerimeter(bounds, subdivisions = 16) {
  const [w, s, e, n] = bounds, points = [];
  for (let i = 0; i < subdivisions; i++) {
    const t = i / subdivisions;
    points.push([w + (e - w) * t, s]);
  }
  for (let i = 0; i < subdivisions; i++) points.push([e, s + (n - s) * i / subdivisions]);
  for (let i = 0; i < subdivisions; i++) points.push([e - (e - w) * i / subdivisions, n]);
  for (let i = 0; i < subdivisions; i++) points.push([w, n - (n - s) * i / subdivisions]);
  return points;
}

export function rotateScreen([east, north], degrees) {
  const a = rad(degrees), x = east, y = -north;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}
