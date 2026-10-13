# Plan 01 — Contracts and validation

Status: complete — design contracts only; application implementation not started.
Dependencies: repository bootstrap.

## Outcome

Make the first browser slice implementable without losing future terrain/routing extension points. Finish design artifacts and acceptance criteria before broad scaffolding.

## Work

- [x] Define versioned lesson-pack schema, stable identifiers, source manifest, module values, review states and exercise/answer discriminated types; specify when each state is valid.
- [x] Specify projection, coordinate order, true/map heading, print units, distance/angle tolerances, imported limits and unsupported-version behavior.
- [x] Define UI states/events/payloads and interaction contracts for pack selection, answer submission, hints, reset, resume and canceled work; distinguish synchronous computations from asynchronous storage/network jobs.
- [x] Define settings types/defaults/ranges, UI exposure, persistence, flush failure and migration behavior. Specify startup/shutdown and multi-tab concurrency.
- [x] Select small synthetic cases and one candidate real neighborhood without using a home address. Include bridge crossing, one-way return, boundary/incomplete relation and multiple valid routes.
- [x] Define initial target desktop/mobile browsers, touch/keyboard/accessibility checks, measurable render/load budgets and actual-size print calibration tolerance.
- [x] Define exploratory learning rubric, familiarity controls, delayed/unfamiliar tests, participant/privacy approach and success/revision criteria; no causal efficacy claim.
- [x] Record architecture decisions and dependency/license candidates with version checks; produce contracts and validation documents.

## Acceptance and validation

- [x] Schema examples cover street, optional terrain, invalid inputs and optional stored routes without implementation-specific UI coupling.
- [x] Every first-release exercise has a known-answer fixture, tolerance and ambiguous/unknown handling.
- [x] Lifecycle, storage failures, zero-result success and unconfigured state are explicitly specified.
- [x] Acceptance matrix maps requirements to automated, browser/manual, physical-print and learner-pilot evidence; pending checks have an owner/action.
- [x] Plan 02–05 tasks are revised if contracts change; readiness gaps remain explicit.

## Risks and boundaries

Learner ages, hardware, recruitment and provider selections remain explicit proposals/pending coordination. terrain-v1/directions-v1 have envelope examples but deliberately unsupported payloads until Plans 08/07 finalize them. Plan 02 will implement machine-readable validation; this plan defines the normative contract.

## Execution record

Completed lesson-pack-v1 and application-v1 contracts, synthetic/real-area fixture specification and acceptance/pilot matrix. Initial runtime dependency choice: browser built-ins only for the synthetic core; candidate geographic libraries remain unselected until Plan 02 capability/version/license checks. No dependency version or device compatibility claim is fabricated.

Validation: reviewed required fields, state/event triggers, settings persistence failures, restriction-aware scoring, optional-module rejection, lifecycle/concurrency, source references, budget gates and evidence ownership. Internal Markdown links and exact remote readback verified in PR. Runtime test cases, real-area acquisition, device/print checks and learner pilot are specifications, not executed results.

Next action: Plan 02 source/pack validation implementation. Add executable schemas and machine-readable fixtures before importing any real pack.