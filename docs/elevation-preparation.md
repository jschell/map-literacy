# Elevation preparation: first benchmark

The first implementation is a strict [normalized grid contract](contracts/elevation-grid-v1.md) and deterministic sampling tests. Existing USGS map imagery and contour metadata remain reference cartography; neither supplies reviewed elevation answers. An optional offline Python benchmark preparer and standalone JavaScript contour derivation now exist. No numerical map UI or terrain lessons are enabled.

## Product choice

| Candidate | Preparation implications |
|---|---|
| USGS 1/3 arc-second | Broad US coverage; nominally about 10 m, but geographic angular spacing is not a 10 m square grid. Selected for the bounded benchmark. |
| USGS 1 arc-second | Nominally about 30 m; less detail for the same area. |
| Project 1 m and seamless 1 m (S1M) | More detailed, larger input and coverage/version checks required. S1M rollout began in 2025; do not assume complete coverage. |

Primary references: [USGS product projections](https://www.usgs.gov/faqs/what-are-projection-horizontal-and-vertical-datums-and-spatial-resolution-usgs-3d-elevation-program), [3DEP seamless DEM specification](https://pubs.usgs.gov/tm/11b9/tm11B9.pdf), and [S1M product announcement](https://www.usgs.gov/3d-elevation-program/new-product-3d-elevation-program-seamless-1-meter-digital-elevation-model-s1m). Product descriptions guide selection; the selected file's metadata must establish its actual CRS, units, vertical reference, registration and nodata.

The proposed public benchmark is near Rattlesnake Lake, Washington, with longitude/latitude bounds `[-121.77,47.44,-121.74,47.47]`. It is a preparation test area, not a reviewed lesson pack. [The catalog record](sources/3dep-benchmark-candidate.json) records the bounded query, response hash and pinned historical `USGS 1/3 Arc Second n48w122 20250813` candidate. This is deliberately not a claim to select the newest product. The catalog reports a 473964013-byte GeoTIFF (about 474 MB). The source TIFF and sibling XML have now been downloaded and verified; see [preparation evidence](sources/3dep-benchmark-preparation.json). A catalog-response hash cannot stand in for a DEM hash.

## Preparation gates

1. Acquire the pinned source outside git; verify its actual bytes and record SHA-256, acquisition time, product/version, license and attribution. Confirm tile-specific native horizontal and vertical references, units, nodata and registration. Typical CONUS product metadata is not proof for an individual tile.
2. Select and version offline preparation tooling. Crop to the bounded area, then explicitly reproject/resample to the proposed EPSG:26910 grid with 10 m spacing. Record operation order, tool versions, resampling method, extent, grid alignment and parameters. The optional offline tool now uses pinned Rasterio/PyProj and exact inverse nearest-center sampling; no vertical datum conversion occurs.
3. Convert GeoTIFF corner/PixelIsArea registration to sample centers correctly. Translate the verified nodata sentinel to null without turning holes into zero or interpolating across them. Preserve unknown uncertainty as unknown. Confirm the result meets grid limits before serializing; separately bound input bytes and processing time in the future importer/preparer.
4. Compare sample locations and elevations independently, including edges, missing data and unit conversions. Derive contours from known-answer synthetic terrain first, specifying saddle cases, boundary behavior, interval and geometry tolerances before comparing real contours.
5. Review actual terrain answers and road/trail alignment before enabling any terrain lesson pack. Contour smoothing, profiles and ascent estimates need their own documented error behavior.

Raw DEMs and large derived products stay outside git. Only deliberately small CC0 synthetic fixtures and source-selection metadata are committed here. USGS source licensing still must be recorded for the selected artifact. The current schema validates declared fields; it cannot establish source authenticity or answer accuracy.

## Evidence for this slice

174 Node tests pass, including six grid tests covering seven analytic fixtures, invalid contracts, missing data, unit conversions and coordinate precision. The complete packaged Chromium release suite also passes for site and Pages packages, including local streets, B&W quality, Letter PDF geometry, storage and keyboard checks. There is no new UI behavior in this slice. The follow-up now has 178 Node tests plus two offline Python tests. Actual DEM preparation and standalone contour-segment derivation are implemented; contour topology integration, Safari/device memory and terrain paper/lesson review remain pending.

## Verified benchmark follow-up

See [tooling and reproduction commands](../tools/elevation/README.md) and the [contour-segment contract](contracts/contour-segments-v1.md). Tile metadata XML is the TIFF download URL with `.tif` replaced by `.xml`; exact hashes are recorded. The TIFF is EPSG:4269, PixelIsArea, 10812 × 10812, with nodata -999999. The XML explicitly declares metres and NAVD88; these are not inferred from a typical product. The [USGS collection catalog](https://data.usgs.gov/datacatalog/data/USGS%3A3a81321b-c153-416f-98b7-cc8e5f0e17c3) declares public-domain licensing. No accuracy/uncertainty value is inferred.

The normalized benchmark is 233 × 338 at 10 m spacing, EPSG:26910, with 78,754 samples, no missing samples and elevations 142.84785–359.55460 m. An independent transform/index path agreed with all sampled source elevations exactly; maximum coordinate round-trip error was 2.88e-9 m. This checks preparation consistency, not surveyed absolute accuracy. Real contour smoke output contains 548 segments at 200 m and 1103 at 300 m. No connected contour topology or lesson answers have been approved.

The earlier browser Terrain fetch failure was not reproduced by a bounded direct request for the same default view: water, contours and roads each returned HTTP 200, valid PNG signatures and Access-Control-Allow-Origin `*`. This confirms service responses for that probe only; it does not establish browser/network reliability or close the device acceptance gate. No speculative provider change was made.

## Connected-line preparation follow-up

The [connected-line contract](contracts/contour-lines-v1.md) now provides exact-endpoint deduplication and iterative chain/ring traversal, retaining the metric CRS and reporting branch junctions for review. Synthetic geometry tests establish algorithm behavior; the real benchmark grid/segments were not reacquired or reviewed in this slice. Geographic reprojection, road/trail alignment and lesson-pack integration remain next gates.

## Geographic draft sidecar

The [geographic contour contract](contracts/geographic-contours-v1.md) now defines offline conversion, draft validation and shared screen/paper overlay integration. [Benchmark audit evidence](sources/3dep-contour-alignment.json) records reproduced source/grid hashes, exact-edge preservation and source-elevation residuals. EPSG:1188 explicitly contributes a reported 4 m display-operation accuracy; inverse consistency does not remove that limit or unknown source uncertainty. Real road/trail alignment, full terrain lesson-pack consumers and reviewed answers remain pending.
