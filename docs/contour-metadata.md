# Source-reported contour units and intervals

Terrain now queries contour attributes for the outlined area and displays the result below the map. Print/PDF snapshots include the current result in their footer. For example, **Source contour intervals: 20 ft, 40 ft (vary within this area); elevations in ft.** means the source returned both intervals in this extent. It does not identify a single uniform interval, assign a value to every line, verify individual elevations or establish a terrain lesson answer key.

These details are additive. A ready map can print while details load, and still prints after an unavailable/incomplete response. Its footer then says units/interval are unverified, with pending/unavailable status. Retry map reloads the view and details. Existing generated PDF links keep their original snapshot; generate a new PDF to include subsequently loaded details.

## Query contract

The client queries rendered geometry layers **25, 26, 33, 34** (normal/depression index and intermediate contours). Label layers 21/29 repeat those source features. Each query uses exactly the image group's EPSG:3857 bbox, spatial intersection, no geometry, and distinct `contourunits,contourinterval` values. The [USGS layer schema](https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer/26?f=pjson) defines contourunits code 1 as Feet, 2 as Meters and 99 as Unknown. No unit is inferred from a bare raster label, generic layer description, Z coordinate or vertical CRS metadata.

[Esri's layer query contract](https://developers.arcgis.com/rest/services-reference/enterprise/query-map-service-layer/) documents distinct fields, returnGeometry=false and the exceededTransferLimit flag. The request caps each layer at 32 rows/128 KiB, including chunked responses. One independent 10-second timeout bounds the metadata group; no pagination or bulk source acquisition is attempted. The four small metadata queries start after the selected map images load. No CSP origin or dependency is added.

A summary requires all four responses, no truncation flag, at least one record overall, recognized unit codes, positive finite intervals and at most eight distinct unit/interval pairs. Empty depression layers are valid; four empty layers cannot establish units. Missing layers, unknown/null fields, malformed/oversized responses, service errors or excess variants produce unverified status. Known values from partial results are not displayed as a complete summary. Multiple units remain paired with their intervals, without conversion.

Metadata uses an independent request lifecycle so a failure cannot cancel loaded map imagery or disable basic printing. Only the current extent's result can update its snapshot. Panning/provider/extent changes cancel/discard old queries; appearance and light-relief changes reuse details for the same bbox. Completed information stays in memory for the current area only. Source reporting is not an immutable data release: map images and metadata are separate live requests, so changes between requests remain possible.

## Evidence — 2026-10-16

Four bounded live queries for the existing mountainous review view (47.5, -121.75, zoom 15, landscape) returned HTTP 200 with anonymous CORS. Normal index/intermediate responses each reported **20 ft and 40 ft**; both depression responses were empty. This supports a mixed-interval summary for that sample, not a nationwide interval claim. Captured responses remain outside git. Earlier metadata timeouts remain relevant evidence that details must not block printing.

Unit checks cover repeated/uniform pairs, mixed intervals, mixed units, unknown/null/invalid values, empty/partial/truncated responses, spatial request fields, UTF-8 and chunked byte limits. Both packaged browser/CSP profiles cover screen/footer results, pending details, failed/unknown/truncated details with Print still enabled, same-area reuse and stale metadata rejection after moving. Existing image failure gates, native invocation, one-page Letter downloads and compression checks remain in place.

Full elevation/terrain lessons still need reviewed source/version, grid resolution, horizontal and vertical references, nodata, uncertainty and known-answer fixtures. Source-reported contour attributes alone do not supply that contract. Target Safari and paper acceptance of the new footer remain pending.

Execution result: all 167 Node tests, fixture reproduction, synthetic pack validation and the full packaged Chromium suite pass under host-header and Pages meta CSP. Generated mixed-interval and pending-detail PDFs were independently rendered and visually inspected as single Letter pages with complete footer text.
