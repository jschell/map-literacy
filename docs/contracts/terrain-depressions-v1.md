# Synthetic depression contours

Status: optional `terrain-depressions-v1` companion to the terrain v2 envelope. Capabilities use the canonical subset order: contours, slopes, profiles, landforms, depressions. Older readers reject the new companion before writes. Existing pack revisions, numeric answers, database and backup envelopes remain unchanged.

## Evidence and limits

Closure alone never establishes a depression. This capability requires a synthetic grid with exactly zero vertical uncertainty and 1–100 m cells. All selected contours must regenerate as unbranched closed rings with nonzero area. Winding-independent normals point into the ring. Every segment midpoint is probed 0.1 cell inward and outward: both samples must be present, inside must be lower than the contour and outside higher by more than 1e-7 m. Each tick endpoint is checked again against the grid and ring containment. Missing data, open chains, ambiguous topology, hills and uncertain grids reject the pack.

Ticks have length 0.2 cell, with approximately one tick per cell along the perimeter. A 0.37 spacing phase avoids systematically landing on vertices; ambiguous vertex candidates are skipped. Require at least four ticks per ring, at most 500 candidates per ring and 4,000 per pack. Grid/contour budgets remain those of the parent envelope. Signed area uses relative coordinates to avoid cancellation with large local origins.

These local probes support this bounded analytic basin demonstration. They do not classify every point inside arbitrary rings or establish a general real-terrain depression detector. No smoothing, vertical conversion or source geometry changes occur. [USGS elevation cartographic specifications](https://www.usgs.gov/ngp-standards-and-specifications/us-topo-cartographic-specifications-elevation) describe depression hashes pointing toward lower ground; this demonstration follows that direction convention without claiming full USGS symbol dimensions.

## Fixture, learning and output

**Load depression lesson** loads a separate CC0 9×9 grid: `z = 100 + 5*(abs(column-4)+abs(row-4))`, with 10 m cells. The exact recipe is hashed in source provenance. Regenerated 105/110/115 m rings produce 35 inward ticks. Two existing `contour-elevation` questions derive 110 m and 105 m answers with a 5 m interval, explicit decreasing-inward guidance, a reference elevation and A target. There is no new authored answer field or scoring type.

Screen, preview, native worksheets and direct Letter PDFs share the tick geometry and lower-inside legend. Learner elevation maps suppress automatic numeric labels; instructor criteria give the derived answer. Rotation and both paper orientations preserve metric tick length and fixed scale. Numeric retry, hints, saved recovery and conflict-safe backup fork reuse the existing lesson controller. Ordinary hills have no hachures.

Independent curriculum review, unfamiliar-terrain transfer, physical B&W/Safari acceptance, optional lesson hillshade and real-source cartography remain open. After merge, verify the automatic Pages deployment and hosted lesson before advancing the plan.


Validation for depression lessons: 223 Node tests pass; fixtures reproduce exactly, the basin pack validates and 168 local Markdown links resolve. Full packaged Chromium site/Pages checks pass with zero browser errors, including both numeric answers, lower-ground tick evidence, hill/uncertainty/nodata rejection, reversed winding and large origins, rotation, keyboard retry, hints, save/reload, invalid-import retention, backup fork and narrow reflow. Four direct and four native learner/instructor Letter documents were generated; representative learner map/question and instructor question pages plus the narrow map were rendered and visually inspected. Existing lesson, recovery, accessibility and fixed-scale PDF regressions pass. Hosted verification remains pending merge.
