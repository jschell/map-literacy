# Draft terrain profiles

`deriveTerrainProfile(grid, path, {spacingM})` produces a standalone `map-literacy-terrain-profile-v1` preparation artifact. This does not add a lesson capability, route approval, browser menu or scored profile exercise. Every result is marked `reviewStatus: draft` even for synthetic grids. Real terrain answers still require independent source/alignment and instructional review.

## Coordinates, sampling and budgets

The input is a validated elevation-grid-v1 and 2–1024 metric `[easting,northing]` vertices in **that grid's CRS**. Coordinates must be finite and within ±1e9 m. Consecutive identical vertices are rejected; bends, reversals and closed/self-crossing paths are permitted. Total horizontal path length is at most 10,000,000 m. No geographic conversion, road-graph matching, route finding or vertical datum conversion occurs.

`spacingM` must be finite, positive and at most 10,000 m. Each segment is divided into `ceil(length/spacingM)` equal intervals, so spacing is a maximum, not a promise of a fixed number of samples. The sampler additionally retains every waypoint and every crossed grid row/column sample-center line, including outer grid boundaries. Exact identical segment fractions are deduplicated; the shared waypoint is emitted once. At most 20,000 output samples are allowed; density/processing requests that exceed the budget fail.

The existing grid sampler supplies bilinear values in metres, with its established outside/nodata and numerical boundary rules. Every interval within a single bilinear cell also gets a midpoint. Positive-weight nodata corners can therefore be detected even when both interval endpoints are valid. There is no interpolation across missing data.

Within one cell, bilinear elevation along a straight segment is quadratic. Endpoint and midpoint values determine that quadratic; any interior stationary point is retained. This prevents a coarse requested spacing from losing an interpolated peak/trough and its ascent/descent. Near-zero curvature is treated as linear using `64 * Number.EPSILON * max(1, abs(endpoint/midpoint elevations))`. Arithmetic overflow fails explicitly. This accuracy is relative to the bilinear grid surface, not an independent survey or a claim that an actual terrain feature smaller than the source grid was observed.

## Output and totals

Each sample contains accumulated horizontal `distanceM`, original-CRS `coordinate`, `status: value|nodata|outside`, and `elevationM` (finite metres for value, null otherwise). Complete horizontal/vertical reference metadata, original vertical units/uncertainty and source provenance are copied from a private validated grid snapshot. Output elevations and totals are in metres even when the original samples use feet. The input grid and path are not mutated or retained by reference.

Summary includes horizontal distance, covered/missing distance, ascent/descent, net elevation change, minimum/maximum valid elevation and missing-sample counts. Only adjacent **valid** samples contribute covered distance or positive/negative elevation differences; a missing sample breaks the chain. No ascent/descent is invented across a gap. `totalsStatus: partial` makes those totals explicitly partial, and `netChangeM` is null. With no valid elevations, min/max are also null. `complete` means this profile has values throughout its sampling, not that its source has been reviewed or its elevations are certain.

There is **no smoothing or ascent threshold**. Source noise and bilinear surface variation remain in the totals; floating-point rounding can contribute negligible differences. Refining requested spacing should preserve meaningful totals because cell boundaries and quadratic extrema are already retained. A future noise-filter policy must be explicit and versioned before it changes lesson answers. Neither these totals nor a trail/road drawing establish safe or permitted travel.

## Bounded offline command

```sh
node scripts/derive-terrain-profile.js GRID.json REQUEST.json OUTPUT.json
```

Request fields are exactly `{format: "map-literacy-profile-request-v1", path: [[x,y],...], spacingM: number}`. The command reads at most 32 MiB of grid bytes and 256 KiB of request bytes, rejects output above 8 MiB and creates output exclusively (no overwrite). SHA-256 hashes of the exact input files are added as `inputHashes.gridFileSha256` and `requestFileSha256`, separate from the original source hash. It performs no network requests. Large real artifacts stay outside git.

Tests cover analytic flat/plane/hill/valley, reverse/bent/closed paths, feet conversions, off-midpoint bilinear extrema at coarse/refined spacing, hidden nodata between valid endpoints, outside coverage, all-missing values, immutable snapshots, input/count/distance limits and CLI hashing/overwrite behavior. Scored route-profile questions, profile charts and actual-device/paper learning validation remain separate Plan 08 work.
