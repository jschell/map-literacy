# Plan 04 — Street lessons and scoring

Status: active; scoring and revision-locked memory lesson sessions implemented.
Dependencies: implemented acquisition/validation and renderer slices of 02–03. Real lesson approval and physical/device acceptance remain queued.

## Outcome

Build orientation, endpoint, connected-route and detour lessons with deterministic feedback.

## Work

- [x] Implement revision-locked memory session state and deterministic reviewed exercise order; persistence remains Plan 05.
- [x] Implement heading/orientation and endpoint checks using defined angular/distance tolerances.
- [x] Submit current directed review traces against explicit exercise starts/modes/objectives; accept multiple valid answers.
- [x] Evaluate authored synthetic edge closures without mutating original source records; learner controls remain pending.
- [x] Add counted hints, deterministic reason/metric feedback and known/unknown feedback states; instructor guides remain the manual review aid.
- [ ] Specify local address-system module from documented examples; defer automatic generalized numbering rules.
- [x] Generate matched worksheets and instructor rubrics (implemented in Plan 03).

## Acceptance and validation

- [ ] Tests cover rotated maps, wrap-around headings, tolerance boundaries, one-way return, bridge crossing, no valid answer and multiple routes.
- [ ] Wrong/ambiguous/unreviewed answers receive appropriate feedback; no engine shortest-path exact-match assumption.
- [ ] Refresh/reset behavior follows the contract; interaction and paper versions use the same pack/exercise revision.
- [ ] Usability checks demonstrate completion with keyboard and touch without driving-time interaction.

## Risks and boundaries

An LLM is unnecessary for first-release correctness. Free-text reasoning may initially need instructor review. Exercise scores do not prove real-world learning.

## Execution record

Implemented synchronous pure scoreAnswer for heading, endpoint, directed route and detour answers. Circular angular error, great-circle metre error, inclusive tolerances, directed adjacency/mode/access/restrictions, synthetic closures and explicit maximum-distance objectives produce versioned status/reason/numeric metrics. Valid alternatives are accepted; empty paths require matching endpoints. Missing/malformed answers remain unanswered. Draft content and any partial topology conservatively return needs-review; targeted exclusion proof is deferred. Unknown access never yields correct. Geometry crossings do not create connections; hints/display rotation cannot change the scorer.

Validation: 105 Node tests pass and fixture regeneration is exact. Scoring tests consume the published lesson-case expectations and cover additional malformed answers, distance objectives, crossing identities, revision immutability and draft/partial boundaries. No learner scoring UI, session state, persistence or real curriculum approval is implied.

Memory-session follow-up: begin/end, heading and geographic endpoint controls, current directed trace submission, hints, draft reset, retry and next actions are implemented. Reviewed exercises run in deterministic pack order; draft pack/exercises never start scored practice. Session pack content is cloned and revision locked, attempts are retained on retry and duplicate submissions are rejected. Imports/author edits clear the active UI session; invalid import retains it. Memory sessions have a 1,000-attempt bound and are explicitly lost on refresh or beginning another session. Source data and printable exercise rubrics are unchanged.

Validation: 108 Node tests and Chromium browser checks pass. Browser checks complete all four exercise types, valid/invalid detours, retry/hints, empty endpoint input, keyboard input, touch-emulated submission, refresh/import clearing and draft author-edit invalidation. Physical/device/curriculum and durable recovery acceptance are still pending.

Next action: review the remaining address-system scope and lesson acceptance gaps, then implement recoverable storage in Plan 05.

