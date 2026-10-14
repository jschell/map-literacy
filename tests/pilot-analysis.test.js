import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizePilot } from '../scripts/pilot-analysis.js';

// Invented observations for software tests only; never participant/pilot evidence.
function invented() {
  const skills = ['heading', 'endpoint', 'route', 'detour'];
  const sets = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((key) => [key, { packId: `test-${key}`, revision: 1, sha256: key.toLowerCase().repeat(64), exercises: skills.flatMap((skill) => [0, 1].map((i) => ({ id: `${skill}-${i}`, skill }))) }]));
  const participants = Array.from({ length: 4 }, (_, i) => ({ id: `P0${i + 1}`, order: i % 2 ? 'interactive-first' : 'paper-first', paperSet: i < 2 ? 'B' : 'C', familiarity: 'unfamiliar', permissionConfirmed: true, paperMinutes: 15, interactiveMinutes: 15, delayDays: 7 }));
  const items = participants.flatMap((p) => Object.entries({ baseline: 'A', immediate: 'D', delayed: 'E' }).flatMap(([phase, key]) => sets[key].exercises.map((e, i) => ({ participantId: p.id, phase, exerciseId: e.id, skill: e.skill, status: i < (phase === 'baseline' ? 4 : phase === 'immediate' ? 6 : 5) ? 'correct' : 'incorrect', hints: 0, seconds: 20, explanation: 0, interfaceAssistance: false, headingErrorDeg: e.skill === 'heading' ? 0 : null, endpointErrorM: e.skill === 'endpoint' ? 0 : null, routeValid: ['route', 'detour'].includes(e.skill) ? i < 5 : null }))));
  return { protocolVersion: 1, materialsApproved: true, conditionsComparable: true, factualError: false, sets, participants, items };
}

test('blank kit reports pending review, with no fabricated observations or zero-filled metrics', async () => {
  const input = JSON.parse(await readFile(new URL('../docs/examples/pilot-records.json', import.meta.url), 'utf8'));
  const result = summarizePilot(input);
  assert.equal(result.enrolled, 0); assert.equal(result.observedItems, 0); assert.equal(result.medianDelayedChange, null); assert.equal(result.decision, 'pending-review');
  input.participants.push(invented().participants[0]);
  const empty = summarizePilot(input).participants[0].results.baseline;
  assert.equal(empty.accuracy, null); assert.equal(empty.meanHeadingErrorDeg, null); assert.equal(empty.missing, 8);
});
test('complete invented data computes explicit denominators and only an exploratory continuation signal', () => {
  const result = summarizePilot(invented());
  assert.equal(result.decision, 'exploratory-continue-signal'); assert.equal(result.improvedParticipants, 4); assert.equal(result.improvementDenominator, 4);
  assert.equal(result.medianDelayedChange, .125); assert.equal(result.participants[0].immediateChange, .25);
  const baseline = result.participants[0].results.baseline;
  assert.equal(baseline.accuracyDenominator, 8); assert.equal(baseline.meanExplanation, 0); assert.equal(baseline.meanHeadingErrorDeg, 0); assert.equal(baseline.metricCounts.headingError, 2);
  assert.deepEqual(baseline.routeValidity, { valid: 1, invalid: 3, unknown: 0 });
});
test('missing or late follow-up remains unresolved and preserves missing counts', () => {
  const input = invented(); input.items = input.items.filter((r) => !(r.participantId === 'P04' && r.phase === 'delayed'));
  const result = summarizePilot(input); assert.equal(result.decision, 'retention-unresolved'); assert.equal(result.missingItems, 8); assert.equal(result.delayedComplete, 3);
  const late = invented(); late.participants[0].delayDays = 10; assert.equal(summarizePilot(late).decision, 'retention-unresolved');
});
test('factual errors, excessive ambiguity and interface assistance trigger their revision gates', () => {
  const factual = invented(); factual.factualError = true; assert.equal(summarizePilot(factual).decision, 'pause-factual-error');
  const ambiguous = invented(); for (const r of ambiguous.items.slice(0, 20)) r.status = 'needs-review'; assert.equal(summarizePilot(ambiguous).decision, 'revise-items');
  const assisted = invented(); assisted.items[0].interfaceAssistance = true; assisted.items[24].interfaceAssistance = true; assert.equal(summarizePilot(assisted).decision, 'revise-interaction');
});
test('unanswered trials are distinct from unresolved scoring, missing rows and coached assessments', () => {
  const input = invented(); input.items[0].status = 'unanswered'; input.items[1].status = 'needs-review';
  const baseline = summarizePilot(input).participants[0].results.baseline;
  assert.equal(baseline.counts.unanswered, 1); assert.equal(baseline.counts['needs-review'], 1); assert.equal(baseline.accuracyDenominator, 7); assert.equal(baseline.eligible, false);
  const hints = invented(); hints.items[0].hints = 1; assert.equal(summarizePilot(hints).immediateComplete, 3);
});
test('unknown fields, duplicate attempts, mismatched skills and repeated pack identities are rejected', () => {
  const extra = invented(); extra.participants[0].name = 'not allowed'; assert.throws(() => summarizePilot(extra), /expected fields/);
  const duplicate = invented(); duplicate.items.push(duplicate.items[0]); assert.throws(() => summarizePilot(duplicate), /duplicate/);
  const wrong = invented(); wrong.items[0].skill = 'route'; assert.throws(() => summarizePilot(wrong), /reference/);
  const reused = invented(); reused.sets.D.packId = reused.sets.A.packId; assert.throws(() => summarizePilot(reused), /distinct pack/);
  const hash = invented(); hash.sets.D.sha256 = hash.sets.A.sha256; assert.throws(() => summarizePilot(hash), /distinct pack hashes/);
});
test('fewer than four eligible learners, unequal exposure and unknown material reviews cannot imply success', () => {
  const input = invented(); input.participants.pop(); input.items = input.items.filter((r) => r.participantId !== 'P04'); assert.equal(summarizePilot(input).decision, 'usability-only');
  const exposure = invented(); exposure.participants[0].interactiveMinutes = 10; assert.equal(summarizePilot(exposure).immediateComplete, 3);
  const review = invented(); review.materialsApproved = null; assert.equal(summarizePilot(review).decision, 'pending-review');
});
test('negative retention or fewer than 75 percent improving cannot produce a continuation signal', () => {
  const delayed = invented(); for (const row of delayed.items.filter((r) => r.phase === 'delayed')) row.status = row.exerciseId.startsWith('heading') ? 'correct' : 'incorrect';
  assert.equal(summarizePilot(delayed).decision, 'revise-or-pause-learning');
  const immediate = invented(); for (const row of immediate.items.filter((r) => r.phase === 'immediate' && ['P03', 'P04'].includes(r.participantId))) row.status = ['heading', 'endpoint'].includes(row.skill) ? 'correct' : 'incorrect';
  assert.equal(summarizePilot(immediate).decision, 'revise-or-pause-learning');
});
test('ambiguity threshold is strictly greater than 20 percent of observed trials', () => {
  const input = invented(); input.items = input.items.slice(0, 20);
  for (const row of input.items.slice(0, 4)) row.status = 'needs-review';
  assert.notEqual(summarizePilot(input).decision, 'revise-items');
  input.items[4].status = 'needs-review'; assert.equal(summarizePilot(input).decision, 'revise-items');
});
