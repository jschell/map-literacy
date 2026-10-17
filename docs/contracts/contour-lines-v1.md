# Connected contour lines v1

`deriveContourLines(grid, levelsM)` in `src/terrain/contour-lines.js` derives the existing bounded marching-squares segments, then calls `stitchContourSegments(segmentResult)`. The latter also accepts a validated-shape [contour-segment result](contour-segments-v1.md). These are preparation APIs, not terrain lesson-pack imports or changes to the reference-map UI.

## Coordinates and connectivity

Levels remain separate and coordinates retain the source metric CRS. Two endpoints connect only when both coordinate values are exactly equal; negative zero is normalized to zero. No rounding, proximity snapping, geographic reprojection, crossing insertion, smoothing or hole filling occurs. Shared-edge interpolation in the segment generator already uses canonical endpoint ordering. Approximate external endpoints must not be silently joined by this API.

Zero-length segments are discarded and counted. Identical undirected segments, including reversed plateau coincidences, appear once and are counted as duplicates. This removes repeated geometry; it does not infer a plateau interior, polygon, downhill direction or contour nesting.

Unique segments form an endpoint graph. Degree-one vertices terminate open chains. Degree-two vertices continue a chain or ring. At degree greater than two, traversal stops and a junction with its coordinate and degree is returned. Each incident edge starts or ends a separate piece; no arbitrary turn or physical ridge connection is chosen. An attached loop can return to its starting junction and be geometrically closed while its contour still needs review.

The generator's asymptotic saddle choice is preserved. Geometric interior crossings are not inserted as nodes. `unbranched` describes endpoint degrees only: it does not certify no intersections, source accuracy, terrain topology or reviewed lesson answers. Open endpoints are not classified as grid-edge versus nodata boundaries without source-grid review.

## Result

The result contains `format: map-literacy-contour-lines-v1`, `gridId`, `horizontalCrs`, `verticalReference`, `units: m`, `method: exact-endpoint-chains-v1`, `segmentMethod: marching-squares-asymptotic-v1`, `skippedCells` and `contours`.

Each contour contains:

| Field | Meaning |
|---|---|
| `levelM` | Original metre elevation |
| `lines` | Objects with `closed` and `coordinates`, preserving each unique segment as an adjacent coordinate pair |
| `junctions` | Endpoint vertices with degree greater than two |
| `duplicateSegments` | Removed identical undirected segments |
| `zeroLengthSegments` | Removed degenerate segments |
| `topologyStatus` | `needs-review` when junctions exist; otherwise `unbranched`, including empty levels |

Closed lines repeat their initial coordinate at the end. Open/branch pieces are visited from vertices ordered by easting, then northing, and adjacent edges are ordered by their other endpoint. Remaining isolated rings start at their smallest vertex. Output is deterministic under input segment reordering and endpoint reversal; winding is canonical traversal, not an elevation/interior convention. The input is not mutated, and returned coordinates do not alias input or other line coordinates.

## Limits and evidence

Input is limited to 64 increasing finite levels and 131072 total segments before graph construction. Existing grid derivation also limits cell-level processing to 2,000,000 evaluations. Unique edges, vertices, lines and junctions cannot exceed these input-derived counts; line coordinate positions are at most twice the unique edge count. Iterative traversal avoids call-stack growth. Graph construction and traversal are linear apart from deterministic vertex/adjacency sorting. These are count bounds, not measured device memory or latency guarantees; file byte limits belong to a future importer.

Known-answer tests cover plane/valley open chains, the analytic closed hill, exact plateau duplicates, nodata gaps, branch junctions and touching rings, preserved saddle choices, geometric crossings and near endpoints, immutable inputs, deterministic order, invalid/count-limited inputs and a 20,000-edge chain. Real benchmark contour topology, geographic/road alignment, cartographic labels, paper/device acceptance and terrain answers remain pending. Full lesson integration must retain the normalized grid's provenance; this internal result is not a self-contained source archive.
