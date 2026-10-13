# Plan 08 — Topographic data and learning

Status: queued.
Dependencies: 01–05 shared foundation; source research may start earlier.

## Outcome

Add terrain interpretation to the shared pack/renderer/lesson system without equating a hillshade with elevation.

## Work

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

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Select one bounded terrain area and synthetic elevation fixtures; compare USGS 3DEP products for US coverage/resolution/license/access.
