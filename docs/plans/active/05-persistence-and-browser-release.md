# Plan 05 — Persistence and browser release

Status: active; transactional IndexedDB foundation implemented; learner UI remains memory only.
Dependencies: implemented scoring/session slice of 04; address-system and external acceptance remain queued.

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

Implemented version-1 IndexedDB stores, immutable pack revision insertion, validated atomic pack/session/attempt commits with expected-version leases, immutable attempt checks, exact attempt-order metadata, validated reloads, cancellation, quota/unavailable error normalization and versionchange close/reload notification. Same-content pack insertion is idempotent independent of JSON object-key ordering; changed content at the same revision is rejected. Returned write success occurs only after transaction completion. Late failures roll back pack, session, attempts and metadata together; no database deletion is used as recovery.

Record validation checks reviewed exercise order, revision references, timestamps, counted hints, last-attempt links and recomputed score records before opening writes. Session bundles are limited to 1,000 attempts and 16 MiB, independent of future full-backup limits. Settings/meta stores exist, but settings writes, migrations beyond initial creation, full backup, listing/resume and UI save states remain pending. The current browser UI is still explicitly memory only; no automatic persistence is enabled by this slice.

Validation: 113 Node tests and Chromium browser checks pass. Actual IndexedDB checks cover pack idempotency/conflict, complete attempt round-trip, close/reopen durability, competing writers (one winner), invalid records, cancellation after a successful request, late multi-store rollback and versionchange handling. Quota normalization is tested with an injected DOMException, not an actual full device. See [storage evidence](../../validation/storage.md).

Next action: implement bounded progress backup validation/export/import and controller resume, then connect serialized saves/retries and explicit saved-session selection to learner controls. Keep external print/device acceptance and hosting selection pending.

