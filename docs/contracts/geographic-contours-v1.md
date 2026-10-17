# Geographic contour sidecar v1

Status: offline preparation, structural validation and optional shared-renderer overlay implemented. This is a draft display sidecar, not a supported terrain lesson pack, scored exercise or new map-menu mode.

## Preparation and references

`tools/elevation/geographic_contours.py GRID.json OUTPUT.json --levels 200,300` invokes the bounded Node grid validator/segment generator/stitcher and an independent source-elevation/edge audit. It then converts EPSG:26910 vertices into longitude/latitude display coordinates with pinned PyProj/PROJ. LOCAL_METRIC fixtures are rejected rather than assigned a real-world location.

The initial display operation deliberately selects **EPSG:1188, NAD83 to WGS 84 (1)**, with reported accuracy **4 m**. PROJ networking is disabled; a regional high-accuracy grid is not downloaded or silently substituted. The selected operation, pipeline, accuracy and tool versions are retained. `always_xy=True` produces longitude/latitude order. Source references: [PyProj Transformer API](https://pyproj4.github.io/pyproj/stable/api/transformer.html) and the operation metadata in the pinned PROJ database. This is an explicit approximate display operation, not proof that NAD83 and WGS84 are identical or that absolute source accuracy is 4 m.

The preparer is limited to the existing zone-10 benchmark reference and output coordinates within longitude [-126,-120], latitude [24,70]. Every converted vertex is inverse checked within 1e-6 projected metres. That numerical round trip measures consistency, not datum/source accuracy. Vertical values remain metre elevations referenced to NAVD88; no vertical conversion occurs. Unknown source vertical uncertainty remains null.

## Artifact

| Field | Meaning |
|---|---|
| `format` | `map-literacy-geographic-contours-v1` |
| `coordinateReference` | `OGC:CRS84`, longitude/latitude display order |
| `review` | Always `draft` in this version; reviewed values are rejected |
| `grid` | Full validated normalized elevation-grid-v1 snapshot, including original source metadata and transforms |
| `sourceGridSha256` | SHA-256 of the exact input grid file bytes; not a replacement for upstream TIFF/XML hashes |
| `operation` | EPSG operation ID, reported horizontal accuracy, pipeline/description, tool versions, maximum round trip and `verticalConversion: false` |
| `gridCornerBounds` | Envelope of four transformed grid corners; not a claim of exact curved grid footprint or full-feature bounds |
| `skippedCells` | Original marching-squares missing-cell count |
| `contours` | Connected-line fields with geographic line/junction coordinates; metre levels, duplicate counts and review status retained |

The full source grid is retained so provenance and elevations are not discarded when geometry is converted. A hash-shaped string and structurally valid metadata do not authenticate upstream content. Acquisition verification and the exact-byte reproduction record remain separate evidence. Nothing in the artifact establishes access, safe terrain travel or a valid walking/driving graph.

The Node preparer reads at most 32 MiB plus an overflow byte before parsing, with existing grid/cell/segment limits. Its output and the Python artifact are capped at 64 MiB; subprocess derivation has a 60-second timeout. These are preparation limits, not a browser performance guarantee. Existing output files are never overwritten. Output paths should remain outside git; preserve original acquisition metadata when reproducing exact artifacts and separately record reacquisition/hash verification time.

## Shared display integration

`validateGeographicContours` validates the supported draft/reference/operation metadata, finite coordinates, closure flags, levels, counts and junction status. It does not recompute terrain answers or authenticate geographic line positions against the embedded grid.

`createContourOverlayModel(sidecar, mapModel)` uses the existing map model's `convert`, `clip`, scale and orientation. The display budget is smaller than the preparation budget: at most 1,000 lines and 10,000 line coordinate positions. Over-budget input fails explicitly. `renderMap(document, model, {terrain: sidecar})` draws clipped monochrome contours under road geometry and adds a visible draft/4 m operation note; the SVG title retains the source-grid hash and vertical reference. The caller must carry full source attribution into any surrounding output document.

This is a programmatic integration API. The deployed interface has no sidecar upload control, saved sidecar preference or approved terrain exercise. Existing street sessions, backups and map-type choices keep their current contracts. Numerical terrain overlays are not silently added to a street pack or its scored revision.

## Proposed lesson-pack integration gate

Before enabling imported terrain lessons, implement a versioned pack payload and all consumers together. The proposed first capability is a bounded terrain-only pack with the grid/sidecar, explicit sources/review and contour-elevation questions. It must not infer a route graph from contours or require a routing provider.

The first synthetic teaching slice now uses a separate [version-2 envelope](terrain-lessons-v2.md) with terrain-contours-v1. This does not approve or import the real geographic sidecar; its eventual pack payload and real-source review remain separate work. Do not place an unsupported payload into currently empty `extensions`. Until pack validation, storage/backup, scoring and paper contracts are implemented together, current street-core import must continue rejecting `terrain-v1`.

Acceptance must include exact pack/revision/source binding; source/grid/operation attribution on paper; unknown uncertainty and datum limits in rubrics; malformed/oversized import retaining old state; reviewed real road/trail tie points; index/intermediate contour and label policy; both-orientation PDF/scale checks; and independently reviewed known answers. A synthetic coincident-road/contour rendering check proves shared transforms, not real source alignment or curriculum validity.
