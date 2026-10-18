# Plan 10 — Learner usability and website workflows

Status: active; package A merged and hosted behavior verified after PR 64. Package B implemented on a review branch; merge/deployment acceptance pending. Packages C–E remain open. Authorized 2026-10-18 after the critical website review.
Dependencies: existing Plan 02–05 capabilities; supports their unfinished acceptance and Plan 06. Plan 02 remains queued for content/source acceptance. Plan 08 feature expansion stays paused.

## Outcome and boundaries

A learner can understand a task, inspect its map, answer spatially, receive useful feedback, save/resume honestly and print the intended material. A coordinator can inspect draft materials without confusing technical validation with curriculum approval. Preserve map literacy as the goal: orient, locate, connect, return, detour and reconstruct, as described in the [learning sequence](../../learning-sequence.md).

Use vanilla JS and existing renderers/scorers. Preserve topology, provenance, attribution, scale, privacy, local recovery and valid route alternatives. No framework rewrite, new terrain types, address scoring, simulation, accounts, GPS, geocoder dependency or reporting subsystem is required. Do not promote draft materials or claim learning effectiveness from successful software tests.

## Review baseline

Observed on deployed main after PR 62 (merge 8ab018f6e7b3c2b8d510912462c0884f69afb72f), 2026-10-18. These are author observations, not independent usability or curriculum acceptance. Reproduce before changing behavior; layout numbers describe one desktop viewport, not every device.

| Finding | Evidence and consequence | Work package |
|---|---|---|
| Endpoint tasks require coordinates | “Locate A” offered longitude/latitude fields; the default street map had no A marker. This tests coordinate transcription instead of locating. | A |
| Street task clues missing | Detour A→C with BC closed had no visible closure mark; street annotations were absent while print supplied task marks. | A |
| Practice is spread across the page | At 1363×936, initial page had 49 visible buttons, 26 disabled; endpoint question/answer sat hundreds of pixels below the map. Profile chart and question were also separated. | A, C |
| Early end reports completed | Three attempts in a four-item lesson followed by End session produced “completed”; stale route instructions remained. | B |
| Print selector ignores current task | On detour question 4/4, print still selected heading. | B |
| Public and internal controls intermingle | Map browsing, practice, editing, recovery and review compete on one page; prepared lessons and browsed geography appear related when they are separate. | C |
| Feedback and progress expose internals | Raw angularErrorDeg, graph IDs, long coordinate decimals, UUIDs/timestamps and grammatical errors obscure meaning. | B, C |
| Fallback controls overpromise | Street-detail request timed out in the audit while tiles worked; vector label settings remained available despite having no effect. | C |
| Print workflow lacks a full preview | Preview did not show question/credit pages; exports were cumbersome per item; loading a profile lesson changed shared orientation and the offscreen geographic frame. | D |
| Material and lesson entry are unclear | Draft packets are repository-only; “Reviewed pack” can imply curriculum approval; terrain demos are not ordered by prerequisites. | C, D |
| Place navigation is indirect | Search requires an external OSM tab/copy/paste, Enter has no evident action, and World view lacks a clear return to the prior area. | C |

## Ordered work packages

Keep each package a coherent PR (split only for a substantial contract or independently reviewable implementation). A precedes B and C; D uses the task/context boundaries established by B/C. E validates the integrated result. Independent material review can proceed throughout; participant evaluation waits for the practice gate.

### A — Spatial answers, task annotations and the practice workspace (first)

- [x] Put prompt, map, relevant profile/chart, answer controls and feedback in one responsive workspace. On desktop keep related panels adjacent; on mobile stack them without intervening author/recovery controls. Preserve focus, autosave and usable map size; avoid sticky overlays hiding the task or mobile keyboard.
- [x] Add pointer/touch endpoint placement with a visible tentative answer, replace/reset and explicit submission. Provide an equivalent keyboard interaction and meaningful spatial instructions; coordinates may remain advanced details. Accessible choices must not reveal the correct answer or change what is tested.
- [x] Ensure each task has sufficient visible reference labels. Share street exercise annotations between screen and paper where appropriate: route start/end and authored closures, with synthetic changes distinguished from source geometry. Do not display the correct endpoint or instructor answers on learner views.
- [x] Set trace start/end/mode from the task with clear map interaction and keyboard alternatives. Define when traces reset or are explicitly retained between items; prevent accidental stale submission. Explain when a retained route already avoids a closure rather than forcing an unnecessary different route.

Acceptance: a first-time user can locate a referenced point without typing coordinates, see a closure before tracing, construct an accepted route and revise an answer. Run these tasks with pointer and keyboard at desktop/mobile widths, including rotated maps and profile lessons. Confirm letter references and closure identities agree on screen and learner paper, and that answer keys stay hidden. Source connectivity, access rules and scoring tolerances remain unchanged.

Likely touchpoints: index.html, styles.css, src/ui/app.js, src/ui/lessons.js, src/ui/route-trace.js and shared annotation/rendering helpers. Extract shared behavior instead of maintaining divergent screen/print task logic.

### B — Honest session progress, useful feedback and current-task printing

- [x] Specify lifecycle, item coverage and accuracy separately before changing persistence. Ending early must not imply all questions were answered or mastered. Show an honest summary and define pause/resume/end behavior, including repeat attempts and revision-locked sessions.
- [x] Review the [application contract](../../contracts/application-v1.md), storage/import/export and fixtures together. Decide whether coverage can be derived safely or requires a versioned schema/migration. Old “completed” records may have ended early: preserve them and show unknown coverage where reconstruction is unreliable. Never silently relabel all legacy records as fully answered or discard user data.
- [x] Clear stale task instructions after ending/changing lessons. Display human lesson names, covered-item counts and friendly dates; retain IDs and exact values in details/export.
- [x] Replace raw scorer-property feedback with an explanation, units and a useful next action. Round display values appropriately while retaining scoring/storage precision and optional diagnostic detail.
- [x] Default an explicit “Print current question” action to the active task. Retain a clearly labeled manual question override; show selected question, audience and orientation. Keep instructor content separate from learner practice.

Acceptance: end a four-item lesson after three items and observe truthful partial coverage; complete all items with mistakes and see coverage distinguished from accuracy; reload/resume; import representative legacy/current backups and verify no loss or invented mastery. Navigate to detour and print it without reselecting its type; verify intentional override and audience changes. Add meaningful regression tests for these cases, not just coordinate-filled happy paths.

### C — Clear public tasks, entry points and truthful loading states

- [ ] Separate Explore and print, Practice, and Review/edit materials through accessible navigation and progressive disclosure. Keep recovery/conflict actions available when relevant; reduce irrelevant disabled controls in the normal entry flow.
- [ ] Offer a clear street-basics start/resume path with skill/task expectations. Explain that browsing real geography does not automatically create reviewed lessons. Order terrain options by prerequisites: contours, relative slope, then landforms/profiles; describe depressions as a contour variant. Preserve existing capabilities without implying all demos are independently approved.
- [ ] Distinguish technically validated synthetic fixtures, source-backed draft display materials and independently approved curriculum. Replace ambiguous review badges with their actual evidence basis.
- [ ] Consolidate loading/readiness messages without hiding failures. Distinguish usable tile output from optional street-detail readiness, disable/hide ineffective settings, and provide targeted detail retry. Exercise timeout, offline/error and successful retry; do not treat the audit timeout as proof of a universal provider outage.
- [ ] Explain the external place-search flow and support Enter consistently with its existing link. Add a clear return to prior area/reset to example after World view. Integrated geocoding remains a separate policy decision.

Acceptance: a new visitor can choose browsing or practice, start/resume a lesson and find advanced tools without passing through internal review controls. Verify navigation/focus, loading/failure recovery, human-readable saved records and mode-specific controls. Real geography, prepared lessons and draft/approved evidence remain distinguishable.

### D — Reliable print and coordinator workflows

- [ ] Resolve orientation/scale preference ownership explicitly: separate browse and lesson context, or make global effects unmistakable. Define migration/defaults and preserve accepted user settings; loading an unrelated lesson must not silently alter another output context.
- [ ] Preview every generated page with question, audience, orientation and page count, including question and attribution pages. Preserve Letter portrait/landscape fit, readable B&W output, physical scale guidance and screen-rotation versus paper-north behavior.
- [ ] Add whole-lesson/multi-question export using existing rendering. Preserve question-specific markers and closures, ordering, appropriate filenames, attribution and distinct learner/instructor outputs. Do not leak keys through preview, downloads or shared state.
- [ ] Provide a read-only coordinator catalogue for existing Redmond and pilot-v2 draft review packets with revision, limitations and links to learner/instructor material. Draft scoring remains disabled; catalogue access does not approve a pack.

Acceptance: inspect rendered PDFs for heading, endpoint, route, detour and profile tasks in both orientations and both audiences; test a mixed whole-lesson export. Preview page count/content matches the download, credits do not orphan onto an unnecessary page, and reference identities match the screen. Recheck the previously accepted B&W workflow and record physical ruler/device checks separately. All published review assets retain provenance and draft status.

### E — Integrated acceptance and return to learning evaluation

- [ ] Add task-based browser coverage: locate without coordinates, read a closure before tracing, keep map/question usable together, end early honestly, print the current task and recover saved work. Retain meaningful topology, scoring, import/export and migration tests.
- [ ] Record desktop/mobile keyboard, touch, zoom and screen-reader task walkthroughs; perform actual Safari/device checks where available. Automated layout checks do not establish spatial accessibility or device acceptance. Missing access is an explicit blocker with owner/next action, not a passing row.
- [ ] Update user guidance and Plans 03–05 acceptance evidence for changed workflows. Record exact revision, browser/device, task, result and outstanding issues. Keep technical author checks distinct from independent reviews.
- [ ] Re-run the internal screen/paper material walkthrough before recruitment. Resume Plan 02 independent neighborhood source/content review and Plan 06 cross-set content/difficulty review and actual participant work. Retain the [pilot-v2 desk-review concerns](../../reviews/2026-10-18-pilot-materials.md), reviewer/date gates and predeclared revise/continue/pause criteria.

## Delivery and verification after every merge

For each implementation PR: explain the learner-visible outcome, changed contracts/data behavior, validation and unresolved risks. Run the checks appropriate to that slice; broad browser/PDF release checks are required when shared interaction or rendering changes. After the user merges, verify merged SHA, CI, automatic Pages build/deploy and hosted task behavior before advancing the next package. Record failures and repair them before calling that package delivered. Never auto-merge.

Completion requires A–D outcomes demonstrated and E evidence recorded, with manual acceptance gaps explicitly retained in the supporting plans. Do not call the site pilot-ready while critical practice tasks or supported-device accessibility checks fail. Content approval and observed learning remain separate gates even after every software check passes.

## Next action

Package B is prepared for review. After merge, verify CI, automatic Pages deployment and hosted early-end/pause/current-question print behavior, then implement package C. The lifecycle/coverage compatibility decision is recorded in docs/decisions.md; no storage migration is required.


## Package A execution record — 2026-10-18

Implemented responsive map/chart/answer placement, tentative pointer and keyboard endpoint answers, bounded searchable reference selection, shared screen/paper street references and scenario closures, automatic task start/mode and fresh traces for new questions. Retry keeps an editable route; Reset clears it. Task destination marks stay distinct from the trace's current endpoint. Existing topology, tolerances, storage schema and draft-review gates are unchanged. See [practice guidance](../../practice-workspace.md).

Author checks include known-answer annotation/answer-isolation tests and task-based browser placement, rotation, retry/reset, route-context and responsive-layout walkthroughs. The full release suite and final evidence are recorded in the PR. Independent screen-reader, physical touch/Safari and curriculum/learner observations remain pending; simulated browser touch does not close those gates.

Package A merge, CI, deployment and hosted endpoint/detour/profile behavior were verified after PR 64. Package B follows the recorded lifecycle/coverage compatibility decision. C–E are not delivered by these slices.


## Package B execution record — 2026-10-18

PR 64 merged as 669bd20df6008c72e9e4ce5b4cd3ff829636797e; CI and automatic Pages deployment succeeded. Hosted checks verified endpoint selection, a fresh detour trace with two closure marks and Start/End references, and a profile chart/question in the shared workspace. Physical device and independent acceptance remain open.

Package B derives exact recorded coverage separately from latest-answer correctness, labels closed partial sessions Ended early, adds a per-question coverage review, and provides memory-only Pause/Resume while preserving strict v1 records/backups. Legacy closed sessions stay immutable; missing coverage is never inferred from the lifecycle or last-item index. Friendly saved-session labels retain raw IDs/timestamps in details. Feedback uses plain explanations/actions with full-precision diagnostic details; print key rounding stays finer than the rubric or retains exact values. Practice defaults to learner/current-question printing, manual overrides are explicit, and filenames identify the question and audience.

Validation includes legacy/current v1 roundtrips, end-early and all-answered-but-incorrect cases, repeat attempts, pause/reload, last-item legacy gaps and tolerance-boundary display checks. Browser acceptance covers current-question printing, override recovery, audience isolation, backup preservation and saved labels, plus the existing full release checks. Exact results are recorded in the PR. C–E remain undelivered; software tests do not replace independent content, physical Safari/touch, assistive-technology or learning observations.
