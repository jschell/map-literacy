# Terrain: contours with sparse road context

Choose **Terrain — contours + roads (US)** under Map type. Pan or jump to an area, use zoom 13–16, then Print this map or Download Letter PDF. Terrain road context defaults to **Streets + trails**, including local and connecting roads with source names. Choose **Highways + trails only** for the original sparse context. Terrain relief defaults to Off — clear contours; Light hillshade adds subdued relief. B&W uses the existing Stronger lines / Standard grayscale choice. Color retains source colors. Orientation, 8 mm PDF margins, north, approximate center scale and lossless Letter PDF output remain available without a lesson pack.

This view combines contours and water with roads and trails. The default includes local/connecting streets, highways and ramps with available source labels; the optional sparse setting includes highways/trails only. Buildings, parcels, railways and airport clutter remain omitted. Roads/trails may be absent where the source has none; a successfully loaded transparent layer is not an availability failure. Coverage is US-focused and not complete. Elevation labels and interval vary by source quadrangle. The screen and printed footer show source-reported units/intervals when all bounded metadata queries complete, including mixed values; otherwise they explicitly mark units/interval unverified. Do not infer feet/meters from an unlabeled number or treat the view as a terrain lesson answer key.

## Sources reviewed — 2026-10-15

| Layer | Official source | Selection |
| --- | --- | --- |
| Contours | [USGS contours MapServer](https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer?f=pjson) | Normal/depression index labels and index/intermediate lines: 21,25,26,29,33,34 |
| Water | [USGS Hydro cached MapServer](https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer?f=pjson) | Hydrography imagery export; cached source detail remains limited |
| Roads/trails | [USGS transportation MapServer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer?f=pjson) | Default: labels 16–18,20–21,24; roads 29–33; trails 37. Sparse: labels 16–18,24; highways 29–30; trails 37 |
| Optional relief | [USGS 3DEP ImageServer](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer?f=pjson) | Hillshade Gray visualization, composited at 18% opacity |

The contour service advertises a 1:50,000 large-scale group boundary and variable large-scale contour intervals; the client limits this view to zoom 13–16. Normal Intermediate layer metadata exposes contourunits and contourinterval fields, but its general description is not sufficient to establish those values for every viewed quadrangle. The initial bounded metadata query timed out. A later four-layer probe succeeded with mixed intervals, and bounded per-extent source metadata is now implemented; see [contour details](contour-metadata.md). The original composite Topographic mode remains available.

All printed output includes the USGS acknowledgment. The [National Map terms](https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map) and [service listings](https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map) remain the source/policy references. These public services are a bounded preview dependency, with no production SLA or offline guarantee.

## Rendering and limits

Plain JavaScript requests three PNG exports for the settled outlined extent, or four with relief. Every layer uses one exact EPSG:3857 bounding box, image SR, output size and 200 dpi request. EPSG:3857 calculations use the WGS84 semi-major axis 6378137 m, independently checked against projected coordinates. Exact Letter aspect ratios prevent the export service from expanding different layer envelopes to fit their images. Dateline/map-edge crossings are rejected.

The source image grid is 1980 × 1530 landscape or 1530 × 1980 portrait: 3.09 times the former 640-pixel map width in landscape. Contours/roads are rendered by the source service at that requested grid; hydrography remains cached imagery. This is a higher output sampling grid, not a claim that the underlying elevation dataset gained resolution. The final PDF remains a 200 dpi raster page. No editable contour vectors, source geometry, elevation grid, profile/route calculations or terrain scoring are supplied.

Only the current settled frame is requested, without neighbor prefetch, bulk download or persistent source caching. Each response is capped at 8 MiB before decode, including chunked bodies; MIME/status and exact decoded dimensions are checked. A 20-second timeout bounds each group. Panning, zoom/orientation changes, retries and provider changes abort/invalidate superseded groups. Print requires every selected layer from the current completed group; partial or stale groups cannot silently substitute another map. Appearance/contrast changes reuse loaded images. Native Print stays synchronous inside its click handler.

Light relief is drawn first; water uses multiply composition so white source land does not conceal relief. Contours and the selected road context are placed above it. B&W conversion is applied after composition. The selected sources are rendered within the outline; surrounding terrain imagery is not requested. Preview content moves during drag, and the new settled frame replaces it after loading.

CSP adds carto.nationalmap.gov, basemap.nationalmap.gov and elevation.nationalmap.gov to connect-src for bounded image fetches. Image decode uses blob URLs, which are revoked after decoding. No script/CDN exception, account, token or runtime dependency is added.

## Validation

- Unit checks cover independent Mercator coordinates, shared envelope/grid/aspect, sparse layer selection, zoom/map-edge limits and response byte/type/status limits, including oversized chunked bodies.
- Both packaged browser/CSP profiles exercise B&W/color, both Letter orientations, optional light relief, missing-layer print blocking, stale-view cancellation, keyboard panning, unsupported zoom and restoration of vector streets. Exact output dimensions and grayscale samples are checked. Downloaded/native PDFs must contain a one-page image; existing geometry/page-fill and compression quality gates remain.
- Bounded real-source PNG exports returned HTTP 200 with anonymous CORS. A mountainous footprint's contours/water and optional hillshade were replayed locally into real application downloads. Both no-relief/light-relief PDFs independently rendered as one landscape Letter page with visible content, attribution, north and scale. A second bounded context sample returned water and labeled trail imagery; its contour request timed out. Raw source imagery and temporary review outputs are outside git.
- Physical paper and target Safari acceptance of this new composition remain pending. Automated checks and visual inspection do not establish contour-reading accuracy, safe/legal access or learning transfer.

Execution evidence: 164 Node tests, fixture reproduction, synthetic pack validation and the full packaged Chromium release suite pass under host-header and Pages meta CSP. The existing print-quality gate retains 11/11 synthetic thin-line sample centers and zero added PDF compression error. These contrast metrics belong to that synthetic fixture, not to a measurement of real terrain readability.


Contour-details follow-up (2026-10-16): source metadata is now queried separately after image readiness. Missing/pending metadata never disables basic printing; snapshots carry reported/mixed or unverified status. This supersedes the earlier per-extent-unverified-only behavior. See [metadata contract and live evidence](contour-metadata.md).


Street-context correction (2026-10-16): a user-supplied Terrain export had contours/water without the expected streets. The original request deliberately excluded local/connecting-road layers, so a successful PNG load did not prove useful street context. Default to Streets + trails, including geometry 31/32 and labels 20/21 (plus ramps 33); retain Highways + trails only as an explicit sparse choice. Road selection participates in the image snapshot key and printed credit; changing it blocks Print until the current layers are ready. Same-area contour metadata remains reusable. Tests require actual local-street pixels and exercise a late sparse response after switching back to Streets. Real default-area exports confirmed local streets and names; no user source imagery is committed.

Correction validation: 168 Node tests, fixture reproduction, synthetic pack validation and the full packaged Chromium suite pass for header CSP and Pages meta CSP. Browser checks cover local-road pixel presence, sparse omission, late road-choice results, same-area metadata reuse, phone reflow and both paper orientations. Bounded real default-area exports returned HTTP 200/CORS; the combined B&W streets and sparse PDFs were independently rendered as single landscape Letter pages. Local names and road lines are visible in the streets version. Actual paper/Safari acceptance of this corrected composition remains pending.
