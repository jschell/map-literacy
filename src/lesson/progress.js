/** Recorded coverage is independent of lifecycle and correctness. Null means unknown. */
export function recordedCoverage(session) {
  const order = session?.exerciseOrder, answers = session?.answers;
  if (!Array.isArray(order) || !order.length || !order.every(id=>typeof id==='string') || new Set(order).size!==order.length || !answers || typeof answers!=='object' || Array.isArray(answers) || Object.keys(answers).some(id=>!order.includes(id) || typeof answers[id]!=='string')) return null;
  return {answered:Object.keys(answers).length,total:order.length};
}

/** For a validated bundle, answers name the last immutable attempt for each item. */
export function sessionProgress({session,attempts}) {
  const coverage = recordedCoverage(session);
  if (!coverage) return {coverage:null,label:'Coverage unavailable'};
  const byId = new Map(attempts.map(a=>[a.id,a]));
  const latest = Object.entries(session.answers).map(([exerciseId,id])=>byId.get(id)?.exerciseId===exerciseId ? byId.get(id) : null);
  if (latest.some(a=>!a)) return {coverage:null,label:'Coverage unavailable'};
  const correct = latest.filter(a=>a.result.status==='correct').length;
  const needsReview = latest.filter(a=>a.result.status==='needs-review').length;
  const label = session.status==='active' ? 'In progress' : coverage.answered===coverage.total ? 'All questions answered' : 'Ended early';
  return {coverage,correct,needsReview,incorrect:latest.length-correct-needsReview,label};
}

export function progressText(progress) {
  if (!progress.coverage) return 'Coverage unavailable; no completion or accuracy is inferred.';
  const {answered,total}=progress.coverage;
  return `${answered}/${total} answered · ${progress.correct} correct on the latest submitted answers${progress.incorrect ? ` · ${progress.incorrect} to revisit` : ''}${progress.needsReview ? ` · ${progress.needsReview} need review` : ''}. Answering every question does not establish mastery.`;
}
