# Plan 03 — SVG rendering and print

Status: active; initial projection, map review UI and fixed-scale print renderer implemented.
Dependencies: 01 and the implemented acquisition/validation slice of 02; real lesson approval remains in 02.

## Outcome

Render interactive and monochrome paper variants from shared geographic data. The initial print target is US Letter (8.5 x 11 inches), selectable portrait or landscape; other paper sizes are later goals.

## Work

- [x] Implement calibrated geographic-to-display/paper transforms and extent clipping.
- [x] Draw road hierarchy, landmarks, water, crossings, selected one-way symbols and SVG interaction layers.
- [x] Separate labels from geometry; use imported manual placement overrides and deterministic initial collision policy (in-app label editing/export now implemented).
- [x] Create labeled/partial/blank views, heading arrows, road selection and route overlays with native keyboard controls and container touch-emulation evidence; actual target-device validation remains below.
- [x] Complete external print CSS and Letter portrait/landscape presets, questions/instructor pages, scale bar, north arrow, source date and attribution. Both orientations now exist in schema/model/UI/CSS with regression coverage; selected exercise learner/instructor sheets and measured text pagination are now implemented.
- [x] Measure bounded-pack performance and inspect container Chromium PDF output; provide actual-paper calibration procedure. Actual target-browser/device validation remains below.

## Acceptance and validation

- [x] Automated known-distance/cardinal-angle checks meet Plan 01 tolerances; label variants preserve geometry/extent. Physical calibration remains pending.
- [ ] Bridge/junction and divided-road cases remain distinguishable at chosen scale.
- [ ] Keyboard/touch targets work without color-only feedback; labels do not obscure required answers.
- [ ] Both Letter orientations produce one-page map worksheets with correct page dimensions, margins, legible labels and visible scale/attribution; additional question/instructor pages remain Letter. PDF inspection passes layout checks; physical monochrome print calibration/readability for each orientation is separately performed or explicitly pending.
- [ ] User sees readable limits when area is too large rather than silently reducing labels below the agreed threshold.

## Risks and boundaries

A4, Legal, larger sheets and custom sizes are deferred; they are not required to complete this plan.

SVG does not solve cartographic labeling automatically. Browser fit-to-page changes scale; screenshots cannot verify paper dimensions.

## Execution record

Implemented local spherical azimuthal-equidistant projection/inverse, ordered extent clipping, SVG feature layers, source bridge/one-way/tunnel symbols, label policies, responsive screen models and north-up physical print models. Added vanilla browser review UI, explicit pack import, synthetic demo, feature selection alternative, heading/rotation, print scale selection and a loopback-only CSP server.

Added 1:1,000 as a compatible v1 print preset for small synthetic maps; source/pack recipe revision 2 records midpoint/partial labels and explicit synthetic bridge/direction tags. Browser QA dependencies are exact-pinned dev tools with lockfile; frontend has no runtime dependencies. CI runs unit and headless browser checks.

Validation: 71 Node tests passed; Chromium desktop/mobile-emulation checks passed with no browser/CSP errors; hostile label text stayed literal; malformed import retained prior map; PDF dimensions match 259.4 x 145mm map box. One-page Letter landscape synthetic/Redmond PDFs rendered and visually inspected. Redmond draft import displayed 918 features in about 0.2–0.3s on this container. See [evidence](../../validation/render-evidence.md).

Letter orientation follow-up: selectable portrait/landscape, pack-default import, separate page layouts and orientation-specific fit errors are implemented. 73 Node tests and browser checks passed; both synthetic PDFs are single-page Letter at the expected dimensions. Physical-print calibration is still pending.

Label authoring follow-up: native forms support add/edit/remove, geographic click/tap placement with coordinate alternatives, single-step undo and validated standalone export. Edits/undo increment revisions and clear pack/exercise approval while preserving source hashes, geometry and topology. 77 Node tests and browser checks passed, including download/re-import and rotated placement. Storage remains a later plan.

Route-overlay follow-up: explicit graph-node start, walking/driving edge tracing, ordered steps/source distances, known access/sequence restrictions and review warnings are implemented. Screen overlays and opt-in monochrome Letter overlays share geographic transforms; native controls, remove/clear and map taps are available. 83 Node tests and browser checks cover constraints, crossings, rotation, variants, print opt-in and touch emulation. No scoring, detour closure evaluation, directions provider or trace persistence is advertised.

Exercise-print follow-up: selected heading/endpoint/route/detour learner worksheets and separate instructor guides share the fixed-scale map model. Learner output omits review traces, answer arrows, rubric answers and hints; instructor output includes authored criteria without inventing a unique route. Long text/source credits flow onto measured Letter pages with explicit layout limits. 87 Node tests and browser/PDF checks passed across both audiences, all four exercise types and both orientations; no physical-printer or curriculum approval is implied.

Performance follow-up: reproducible neighborhood/display/graph stress profiles and raw 20-sample p95 reports are implemented. Display and graph profiles reach the joint 100,000-position budget; high-percentile ceiling delays remain too large to claim a practical performance envelope. Reused SVG/label layers and four-entry model caches reduce avoidable churn; measured limits and device/ruler procedure are explicit. See [performance evidence](../../validation/performance.md) and [manual checks](../../validation/physical-print-check.md).

Remaining: practical device-specific performance budget/pack sizing, actual Safari/Firefox/tablet and physical-print calibration. These are not implied by headless Chromium success. Plan 02 real lesson review and newer-source comparison remain queued, not complete.

Next action: validate practical pack sizing on the chosen device matrix and complete physical geometry/label acceptance; coordinate physical/device checks when available.
