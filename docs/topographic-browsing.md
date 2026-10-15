# Topographic browsing and Letter print

The map-type selector offers Streets and Topographic — USGS (US). Switching preserves the geographic center and clamps topo zoom to 16. Existing pan, zoom, coordinate jump, Letter portrait/landscape and direct Print controls apply. Streets remain the default. No account, key, new runtime dependency or lesson pack is required.

The first topo implementation displays USGS's pre-rendered map imagery, including source contours, elevation labels, water, roads and shaded relief where available at the chosen scale. It is not a DEM or editable contour layer. Detail is US-focused; low-detail/blank coverage can occur outside US coverage or at unsuitable scales. Names, contour intervals/units and relief are baked into the source image; no uniform interval, vertical datum or numerical elevation is inferred from pixels. Street source acquisition, exports, label editing and practice markings are disabled in this mode. Terrain packs and exercises remain unsupported by street-core import.

## Source review — 2026-10-14

- Service metadata: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer?f=pjson
- Basemap description: https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map
- Terms and acknowledgment: https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map
- Service uses 256 × 256 cached mixed-format tiles in EPSG:3857 (102100), northwest origin and ArcGIS level/row/column order. The current service advertises LOD entries beyond its supported display scale; maxScale 9027.977411 corresponds to level 16. The client caps at 16 rather than relying on larger LOD numbers.
- The National Map services/data are free and public domain. Printed output includes the requested acknowledgment: “Map services and data available from U.S. Geological Survey, National Geospatial Program.” Screen attribution links to The National Map.
- A bounded manual default Redmond tile probe returned HTTP 200, JPEG and Access-Control-Allow-Origin: *. One 12-tile default landscape footprint was captured for local visual replay; source imagery is not committed. Availability and CORS are observations, not a service guarantee. Do not bulk download, prefetch surrounding views or treat this public endpoint as a production SLA.

Only settled visible tiles are requested. Provider-specific cache keys and clearing images on switching prevent street/topo mixing. Orientation/preference changes refresh tile coverage and print readiness as well as the outline. Pending street requests are aborted/invalidated when switching to topo; topo neither relies on Overpass nor adds USGS to connect-src. The only CSP change permits images from https://basemap.nationalmap.gov. Both host-header and Pages-meta CSP packages use the shared policy.

Printing reuses loaded current-view tiles with anonymous CORS. B&W creates actual grayscale canvas pixels; it does not rely on printer color conversion or CSS filtering. Color retains source tiles. The native print call stays synchronous in the click handler. A missing/failed current-view tile disables Print; retry reloads that layer. Raster output is less flexible/sharp than vector contours and retains baked-in shading. A white-backed north arrow and approximate center scale are added; scale varies away from the center in Web Mercator. Actual contour interval and units must be read from the source map; this preview does not certify contour-reading answers.

## Validation and remaining work

Unit checks cover provider row/column order, isolated cache keys, identical geographic extent and invalid/out-of-range tile rejection. Browser checks cover both package/CSP profiles, switching from an already ready street SVG, no topo Overpass requests, grayscale pixels, embedded raster content, one-page Letter portrait/landscape output, zoom clamping, missing tiles/retry and restoration of vector street printing.

Actual Safari topo printing, physical B&W contour/label legibility and representative mountainous areas remain device/manual acceptance gates. The user's successful street Safari sample confirms only the street print layout, not topo acceptance.

Plan 08 still needs a reviewed elevation product with horizontal CRS, vertical reference/units, grid resolution/origin, nodata and version metadata; then contour derivation/labels, independent shading, terrain exercises and known-answer fixtures. Neither shaded pixels nor OSM road geometry supplies that elevation model.

## Next view: terrain with sparse road context

User direction (2026-10-14): make a useful view of mostly topo with some road features. The full composite USGS basemap above is a first option, not the final terrain-focused composition. The intended additional view prioritizes labeled index/intermediate contours and water, with major roads and trails for orientation; omit buildings, parcels and most local street names. Hillshade should be optional/light for monochrome output.

Official separate services reviewed on 2026-10-14:

- Contours: https://carto.nationalmap.gov/arcgis/rest/services/contours/MapServer — scale-dependent contour groups and labels; large-scale intervals vary by quadrangle and lines can mismatch at boundaries. Do not promise a single interval without checking local metadata.
- Transportation: https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer — separate highway, connecting/local road and trail features/labels support selecting sparse orientation context.
- Optional relief: https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer — dynamic hillshade render functions are visualization, not a substitute for reviewed elevation grid metadata.

Implementation acceptance: verify export/query/CORS behavior, bounded data/image sizes, source scales and co-registration; keep contour units/intervals explicit; verify a mountainous area and B&W physical print; disable printing if any required current-extent layer is missing. Separate services are researched, not implemented in this first raster mode. Building that composition does not require enabling numerical terrain scoring or live navigation.

Execution evidence (2026-10-14): 155 Node tests pass; the complete packaged Chromium release suite passes for host-header and Pages-meta CSP. Both topo Letter orientations embed raster output on one page; actual grayscale pixels and street-mode restoration pass. The real 12-tile default sample was replayed locally and its one-page B&W landscape PDF rendered and visually inspected. Contour contrast/label sharpness is limited by source raster styling; device/physical acceptance remains open.


Orientation follow-up: the affected Safari device produced a visible one-page topo map, but selected landscape still yielded a portrait physical page. This confirms map visibility for that sample, not orientation/physical topo acceptance. Use Download Letter PDF for an explicit landscape/portrait file; see [PDF output](pdf-output.md).
