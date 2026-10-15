# Plan 08 — Topographic data and learning

Status: printable USGS raster preview implemented; elevation/contour lesson pipeline queued.
Dependencies: 01–05 shared foundation; source research may start earlier.

## Outcome

Add terrain interpretation to the shared pack/renderer/lesson system without equating a hillshade with elevation.

## Work

- [ ] Add a terrain-focused view: contours/elevation labels and water with sparse major roads/trails; optional light relief, no building/label clutter. Verify separate USGS contour/transportation service exports, scale/units/alignment and B&W readability (see ../../topographic-browsing.md).

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

Remaining work above is still open. Next action after device print review: select a bounded 3DEP product and define the versioned terrain schema, then implement synthetic grid/contour validation. Keep street-core import rejecting unsupported terrain packs until that contract is implemented.


First-slice verification: 155 Node tests and complete packaged Chromium browser checks pass, including both topo paper orientations, grayscale pixels, provider switch/zoom/failure recovery and street regression checks. Real default USGS imagery was replayed and visually checked in a one-page B&W landscape PDF. Safari topo and physical-paper checks remain pending.
