const skills = ['heading', 'endpoint', 'route', 'detour'];
const phases = { baseline: 'A', immediate: 'D', delayed: 'E' };
const statuses = ['correct', 'incorrect', 'needs-review', 'unanswered'];
const id = (value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(value);
const number = (value, max) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const fail = (message) => { throw new Error(`Invalid pilot record: ${message}`); };
function shape(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) fail(`expected fields ${keys.join(', ')}`);
}
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const median = (values) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b), n = sorted.length; return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2; };

/** Coordinator-entered observations, not a grader or proof of permissions/equivalence. */
export function summarizePilot(input) {
  shape(input, ['protocolVersion', 'materialsApproved', 'conditionsComparable', 'factualError', 'sets', 'participants', 'items']);
  if (input.protocolVersion !== 1) fail('unsupported protocol');
  for (const key of ['materialsApproved', 'conditionsComparable', 'factualError']) if (![true, false, null].includes(input[key])) fail(key);
  shape(input.sets, ['A', 'B', 'C', 'D', 'E']);
  const packKeys = new Set(), packHashes = new Set();
  for (const [key, set] of Object.entries(input.sets)) {
    if (set === null) continue;
    shape(set, ['packId', 'revision', 'sha256', 'exercises']);
    if (!id(set.packId) || !Number.isSafeInteger(set.revision) || set.revision < 1 || !/^[a-f0-9]{64}$/.test(set.sha256) || !Array.isArray(set.exercises) || set.exercises.length !== 8) fail(`set ${key}`);
    const identity = `${set.packId}:${set.revision}`; if (packKeys.has(identity)) fail('sets must use distinct pack identities'); packKeys.add(identity);
    if (packHashes.has(set.sha256)) fail('sets must use distinct pack hashes'); packHashes.add(set.sha256);
    const ids = new Set();
    for (const exercise of set.exercises) { shape(exercise, ['id', 'skill']); if (!id(exercise.id) || !skills.includes(exercise.skill) || ids.has(exercise.id)) fail('exercise reference'); ids.add(exercise.id); }
    for (const skill of skills) if (set.exercises.filter((e) => e.skill === skill).length !== 2) fail('two exercises per skill required');
  }
  if (!Array.isArray(input.participants) || input.participants.length > 6 || !Array.isArray(input.items) || input.items.length > 144) fail('participant/item limits');
  const people = new Map();
  for (const p of input.participants) {
    shape(p, ['id', 'order', 'paperSet', 'familiarity', 'permissionConfirmed', 'paperMinutes', 'interactiveMinutes', 'delayDays']);
    if (!/^P[0-9]{2}$/.test(p.id) || people.has(p.id) || !['paper-first', 'interactive-first'].includes(p.order) || !['B', 'C'].includes(p.paperSet) || !['unfamiliar', 'somewhat', 'familiar'].includes(p.familiarity) || typeof p.permissionConfirmed !== 'boolean') fail('participant metadata');
    for (const key of ['paperMinutes', 'interactiveMinutes', 'delayDays']) if (p[key] !== null && !number(p[key], key === 'delayDays' ? 365 : 120)) fail(key);
    people.set(p.id, p);
  }
  const seen = new Set();
  for (const item of input.items) {
    shape(item, ['participantId', 'phase', 'exerciseId', 'skill', 'status', 'hints', 'seconds', 'explanation', 'interfaceAssistance', 'headingErrorDeg', 'endpointErrorM', 'routeValid']);
    const set = input.sets[phases[item.phase]];
    if (!people.has(item.participantId) || !set || !skills.includes(item.skill) || !set.exercises.some((e) => e.id === item.exerciseId && e.skill === item.skill) || !statuses.includes(item.status)) fail('assessment reference/status');
    const key = `${item.participantId}:${item.phase}:${item.exerciseId}`; if (seen.has(key)) fail('duplicate first-attempt item'); seen.add(key);
    if (!Number.isSafeInteger(item.hints) || item.hints < 0 || item.hints > 3 || !number(item.seconds, 3600) || typeof item.interfaceAssistance !== 'boolean' || (item.explanation !== null && ![0, 1, 2].includes(item.explanation))) fail('assessment measurements');
    if (item.headingErrorDeg !== null && (item.skill !== 'heading' || !number(item.headingErrorDeg, 180))) fail('heading error');
    if (item.endpointErrorM !== null && (item.skill !== 'endpoint' || !number(item.endpointErrorM, 10000))) fail('endpoint error');
    if (item.routeValid !== null && (!['route', 'detour'].includes(item.skill) || typeof item.routeValid !== 'boolean')) fail('route validity');
  }
  function assessment(rows) {
    const counts = Object.fromEntries(statuses.map((s) => [s, rows.filter((r) => r.status === s).length]));
    const denominator = rows.length - counts['needs-review'];
    const eligible = rows.length === 8 && skills.every((skill) => rows.filter((r) => r.skill === skill).length === 2) && !counts['needs-review'] && rows.every((r) => !r.hints && !r.interfaceAssistance);
    return { observed: rows.length, missing: 8 - rows.length, counts, accuracyDenominator: denominator, accuracy: denominator ? counts.correct / denominator : null, eligible,
      bySkill: Object.fromEntries(skills.map((skill) => { const selected = rows.filter((r) => r.skill === skill); return [skill, { observed: selected.length, correct: selected.filter((r) => r.status === 'correct').length }]; })),
      meanHeadingErrorDeg: mean(rows.map((r) => r.headingErrorDeg).filter((v) => v !== null)), meanEndpointErrorM: mean(rows.map((r) => r.endpointErrorM).filter((v) => v !== null)),
      metricCounts: { headingError: rows.filter((r) => r.headingErrorDeg !== null).length, endpointError: rows.filter((r) => r.endpointErrorM !== null).length, explanation: rows.filter((r) => r.explanation !== null).length },
      routeValidity: { valid: rows.filter((r) => r.routeValid === true).length, invalid: rows.filter((r) => r.routeValid === false).length, unknown: rows.filter((r) => ['route', 'detour'].includes(r.skill) && r.routeValid === null).length },
      meanExplanation: mean(rows.map((r) => r.explanation).filter((v) => v !== null)), meanSeconds: mean(rows.map((r) => r.seconds)), hints: rows.reduce((sum, row) => sum + row.hints, 0) };
  }
  const participants = [...people.values()].map((p) => {
    const results = Object.fromEntries(Object.keys(phases).map((phase) => [phase, assessment(input.items.filter((r) => r.participantId === p.id && r.phase === phase))]));
    const exposureComparable = p.paperMinutes !== null && p.interactiveMinutes !== null && Math.abs(p.paperMinutes - 15) <= 1 && Math.abs(p.interactiveMinutes - 15) <= 1 && Math.abs(p.paperMinutes - p.interactiveMinutes) <= 1;
    const immediateEligible = p.permissionConfirmed && exposureComparable && results.baseline.eligible && results.immediate.eligible;
    const delayedEligible = immediateEligible && p.delayDays !== null && p.delayDays >= 5 && p.delayDays <= 9 && results.delayed.eligible;
    return { id: p.id, order: p.order, paperSet: p.paperSet, familiarity: p.familiarity, exposureComparable, results, immediateEligible, delayedEligible,
      immediateChange: immediateEligible ? results.immediate.accuracy - results.baseline.accuracy : null,
      delayedChange: delayedEligible ? results.delayed.accuracy - results.baseline.accuracy : null };
  });
  const observed = input.items.length, ambiguous = input.items.filter((r) => r.status === 'needs-review').length;
  const assistedParticipants = new Set(input.items.filter((r) => r.interfaceAssistance).map((r) => r.participantId)).size;
  const n = participants.length, immediateComplete = participants.filter((p) => p.immediateEligible).length, delayedComplete = participants.filter((p) => p.delayedEligible).length;
  const improved = participants.filter((p) => p.immediateChange !== null && p.immediateChange > 0).length;
  const medianDelayedChange = median(participants.map((p) => p.delayedChange).filter((v) => v !== null));
  const decision = input.factualError === true ? 'pause-factual-error' : observed && ambiguous / observed > .2 ? 'revise-items' : assistedParticipants >= 2 ? 'revise-interaction' : input.materialsApproved !== true || input.conditionsComparable !== true || input.factualError !== false || Object.values(input.sets).some((s) => s === null) ? 'pending-review' : immediateComplete < 4 ? 'usability-only' : immediateComplete !== n || delayedComplete !== n ? 'retention-unresolved' : improved / n >= .75 && medianDelayedChange > 0 ? 'exploratory-continue-signal' : 'revise-or-pause-learning';
  return { protocolVersion: 1, evidence: 'coordinator-entered; no causal or driving-safety inference', enrolled: n, observedItems: observed, expectedItems: n * 24, missingItems: n * 24 - observed,
    ambiguousItems: ambiguous, ambiguityDenominator: observed, assistedParticipants, immediateComplete, delayedComplete, improvedParticipants: improved, improvementDenominator: n,
    medianDelayedChange, decision, participants };
}
