export const RENDER_LIMITS = Object.freeze({ features: 1000, displayCoordinates: 10000, labels: 200 });

/** Call only after pack validation. Schema/preparation ceilings remain separate. */
export function assertRenderable(pack) {
  let displayCoordinates = 0;
  const count = (coordinates) => typeof coordinates[0] === 'number' ? 1 : coordinates.reduce((sum, item) => sum + count(item), 0);
  for (const feature of pack.features.features) displayCoordinates += count(feature.geometry.coordinates);
  if (pack.features.features.length > RENDER_LIMITS.features || displayCoordinates > RENDER_LIMITS.displayCoordinates || pack.labels.length > RENDER_LIMITS.labels) {
    throw Object.assign(new Error('Map exceeds the initial browser limit. Prepare a smaller lesson: at most 1,000 features, 10,000 display coordinates and 200 authored labels.'), { code: 'render-limit-exceeded' });
  }
  return { features: pack.features.features.length, displayCoordinates, labels: pack.labels.length };
}
