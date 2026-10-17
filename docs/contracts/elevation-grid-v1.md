# Elevation grid v1

A standalone preparation artifact implemented by `src/terrain/grid.js`. It does not enable terrain lesson-pack import, numerical queries in the map UI, or contour derivation. `validateElevationGrid` validates an already parsed object; there is no byte-capped file importer or reprojection engine in this slice.

All listed fields are required; unknown fields are rejected at every schema level. Samples are row-major numbers in the declared vertical units, or JSON `null` for missing data.

| Object | Fields and restrictions |
|---|---|
| Root | `format: map-literacy-elevation-grid-v1`, nonempty `id` (80 characters maximum), integer `width`, `height`, `horizontal`, `vertical`, `source`, `samples` |
| Dimensions | Each dimension 2–1024; at most 262144 samples; sample array length equals width × height |
| Horizontal | `crs: LOCAL_METRIC` or `EPSG:26910`; `units: m`; `axisOrder: easting,northing`; `origin: [x,y]`; `step: [dx,dy]`; `registration: sample-center` |
| Vertical | `units: m`, `ft` or `us-survey-ft`; `reference: synthetic-zero` or `NAVD88`; `nodata: null`; `uncertaintyM: null` or a finite nonnegative number |
| Source | `kind: synthetic` or `usgs-3dep`; nonempty `productId`, `version`, `license` (each at most 240 characters); `acquiredAt`; `url`; `sha256`; `attribution` (1–2000 characters); `transforms` |
| Source timestamp/hash | Canonical UTC ISO timestamp with milliseconds, e.g. `2026-10-16T00:00:00.000Z`; SHA-256 is exactly 64 lowercase hexadecimal characters |
| Transform | At most 8 ordered entries, each with nonempty `operation`, `version` (240 characters maximum) and `parameters` |
| Parameters | At most 32 keys, each matching `[a-zA-Z][a-zA-Z0-9_-]{0,79}`; values are null, boolean, finite number, string up to 2000 characters, or up to 8 finite numbers; no nested objects |

Synthetic data requires LOCAL_METRIC, synthetic-zero and a null URL. Declared USGS data requires EPSG:26910 (NAD83 / UTM zone 10N), NAVD88 and an HTTPS URL of at most 2048 characters without credentials. These deliberately narrow declarations cover the proposed benchmark. Validation does not establish that a source really has those references, that its hash matches downloaded bytes, or that its answers were independently reviewed.

## Coordinates and sampling

`origin` is the center of the upper-left sample. The grid is north-up: dx is positive and dy negative. Both axes are metres; rectangular cells are allowed. Column c, row r has coordinates `x = origin[0] + c * dx`, `y = origin[1] + r * dy`. Steps and endpoints must be finite and distinguishable at the origin; step cancellation error above 1e-6 is rejected. Geographic degrees, rotated grids and automatic datum conversion are unsupported.

`createElevationGrid` validates and freezes a private clone. `coordinate(column,row)` accepts integer in-bounds indices. `sample(x,y,method)` accepts finite coordinates and `nearest` or default `bilinear`. The valid domain ends at the outer sample centers, not the outer cell edges. Outside coordinates return `{status: 'outside'}`; no extrapolation occurs. A bounded floating-point tolerance (at most 1e-7 cells) restores center round trips.

Nearest half-cell ties select east/south. Bilinear sampling returns `{status: 'nodata'}` if any positive-weight contributor is null; zero-weight missing neighbors do not invalidate an exact valid center. There is no hole filling. Valid results contain `status: value`, `valueM`, `verticalReference` and `uncertaintyM`. Uncertainty is retained as declared; null remains unknown and interpolation does not create an error estimate. Nonfinite values and conversion/interpolation overflow are rejected.

An international foot is exactly 0.3048 metres. A legacy US survey foot is exactly 1200/3937 metres; the distinct input unit preserves legacy data rather than silently treating the definitions as identical. See [NIST definitions and retirement](https://www.nist.gov/pml/us-surveyfoot).

## Bounds and evidence

262144 Float64 samples correspond to 2 MiB of numeric payload, but JSON, ordinary arrays, validation and the immutable clone use additional memory. This is a sample-count guard, not a measured device memory guarantee or a pre-parse file-size limit.

Seven generated CC0 grids test flat, hill, valley, rectangular plane, missing data, international feet and US survey feet. Tests check analytic answers, provenance recipe hashes, immutable snapshots, fractional-coordinate round trips, malformed metadata and continued rejection by the street-pack importer. Contour generation and real-data accuracy remain separate gates. See [preparation review](../elevation-preparation.md).
