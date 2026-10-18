# Synthetic contour lesson packs: envelope v2

Status: first terrain capability implemented across validation, import/export, scoring, sessions, storage/backup, SVG and Letter worksheets. This bounded synthetic teaching slice is separate from the real DEM's draft geographic sidecar.

## Compatibility and scope

Street packs remain `schemaVersion: 1`, `module: street`, `capabilities: [street-core]`. The new envelope uses `schemaVersion: 2`, `module: topographic`, `capabilities: [terrain-contours-v1]`. Optional companion capabilities add [relative slope](terrain-slopes-v1.md), [profile lessons](terrain-profile-lessons-v1.md) and [ridge/valley lessons](terrain-landforms-v1.md). The contour capability comes first, followed by slopes when used, then profiles when used, then landforms when used; any subset of companions may be present in that order. Other version-2 module/capability combinations are unsupported. Version-1 readers reject v2 before writes. The older placeholder `terrain-v1`, routing capabilities and real DEM payloads remain unsupported; none is silently upgraded.

Common envelope fields, sources, feature properties, print presets, review states, JSON/file/render bounds and revision rules retain the [v1 contract](lesson-pack-v1.md). The only additional envelope field is `terrain`. This capability is terrain-only: contour LineStrings, no road graph, no authored labels and `contour-elevation` exercises; `relative-slope`, `profile-value` and `terrain-form` additionally require their respective companion capabilities. No new database version or backup envelope is needed: existing revision-locked pack/session records retain the complete v2 payload and recompute its score before accepting restored records.

## Terrain payload

`terrain = {format: synthetic-contours-v1, grid, frame, intervalM, contours}`.

| Field | Rule |
|---|---|
| `grid` | Valid elevation-grid-v1; synthetic LOCAL_METRIC reference, metre elevations, at most 32 samples on each axis |
| `frame.center` | Explicit synthetic geographic drawing anchor `[longitude,latitude]`, within existing latitude support; not a real acquisition or inferred location |
| `frame.origin` | Exact metric grid center, computed from sample-center origin, spacing and dimensions |
| `intervalM` | Positive finite interval, at most 1000 m |
| `contours` | Ordered `{featureId,levelM}` records; 2–8 distinct consecutive levels at the declared interval |

The single synthetic pack source ID equals the grid ID; hash, acquisition time, source version, license and attribution must match its embedded grid. Its source hash remains a provenance reference, not an authentication check on a source file absent from the importer.

Validation regenerates connected contours from the grid and compares every feature's ID, level, source, LineString length and ordered coordinates. No segment, line or level can be omitted, added, duplicated or relabeled. Degree-greater-than-two junctions are rejected for this capability. Coordinates are obtained by subtracting the metric grid center and applying the inverse of the existing local azimuthal-equidistant display projection at `frame.center`. Imported geometry must reproduce that recipe within 1e-6 geographic metres and lie in the lesson extent; all four grid corners must fit source bounds. The tolerance tests numerical reproduction, not surveyed accuracy.

Scored content still requires both pack and exercise review. A grid and contour validation pass does not establish the pedagogical adequacy of an arbitrary authored prompt; direction, reference and ambiguity must be reviewed by the author. The shipped fixture explicitly states that elevations rise inward on a synthetic hill. It does not require the learner to infer a hill versus depression from otherwise ambiguous contour geometry.

## Exercise and answer

`type: contour-elevation` retains common exercise fields. `scenario` is null and `sourceIds` names the single grid source. The rubric is `{featureId,referenceFeatureId,toleranceM}`. Both references resolve to different contour levels; the tolerance is finite, 0–0.1 m and strictly smaller than one quarter of the interval.

The target answer is derived from the validated contour mapping, not a second authored `expectedM` that could disagree with the drawing. Answer: `{type: contour-elevation, elevationM: finite number}`. Missing, wrong-type, string-valued or nonfinite answers are unanswered. Numeric error within the authored tolerance is correct, inclusively, with the same 1e-9 m rounding allowance as other numerical rubrics. Draft review produces needs-review. The result retains rubricVersion 1 and one numeric metric, `elevationErrorM`; hints remain counted separately.

The map marks the reference with its metre elevation and the target with A. The reference and target remain at the same geographic coordinates under screen rotation and fixed-scale paper output. The learner map and questions omit the target answer; instructor output adds its derived elevation and tolerance. No shortest-path search, coordinate-answer inference, slope safety claim or free-text grading is involved.

## Browser and recovery behavior

**Load contour lesson** opens the small CC0 analytic hill fixture. Existing Import lesson pack and Export pack controls support the v2 envelope. Begin lesson session enables a labeled numeric metre input; native keyboard actions, retry, hints, next/end and save feedback use the common controller. Saved-session resume and file backup retain the grid, source, exact pack revision, submitted answers, computed results and hint counts. Invalid imports keep the previous map/session. Restoring an older conflicting session offers the existing explicit fork/reload recovery rather than overwriting newer progress.

Reference/target annotations are supplied by the exercise, so free label editing is disabled for this capability. Routing controls have no graph to select. Existing Street, Topographic and Terrain reference-map browsing/printing remain separate, and loading this exercise does not turn real raster imagery into scored elevation data.

## Evidence and remaining gates

The deterministic analytic hill fixture has contours at 80, 85 and 90 m. Its two questions use successively higher reference/target contours with a stated 5 m interval. Regeneration, geometry/source tampering, compatibility rejection, tolerance boundaries, draft review, session/backup integrity, wrong-score rejection and learner/instructor separation have automated coverage. Browser checks exercise numeric/keyboard feedback, reload and conflict-safe file recovery, malformed import retention, narrow reflow and both Letter orientations.

The fixture is a technical instructional demonstration, not the multi-pack learning pilot or evidence of transfer/retention. Real-grid payloads, actual road/trail alignment, independent terrain-answer review, index/intermediate labeling policy, ridge/valley/profile exercises and broader slope instruction and target-device/physical-paper acceptance remain separate Plan 08 work.

The separate **Load slope lesson** demo uses the same analytic hill with three comparisons (A steeper, B steeper, equal). Its answers are derived from validated contour vertices and metric distances; the original elevation fixture and stored revisions remain unchanged.

**Load profile lesson** opens a separate four-question synthetic pack. It regenerates complete transect profiles from the validated grid, displays labeled chart axes and a value table, and derives ascent/descent/signed-change answers. Profile charts and question pages accompany learner/instructor output; no real route or terrain-answer approval is implied.
