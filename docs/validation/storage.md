# Transactional storage evidence

The version-1 adapter and learner UI support saved progress/preferences and explicit backup recovery. The chronological follow-ups below describe evidence added after the foundation slice; this is not a released browser/device acceptance claim.

Run `npm test`, `npm run fixtures:check` and `npm run browser:check`. Browser checks use real Chromium IndexedDB in a unique disposable test database; cleanup deletes only that test database. Application recovery never deletes a database.

113 Node tests pass, including record-copy integrity, tampered scores/revisions/hints/attempt links, malformed records, bounded attempts and injected unavailable/quota/canceled opens. Chromium checks verify immutable pack idempotency, changed-revision-content rejection, session/attempt round-trip, competing transaction leases, close/reopen retention, failed-record retention, attempt-removal rejection, abort after a successful request, late collision rollback of a newly queued pack/session, and versionchange close/reload handling. Existing lesson, renderer, print and touch-emulation regressions also pass.

Limits: 1,000 attempts and 16 MiB per session bundle; pack schema and 10 MiB pack limit remain unchanged. Settings persistence, saved-session selection, serialized UI saves, degraded-mode automatic storage recovery and future migration fixtures remain pending. Backup and controller-resume support is described below. The blocked-open callback is implemented but a real multi-tab blocked upgrade remains pending. Quota classification uses an injected DOMException; actual quota exhaustion, private browsing, eviction and real target-device/browser tests remain pending.


## Backup and resume follow-up

118 Node tests and real Chromium checks pass. Version-1 backup records are validated before storage writes, with file byte limits before parsing. Browser tests verify full and per-session export/restore, repeated identical imports, a conflicting record rolling back newly queued packs/sessions and prior-record retention. Controller tests retain hints/attempts, restore feedback, retry/advance/end correctly, discard drafts and tolerate a slower local clock.

UI checks download a real session backup, refresh, restore the original pack and committed feedback, retain counted hints and reject duplicate submission. Malformed and renderer-budget backups preserve the old map/session; a delayed restore is canceled when a new map is selected. Keep downloaded backup files outside browser storage and download again after new progress; unsubmitted answers and review traces are excluded. Restore requires a one-session file and replaces the current memory map/session. No automatic browser save is claimed.

Settings backup/persistence, saved-session selection, serialized UI saves/retries and concurrent-tab UI recovery remain pending. Existing physical/device/quota/eviction and blocked-upgrade limitations still apply.


## Automatic save and recovery follow-up

121 Node tests and real Chromium checks pass. The save writer tests completion-only Saved status, retained leases after failure, single-writer exclusion, explicit copied-session IDs and preflight failure feedback. Browser checks inject a QuotaExceededError into a write transaction, retain the accepted answer, retry successfully and resume it after reload. Startup leaves the map empty until explicit user selection. Two actual tabs compete over one session; the stale writer enters conflict and can save a new session without changing the original. A changed stored version is detected on focus and explicitly reloaded. With IndexedDB unavailable, practice remains in memory and a real session backup download works.

Saved-session headers are paginated at 100 per page; full resume remains validated. Pending/failed changes are guarded before replacement, with explicit file backup available. Existing pack/trace/label/Letter worksheet and touch-emulation regressions pass. These are container Chromium/injected-error checks, not actual device quota, eviction, Safari/Firefox or physical-printer evidence. Settings, future migration fixtures, browser release guidance and deployment selection remain pending.


## View preference follow-up

125 Node tests and Chromium checks pass. Pure tests verify immediate/latest choices, serialized CAS versions, retry retention, visible enum defaults and unsupported-version read-only recovery. Browser checks persist labels/rotation/print scale/orientation across reload, download/restore preference files, reject a competing tab's write, explicitly reload saved choices and retain an invalid stored enum while showing its default. Full backup includes preferences and a preference conflict rolls back newly queued records. Lesson/source/map/Letter/touch checks still pass.

Preferences are display-only and independent of score/rubric revisions. Session files are progress-only; view preference files are separate. The full storage API supports preference records in its version-1 backup envelope. Actual browser/device, quota/eviction and physical-print evidence remains pending. See [setup and removal guidance](../browser-setup.md).

## Database compatibility and upgrade follow-up

125 Node tests, reproducible fixtures and Chromium browser checks pass. Every database open now checks the version, exact store set, key paths, auto-increment flags and attempt index before returning storage APIs. Missing/extra stores, wrong keys and missing/wrong/unique/multi-entry indexes fail explicitly without rewriting records. A newer database version reports that a compatible app is required. Memory practice and file downloads remain available through the existing unavailable-storage UI.

Real IndexedDB fixtures hold an older connection open, observe the blocked callback, cancel the pending open and then release the blocker. The queued upgrade aborts and all existing records survive. An injected unsupported upgrade is rejected before changes. A failing future-migration fixture queues store creation/deletion and clears packs/sessions/attempts, then aborts after a clear request succeeds; reopening version 1 verifies the original schema and complete backup are identical. An injected partial first initialization aborts and a clean retry commits/loads successfully. Eight malformed schemas retain sentinel data after rejection. Newer-version rejection also retains committed progress.

The production adapter still implements version 1 only. The destructive version-2 fixture tests IndexedDB rollback, not a supported migration. Any actual future migration needs its own transformation and preservation fixtures before release. Blocked checks run against real connections in container Chromium; they do not establish Safari/Firefox or actual-device acceptance. Recovery never deletes a database; test cleanup removes only uniquely named fixture databases.


## Synthetic contour v2 records

The existing version-1 stores/backup envelope now accept a validated synthetic contour v2 pack and contour-elevation attempts. The embedded grid/source/revision and recomputed numeric result travel with the pack/session; no store migration or silent conversion of street records occurs. Unit checks cover hint/answer/pack round-trip and fabricated-score rejection. Browser checks cover actual save/reload and restoring an older conflicting backup into a new session without overwriting the completed original. Real terrain sidecars and terrain-v1 imports remain unsupported.
