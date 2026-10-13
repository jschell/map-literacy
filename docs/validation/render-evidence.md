# Renderer validation evidence

Date: 2026-10-12 (America/Los_Angeles). Runtime: Node.js v24.19.0, Playwright 1.62.1 and packaged headless Chromium 153. This is container desktop/mobile emulation, not a physical iPad test.

71 Node tests passed. New cases cover azimuthal-equidistant known meter positions, inverse/distance tolerances, north/page rotation, ordered clipping perimeter, variant geometry consistency, fixed paper units/fit rejection, manual/automatic label policy, one-way symbol rotation/conditional suppression and phone-native font size.

Browser checks passed: six synthetic features; labeled/partial/blank switching; selection; heading/rotation; bad import retains current map; hostile label string remains literal text with no injected image/script; no horizontal overflow on 390px touch emulation; zero browser/CSP errors. All local assets remain self-hosted and external script/style files.

Paper SVG measured 980.40625 x 548.03125 CSS pixels, matching 259.4 x 145 mm at 96dpi within rounding tolerance. Generated PDFs inspected with Poppler: one page, 792 x 612 points (Letter landscape). Rendered synthetic and real PDF page images were visually inspected; physical calibration remains pending.

The archived Redmond draft imported 918 display features in approximately 0.2–0.3 seconds on this container. It remained explicitly unreviewed; the snapshot/access flags were not changed. Screen and paper name placement differs as expected from fixed paper scale; suppressed labels need author review. This is one bounded pack, not maximum-pack stress, p95 interaction or tablet memory evidence.

Visual review led to a viewport-sized screen model (so phone labels are not scaled from a desktop canvas), midpoint synthetic labels and a 1:1,000 print preset. Synthetic pack revision/source recipe moved to 2, preserving deterministic source hashes and recording the new one-way/bridge recipe. Existing OSM pack snapshots were not rewritten.

Pending: physical monochrome output/ruler calibration, Safari/Firefox/actual tablet checks, maximum-size and p95 measurements, label editing, route overlays, reviewed real lessons and instructor-answer sheets. Plan 03 is not complete. Local standard Playwright browser download failed; the packaged executable was extracted without archive ownership changes for local QA, while CI uses its normal unprivileged extraction.
