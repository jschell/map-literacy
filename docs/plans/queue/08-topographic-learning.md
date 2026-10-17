# Plan 08 — Topographic data and learning

Status: printable USGS composite and terrain-focused reference views implemented; source-reported contour metadata and standalone elevation-grid foundation implemented; bounded real DEM preparation and standalone contour segments implemented; contour integration and terrain lessons queued.
Dependencies: 01–05 shared foundation; source research may start earlier.

## Outcome

Add terrain interpretation to the shared pack/renderer/lesson system without equating a hillshade with elevation.

## Work

- [x] Add a terrain-focused reference view: contours/elevation labels and water with sparse highways/trails; optional light relief, no building/label clutter. Shared export grid/alignment and B&W output verified in automated/sampled rendering checks (see ../../terrain-view.md).
- [x] Query source-reported per-extent contour units/intervals with explicit mixed/unknown/partial handling; keep basic printing available when metadata is pending/unavailable. See ../../contour-metadata.md.
- [ ] Complete representative physical/Safari review and independently review terrain data before supporting lesson answers.

- [x] Select a bounded candidate area, compare 3DEP products and implement seven synthetic elevation fixtures; see ../../elevation-preparation.md.
- [x] Acquire, verify and prepare the bounded benchmark DEM with actual source/metadata hashes and all-sample comparison; see ../../elevation-preparation.md.
- [x] Define and test a standalone normalized elevation-grid contract with CRS, units/reference, sample centers, nodata, provenance and uncertainty; see ../../contracts/elevation-grid-v1.md.
- [ ] Define contour output/lesson-pack integration and verify actual raster normalization.
- [ ] Start with reviewed precomputed contours if it reduces risk; evaluate geotiff.js for DEM reading and d3-contour for marching-squares contour derivation.
- [ ] Specify raster reprojection/georeferencing and contour conversion to geographic coordinates; d3-contour output alone is grid-space geometry.
- [ ] Bound raster memory/bytes and processing time; evaluate Web Workers and selected preparation tooling.
- [ ] Render index/intermediate contours, elevation labels, depression symbols where supported, legend and optional hillshade; make B&W readable.
- [ ] Implement contour interval/elevation, relative slope, ridge/valley and route-profile exercises with known answers.
- [ ] Add true/grid/magnetic north distinctions where taught; require source/date for declination rather than treating them as equal.
- [ ] Verify alignment with roads/trails, units/nodata, profiles and matching printed variants; run unfamiliar-terrain pilot extension.

## Acceptance and validation

- [x] Synthetic hill/valley/flat/nodata and metre/international-foot/survey-foot fixtures produce known elevations and coordinate round trips.
- [x] Standalone synthetic contour segments meet explicit analytic tolerances, saddle/missing-data rules and output budgets. Connected topology and lesson review remain separate.
- [x] Benchmark provenance includes actual source product/version, byte hashes, native CRS, vertical units/reference and reproducible normalization without vertical datum conversion.
- [ ] Contour smoothing/generalization does not change the reviewed answer; profile ascent calculation documents sampling/noise behavior.
- [ ] Street packs remain valid without terrain; terrain lessons do not require routing service.
- [ ] Actual monochrome contour/label print and device memory checks are completed or tracked as pending.
- [ ] Trail presence, slope and road-engine output are not presented as evidence of safe/legal off-trail travel.

## Risks and boundaries

OSM is not a complete DEM source. USGS candidate is US-specific; global sources remain open. Reprojection may justify a focused library or optional preparation tool while preserving vanilla JS product UI.

## Execution record

2026-10-14: user requested topographic viewing and B&W Letter printing after street printing worked on Safari. The first slice uses the official USGS Topo cached raster service, with provider separation, north/approximate center scale, exact USGS acknowledgment, B&W pixel conversion and color output. No DEM, numerical elevation queries, editable contours or terrain lesson support is advertised. USGS tiles include their own cartography and cannot support blank/partial names or independent hillshade controls. See ../../topographic-browsing.md for current source review and boundaries.

Next action: stitch/deduplicate and review contour topology, define terrain lesson-pack integration, and verify geographic display/print alignment before enabling terrain lessons. Keep street-core import rejecting unsupported terrain packs until that contract is implemented.


First-slice verification: 155 Node tests and complete packaged Chromium browser checks pass, including both topo paper orientations, grayscale pixels, provider switch/zoom/failure recovery and street regression checks. Real default USGS imagery was replayed and visually checked in a one-page B&W landscape PDF. Safari topo and physical-paper checks remain pending.


B&W fidelity follow-up (2026-10-15): the user accepted physical page fit and requested sharper B&W output. Implemented a selectable stronger-midtones topo print curve and lossless grayscale/RGB PDF samples, preserving Letter geometry and native street vectors. Automated quality gates measure a known synthetic contour fixture: at least 25% nominal contrast gain, all 11 thin-line sample centers retained and zero PDF compression sample error. See [quality method and measured limits](../../print-quality.md). Raster source resolution, baked-in shading and separate contour-first services remain unchanged; actual paper comparison of this treatment remains pending.


2026-10-15: user confirmed the PR-40 B&W workflow usable after merge/deployment. Added Terrain — contours + roads (US), with 1980 × 1530 / 1530 × 1980 shared EPSG:3857 source grids, bounded current-frame PNG requests, optional 18% hillshade and incomplete/stale-layer print blocking. This is a cartographic reference composition, not the DEM/lesson pipeline. Source unit/interval queries and paper/Safari review remain open; see ../../terrain-view.md for evidence and limits.


2026-10-16: user reports PR 41 merged/deployed; merge CI and Pages workflow both succeeded. Implemented source-reported contour details for all four rendered geometry layers. A bounded live view returned mixed 20/40 ft intervals. Pending/unavailable/unknown/truncated metadata is additive and never gates basic printing. This source summary is not the reviewed elevation/lesson contract; paper/Safari review remains open.


2026-10-16 street-context correction: the user reported missing streets in Terrain — contours + roads. The original highways/trails-only layer selection omitted local/connecting streets. Added default Streets + trails with local geometry/names and retained the original selection as an explicit sparse option. The image key includes road context; browser checks require local-road pixels and reject stale road-choice results. This is a reference-view correction; the elevation-grid work was paused for this correction and resumed after PR 43 merged/deployed.


2026-10-17 elevation-grid foundation: PR 43 merge checks and Pages deployment succeeded. Added a standalone strict grid contract, immutable sampling with explicit outside/nodata results, unit conversions, seven deterministic CC0 grids and a pinned 3DEP catalog candidate. 174 Node tests and complete packaged Chromium checks pass. The actual DEM is not downloaded or verified; contour derivation and lesson-pack support remain pending. See ../../elevation-preparation.md for source-selection evidence and the next gate.


2026-10-17 benchmark preparation and contour derivation: verified TIFF/XML hashes and tile-specific NAD83/NAVD88 metre metadata. Offline exact inverse nearest-center sampling produces a 233 × 338 EPSG:26910 grid. All 78,754 elevations agree with independent GDAL-transform/source-index checks; coordinate round trips stay below 1e-6 m. Added bounded unsmoothed JavaScript contour segments with analytic plane/hill/valley/saddle/nodata tests; 178 Node tests and two synthetic Python preparation tests pass. Raw/normalized real grids remain outside git. Terrain service probe returned all three PNGs with CORS, without reproducing the earlier browser failure. Contour topology, lessons and device acceptance remain open.
