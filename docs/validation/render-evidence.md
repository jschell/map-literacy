# Renderer validation evidence

Date: 2026-10-12 (America/Los_Angeles). Runtime: Node.js v24.19.0, Playwright 1.62.1 and packaged headless Chromium 153. This is container desktop/mobile emulation, not a physical iPad test.

71 Node tests passed. New cases cover azimuthal-equidistant known meter positions, inverse/distance tolerances, north/page rotation, ordered clipping perimeter, variant geometry consistency, fixed paper units/fit rejection, manual/automatic label policy, one-way symbol rotation/conditional suppression and phone-native font size.

Browser checks passed: six synthetic features; labeled/partial/blank switching; selection; heading/rotation; bad import retains current map; hostile label string remains literal text with no injected image/script; no horizontal overflow on 390px touch emulation; zero browser/CSP errors. All local assets remain self-hosted and external script/style files.

Paper SVG measured 980.40625 x 548.03125 CSS pixels, matching 259.4 x 145 mm at 96dpi within rounding tolerance. Generated PDFs inspected with Poppler: one page, 792 x 612 points (Letter landscape). Rendered synthetic and real PDF page images were visually inspected; physical calibration remains pending.

The archived Redmond draft imported 918 display features in approximately 0.2–0.3 seconds on this container. It remained explicitly unreviewed; the snapshot/access flags were not changed. Screen and paper name placement differs as expected from fixed paper scale; suppressed labels need author review. This is one bounded pack, not maximum-pack stress, p95 interaction or tablet memory evidence.

Visual review led to a viewport-sized screen model (so phone labels are not scaled from a desktop canvas), midpoint synthetic labels and a 1:1,000 print preset. Synthetic pack revision/source recipe moved to 2, preserving deterministic source hashes and recording the new one-way/bridge recipe. Existing OSM pack snapshots were not rewritten.

Pending: physical monochrome output/ruler calibration, Safari/Firefox/actual tablet checks, maximum-size and p95 measurements, label editing, route overlays, reviewed real lessons and instructor-answer sheets. Plan 03 is not complete. Local standard Playwright browser download failed; the packaged executable was extracted without archive ownership changes for local QA, while CI uses its normal unprivileged extraction.


## Letter portrait/landscape follow-up — 2026-10-12

73 Node tests passed, including fixed geographic distances and readable labels in both orientations, north-up/inverse consistency, invalid orientation rejection, and wide/tall extent fit limits without rescaling. Browser checks passed with zero console/CSP errors: selecting either orientation, honoring portrait pack defaults, clearing stale printable geometry on fit failure and recovering after switching back. Touch emulation retained the orientation control without horizontal overflow.

Synthetic paper SVG measurements: landscape 980.40625 x 548.03125 CSS pixels (259.4 x 145 mm), portrait 740.40625 x 788.03125 (195.9 x 208.5 mm). Automated checks inspect pinned Chromium's generated PDF page dictionaries for one page and the exact MediaBox. Poppler independently confirmed one-page 792 x 612 point landscape and 612 x 792 point portrait output. Both rendered synthetic PDFs were visually inspected for labels, north arrow, scale, prompt and footer. The Redmond draft was additionally rendered in landscape at 1:5,000 and portrait at 1:10,000; no source or review status was changed.

Physical printer calibration and Safari/Firefox/actual tablet evidence remain pending. Other paper sizes remain deferred. Browser/PDF checks establish generated geometry, not actual printer accuracy.

## Label editing/export follow-up — 2026-10-12

77 Node tests passed. Pure authoring checks cover immutable source/topology/geometry, invalid-edit atomicity, revision increments and review invalidation, literal text export/import, addition/removal, and undo as a new draft revision after export. Fixtures still reproduce exactly.

Chromium browser checks exercised native label fields, rejected an out-of-extent anchor while retaining the prior pack, placed an anchor at map center after rotation, edited visibility/rotation/text, downloaded and re-imported the resulting pack, removed/restored/added labels, and applied a label with touch emulation. Source/topology content in the download matched the original. Both Letter PDF and mobile overflow checks still passed with zero browser/CSP errors. Desktop/mobile editor screenshots were visually inspected. Redmond remained a 918-feature draft; no real pack was approved or committed.

This is local draft authoring with explicit file export, not persistent browser storage, learner-progress backup, reviewed curriculum or a full cartographic label solver. Actual tablet/browser and physical printer checks remain pending.

## Directed route-overlay follow-up — 2026-10-12

83 Node tests passed. Trace checks independently cover AB→BC length/endpoints and input immutability, one-way adjacency and mode mismatch, bridge crossing without a graph junction, unknown/blocked access, partial/draft warnings, history-sensitive only/forbidden restrictions (including a three-edge sequence), missing/off-map/overlong traces and both fixed-scale Letter transforms.

Chromium browser checks passed native keyboard edge addition, map-tap tracing with touch emulation, remove/clear, start/mode reset, unknown-access warnings, disabled only-turn choices, screen rotation and blank-label overlay preservation. Print opt-in remained off by default, and importing another pack cleared the trace. Decorative heading graphics no longer intercept road taps. Label editing/export checks and 390px overflow checks still passed with zero browser/CSP errors.

Trace PDFs are single-page Letter: Poppler independently confirmed 612 x 792 point portrait and 792 x 612 point landscape. Rendered pages and the desktop trace UI were visually inspected for dashed trace, direction chevrons, S/E markers, labels and source/preview footer. Physical monochrome calibration and actual Safari/Firefox/tablet checks remain pending. No routing provider, geolocation, correctness score, real-route approval or persistent trace was involved.

### Print-mode stability correction

The first PR 09 CI run passed all 83 Node tests and fixture checks, then failed an intermittent paper-width measurement in the browser check. The same failure reproduced locally. ResizeObserver treated the print-hidden screen map as a viewport change and scheduled an unnecessary whole-view redraw; a locator could then measure a detached paper SVG. The resize handler now ignores hidden/print-mode screen geometry and guards its queued callback. Browser measurements query/measure the current SVG in one task after verifying print layout; tolerances remain 0.1 CSS pixel. A regression check requires the paper SVG to remain the same node through print mode and PDF generation. Local synthetic-only CI-equivalent checks passed after the correction.

## Exercise worksheet/instructor follow-up — 2026-10-12

87 Node tests passed. Print-content tests cover learner/instructor answer separation, literal long text and source retention, draft status, endpoint/heading criteria, route/detour problem annotations and non-unique manual path acceptance, pack immutability and off-map/unknown selection errors.

Chromium checks generated all 16 audience/exercise/orientation combinations (learner/instructor × heading/endpoint/route/detour × portrait/landscape). Each PDF's page count matched the map plus measured text pages, and every MediaBox matched Letter orientation. Learner DOM output contained no answer/hint blocks or review-trace geometry even with screen heading/trace enabled; instructor endpoint/heading visuals were separate. Content/header/footer containment passed, and map-only output remained a single page without blank trailing pages.

A long-input fixture used a nearly 2,000-character literal hostile prompt, three 2,000-character hints, a 2,000-character attribution and long title. Text continued to extra pages without lost prompt/hint/credit characters or injected elements. Switching instructor to learner removed answer/hint blocks; import reset to map output. Poppler independently confirmed two-page learner detour portrait and instructor endpoint landscape dimensions. Their map/text pages were visually inspected. No real pack was approved, and actual-printer/device calibration remains pending.

The expanded control layout exposed integer-pixel pointer quantization in the existing rotated-anchor browser assertion. That interaction check now uses a 1.5 CSS-pixel tolerance derived from the fixture's displayed extent, while independent geographic transform tolerances and 0.1 CSS-pixel paper checks remain unchanged. The full synthetic-only and optional Redmond browser workflows both passed.

## Boundary performance and geometry follow-up — 2026-10-12

Added reproducible stress packs, raw browser p95/heap observations and independent parallel-road separation checks. See [performance.md](performance.md) and [performance-report.json](performance-report.json). Browser regression checks verify geometry/paper node reuse, current label/selection styling and existing edit/trace/worksheet behavior. SVG view reuse, four-entry model caches and batched selectors are implemented, but ceiling-sized packs still have multi-second high-percentile delays. No practical ceiling-performance or actual-device approval is claimed.

A completed-import sequence marker makes browser tests wait for the newly installed pack instead of matching an old pack with the same title. Failed imports retain the old map/sequence. The [physical-print and device procedure](physical-print-check.md) specifies both Letter orientations, horizontal/vertical ruler measurements, monochrome labels/crossings and learner/instructor separation. Physical/device results remain pending; Plan 03 stays active.

## Initial browser budget/search follow-up — 2026-10-13

92 Node tests and browser checks passed. Enforced neighborhood rendering limits prevent the measured display-ceiling case from replacing the current map. Searchable native feature/start/edge selects bound inserted options while retaining all indexed items and selected IDs. Tests cover beyond-first-page lookup, no-match pinning, atomic oversized import/label edit failure and graph trace continuation. The archived Redmond pack still fits and imported in about 232ms; the optional touch import waits for completed installation.

See [render-budget.md](render-budget.md) and [raw report](render-budget-report.json). Graph import/DOM improved in this run from roughly 18s/20,206 nodes to 2.1s/218 nodes. Neighborhood p95 was 32–70ms, with a 1.7s rotation maximum retained. This is not actual-device/physical-printer approval; Plan 03 remains active.
