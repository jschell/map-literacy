# Plan 05 — Persistence and browser release

Status: active; transactional storage, validated backups and session file restore implemented; automatic UI saves remain pending.
Dependencies: implemented scoring/session slice of 04; address-system and external acceptance remain queued.

## Outcome

Deliver a recoverable local browser application and documented static-host deployment.

## Work

- [ ] Implement IndexedDB adapter, transactions, version migrations and defined multi-tab behavior.
- [x] Implement pack/progress JSON backup APIs with validation and atomic conflict rules, plus explicit single-session UI download/restore and backup guidance.
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

Record validation checks reviewed exercise order, revision references, timestamps, counted hints, last-attempt links and recomputed score records before opening writes. Session bundles are limited to 1,000 attempts and 16 MiB, independent of future full-backup limits. Settings/meta stores were created in the foundation slice; backup/resume support follows below. Settings writes, migrations beyond initial creation and automatic UI save states remain pending. The current browser UI is still explicitly memory only; no automatic persistence is enabled by this slice.

Validation: 113 Node tests and Chromium browser checks pass. Actual IndexedDB checks cover pack idempotency/conflict, complete attempt round-trip, close/reopen durability, competing writers (one winner), invalid records, cancellation after a successful request, late multi-store rollback and versionchange handling. Quota normalization is tested with an injected DOMException, not an actual full device. See [storage evidence](../../validation/storage.md).

Backup/resume follow-up: version-1 UTF-8 progress envelopes enforce 50 MiB/20 packs/100 sessions/10,000 attempts, full revision/reference/score validation and unique IDs. IndexedDB full/per-session export uses a consistent read transaction; full import is atomic and rejects any differing existing record or attempt order. Identical records are idempotent. Settings must currently be empty; unsupported settings fail explicitly instead of being dropped.

The controller resumes committed attempts/hints and the locked revision, discards unfinished answer drafts, presents prior committed feedback and keeps completed sessions completed. Timestamp handling prevents a slower local clock from corrupting resumed records. Browser controls download one-session backups and restore exactly one session with its pack. Restore validates before replacing state, rejects renderer budgets and cancels stale reads; invalid restore retains the prior map/session. These controls do not silently write IndexedDB or claim automatic Saved status.

Validation: 118 Node tests, fixture regeneration and Chromium browser checks pass, including full/per-session backup round-trip, idempotent restore, conflicting import rollback, controller retry/next/end after resume, malformed/oversized UTF-8 files, downloaded session restore after refresh, retained hints, duplicate-submit prevention and invalid/render-budget restore retention.

Next action: connect serialized IndexedDB saves/retries, explicit saved-session selection, concurrent-tab reload/fork and degraded-mode export to learner controls. Settings persistence, future migration fixtures, external print/device acceptance and hosting selection remain pending.


