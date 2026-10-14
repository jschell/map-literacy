# Browse and print a street map

The geographic viewer starts at the fixed Redmond example, zoom 15. It does not request device location or infer a home. Pan/zoom to choose an area; the Letter orientation follows the existing saved setting.

## Basic controls

- Print appearance defaults to **Black and white**: vector black roads/text on white paper, with lighter context outlines and road hierarchy. Color is optional.
- Street names offer **Labeled**, **Partly labeled** and **Blank**. Partial selection is deterministic from source names. Landmark names are independent.
- The center/zoom define a fixed reference footprint, independent of viewport size. The map backdrop scales to the Letter frame; changing orientation swaps its long/short axes. Phone and desktop render the same paper extent for the same center, zoom and orientation.
- The selected frame previews street geometry. Screen labels use a 12-pixel minimum and can omit more crowded names; paper layout uses 8.5-point names. The status reports paper/preview coverage and source roads without names. Zoom in when paper labels cannot fit.
- Print this map opens the native dialog synchronously as soon as either vector streets or the current frame’s map tiles are ready. Vector streets remain preferred, with north arrow, calibrated scale bar, editable name modes and sharp geometry/text. While street data is loading, rejected or unavailable, basic printing uses the loaded visible tiles: fixed baked-in names, no practice markings, and raster resolution. The status beside Print and the paper footer identify that fallback; B&W/color applies to both outputs. Both use one Letter sheet with 10 mm margins and attribution. No pack, session or mandatory export is needed. Printing waits only if neither current-view output is available; it never prints a previous area.
- Download SVG map preserves vector geometry, visible attribution and source provenance metadata. Download map source preserves exact raw response text, SHA-256, query, bounds, timestamps, IDs/tags/node references, view choices and markings.
- Practice markings allow a start, destination, drawn route and heading arrow. Tap the frame or focus the map and press Enter to place at its center. Clear markings removes these drafts. They do not verify road connectivity, access or driving-valid routes.
- Geographic appearance, street names, heading and markings are memory-only. Shared Letter orientation retains its existing saved-preference behavior. Lesson labels/rotation/scale remain separate.

Place search still opens the normal OpenStreetMap website in a new tab. Paste an OSM map link or latitude, longitude into Go to location. Reviewed lesson packs add exercises, scoring, editable lesson labels and worksheets without blocking basic geographic use.

## Source and provider boundary

The explicit adapter queries `https://overpass-api.de/api/interpreter` for bounded OSM street geometry, source names, water/park way outlines and school/library/hospital/police/fire-station amenity nodes. It includes named footways/steps and excludes parking aisles, anonymous footways/steps and indoor corridors/platforms to keep street cartography useful and bounded. It is not a complete walking/routing graph or a complete building/POI layer.

Whole-way geometry and node IDs are retained, even outside the display bounds. Drawing is clipped at the paper edge; outside endpoints do not cause a road to be discarded. Missing names stay missing; collision/length suppression is reported separately. Explicit bridges/layers/tunnels and supported unconditional oneway tags affect drawing, without inferring permissions or answers.

The adapter uses the shared local azimuthal-equidistant projection, with scale computed in meters per physical paper unit. Limit: query diagonal under 10 km, latitude within ±70°, no dateline-crossing extent; 8 MiB response, 5,000 source objects, 2,500 display features, 1,500 roads and 40,000 coordinates. Dense/unsupported areas ask for a closer zoom. No terrain-elevation inference is introduced.

The [Overpass operator's commons guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), reviewed 2026-10-14, describes shared capacity, quotas/load shedding and problematic large-app reliance. This is a low-volume prototype, not a production availability contract. Requests are human-view driven, coalesced after 650 ms, separated by at least five seconds, with one active client request, cancellation/stale-result protection, a three-snapshot memory cache and a 25-second client timeout. HTTP 429/503/504 respect a minimum 30-second pause and Retry-After; failed areas do not automatically retry. Larger rollout needs an operator-owned or otherwise approved source backend. The endpoint is isolated in the adapter; changing it requires provider and CSP review.

The query declares a 20-second/32-MiB server budget; that RAM declaration differs from the 8-MiB response-byte cap. It requests only the current bounded extent with a small context margin, not a worldwide sweep. Street/source requests disclose viewed extents to the provider. No learner identities, GPS or background tracking are collected.

Surrounding raster context uses the [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/), visible attribution and normal browser image caching. Only currently visible tiles are requested; printing does not fetch a higher tile zoom or build archives. Scripts/styles remain self-hosted. Both static CSP policies add only `https://overpass-api.de` to connect-src and retain the tile-host img-src exception. There is no public Nominatim API integration.

## Evidence and remaining checks

150 Node checks cover source identity/geometry, exact raw UTF-8/hash preservation, resource failure/backoff, projection/physical extent/scale, whole-way clipping, stable label variants and dense-name collision/minimum-size behavior.

The full packaged Chromium suite passes against both header and Pages meta CSP. It checks startup print without a pack, both one-page Letter vector PDFs without raster image objects, modes, a readable 320-pixel preview, viewport-independent paper extent, SVG attribution/source export, keyboard markings/heading, slow source loading, HTTP 406 rejection and invalid source with current-view tile printing in both orientations, no stale vector printing, zoom limits and direct print invocation despite unresolved image.decode. Existing lesson scoring, backup, storage, preferences and worksheet checks pass. Automated checks mock external services.

Manual bounded API probes returned HTTP 200 JSON for the default Redmond footprint, browser-Origin CORS permission, and parsable source names/geometry. The default landscape response contained 1,431 display features; its visible area had 68 distinct names before layout. This is point-in-time source evidence, not an availability guarantee. No captured live extract is committed. A later same-area service check returned HTTP 406 without CORS headers, illustrating why source availability must not gate basic printing. This does not establish the cause of every user/device failure.

Rendered synthetic portrait/landscape PDFs were inspected. Actual Safari/iOS output with this new vector path and actual-size monochrome paper still require acceptance. Context-layer completeness, production source hosting, geography-specific saved preferences, and reviewed real lessons remain follow-up work.
