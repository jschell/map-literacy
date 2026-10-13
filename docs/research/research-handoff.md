> Historical research snapshot imported from the merged ideas repository. This is context, not current implementation instructions. See [sources](sources.md) for provenance and [current plans](../plans/README.md).

# Street Map Learning — Research and Tooling

**Status: In Draft.** Source review date: 2026-10-11. This file records the research available in the originating conversation. Website capability descriptions are not installation tests, printed-output tests or evidence of learning effectiveness. Verify current versions and behavior before choosing dependencies.

## Research question and evidence limits

The user observed a possible deficit in current learner drivers' spatial awareness regarding street maps/navigation. The cited studies support investigating navigation learning and GPS dependence; they do **not** establish a generational decline, prevalence among learner drivers, or that this proposed tool improves driving safety.

### GPS habits and spatial memory

**Dahmani & Bohbot (2020), Habitual use of GPS negatively impacts spatial memory during self-guided navigation.**
- Primary paper: https://www.nature.com/articles/s41598-020-62877-0
- DOI: https://doi.org/10.1038/s41598-020-62877-0
- Cross-sectional sample: 50 regular drivers; longitudinal follow-up: 13 after roughly three years.
- Greater GPS experience was associated with poorer performance on some spatial-memory/cognitive-mapping measures.
- Important limitations: small follow-up, virtual tasks, self-reported GPS habits and no randomized assignment of long-term GPS use. Do not convert the title into a general causal claim.

**Topete et al. (2024), How is GPS used? Understanding navigation system use and its relation to spatial ability.**
- Primary paper: https://link.springer.com/article/10.1186/s41235-024-00545-x
- 249 participants across two preregistered studies.
- Reported GPS dependence was associated with poorer navigation performance, poorer self-reported sense of direction and greater spatial anxiety.
- Objective performance was not significantly associated with reported use of each individual GPS function.
- Authors explicitly state that the correlational design cannot determine causality. Some navigation was measured in a desktop virtual environment.
- Differentiate dependence from use for route preview, traffic estimates or services.

**Perspective taking ability is important in map reading for navigation – Unless you follow the instruction (2025).**
- Primary publisher page: https://www.sciencedirect.com/science/article/pii/S0272494425000672
- Search metadata described map-reading instructions/training and perspective taking.
- Full page retrieval was blocked. Treat as a literature follow-up, not a verified result or supporting evidence for effectiveness.

## Existing or adjacent teaching solutions

| Resource | Observed capability | Relationship to the proposed idea |
|---|---|---|
| Training Wheels Driving School | Exercises in local-road direction, written routes, map location and return navigation | Establishes related teaching practice; manual instruction may be an effective baseline |
| RoadMode | Parent/supervisor practice-route planning by learner stage, time and driving skill | Adjacent route planner; not demonstrated to assess map literacy |
| ObjectiveEd Wayfinding, described by Perkins | iPad mental-mapping games designed for visually impaired learners | Related learning approach; exact general street-driving overlap not established |

Links:
- https://www.twdrivingschool.com/reading-maps-and-learning-directions/
- https://roadmode.app/
- https://www.perkins.org/resource/objectiveed-wayfinding-app/

These pages were opened. Marketing descriptions do not prove effectiveness. No exhaustive competitor search has been completed, and absence of a found equivalent is not proof of novelty.

### Driving interaction

NHTSA identifies navigation-system interaction as a possible distraction:
- https://www.nhtsa.gov/book/countermeasures-that-work/distracted-driving

Proposed design implication: do interactive lessons while stationary, with walking/passenger observation and pre/post-drive activities as distinct stages. Do not claim removing GPS or reading paper while driving is inherently safer.

## Printable OSM maps

### Direct OpenStreetMap

- Export documentation: https://wiki.openstreetmap.org/wiki/Export
- Main site: https://www.openstreetmap.org/
- OSM data export and rendered map-image export are different.
- Rendered exports documented include PDF, SVG and raster formats.
- A direct export may be sufficient. Check grayscale contrast and actual-size labels before adding another service.

### MyOSMatic / MapOSMatic

- https://print.get-map.org/
- https://print.get-map.org/about/user-guide/
- Home page confirms printable PNG/PDF/SVG and plain/index/multipage layouts.
- Guide search retrieval describes CartoOSM B&W (grayscale) and Toner (black/white high contrast).
- Full guide open exceeded retrieval size; individual style descriptions were available in search retrieval.
- Benefits: monochrome styles, street index and atlas layouts.
- Not better underlying geographic data; not a validated educational system.
- No render job or print comparison was run in this conversation.

### Inkatlas

- https://inkatlas.com/create/
- https://inkatlas.com/features/
- Inkatlas Urban is described as a detailed black-and-white street map.
- Features page describes paper-oriented scale/resolution, multipage atlases, OSM-derived data and added GPX/GeoJSON points/tracks.
- Some advanced capabilities require particular plans; pricing and exact export formats are not settled here.
- Create page reports that style preview may be approximate and style-specific output restrictions exist.
- No generated output was inspected. Do not assume a particular style yields editable vectors.

### QGIS

- https://www.qgis.org/
- Print layout: https://docs.qgis.org/3.44/en/docs/user_manual/print_layout/index.html
- Can export image/PDF/SVG and build a deliberate monochrome style.
- Best candidate for manually developing matching labeled/partial/blank map variants.
- Downloading raw OSM features does not automatically reproduce the OSM website's cartography. Styles and label placement need work.

## Packages that interact with OSM

| Package | Role | Candidate project use | Verification needed |
|---|---|---|---|
| QuickOSM | QGIS plugin: Overpass queries, local OSM/PBF loading | Retrieve roads, buildings and landmarks separately | Query extent, tag coverage, labels and downloaded relations |
| OSMnx | Python street graph/features analysis | Bearings, intersections, paths and exercise selection | Simplification, complex intersections, restriction handling |
| Mapnik | Cartographic renderer | Repeated monochrome output; PDF/SVG through appropriate Cairo support | Build capabilities, fonts, style setup and actual outputs |
| Leaflet | Browser map/GeoJSON interaction | Road selection, heading tokens and route overlays | Separate print generation; map data acquisition |
| MapLibre GL JS | Browser vector-map rendering | Interactive label/layer control | Tile/data source and print pipeline |
| OSRM | Routing engine | Routes, maneuvers, alternatives and matrices | Routing profile, restriction coverage and scenario suitability |
| Valhalla | OSM routing engine with multiple modes | Driving/walking routes and map matching | Resource needs, costing/profile choices and data correctness |
| Pyosmium | Raw OSM stream/file processing | Preserve/filter source tags and relations | Reconstruction of usable geometry/topology |
| Geofabrik | Regional OSM extract distributor | Dated Washington source snapshots | Boundary clipping, updates and retained objects |

Primary documentation:
- QuickOSM: https://plugins.qgis.org/plugins/QuickOSM/
- OSMnx: https://osmnx.readthedocs.io/en/stable/getting-started.html
- OSMnx reference: https://osmnx.readthedocs.io/en/stable/user-reference.html
- Mapnik: https://mapnik.org/documentation/
- Mapnik renderers: https://github.com/mapnik/mapnik/wiki/mapnikrenderers
- Leaflet GeoJSON: https://leafletjs.com/examples/geojson/
- MapLibre: https://maplibre.org/maplibre-gl-js/docs/
- OSRM: https://project-osrm.org/docs/v26.5.0/http
- Valhalla: https://valhalla.github.io/valhalla/
- Pyosmium: https://docs.osmcode.org/pyosmium/latest/
- Geofabrik Washington: https://download.geofabrik.de/north-america/us/washington.html

Maperitive was also considered as a desktop OSM-to-SVG renderer. Its official documentation could not be retrieved, and current compatibility/maintenance was not established. It is not a selected dependency.

## Data and attribution

- https://www.openstreetmap.org/copyright
- OSM data is under ODbL; map outputs need appropriate attribution.
- For print, retain credit to OpenStreetMap contributors and the copyright/license URL.
- Data licensing does not imply unrestricted use of publicly hosted tiles, geocoding or query services. Check the respective service policies before automation.
- Cache/reuse bounded snapshots for repeatable exercises, and record extraction date and boundary.
- Source completeness matters: missing tags or restrictions cannot establish absence of a real-world rule.
- Synthetic exercise modifications must be clearly separated from the actual OSM source; do not upload fictitious lesson roads/restrictions to OSM.

## Evidence still needed

- Exact competitors and existing curriculum coverage for street-map literacy in learner-driver education.
- Local OSM completeness at relevant intersections and landmarks.
- Same-area printable comparison and actual black-and-white printer test.
- Appropriate lesson progression and educator/instructor review.
- A rubric accepting multiple valid answers.
- Retention and unfamiliar-area transfer.
- Learner/instructor adoption and willingness to pay, if commercial goals are pursued.
- Hosting/API costs and licenses after stack selection.

No code, downloaded map dataset, lesson packet or effectiveness study was produced in the originating conversation.

## JavaScript, TinyJS and directions follow-up (2026-10-12)

This follow-up records documentation review and proposed architecture. No JavaScript prototype, TinyJS installation, routing service, route correctness trial or print test was performed. The README contains the corresponding proposal; the stack remains unselected and the idea remains In Draft.

| Primary source | Capability reviewed | Project implication |
|---|---|---|
| https://github.com/tarwin/tinyjsapp | Desktop system-webview frontend, txiki.js backend, native integration and SQLite | Optional desktop wrapper around a browser-compatible learning UI |
| https://github.com/tarwin/tinyjsapp/blob/main/skill/references/platforms.md | macOS primary, Windows/Linux beta; per-platform PDF behavior | No documented mobile target; test printing and target-platform operation |
| https://leafletjs.com/reference.html | GeoJSON, SVG/Canvas and map interactions | Optional area selector/interactive map; pin a release and matching documentation |
| https://leafletjs.com/examples/geojson/ | Styling, filtering and per-feature interaction | Suitable for bounded geographic overlays |
| https://github.com/tyrasd/osmtogeojson | Browser conversion of OSM JSON/XML to GeoJSON | Retain original source topology separately; converter is not a route engine |
| https://turfjs.org/ | Browser-capable geographic calculations | Focused geometry utilities, not driving restriction/maneuver handling |
| https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API | Structured client-side storage | Local packs/attempts with explicit import/export backup |
| https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing | Print media rules and page styling | Dedicated worksheet layout; verify paper dimensions and physical scale |
| https://project-osrm.org/docs/v5.24.0/api/ | Route geometry, steps, alternatives, matching | API concepts reviewed using versioned docs; recheck against chosen engine release |
| https://github.com/Project-OSRM/osrm-text-instructions | JavaScript instruction formatting from OSRM responses | Readable text is separate from structured OSRM maneuvers |
| https://valhalla.github.io/valhalla/ | Multimodal routing, dynamic costing, narrative generation, regional routing data and Docker deployment | Provisional candidate for walking and driving; not selected |
| https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server | Public demo usage guidance | Verify current policy before evaluation; do not assume production availability |
| https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition | Continuous browser position updates with secure-context and permission requirements | Input to live navigation, not a complete navigation implementation |

Additional larger-area option:
- https://maplibre.org/maplibre-gl-js/docs/
- https://docs.protomaps.com/pmtiles/
MapLibre and PMTiles were reviewed as alternatives for scalable vector-map delivery, not selected for the first bounded SVG lesson pack. Drawing tiles do not replace a routing graph.

TinyJS platform documentation was successfully read through the GitHub connector. Current project documentation differs from broad marketing shorthand: Windows uses WebView2; macOS uses WKWebView; Linux uses WebKitGTK. Distribution size claims are not measured runtime-memory or map-performance results. Native printToPDF is documented as one tall page on macOS and paginated on Windows/Linux.

Valhalla's old turn-by-turn reference URL redirected without readable reference content during this review; the accessible project overview supports the general capabilities recorded above. Request/response fields, costing options, spoken-instruction fields and current route API must be verified against the chosen release before an implementation contract is finalized.

Remaining evidence: target-device performance; browser storage/backup behavior; SVG projection and label readability; actual-size paper output; source completeness; route/map snapshot consistency; reviewed maneuver correctness; hosted-service policies or self-hosting resource requirements; and background/location behavior only if live navigation is later pursued.
