# Sources and provenance

Review date: 2026-10-12, America/Los_Angeles.

## Imported handoff

The merged Ideas-for-projects handoff was read from commit 05776feb3bf2ea904ebf002b5d86a5a0297d0e07.
- [Original idea snapshot](../context/original-street-map-idea.md), source blob 4f14f50ac696058e8732e7b25eb4e52a7bd0dde7.
- [Research handoff](research-handoff.md), source blob 745c951e43477efedcb9e9400d2ba35dfe6efb11.
- Canonical source: https://github.com/jschell/Ideas-for-projects/tree/05776feb3bf2ea904ebf002b5d86a5a0297d0e07/street-map-learning

Snapshots preserve historical research and draft limitations. Their statements that no repository was selected or no work was authorized describe the earlier conversation; current repository scope/plans supersede them. No research claim was validated by implementing code during bootstrap.

## Topographic follow-up

- https://www.usgs.gov/3d-elevation-program — official overview states 3DEP provides elevation data and products are free without use restrictions. Exact DEM product, metadata/units/coverage and acquisition workflow remain Plan 08 work.
- https://geotiffjs.github.io/ — JavaScript GeoTIFF parsing in browser/Node; evaluate actual selected data format, raster memory and CRS handling before adoption.
- https://github.com/d3/d3-contour — marching-squares contour polygons from gridded values. Output requires explicit georeferencing; this is not a complete cartographic contour pipeline.

These three primary sources were opened during planning. No terrain dataset was acquired or processed. No current dependency release was pinned. Older OSRM docs in the handoff illustrate API concepts only; verify against the deployed release.

## Source discipline for implementation

For every acquired dataset record canonical URL/query, retrieval time, source date/version if available, boundary, hash, license/attribution, units/CRS and transformations. Separate raw source, derived features, manual review and synthetic changes. Document endpoint service policy independently of data licensing. Unknown provenance or incomplete topology blocks a verified real-world lesson.
