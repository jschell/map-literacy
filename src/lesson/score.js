import { contourLevel } from '../terrain/lesson-pack.js';
import { validatePack } from '../data/validate-pack.js';
import { distanceM } from '../geo/distance.js';
import { createTraceReview } from '../route/trace.js';

const result = (status, reasonCode, metrics = {}) => ({ status, metrics, reasonCode, rubricVersion: 1 });
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Pure rubric scoring. Coordinates/headings are geographic, independent of map rotation. */
export function scoreAnswer(pack, exerciseId, answer) {
  if (!validatePack(pack).valid) throw Object.assign(new Error('Choose a validated lesson pack.'), { code: 'invalid-pack' });
  const exercise = pack.exercises.find((e) => e.id === exerciseId);
  if (!exercise) throw Object.assign(new Error('Choose an exercise in this pack.'), { code: 'missing-exercise' });
  if (answer == null) return result('unanswered', 'missing-answer');
  if (answer.type !== exercise.type) return result('unanswered', 'invalid-answer');
  const reviewed = pack.review.status === 'reviewed' && exercise.review === 'reviewed';
  const decide = (correct, reason, metrics) => reviewed
    ? result(correct ? 'correct' : 'incorrect', reason, metrics)
    : result('needs-review', 'unreviewed-content', metrics);
  const rubric = exercise.rubric;
  if (exercise.type === 'heading') {
    if (!finite(answer.degrees) || answer.degrees < 0 || answer.degrees >= 360) return result('unanswered', 'invalid-answer');
    const difference = Math.abs(answer.degrees - rubric.expectedDeg);
    const angularErrorDeg = Math.min(difference, 360 - difference);
    return decide(angularErrorDeg <= rubric.toleranceDeg, angularErrorDeg <= rubric.toleranceDeg ? 'within-tolerance' : 'outside-tolerance', { angularErrorDeg });
  }
  if (exercise.type === 'endpoint') {
    const c = answer.coordinate;
    if (!Array.isArray(c) || c.length !== 2 || !c.every(finite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) return result('unanswered', 'invalid-answer');
    const endpointErrorM = distanceM(c, rubric.expected);
    // Nanometre rounding allowance only; the authored tolerance is not expanded for display rounding.
    const within = endpointErrorM <= rubric.toleranceM + 1e-9;
    return decide(within, within ? 'within-tolerance' : 'outside-tolerance', { endpointErrorM });
  }
  if (exercise.type === 'contour-elevation') {
    if (!finite(answer.elevationM)) return result('unanswered','invalid-answer');
    const elevationErrorM = Math.abs(answer.elevationM - contourLevel(pack,rubric.featureId));
    const within = elevationErrorM <= rubric.toleranceM + 1e-9;
    return decide(within,within?'within-tolerance':'outside-tolerance',{elevationErrorM});
  }
  const ids = answer.edgeIds;
  if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((id) => typeof id === 'string')) return result('unanswered', 'invalid-answer');
  const uncertain = !reviewed || pack.topology.completeness !== 'complete';
  const routeResult = (correct, reason, metrics = {}) => uncertain
    ? result('needs-review', reviewed ? 'incomplete-topology' : 'unreviewed-content', metrics)
    : result(correct ? 'correct' : 'incorrect', reason, metrics);
  let trace;
  try { trace = createTraceReview(pack).inspect({ startNodeId: rubric.startNodeId, mode: rubric.mode, edgeIds: ids }); }
  catch (error) {
    if (!['missing-edge', 'disconnected', 'mode-mismatch', 'outside-extent', 'blocked-access', 'only-turn', 'forbidden-turn', 'invalid-start'].includes(error.code)) throw error;
    return routeResult(false, error.code);
  }
  const metrics = { lengthM: trace.lengthM, edgeCount: ids.length };
  if (trace.edges.some((edge) => edge.access === 'unknown')) return result('needs-review', 'unknown-access', metrics);
  if (trace.endNodeId !== rubric.endNodeId) return routeResult(false, 'wrong-endpoint', metrics);
  const closed = new Set(exercise.scenario?.closedEdgeIds ?? []);
  if (ids.some((id) => closed.has(id))) return routeResult(false, 'closed-edge', metrics);
  if (rubric.objective === 'max-distance' && trace.lengthM > rubric.maxDistanceM) return routeResult(false, 'distance-exceeded', metrics);
  return routeResult(true, 'valid-route', metrics);
}
