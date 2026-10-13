# Architecture proposal

Status: street-core v1 contract baseline; see [pack contract](contracts/lesson-pack-v1.md) and [application contract](contracts/application-v1.md). Runtime implementation begins in Plan 02.

## Shared core

| Layer | Responsibility | Candidate implementation |
|---|---|---|
| Acquisition | Bounded source fetch/import, completeness and provenance | Browser fetch or JavaScript preparation tool |
| Pack validator | Version, bounds, identifiers, units, references and review status | Pure JavaScript validation |
| Map model | Display features plus separate graph/elevation layers | GeoJSON and explicit source/topology records |
| Projection | Geographic/local coordinates and paper units | Tested transform; local azimuthal equidistant for bounded street-core; terrain CRS later |
| Renderer | Road/terrain layers, labels and interactive overlays | SVG for bounded teaching maps |
| Lessons | State, answers, tolerances, hints and review | Deterministic JavaScript modules |
| Print | Fixed extent/layout and answer variants | SVG + external CSS print rules |
| Persistence | Packs, attempts, preferences, backups and migrations | IndexedDB adapter |
| Routing | Requests and normalized maneuvers | Provider adapter; OSRM/Valhalla candidate |
| Desktop | Optional native file/storage/export integration | TinyJS adapter, deferred |

Proposed later folders: src/{data,geo,map,lessons,print,storage,routing,ui}, scripts/, tests/fixtures/, public/, docs/. This planning PR creates documentation only.

## Lesson-pack boundary

Candidate sections: schemaVersion, pack identity/revision, module, bounds and coordinate systems, source manifest, display features, topology, optional elevation/contours, manual labels, reviewed exercises/rubrics, print presets and optional routes. Street-core types/ranges are defined by the linked contract. Terrain/directions are reserved capabilities rejected until their later payload contracts are implemented.

Source entries record canonical URL/query, fetched time, source time/version when supplied, hash, extraction/transform versions, license, attribution and reviewer status. Derivative packs retain this manifest. Route provider/version/options and elevation resolution/units/reference are independent source entries. Stored routes may use different snapshots; detect and report inconsistencies.

Validate imports before replacing records; bound bytes/features/raster size, reject unsupported versions, invalid coordinates and unresolved references. Treat labels as text, never imported executable HTML/JS. Specify transactional migration and rollback before implementing persistence.

## Geometry, topology and scale

GeoJSON is for drawing and exchange. Use original OSM nodes/ways/relations for connection and restriction reasoning. Bridges crossing roads are not automatically junctions. Clip display extent separately from routing extent; request boundary buffers and reject incomplete examples.

Do not derive print scale from uncorrected Web Mercator screen units. Choose a projection and scale computation with known distances, define acceptable error and render a calibrated scale bar. Keep true north, grid north and map rotation distinct where relevant; topo magnetic compass work requires dated declination/reference decisions.

SVG offers manipulable layers and scalable print output but requires label collision handling, clipping and text sizing. Start with manual label overrides; evaluate Canvas/MapLibre only if measured pack complexity demands it.

## Execution and services

Static browser UI initially; no server required for prebuilt packs. Source fetching depends on network/CORS/service policy; an optional JavaScript preparation CLI can avoid browser acquisition limits. A Node.js development/preparation tool is compatible with a vanilla frontend and does not imply Node in end-user browsers.

Heavy raster parsing/contouring can run in Web Workers; select explicit memory/bounds limits. Topo can begin with reviewed precomputed contours before in-browser DEM derivation.

Routes are calculated by an external engine through HTTP, then normalized into pack data. Browser keys and CORS are provider-specific; a same-origin proxy may be needed. Self-hosting requires preprocessing and refresh orchestration, separate from static hosting.

## Failure and lifecycle work

The application contract defines startup (open storage -> validate/migrate -> select pack -> readiness), shutdown/save semantics, canceled work, storage failure, corrupt imports, missing source, unknown correctness and zero exercises. Route failure must not silently substitute straight-line directions. Elevation nodata must not silently become zero meters.
