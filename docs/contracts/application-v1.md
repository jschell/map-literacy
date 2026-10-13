# Application v1 contracts

## Synchronous and asynchronous boundaries

validatePack(value) returns {valid,errors:[{path,code,message}]} synchronously after bounded parsing; errors ordered by JSON path/code. project/inverseProject and scoreAnswer are synchronous pure functions with no DOM/storage access. renderMap(model,view) is synchronous DOM preparation; readiness emitted after a paint boundary.
readImport(file,signal), storage.open/load/commit/export and source.prepare use Promises. They resolve only after final validation/transaction completion, not after an individual IndexedDB request. All async jobs carry jobId; canceled/stale result must never update UI or persistence. Cancellation before commit aborts work; after commit the committed record remains and UI reports committed rather than pretending undo.

## UI states

| State | Trigger and allowed behavior |
|---|---|
| starting | Page start/open storage; no practice |
| empty | No selected supported pack; select/import action |
| loading | Pack read/validate/render; selection can cancel previous job |
| ready | Supported reviewed pack rendered; can begin session |
| practicing | Current exercise active; answer/hint/reset |
| feedback | Result shown; retry/next/end |
| preview-only | Draft or no reviewed exercises; inspect/print draft watermark, no scored session |
| storage-degraded | Persistence unavailable; memory session with export and persistent not-saved indicator |
| blocked | Import/core error prevents selected pack; return to selection/retry |

Zero exercises is successful preview-only with "No reviewed exercises are available." No location default. Cancel returns prior ready/empty state, not error. Invalid import leaves prior selection intact. Unknown correctness feedback uses "This answer needs review." Correct/incorrect feedback includes deterministic reason and metrics without claiming driving skill.

Session={id:UUID,version:nonnegative safe integer,packId,packRevision,exerciseOrder:ID[],index,answers:map,hintCounts:map,startedAt,updatedAt,status:active/completed}. UUID via browser crypto; revision locked for session. Selection of a newer pack offers new session; old attempts retain old rubric/revision. Reset clears current draft answer only; committed attempts remain. Retry creates another attempt. End marks session completed after save; failed save leaves memory state and visible pending indicator.

## Event contract

Internal events are dispatched only when transitions complete. Payloads contain IDs/metrics, never raw location tracks.

| Event | Payload | Fire condition |
|---|---|---|
| pack-selected | {jobId,packId,revision} | Valid selection begins loading |
| pack-ready | {jobId,packId,revision,mode:practice/preview} | Matching render completed |
| answer-submitted | {sessionId,exerciseId,answer,attemptId} | Valid answer type accepted once; double-submit disabled |
| answer-scored | {attemptId,result} | Pure scorer completed |
| hint-shown | {sessionId,exerciseId,hintIndex} | Next available hint shown |
| save-completed | {jobId,recordId,version} | Transaction complete |
| save-failed | {jobId,recordId,code} | Abort/error; memory copy retained |
| session-reset | {sessionId,exerciseId} | Unsaved current answer cleared |
| job-canceled | {jobId} | Work canceled before commit |
| storage-changed | {store,key,version} | Other-tab committed notification, then re-read |

No unlimited event log; persisted attempts are explicit records. Payload validation is part of tests. Programmatic callbacks follow the same semantics as UI actions.

## Settings

Settings record is versioned independently from pack; all settings exposed in UI. Changes take effect in memory immediately and commit asynchronously in one settings transaction. Failure restores no hidden default; keep pending value, display "Changes are not saved", and offer retry/export. These preferences never change scoring rubric.

| Key | Type/default/range |
|---|---|
| units | metric; metric/imperial; display only |
| labels | labeled; labeled/partial/blank |
| mapRotationDeg | number 0; [0,360), normalize interactive steps; stored finite |
| reducedMotion | system; system/on/off |
| printScale | integer 5000; 5000/10000 |
| showInstructorAnswers | boolean false; separate output, never learner worksheet |

Margins, label minimum and paper are fixed v1 preset; not configurable settings. An unavailable stored enum produces validated-default plus visible migration note; never overwrite old settings without transactional migration. Hint limit/answer tolerances belong to reviewed exercises, not preferences.

## Storage, backup and concurrency

IndexedDB database map-literacy, integer DB version 1. Stores: packs key [id,revision]; sessions key id; attempts key id; settings key singleton; meta key name. Pack revisions immutable. Attempt={id,sessionId,packId,packRevision,exerciseId,answer,result,hintsUsed,submittedAt}. Attempt+session update in one readwrite transaction; version checked in the same transaction; conflict returns conflict and asks to reload or fork a new session, never last-writer overwrite.

Identical pack id/revision/content import is idempotent. Same id/revision but different validated content rejects revision-conflict. New revision added without deleting old revisions/attempts. No arbitrary overwrite/merge.

Progress backup envelope={backupVersion:1,exportedAt,packs:[],sessions:[],attempts:[],settings:{}}. Validate entire backup, references/limits and internal revision consistency before one transaction. Existing record identical is skipped; any conflicting ID fails whole import. Export includes all referenced pack revisions. Backup max 50 MiB, 10,000 attempts, 100 sessions, 20 packs; beyond limit require per-session export before memory parsing.

Multi-tab safety comes from IDB transaction/version checks, not notifications. BroadcastChannel is optional notification only; fallback re-read on focus. On versionchange close database and display reload-needed. Blocked upgrade waits with clear close-other-tab action. Upgrade migrations run within upgrade transaction; abort retains original database. Never delete database as automatic recovery.

"Saved" means transaction completed; not a promise against browser eviction/disk failure. Export is an explicit user action; no silent network backup. Quota/permission errors preserve memory data for export and keep old records. Private mode/eviction require user-facing backup guidance.

## Lifecycle

1. Load external assets and feature-detect ES modules, SVG, File/Blob, crypto and IndexedDB.
2. Open/migrate IDB; blocked migration prompts close other tabs; error enters memory mode.
3. Load/validate settings, then user-selected pack/session; no source fetch by default.
4. Check pack/rubric revision, validate and render; resume only matching content.
5. Present ready/preview/empty and pending-save status.

Persist each accepted attempt, hint and preference change immediately through serialized transactions. Never rely on unload for durability. pagehide stops jobs/listeners and closes DB after pending normal tasks where possible; termination may interrupt writes, so only committed records are resumed. Relaunch ignores unfinished memory drafts. Do not prevent closing as a substitute for incremental persistence.

Core error codes: invalid-import, unsupported-version, unsupported-capability, extent-unsupported, revision-conflict, storage-unavailable, storage-full, migration-blocked, conflict, canceled, no-reviewed-exercises. Show a concise action (choose valid pack, export/retry, close other tabs, reload) and retain prior usable state.


## Implemented map-review trace boundary

Transient trace={startNodeId,mode:walk/drive,edgeIds:ID[0..1000]}; initially no start or edges. createTraceReview builds indices from a validated pack. inspect resolves directed adjacency, mode, extent, blocked access and forbidden/only sequence history, and returns geometry, endpoint, source distance sum and review warnings. Unknown access, draft review and partial topology remain warnings, not approval. choices keeps known violations disabled with an explanation. No connection is inferred from feature crossings.

Append failure retains the old trace. Native start/mode/edge controls and add/remove/clear actions are the keyboard alternative to map taps. A tap requires one usable outgoing edge on the selected feature; ambiguity remains explicit. Mode/start changes clear edges; pack import resets all trace state. Label changes preserve trace geometry but refresh its draft-review warning. The print overlay is opt-in, monochrome and transformed through the same fixed-scale geographic model. Trace state is excluded from standalone pack export and has no persistent record yet. Scoring, exercise endpoints/objectives/closures, provider directions and durable answers remain later contracts.

## Implemented exercise print documents

Print output is map/learner/instructor, initially map, with an explicit exercise selection from the current pack. Map output may include the review trace/heading. Learner/instructor output uses exercise-specific annotations and ignores transient trace and screen heading controls. Learner content excludes rubric answers and authored hints; instructor content includes manual answer criteria, heading/endpoint answers and route/detour rules without a generated unique route. Problem endpoints and synthetic closures appear in both outputs. Source geometry/topology and learner records are unchanged.

One fixed-scale Letter map page is followed by independently paginated question/credit pages of the same orientation. Body text is 10pt, headers 11/12pt and footers 8pt. Pagination measures actual DOM text at physical page width, splits oversized literal text without dropping characters and preserves UTF-16 surrogate pairs. Every document retains full source attribution/license/date/URL, pack revision, page count and draft status. Bounds: one exercise, 64 text pages, 100,000 text characters, 1,000 closure edges. Exceeding limits or off-map exercise answers/closures reports a print error, clears stale output and disables the button; it never silently clips or resizes the geographic map. Generic map-only footer behavior remains unchanged.

Changing audience/exercise/orientation replaces the print document, and imports return to map output. Text pagination is rebuilt when the pack or print content changes. Print-mode resizing does not replace the paper SVG. Scoring, answers/progress persistence, curriculum approval and actual-printer calibration remain separate work.
