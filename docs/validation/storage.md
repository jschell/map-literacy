# Transactional storage evidence

The version-1 adapter is tested independently of the learner UI. Learner sessions remain memory only with explicit backup download/restore; this document does not claim automatic progress recovery or a released storage experience.

Run `npm test`, `npm run fixtures:check` and `npm run browser:check`. Browser checks use real Chromium IndexedDB in a unique disposable test database; cleanup deletes only that test database. Application recovery never deletes a database.

113 Node tests pass, including record-copy integrity, tampered scores/revisions/hints/attempt links, malformed records, bounded attempts and injected unavailable/quota/canceled opens. Chromium checks verify immutable pack idempotency, changed-revision-content rejection, session/attempt round-trip, competing transaction leases, close/reopen retention, failed-record retention, attempt-removal rejection, abort after a successful request, late collision rollback of a newly queued pack/session, and versionchange close/reload handling. Existing lesson, renderer, print and touch-emulation regressions also pass.

Limits: 1,000 attempts and 16 MiB per session bundle; pack schema and 10 MiB pack limit remain unchanged. Settings persistence, saved-session selection, serialized UI saves, degraded-mode automatic storage recovery and future migration fixtures remain pending. Backup and controller-resume support is described below. The blocked-open callback is implemented but a real multi-tab blocked upgrade remains pending. Quota classification uses an injected DOMException; actual quota exhaustion, private browsing, eviction and real target-device/browser tests remain pending.


## Backup and resume follow-up

118 Node tests and real Chromium checks pass. Version-1 backup records are validated before storage writes, with file byte limits before parsing. Browser tests verify full and per-session export/restore, repeated identical imports, a conflicting record rolling back newly queued packs/sessions and prior-record retention. Controller tests retain hints/attempts, restore feedback, retry/advance/end correctly, discard drafts and tolerate a slower local clock.

UI checks download a real session backup, refresh, restore the original pack and committed feedback, retain counted hints and reject duplicate submission. Malformed and renderer-budget backups preserve the old map/session; a delayed restore is canceled when a new map is selected. Keep downloaded backup files outside browser storage and download again after new progress; unsubmitted answers and review traces are excluded. Restore requires a one-session file and replaces the current memory map/session. No automatic browser save is claimed.

Settings backup/persistence, saved-session selection, serialized UI saves/retries and concurrent-tab UI recovery remain pending. Existing physical/device/quota/eviction and blocked-upgrade limitations still apply.

