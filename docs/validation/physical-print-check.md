# Letter print and device validation

Status: pending physical output and actual-device observations. Container PDFs and touch emulation do not complete these checks.

## Physical calibration

Use the synthetic street-square revision 2 pack, scale 1:1,000, and test both US Letter orientations. Print a map-only page and a learner/instructor exercise pair in monochrome. Select 8.5 x 11 inch paper, the matching orientation, 100% / actual size, and disable browser headers/footers. Check the print preview page count against the generated document. Record the browser, OS, printer/driver and all dialog settings.

Measure the scale bar and the AB and AD sides of the synthetic square. Each side is approximately 111.195 m, so at 1:1,000 each should measure 111.195 mm. Require each measured horizontal/vertical length to differ by at most 1%; a 50 mm reference permits 0.5 mm error. Use a sufficiently precise ruler and record its resolution. Fit-to-page, driver scaling and printable-area adjustments can invalidate the scale even when the PDF is correct.

| Scale | Portrait bar | Landscape bar |
|---|---|---|
| 1:1,000 | 20 m = 20 mm | 50 m = 50 mm |
| 1:5,000 | 200 m = 40 mm | 200 m = 40 mm |
| 1:10,000 | 200 m = 20 mm | 500 m = 50 mm |

These values follow the current bar-selection rule; verify the distance printed beside the bar rather than assuming an old preset. Printed mm = labeled metres x 1,000 / scale denominator.

Inspect all label variants: required names must be legible at 8pt or larger, north/heading arrows distinguishable, bridge gaps and separate roads recognizable, and no answer hidden by a label. A synthetic crossing of EF/GH is a bridge, not a graph junction. Check real lesson crossings individually; structural tags alone do not approve geography or road access.

For worksheets, verify full prompts/credits, page numbering, source license/date, synthetic closure marks, and draft indicators. Learner pages must not include instructor answer arrows, X endpoint answers, hints or the review trace. Print instructor pages separately. A ruler check establishes scale, not curriculum usefulness or driving competence.

## Device checks

Choose and record the actual release browser/device matrix before completing this gate. Candidate checks include Safari on macOS/iPadOS, Firefox desktop, and a touch tablet; none is assumed already selected or tested. Use their native print dialogs, not only Chromium-generated PDFs.

Verify explicit import, draft/source display, native keyboard controls, focus visibility, road/edge selection, label editing/placement/export/re-import, trace constraints and warnings, both orientations, and learner/instructor audience switching. Inspect at narrow width and ordinary browser zoom. Check native selects at the intended practical pack size; large stress graphs are not evidence of a usable 20,000-option tablet interface. Record browser/OS versions and pack revision/bytes, latency and any missing labels or overflow.

## Observation record

| Item | Observation |
|---|---|
| Date / reviewer | Pending |
| Pack ID / revision / source hash | Pending |
| Browser / OS / device | Pending |
| Printer / driver / monochrome mode | Pending |
| Letter orientation / scaling / headers | Pending |
| PDF/preview vs paper page count | Pending |
| Ruler resolution | Pending |
| Expected/measured horizontal mm / error % | Pending |
| Expected/measured vertical mm / error % | Pending |
| Expected/measured bar mm / error % | Pending |
| Labels / crossings / separate roads | Pending |
| Learner/instructor separation / full credits | Pending |
| Interaction / keyboard / touch observations | Pending |
| Pass, failure, adjustment and retest | Pending |

Retest both scale directions after any browser/driver/scaling change. Preserve failures and fixes; do not mark a row passed from a screenshot.
