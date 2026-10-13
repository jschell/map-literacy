# Plan 01 — Contracts and validation

Status: active planning; implementation not started.
Dependencies: repository bootstrap.

## Outcome

Make the first browser slice implementable without losing future terrain/routing extension points. Finish design artifacts and acceptance criteria before broad scaffolding.

## Work

- [ ] Define versioned lesson-pack schema, stable identifiers, source manifest, module values, review states and exercise/answer discriminated types; specify when each state is valid.
- [ ] Specify projection, coordinate order, true/map heading, print units, distance/angle tolerances, imported limits and unsupported-version behavior.
- [ ] Define UI states/events/payloads and interaction contracts for pack selection, answer submission, hints, reset, resume and canceled work; distinguish synchronous computations from asynchronous storage/network jobs.
- [ ] Define settings types/defaults/ranges, UI exposure, persistence, flush failure and migration behavior. Specify startup/shutdown and multi-tab concurrency.
- [ ] Select small synthetic cases and one candidate real neighborhood without using a home address. Include bridge crossing, one-way return, boundary/incomplete relation and multiple valid routes.
- [ ] Define initial target desktop/mobile browsers, touch/keyboard/accessibility checks, measurable render/load budgets and actual-size print calibration tolerance.
- [ ] Define exploratory learning rubric, familiarity controls, delayed/unfamiliar tests, participant/privacy approach and success/revision criteria; no causal efficacy claim.
- [ ] Record architecture decisions and dependency/license candidates with version checks; produce contracts and validation documents.

## Acceptance and validation

- [ ] Schema examples cover street, optional terrain, invalid inputs and optional stored routes without implementation-specific UI coupling.
- [ ] Every first-release exercise has a known-answer fixture, tolerance and ambiguous/unknown handling.
- [ ] Lifecycle, storage failures, zero-result success and unconfigured state are explicitly specified.
- [ ] Acceptance matrix maps requirements to automated, browser/manual, physical-print and learner-pilot evidence; pending checks have an owner/action.
- [ ] Plan 02–05 tasks are revised if contracts change; readiness gaps remain explicit.

## Risks and boundaries

Do not turn unresolved learner demographics or provider choices into hidden defaults. This plan is the next work item; the current PR only establishes it.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Define versioned lesson-pack schema, stable identifiers, source manifest, module values, review states and exercise/answer discriminated types; specify when each state is valid.
