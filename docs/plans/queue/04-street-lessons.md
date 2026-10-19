# Plan 04 — Street lessons and scoring

Status: queued for external lesson/device acceptance; local address-system design specified but not implemented. Reviewed core scoring, sessions and recovery are available.
Dependencies: implemented acquisition/validation and renderer slices of 02–03. Real lesson approval and physical/device acceptance remain queued.

## Outcome

Build orientation, endpoint, connected-route and detour lessons with deterministic feedback.

## Work

- [x] Implement revision-locked memory session state and deterministic reviewed exercise order; persistence remains Plan 05.
- [x] Implement heading/orientation and endpoint checks using defined angular/distance tolerances.
- [x] Submit current directed review traces against explicit exercise starts/modes/objectives; accept multiple valid answers.
- [x] Evaluate authored synthetic edge closures without mutating original source records; learner trace submission is implemented.
- [x] Add counted hints, deterministic reason/metric feedback and known/unknown feedback states; instructor guides remain the manual review aid.
- [x] Specify local address-system module from documented examples; draft unincorporated King County NE context and synthetic cases prepared. Generalized numbering remains deferred; address contracts/UI/scoring are not implemented.
- [x] Generate matched worksheets and instructor rubrics (implemented in Plan 03).

## Acceptance and validation

- [x] Tests cover rotated maps, wrap-around headings, tolerance boundaries, one-way return, bridge crossing, no valid answer and multiple routes.
- [x] Wrong/ambiguous/unreviewed answers receive appropriate deterministic feedback; no engine shortest-path exact-match assumption.
- [x] Refresh/reset behavior follows the contract; interaction and paper versions use the same pack/exercise revision.
- [ ] Usability checks demonstrate completion with keyboard and touch without driving-time interaction.

## Risks and boundaries

An LLM is unnecessary for first-release correctness. Free-text reasoning may initially need instructor review. Exercise scores do not prove real-world learning.

## Execution record

Implemented synchronous pure scoreAnswer for heading, endpoint, directed route and detour answers. Circular angular error, great-circle metre error, inclusive tolerances, directed adjacency/mode/access/restrictions, synthetic closures and explicit maximum-distance objectives produce versioned status/reason/numeric metrics. Valid alternatives are accepted; empty paths require matching endpoints. Missing/malformed answers remain unanswered. Draft content and any partial topology conservatively return needs-review; targeted exclusion proof is deferred. Unknown access never yields correct. Geometry crossings do not create connections; hints/display rotation cannot change the scorer.

Validation: 105 Node tests pass and fixture regeneration is exact. Scoring tests consume the published lesson-case expectations and cover additional malformed answers, distance objectives, crossing identities, revision immutability and draft/partial boundaries. No learner scoring UI, session state, persistence or real curriculum approval is implied.

Memory-session follow-up: begin/end, heading and geographic endpoint controls, current directed trace submission, hints, draft reset, retry and next actions are implemented. Reviewed exercises run in deterministic pack order; draft pack/exercises never start scored practice. Session pack content is cloned and revision locked, attempts are retained on retry and duplicate submissions are rejected. Imports/author edits clear the active UI session; invalid import retains it. Memory sessions have a 1,000-attempt bound and are explicitly lost on refresh or beginning another session. Source data and printable exercise rubrics are unchanged.

Validation: 109 Node tests and Chromium browser checks pass. Browser checks complete all four exercise types, valid/invalid detours, retry/hints, empty endpoint input, keyboard input, touch-emulated submission, refresh/import clearing and draft author-edit invalidation. Physical/device/curriculum and durable recovery acceptance are still pending.

Address-design follow-up: official county handout (visible November 2020 date, reviewed 2026-10-13) and address-grid metadata establish an explicitly bounded unincorporated King County northeast study context. The [address lesson specification](../../address-lessons.md) distinguishes postal labels from jurisdiction, directional/type/side clues from exact entrance geometry, and authored candidate scoring from generalized address arithmetic. Nine invented [design cases](../../examples/address-design-cases.json) cover directional ambiguity, rotation, missing/wrong answers, unknown jurisdiction, text-valued numbers and alternative entrances. These are draft expectations, not executable lesson packs or evidence of implemented scoring. Real source artifacts/hashes, geometry, targets, redistribution permission and curriculum review remain pending.

Validation: primary-source scope/date/pages were checked; design-case IDs/references and expected-result consistency pass a local check; documentation links resolve. Existing application/schema/scoring are unchanged. Current core keyboard/touch/recovery evidence is documented under Plan 05; it does not establish address-learning transfer or device/curriculum acceptance.

Reconciliation through PR 45: the automated scoring fixtures, session revision-lock/reset tests and subsequent storage/browser recovery checks support the two checked acceptance items above. See [scoring tests](../../../tests/score.test.js), [session tests](../../../tests/session.test.js) and [storage evidence](../../validation/storage.md). This is automated evidence for the existing street capability; keyboard/touch target-device and curriculum acceptance remain open.

Next action: complete the repaired orient/locate/connect/detour workflows on intended devices and independently review existing street materials under Plans 02/06. Address design remains parked unless a concrete material/usability finding justifies changing contracts and implementation; no address-v1 capability is supported. This plan is not complete.

## Integrated usability acceptance update — 2026-10-18

Plan 10 A–D is deployed through PR 68 (merge 3e794ed298c9829b660ae71cf047032ac4f04f0f), with successful CI/automatic Pages publication and hosted task/print/recovery checks. The [integrated author acceptance record](../../reviews/2026-10-18-integrated-acceptance.md) gives exact environment/revision, current task-test evidence, six-packet screen/PDF walkthrough, pending gate owners and next actions. Spatial answers, shared closure/reference marks, honest partial progress, current/whole printing and separate paper preferences supersede older workflow descriptions above. Existing 250-test/full packaged checks support technical behavior only.

This plan remains queued: actual target-browser/device, screen-reader/zoom and physical-paper acceptance are not supplied by these checks. Follow the record’s relevant manual rows; preserve historical user B&W feedback within its reported scope. Independent content/source review and participant outcomes remain separate. Prioritize these checks and reviewed street materials over the unimplemented address or other capability proposals.
