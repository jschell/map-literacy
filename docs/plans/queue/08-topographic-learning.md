# Plan 08 — Topographic data and learning

Status: printable USGS composite and terrain-focused reference views implemented; verified terrain metadata and elevation/contour lesson pipeline queued.
Dependencies: 01–05 shared foundation; source research may start earlier.

## Outcome

Add terrain interpretation to the shared pack/renderer/lesson system without equating a hillshade with elevation.

## Work

- [x] Add a terrain-focused reference view: contours/elevation labels and water with sparse highways/trails; optional light relief, no building/label clutter. Shared export grid/alignment and B&W output verified in automated/sampled rendering checks (see ../../terrain-view.md).
- [x] Query source-reported per-extent contour units/intervals with explicit mixed/unknown/partial handling; keep basic printing available when metadata is pending/unavailable. See ../../contour-metadata.md.
- [ ] Complete representative physical/Safari review and independently review terrain data before supporting lesson answers.

- [ ] Select one bounded terrain area and synthetic elevation fixtures; compare USGS 3DEP products for US coverage/resolution/license/access.
- [ ] Define raster/contour schema: horizontal CRS, vertical reference, units, resolution, origin/grid orientation, nodata, source/version and uncertainty.
- [ ] Start with reviewed precomputed contours if it reduces risk; evaluate geotiff.js for DEM reading and d3-contour for marching-squares contour derivation.
- [ ] Specify raster reprojection/georeferencing and contour conversion to geographic coordinates; d3-contour output alone is grid-space geometry.
- [ ] Bound raster memory/bytes and processing time; evaluate Web Workers and selected preparation tooling.
- [ ] Render index/intermediate contours, elevation labels, depression symbols where supported, legend and optional hillshade; make B&W readable.
- [ ] Implement contour interval/elevation, relative slope, ridge/valley and route-profile exercises with known answers.
- [ ] Add true/grid/magnetic north distinctions where taught; require source/date for declination rather than treating them as equal.
- [ ] Verify alignment with roads/trails, units/nodata, profiles and matching printed variants; run unfamiliar-terrain pilot extension.

## Acceptance and validation

- [ ] Synthetic hill/valley/flat/nodata and meter/foot fixtures produce known elevations and contours within defined tolerances.
- [ ] Real data provenance includes actual source product/version and CRS/vertical units; no unsupported datum conversion.
- [ ] Contour smoothing/generalization does not change the reviewed answer; profile ascent calculation documents sampling/noise behavior.
- [ ] Street packs remain valid without terrain; terrain lessons do not require routing service.
- [ ] Actual monochrome contour/label print and device memory checks are completed or tracked as pending.
- [ ] Trail presence, slope and road-engine output are not presented as evidence of safe/legal off-trail travel.

## Risks and boundaries

OSM is not a complete DEM source. USGS candidate is US-specific; global sources remain open. Reprojection may justify a focused library or optional preparation tool while preserving vanilla JS product UI.

## Execution record

2026-10-14: user requested topographic viewing and B&W Letter printing after street printing worked on Safari. The first slice uses the official USGS Topo cached raster service, with provider separation, north/approximate center scale, exact USGS acknowledgment, B&W pixel conversion and color output. No DEM, numerical elevation queries, editable contours or terrain lesson support is advertised. USGS tiles include their own cartography and cannot support blank/partial names or independent hillshade controls. See ../../topographic-browsing.md for current source review and boundaries.

Next action after terrain-reference device review: select a bounded 3DEP product and define the versioned terrain schema, then implement synthetic grid/contour validation. Keep street-core import rejecting unsupported terrain packs until that contract is implemented.


First-slice verification: 155 Node tests and complete packaged Chromium browser checks pass, including both topo paper orientations, grayscale pixels, provider switch/zoom/failure recovery and street regression checks. Real default USGS imagery was replayed and visually checked in a one-page B&W landscape PDF. Safari topo and physical-paper checks remain pending.


B&W fidelity follow-up (2026-10-15): the user accepted physical page fit and requested sharper B&W output. Implemented a selectable stronger-midtones topo print curve and lossless grayscale/RGB PDF samples, preserving Letter geometry and native street vectors. Automated quality gates measure a known synthetic contour fixture: at least 25% nominal contrast gain, all 11 thin-line sample centers retained and zero PDF compression sample error. See [quality method and measured limits](../../print-quality.md). Raster source resolution, baked-in shading and separate contour-first services remain unchanged; actual paper comparison of this treatment remains pending.


2026-10-15: user confirmed the PR-40 B&W workflow usable after merge/deployment. Added Terrain — contours + roads (US), with 1980 × 1530 / 1530 × 1980 shared EPSG:3857 source grids, bounded current-frame PNG requests, optional 18% hillshade and incomplete/stale-layer print blocking. This is a cartographic reference composition, not the DEM/lesson pipeline. Source unit/interval queries and paper/Safari review remain open; see ../../terrain-view.md for evidence and limits.


2026-10-16: user reports PR 41 merged/deployed; merge CI and Pages workflow both succeeded. Implemented source-reported contour details for all four rendered geometry layers. A bounded live view returned mixed 20/40 ft intervals. Pending/unavailable/unknown/truncated metadata is additive and never gates basic printing. This source summary is not the reviewed elevation/lesson contract; paper/Safari review remains open.
