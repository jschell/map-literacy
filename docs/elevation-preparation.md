# Elevation preparation: first benchmark

The first implementation is a strict [normalized grid contract](contracts/elevation-grid-v1.md) and deterministic sampling tests. Existing USGS map imagery and contour metadata remain reference cartography; neither supplies reviewed elevation answers. No DEM reader, reprojection dependency, numerical map UI or terrain lessons are enabled.

## Product choice

| Candidate | Preparation implications |
|---|---|
| USGS 1/3 arc-second | Broad US coverage; nominally about 10 m, but geographic angular spacing is not a 10 m square grid. Selected for the bounded benchmark. |
| USGS 1 arc-second | Nominally about 30 m; less detail for the same area. |
| Project 1 m and seamless 1 m (S1M) | More detailed, larger input and coverage/version checks required. S1M rollout began in 2025; do not assume complete coverage. |

Primary references: [USGS product projections](https://www.usgs.gov/faqs/what-are-projection-horizontal-and-vertical-datums-and-spatial-resolution-usgs-3d-elevation-program), [3DEP seamless DEM specification](https://pubs.usgs.gov/tm/11b9/tm11B9.pdf), and [S1M product announcement](https://www.usgs.gov/3d-elevation-program/new-product-3d-elevation-program-seamless-1-meter-digital-elevation-model-s1m). Product descriptions guide selection; the selected file's metadata must establish its actual CRS, units, vertical reference, registration and nodata.

The proposed public benchmark is near Rattlesnake Lake, Washington, with longitude/latitude bounds `[-121.77,47.44,-121.74,47.47]`. It is a preparation test area, not a reviewed lesson pack. [The catalog record](sources/3dep-benchmark-candidate.json) records the bounded query, response hash and pinned historical `USGS 1/3 Arc Second n48w122 20250813` candidate. This is deliberately not a claim to select the newest product. The catalog reports a 473964013-byte GeoTIFF (about 474 MB). It has not been downloaded; DEM byte hash and tile metadata verification remain pending. A catalog-response hash cannot stand in for a DEM hash.

## Next preparation gate

1. Acquire the pinned source outside git; verify its actual bytes and record SHA-256, acquisition time, product/version, license and attribution. Confirm tile-specific native horizontal and vertical references, units, nodata and registration. Typical CONUS product metadata is not proof for an individual tile.
2. Select and version offline preparation tooling. Crop to the bounded area, then explicitly reproject/resample to the proposed EPSG:26910 grid with 10 m spacing. Record operation order, tool versions, resampling method, extent, grid alignment and parameters. No tooling choice or dependency is committed yet; no unsupported vertical datum conversion is permitted.
3. Convert GeoTIFF corner/PixelIsArea registration to sample centers correctly. Translate the verified nodata sentinel to null without turning holes into zero or interpolating across them. Preserve unknown uncertainty as unknown. Confirm the result meets grid limits before serializing; separately bound input bytes and processing time in the future importer/preparer.
4. Compare sample locations and elevations independently, including edges, missing data and unit conversions. Derive contours from known-answer synthetic terrain first, specifying saddle cases, boundary behavior, interval and geometry tolerances before comparing real contours.
5. Review actual terrain answers and road/trail alignment before enabling any terrain lesson pack. Contour smoothing, profiles and ascent estimates need their own documented error behavior.

Raw DEMs and large derived products stay outside git. Only deliberately small CC0 synthetic fixtures and source-selection metadata are committed here. USGS source licensing still must be recorded for the selected artifact. The current schema validates declared fields; it cannot establish source authenticity or answer accuracy.

## Evidence for this slice

174 Node tests pass, including six grid tests covering seven analytic fixtures, invalid contracts, missing data, unit conversions and coordinate precision. The complete packaged Chromium release suite also passes for site and Pages packages, including local streets, B&W quality, Letter PDF geometry, storage and keyboard checks. There is no new UI behavior in this slice. Actual DEM preparation, contour derivation, Safari/device memory and terrain paper/lesson review remain pending.
