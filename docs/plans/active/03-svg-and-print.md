# Plan 03 — SVG rendering and print

Status: active; initial projection, map review UI and fixed-scale print renderer implemented.
Dependencies: 01 and the implemented acquisition/validation slice of 02; real lesson approval remains in 02.

## Outcome

Render interactive and monochrome paper variants from shared geographic data. The initial print target is US Letter (8.5 x 11 inches), selectable portrait or landscape; other paper sizes are later goals.

## Work

- [x] Implement calibrated geographic-to-display/paper transforms and extent clipping.
- [x] Draw road hierarchy, landmarks, water, crossings, selected one-way symbols and SVG interaction layers.
- [x] Separate labels from geometry; use imported manual placement overrides and deterministic initial collision policy (in-app label editing remains pending).
- [ ] Create labeled/partial/blank views, heading arrows, road selection and route overlays with keyboard/touch equivalents.
- [ ] Complete external print CSS and Letter portrait/landscape presets, questions/instructor pages, scale bar, north arrow, source date and attribution. Landscape exists; add portrait to schema/model/UI/CSS with orientation-specific layout and regression coverage.
- [ ] Measure bounded-pack performance and inspect target-browser PDF output; provide actual-paper calibration procedure.

## Acceptance and validation

- [ ] Known distances/angles match Plan 01 tolerances and all variants preserve extent.
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

Remaining: portrait preset and orientation selection, route overlays, author label-edit/save controls, exercise-specific and instructor pages, maximum-pack/p95 measurements, actual Safari/Firefox/tablet and physical-print calibration. These are not implied by headless Chromium success. Plan 02 real lesson review and newer-source comparison remain queued, not complete.

Next action: add selectable Letter portrait/landscape output with schema, layout and browser/PDF checks for both orientations, then finalize label review, route-overlay interactions and exercise-specific sheets; coordinate physical/device checks when available.