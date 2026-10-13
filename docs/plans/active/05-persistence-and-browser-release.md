# Plan 05 — Persistence and browser release

Status: active; saved progress/preferences, backup recovery and setup guidance implemented; release acceptance remains pending.
Dependencies: implemented scoring/session slice of 04; address-system and external acceptance remain queued.

## Outcome

Deliver a recoverable local browser application and documented static-host deployment.

## Work

- [x] Implement version-1 IndexedDB initialization/transactions, schema compatibility checks and explicit multi-tab conflict behavior; blocked/canceled/failed upgrade fixtures pass. Actual future migration transformations need version-specific fixtures.
- [x] Implement pack/progress JSON backup APIs with validation and atomic conflict rules, plus explicit single-session UI download/restore and backup guidance.
- [x] Add failed-save retry, unavailable-storage memory/export mode and versionchange/blocked-open recovery messages; Saved is shown only after transaction completion. Actual quota/eviction/device and future migration checks remain pending.
- [x] Document no-build static assets, pinned install/local serve and the implemented external-asset CSP; host publication remains pending.
- [ ] Select hosting using deployment requirements and cost; include reproducible local and hosted setup instructions.
- [ ] Run meaningful automated checks and target-browser keyboard/touch/accessibility/render evidence; container Chromium keyboard/semantics/reflow checks pass. Screen-reader, actual target-browser/device and physical-print acceptance remain pending.
- [x] Document current limitations, backup recovery and manual browser site-data/file removal; no automatic deletion or public release is implied.

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

Automatic-save follow-up: begin, hints, accepted attempts, retry, next and end now commit the locked pack/session/attempt snapshot. Controls prevent overlapping mutations; preflight and transaction failures retain memory progress and a visible not-saved indicator. Retry retains the prior version lease. A bounded 100-item paginated saved-session picker requires explicit selection; no map/location is chosen on startup. Resume reads/validates the committed revision and discards numeric drafts/review traces. Switching pack/session while a write is pending or memory changes lack a backup is guarded; a downloaded backup permits explicit replacement after failure.

Conflicts never use last-writer overwrite: reload latest explicitly discards memory changes, or Save as new session clones committed attempts/hints into fresh session/attempt UUIDs. The original stored session remains. Pack-revision conflicts require a different reviewed revision rather than an ineffective session fork. Focus re-reads detect changed versions; transaction leases remain authoritative. Unavailable/blocked storage permits memory practice and file export. Versionchange/pagehide close connections; BFCache return reopens them. Progress events cover accepted/scored answers, hints, reset and completed/failed saves.

Validation: 121 Node tests and real Chromium browser checks pass. Checks cover commit-only Saved timing, retained lease/retry after injected quota failure, rejected concurrent snapshots, saved-session resume after reload with no automatic map selection, competing real tabs, fork without overwrite, explicit latest-version reload and backup download with IndexedDB unavailable. Existing fixture, map, Letter-print and touch-emulation checks pass.

Preference follow-up: versioned labels/rotation/print-scale/Letter-orientation records save with transaction leases independently of lesson scoring. Rapid changes apply immediately and serialize/coalesce to the latest value. Failed writes retain memory choices for retry/download; explicit reload resolves conflicts. Invalid known values use visible defaults without rewriting storage; unknown record versions remain read-only. Preference JSON files and full progress-backup preference records are supported; progress-only session files stay separate. Full backup preference conflicts roll back the entire import.

Setup/recovery guidance now documents consistent browser origins/profiles, local installation, static asset/CSP requirements, saved-progress/prefs recovery, no automatic location selection, manual site-data removal and pending browser/device/print/release evidence. No host was published.

Validation: 125 Node tests and real Chromium checks pass, including preference serialization/retry, reload/file restore, competing tabs, retained invalid stored values and atomic full-backup preference conflicts. Existing lesson, source, map, print and touch-emulation checks remain covered.

Database compatibility follow-up: opening validates the exact version-1 store/key/index structure before returning APIs. Incompatible structures and newer versions report retained data and a compatible-app recovery path. Real Chromium fixtures verify a blocked open canceled before the blocker closes, unsupported upgrade rejection, rollback of destructive queued migration changes, clean retry after partial initialization, and retained records across eight malformed schema variants. Production supports version 1 only; the version-2 rollback fixture does not implement a migration. Validation: 125 Node tests, reproducible fixtures and full Chromium checks pass.

Keyboard/accessibility follow-up: page shortcuts focus map/lesson/trace targets; native labeled controls provide keyboard alternatives to map taps and answer groups reference exercise context. Keyboard lesson actions recover useful focus after saving, without moving focus after newer navigation or a changed session/version. Real Tab/Enter/Home/arrow-key checks complete all four exercises with retry, hints, missing-answer and closed-edge feedback, session/preference downloads and print activation. Browser semantics, visible outlines, 320/640-pixel reflow and forced-colors emulation pass. Validation: 125 Node tests, reproducible fixtures and full Chromium checks. This is not screen-reader, actual zoom/device or WCAG acceptance; see [accessibility evidence and manual gates](../../validation/accessibility.md).

Next action: prepare reproducible static deployment and select hosting within publication authorization. Screen-reader and actual target-browser/device acceptance require manual evidence. Actual future migration transformations require their own fixtures. Physical print/quota/eviction and real lesson approval remain pending.




