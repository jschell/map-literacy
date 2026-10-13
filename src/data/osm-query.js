import { distanceM } from '../geo/distance.js';

/** A bounded road query, with parent restrictions and recursively required members. */
export function buildRoadQuery(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some((v) => !Number.isFinite(v))
    || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -70 || bounds[3] > 70
    || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]
    || distanceM(bounds.slice(0, 2), bounds.slice(2)) > 10000) throw new Error('Unsupported source bounds.');
  const [west, south, east, north] = bounds;
  return `[out:json][timeout:25][maxsize:33554432];\nway[highway](${south},${west},${north},${east})->.roads;\nrel(bw.roads)[type=restriction]->.turns;\n(.roads;.turns;);\n(._; >>;);\nout meta;\n`;
}
