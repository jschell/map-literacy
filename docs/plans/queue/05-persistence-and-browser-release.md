# Plan 05 — Persistence and browser release

Status: queued.
Dependencies: 04.

## Outcome

Deliver a recoverable local browser application and documented static-host deployment.

## Work

- [ ] Implement IndexedDB adapter, transactions, version migrations and defined multi-tab behavior.
- [ ] Implement pack/progress JSON export/import with validation, clear replacement/merge rules and backup guidance.
- [ ] Add storage failure/quota and migration recovery; do not display saved confirmation before commit.
- [ ] Provide static build/serve workflow, pinned dependencies, external assets and reviewed CSP.
- [ ] Select hosting using deployment requirements and cost; include reproducible local and hosted setup instructions.
- [ ] Run meaningful automated checks and target-browser keyboard/touch/accessibility/render evidence; document remaining physical-print gate.
- [ ] Publish first-release known limitations and data/progress removal instructions.

## Acceptance and validation

- [ ] Attempts survive reload; failed import/migration does not destroy old records; export/import round-trip preserves revision/provenance.
- [ ] No credentials, household defaults, trackers or learner names are required.
- [ ] Static release works on declared browser matrix; data remains understandable when network/source acquisition is unavailable.
- [ ] Release evidence distinguishes completed checks from pending device/paper checks; no guaranteed offline mode claimed.

## Risks and boundaries

No accounts or sync are required. Deployment choice is open; this plan does not authorize public hosting publication by itself.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Implement IndexedDB adapter, transactions, version migrations and defined multi-tab behavior.
