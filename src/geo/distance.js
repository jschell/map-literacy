export const EARTH_RADIUS_M = 6371008.8;
const radians = (degrees) => degrees * Math.PI / 180;

/** Great-circle distance; inputs are validated [longitude, latitude] pairs. */
export function distanceM(a, b) {
  const latA = radians(a[1]);
  const latB = radians(b[1]);
  const h = Math.sin((latB - latA) / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(radians(b[0] - a[0]) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function lineLengthM(coordinates) {
  let total = 0;
  for (let i = 1; i < coordinates.length; i += 1) total += distanceM(coordinates[i - 1], coordinates[i]);
  return total;
}
