/** Schema review flags are author gates, not independent curriculum approval. */
export function packEvidence(pack) {
  const synthetic = pack.sources.length > 0 && pack.sources.every(source => source.kind === 'synthetic');
  const basis = synthetic ? 'Technically validated synthetic fixture' : 'Source-backed display material';
  const review = pack.review.status === 'reviewed' ? 'author review recorded' : 'Unreviewed draft';
  return `${basis} · ${review} · independent curriculum approval not recorded`;
}
