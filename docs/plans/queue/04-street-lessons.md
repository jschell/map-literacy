# Plan 04 — Street lessons and scoring

Status: queued.
Dependencies: 02, 03.

## Outcome

Build orientation, endpoint, connected-route and detour lessons with deterministic feedback.

## Work

- [ ] Implement session state and reproducible exercise selection from reviewed/synthetic content.
- [ ] Implement heading/orientation and endpoint checks using defined angular/distance tolerances.
- [ ] Implement route tracing with connectivity constraints and explicit route objectives; accept multiple valid answers.
- [ ] Implement clearly labeled synthetic edge closures for detours; never mutate original source records.
- [ ] Add hints, explanations, instructor review and known/unknown feedback states.
- [ ] Specify local address-system module from documented examples; defer automatic generalized numbering rules.
- [ ] Generate matched worksheets and instructor rubrics.

## Acceptance and validation

- [ ] Tests cover rotated maps, wrap-around headings, tolerance boundaries, one-way return, bridge crossing, no valid answer and multiple routes.
- [ ] Wrong/ambiguous/unreviewed answers receive appropriate feedback; no engine shortest-path exact-match assumption.
- [ ] Refresh/reset behavior follows the contract; interaction and paper versions use the same pack/exercise revision.
- [ ] Usability checks demonstrate completion with keyboard and touch without driving-time interaction.

## Risks and boundaries

An LLM is unnecessary for first-release correctness. Free-text reasoning may initially need instructor review. Exercise scores do not prove real-world learning.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Implement session state and reproducible exercise selection from reviewed/synthetic content.
