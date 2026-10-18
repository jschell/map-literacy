const rounded = value => Number(value.toFixed(1));
const errorText=(error,tolerance,unit,label)=>error>tolerance && rounded(error)<=tolerance
  ? `The difference is just beyond the allowed ${tolerance}${unit}. See scoring details for the full precision.`
  : `${label} ${rounded(error)}${unit}; the allowed difference is ${tolerance}${unit}.`;
const reasons = {
  'missing-answer':'Choose or enter an answer before submitting.',
  'invalid-answer':'Use a valid value for this question.',
  'missing-edge':'One of the selected road segments is not in this map.',
  disconnected:'The next segment must connect to your current reference; a crossing alone is not a junction.',
  'mode-mismatch':'Choose segments for the travel mode in the prompt.',
  'outside-extent':'The route leaves this lesson map.',
  'blocked-access':'A segment is marked as blocked for this travel mode.',
  'only-turn':'A turn restriction requires a different next segment.',
  'forbidden-turn':'This sequence makes a prohibited turn.',
  'invalid-start':'Start at the reference supplied in the question.',
  'wrong-endpoint':'Your route has not reached the destination in the prompt.',
  'closed-edge':'Your route uses a closed edge marked with a cross. Retry and edit it to avoid the exercise closure.',
  'distance-exceeded':'Your route is longer than the maximum distance in the prompt.',
  'unknown-access':'Access is unknown on part of the route. An instructor must review it.',
  'incomplete-topology':'Connections are incomplete in this map. An instructor must review the route.',
  'unreviewed-content':'The content has not been approved for automatic scoring.'
};
/** Presentation only: retain full precision and original keys in stored score records. */
export function answerFeedback(exercise, score) {
  const lead = {correct:'Correct.',incorrect:'Try again.',unanswered:'Enter a valid answer before submitting.','needs-review':'This answer needs review.'}[score.status];
  const metrics=score.metrics;
  if (score.status==='unanswered' || score.status==='needs-review') return `${lead} ${reasons[score.reasonCode] ?? 'Check the question with an instructor.'}`;
  let explanation = reasons[score.reasonCode] ?? '';
  if (exercise.type==='heading') explanation=`${errorText(metrics.angularErrorDeg,exercise.rubric.toleranceDeg,'°','Your heading differs from the target by')} Use geographic north, even when the map is rotated.`;
  else if (exercise.type==='endpoint') explanation=errorText(metrics.endpointErrorM,exercise.rubric.toleranceM,' m','Your point differs from the target by');
  else if (exercise.type==='profile-value') explanation=`${errorText(metrics.profileErrorM,exercise.rubric.toleranceM,' m','Your answer differs by')} Count rises for ascent, falls for descent, or final minus starting elevation for net change.`;
  else if (exercise.type==='contour-elevation') explanation=`${errorText(metrics.elevationErrorM,exercise.rubric.toleranceM,' m','Your elevation differs by')} Count from the labeled reference using the contour interval.`;
  else if (exercise.type==='relative-slope') explanation='For the same elevation change, the shorter horizontal distance has the steeper average slope.';
  else if (exercise.type==='terrain-form') explanation='Compare contour bends with H (higher) and L (lower): valley contours point uphill and ridge contours point downhill.';
  else if (score.reasonCode==='valid-route') explanation=`Your connected route reaches the destination${Number.isFinite(metrics.lengthM)?` in ${rounded(metrics.lengthM)} m`:''} and follows the stated rules. Other valid routes may also be accepted.`;
  const next = score.status==='correct' ? 'Continue to the next question, or retry for practice.' : explanation.includes('Retry') ? '' : 'Retry to revise your answer; use a hint if needed.';
  return `${lead} ${explanation} ${next}`.trim();
}
