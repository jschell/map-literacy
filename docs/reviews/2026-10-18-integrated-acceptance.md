# Integrated author acceptance — practice, print and material review

Date: 2026-10-18 America/Los_Angeles (execution 2026-10-19 UTC). Reviewer: Codex, implementation/material author. This is technical and author walkthrough evidence, not independent curriculum approval, a physical-device observation or a learner result.

## Decision and exact release

The A–D usability repairs are deployed and the tested practice/print paths work. Continue bounded device and material acceptance; do not recruit for the learning comparison yet. Plan 10 remains active for its unperformed manual acceptance. No new terrain, address, directions or reporting capability is justified by this review.

PR 68 merged as `3e794ed298c9829b660ae71cf047032ac4f04f0f`. [Merge foundation CI](https://github.com/jschell/map-literacy/actions/runs/39194797864) and [automatic Pages build/deploy](https://github.com/jschell/map-literacy/actions/runs/39194797871) succeeded. Both ran the packaged browser/PDF release gate. The local review checkout and merged commit have the identical Git tree `857f35a1d94a72c2d1795f45e388c9651983dd13`.

The live site was reloaded after deployment. Hosted checks used remote Chrome through browser controls; its exact browser/OS/device versions were not exposed, so these observations do not count as an intended-device matrix row. Local checks used Chromium **153.0.8010.0**, Playwright **1.62.1**, Node **24.19.0** on the Linux container. Desktop automated viewport was 1280×1000; material reflow was checked at 390×844. Touch/other narrow widths below refer to the existing CI emulation, not actual hardware.

## Hosted continuous learner walkthrough

| Task on the deployed release | Observed result | Boundary |
|---|---|---|
| Set geographic paper to portrait, load profile then street basics | Geographic portrait remained separate from lesson landscape; both persisted after reload | Does not test a native Safari print dialog |
| Begin street basics; submit north = 0° | Correct; saved progress moved to 1/4 answered | Synthetic authored-answer check |
| Locate A with Map reference, without opening coordinates | Correct; 2/4 answered | Native selector interaction, not a screen-reader observation |
| Trace A→B→C using Next directed edge/Add edge | Correct; 3/4 answered | Multiple alternatives remain governed by the unchanged scorer |
| Advance to detour | Fresh empty trace; Start A/End C and two closure marks present | Closure is invented, not a current road condition |
| Inspect selected browser print preview | Two pages, detour question 4, learner audience, landscape, prompt and credits | Browser/printer may override requested paper settings |
| Download whole street lesson, inspect final preview page | Download completed; eight selectable pages; final page retained detour prompt/credits; current task stayed question 4 | Exact preview/download sample equality is established by CI, not inferred from this UI observation |
| Draft A→D→C; pause/resume; end without submitting detour | Pause cleared draft; Ended early showed 3/4 answered and 3 correct; saved version 7 | Unsubmitted drafts are deliberately transient |
| Reload, select the friendly Ended saved record and reopen | Same 3/4 coverage and version 7 | Closed records stay closed; this does not invent a fourth answer |
| Open catalogue and Redmond draft | Six entries with revision/limits and separate note links; Begin disabled; OSM/ODbL/source date visible | Opening/exporting does not approve a packet |
| Prepare whole Redmond learner preview; choose page 8; switch audience | Eight pages; draft warning, ODbL and 2026-10-13 date retained; audience change cleared old canvas/text/link | No source/current-access or independent content sign-off |

## Existing executable task coverage

Package E reuses the task tests added with A–D instead of adding duplicate happy-path tests. Merge CI passed all **250 Node tests**, fixture reproduction, pack validation and the full release suite. New local reruns also passed 250 tests and both pilot generation `--check` commands. The empty revision-2 capture still reports `pending-review`, zero enrolled/observed items and null delayed change.

| Acceptance requirement | Executable evidence | What remains manual |
|---|---|---|
| Locate without coordinates; replace/reset/rotate; keep task evidence adjacent | [Practice workspace checks](../../scripts/practice-workspace-browser-check.js), [keyboard checks](../../scripts/accessibility-browser-check.js) | Spatial instruction with actual assistive technology and intended devices |
| Read closure before tracing; new task clears old route; valid alternatives | Workspace helper plus [scoring tests](../../tests/score.test.js) | Independent clue/road/answer review |
| End early honestly; coverage differs from correctness; current-task printing | [Session progress checks](../../scripts/session-progress-browser-check.js) | Learner understanding and native paper workflow |
| Save/reload/backup/conflicts; navigate without losing drafts | [Release harness](../../scripts/browser-check.js), [public task checks](../../scripts/public-tasks-browser-check.js) | Real storage pressure, private mode and target browsers |
| Paper settings migration; every preview page; whole export; audience isolation | [Print workflow checks](../../scripts/print-workflows-browser-check.js) | Ruler, printer and intended-device PDF inspection |

Sequential Tab/Enter/Home/arrow-key tests complete four street tasks with visible focus and meaningful feedback. Pointer/keyboard placement, rotation, desktop adjacency, mobile profile stacking, touch emulation, 320/640px reflow and forced-colors checks pass. Actual 200%/400% browser zoom, screen-reader announcements and physical touch remain unperformed. SVG/native-control semantics alone do not establish a nonvisual equivalent of the spatial task.

## Internal material walkthrough after the UI repair

Used the catalogue under the packaged `/map-literacy/` prefix/meta CSP. For every authored question, selected learner output in labeled and partial variants, checked the matching prompt, absence of instructor answer blocks/arrows/X marks, and closure marks for detours. All **44 questions × two variants = 88 selected learner print views** passed. These checks inspect the print DOM; draft screen review remains a map inspection with scored questions disabled. Active question interaction was exercised on the four-item synthetic fixture, not by overriding draft gates for all forty pilot items. Every packet remained draft and unable to begin a scored session; no page errors or checked 390px overflow occurred.

Then exported the following complete documents at 1:1,000. This rerun covers learner-landscape and instructor-portrait, not every audience/orientation combination for every pack. Package D separately tested all four combinations for the street fixture and representative profile output. Exact identities/hashes remain in the existing [Redmond manifest](../materials/redmond-r1/instructor-manifest.json) and [pilot material index](../materials/pilot-v2/material-index.json); no content, geometry, scoring or capture flags changed.

| Packet | Items | Learner landscape pages | Instructor portrait pages |
|---|---:|---:|---:|
| Redmond Cleveland/Brown r1 | 4 | 8 | 8 |
| Pilot A r2 | 8 | 16 | 16 |
| Pilot B r2 | 8 | 16 | 16 |
| Pilot C r2 | 8 | 16 | 16 |
| Pilot D r2 | 8 | 16 | 16 |
| Pilot E r2 | 8 | 16 | 16 |

Twelve downloads contained 176 pages in total. To reproduce: Review/edit materials → catalogue → open each packet; choose 1:1,000/labeled, learner/landscape then instructor/portrait, and Download whole-lesson PDF. Inspect each page using PDF preview. For the 88 selected-view checks, choose each question in both labeled and partial learner views before exporting.

Poppler-rendered samples from all six packets were visually inspected: A/B heading/detour, C's revised headings/route, D's revised endpoints/closure, E's revised route/detours, and Redmond map/question/key/credit pages. The sampled references, closure marks, writing space, draft flags and credits were present without a new layout blocker. This is sampled visual review, not visual approval of all 176 pages or physical readability. Existing profile landscape output uses a third answer-space/credit page to keep the chart legible; it is not a needless credits-only page.

The [earlier pilot desk-review concerns](2026-10-18-pilot-materials.md) still apply. A has 7 nodes/9 roads versus E's 10/14; E's detours each need at least four edges. B/C bearing/path-length proxies do not establish equal difficulty. Shared street vocabulary, motifs and D's reversed C→G task still need outside judgment. Redmond is only an orient/locate draft with unknown access/partial topology; it does not deliver the full six-stage neighborhood sequence. Source replay is not a genuinely newer-source comparison.

## Outstanding gates, owners and next actions

Owner roles below are requested execution roles, not a claim that someone has accepted an assignment. The maintainer coordinates access/people; Codex can prepare and incorporate actual observations. No reminders, invitations or recruitment were sent.

| Gate / plan | State and concrete blocker | Owner role / next action |
|---|---|---|
| Safari/macOS/iPadOS, Firefox and practical tablet sizing / 03–05 | Pending: no intended hardware/browser matrix observations available | Maintainer/device operator selects exact devices/versions; repeat the hosted learner sequence, resume, file restore and native printing; record failures and latency |
| Actual touch and keyboard / 03–05 | Pending: emulation and remote controls cannot establish physical targeting | Device operator repeats endpoint placement, route editing, focus/scroll and reverse Tab without assistance |
| Screen reader and actual zoom / 05 | Pending: no assistive-technology or real zoom observations recorded | Accessibility reviewer records AT/browser/OS, prompt/region navigation, save/score announcements, 200%/400% zoom and spatial-task equivalent; revise if blocked |
| Both-orientation worksheet calibration / 03 | Pending: no new ruler/printer evidence | Printer operator follows [physical check](../validation/physical-print-check.md); measure both axes/bar within 1%, inspect labels and separate learner/teacher output; prior geographic B&W feedback stays scoped |
| Real quota/eviction/private mode / 05 | Pending: only injected failure paths tested | Device operator records save/reload/backup behavior in a disposable profile; retain backups and avoid deleting real records |
| Redmond source/content/access and refresh / 02,04 | Pending: no independent reviewer/date or newer source snapshot | Independent source/content reviewer inspects all four items and exclusions; maintainer supplies retained checkpoint; resolve route uncertainty separately and compare a genuinely newer acquisition |
| Forty pilot items and cross-set comparability / 06 | Pending: no independent sign-off; density/load/overlap confounds remain | Independent curriculum reviewer completes [checklist](../materials/pilot-v2/review-checklist.md) and explicitly revises or justifies differences; advance hashes/revisions together if changed |
| Permissions, familiarity, exposure, transfer and retention / 06 | Pending: no participants/observations | Maintainer/instructor coordinates only after preceding gates; use existing permission/capture procedure and 5–9-day follow-up |

Apply the [predeclared protocol gates](../learning-pilot.md#predeclared-gates) unchanged: factual errors pause use; more than 20% needs-review recorded assessment trials triggers revision; interface assistance for at least two learners triggers interaction revision. Missing material/equivalence approval stays pending-review. Participant continuation thresholds cannot be applied to zero observations. No safer-driving or learning-effectiveness claim follows from this review.

The next useful work is executing these checks and resolving material judgments. Continue preparation within existing packets when feasible; do not create new capabilities to fill the evidence gap. Plan 10's manual acceptance and Plans 02–06 remain open.
