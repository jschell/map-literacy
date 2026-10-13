# Transactional storage evidence

The version-1 adapter is tested independently of the learner UI. Learner sessions are still memory only; this document does not claim automatic progress recovery or a released storage experience.

Run `npm test`, `npm run fixtures:check` and `npm run browser:check`. Browser checks use real Chromium IndexedDB in a unique disposable test database; cleanup deletes only that test database. Application recovery never deletes a database.

113 Node tests pass, including record-copy integrity, tampered scores/revisions/hints/attempt links, malformed records, bounded attempts and injected unavailable/quota/canceled opens. Chromium checks verify immutable pack idempotency, changed-revision-content rejection, session/attempt round-trip, competing transaction leases, close/reopen retention, failed-record retention, attempt-removal rejection, abort after a successful request, late collision rollback of a newly queued pack/session, and versionchange close/reload handling. Existing lesson, renderer, print and touch-emulation regressions also pass.

Limits: 1,000 attempts and 16 MiB per session bundle; pack schema and 10 MiB pack limit remain unchanged. Settings persistence, full backup validation/import/export, saved-session selection, controller resume, serialized UI saves, degraded-mode recovery/export and future migration fixtures are not yet implemented. The blocked-open callback is implemented but a real multi-tab blocked upgrade remains pending. Quota classification uses an injected DOMException; actual quota exhaustion, private browsing, eviction and real target-device/browser tests remain pending.

