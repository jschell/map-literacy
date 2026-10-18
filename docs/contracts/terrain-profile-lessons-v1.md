# Synthetic profile questions and charts

Status: bounded browser/scoring/recovery/print integration of the [draft profile calculation](terrain-profile-v1.md). Envelope v2 requires `terrain-contours-v1` first and `terrain-profiles-v1` after the optional `terrain-slopes-v1`; the landform companion may follow profiles. Missing, duplicated, reordered or unknown capabilities are rejected. Existing street v1, contour-only v2 and slope v2 packs retain their contracts and stored revisions. No database/backup version changes.

## Validated exercise inputs

`type: profile-value` retains common reviewed exercise fields, null scenario and the single synthetic grid source. Rubric is exactly `{path,spacingM,quantity,toleranceM}`:

- `path`: 2–32 finite `[easting,northing]` points in the embedded LOCAL_METRIC metre grid; each must also draw inside the map bounds through the pack frame. These are synthetic transects, not road/trail routes.
- `spacingM`: finite, positive, at most 1000 m. The common sampler still inserts cell boundaries, midpoints and quadratic extrema.
- `quantity`: `ascent`, `descent` or `net-change`.
- `toleranceM`: finite, 0–0.1 m.

Every profile is rederived from the validated grid, never accepted as an authored table, chart or expected answer. Outside/nodata samples or partial totals reject the scored pack. At most 16 profile exercises, 2000 samples per profile and 10000 across the pack are permitted, in addition to the raw profile processor's limits. Broader source/grid/contour/review limits remain in the terrain envelope contract.

`profileAnswer` selects the derived summary's ascentM, descentM or netChangeM. Descent is a positive magnitude; net change is end minus start and may be negative. Answer is `{type:profile-value,valueM:finite number}`; missing/nonfinite/string answers are unanswered. Inclusive tolerance uses the existing 1e-9 m numerical allowance. Draft review needs-review. Result metric is profileErrorM; rubricVersion remains 1. Strict stored answers/results are revalidated during backup restore, including the source grid and pack revision.

The calculation artifact remains marked draft; it does not approve its own teaching content. Authored pack/exercise review must establish question clarity, readable scales, units and intended interpretation. The shipped analytic fixture has explicit known answers, not evidence of learning effectiveness.

## Presentation and output

The map uses a dashed transect with S/E endpoints. Coincident endpoints use one S/E marker. Screen rotation leaves the profile's S-to-E order unchanged. Begin/resume shows the active question's profile; the print exercise selector independently chooses the question to print, as with existing lesson types.

The chart plots horizontal distance from S in metres against elevation in metres. It connects retained profile samples with straight drawing segments, labels units/ticks and explicitly states that its axes use different scales; its visual line angle is not a ground-grade measurement. Display ticks/table values use two decimal places where needed; authored questions must remain readable at that presentation precision. The demonstration uses integer elevations/distances and 0.01 m tolerance. A flat profile receives a ±1 m vertical display range. Screen labels scale for narrow viewports and all values are available in an expandable HTML table; chart aria text identifies direction, distance and unequal scales without supplying the scored total.

Learner and instructor worksheets include the same 180 × 70 mm chart after the map, followed by question/explanation and credits. Instructor criteria add the derived expected quantity and tolerance; learner output omits them. The direct PDF uses the same SVG chart as native print, at lossless 300 dpi; map scale and Letter dimensions remain fixed. Pagination can add a third page in landscape to retain handwriting space or credits. Chart axes have their own labeled scales and are not the map's 1:1,000 scale.

**Load profile lesson** has four analytic questions: full hill crossing (80–100–80 m) gives 20 m ascent; a bent transect (80–100–90 m) gives 10 m descent and +10 m net change; reversing that bent transect gives -10 m net. The original elevation and slope fixtures remain unchanged. Keyboard numeric entry/retry, hints, revision-locked saved sessions, reload and explicit conflicting-backup fork use the common controller.

Real DEM profile questions, road/trail matching, ridge/valley recognition, source uncertainty review, target-device/paper and learning-pilot acceptance remain separate Plan 08 gates.
