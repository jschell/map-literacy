# Offline benchmark preparation

This optional Python tooling is separate from the vanilla JavaScript app and its Node development dependencies. The browser never downloads the full DEM or runs Python. Raw source and generated grids stay outside git.

Tested with Python 3.12, Rasterio 1.4.3 / GDAL 3.9.3 and PyProj 3.7.2 / PROJ 9.5.1. Install the pinned requirements in a virtual environment:

```sh
python3 -m venv .elevation-venv
.elevation-venv/bin/pip install -r tools/elevation/requirements.txt
.elevation-venv/bin/python -m unittest discover -s tools/elevation -p 'test_*.py' -v
```

Acquire the source TIFF and sibling XML URLs recorded in `docs/sources/3dep-benchmark-candidate.json` and the preparation document. The script requires the exact reviewed TIFF and XML hashes; it does not fetch data. Then run:

```sh
.elevation-venv/bin/python tools/elevation/prepare_benchmark.py /outside/source.tif /outside/source.xml /outside/normalized-grid.json --acquired-at 2026-10-17T04:14:18.463Z
```

Use the actual acquisition timestamp for new acquisitions. Retain the recorded timestamp when reproducing this artifact's exact bytes. The command prints a summary; output has the elevation-grid-v1 contract. Run `validateElevationGrid` on the resulting JSON before further use. Reproduction also requires the recorded native-library versions; wheel/platform differences can affect projection results.

The crop envelope explicitly uses NAD83 geographic coordinates (EPSG:4269); it is a benchmark envelope rather than a claim that WGS84 display coordinates equal NAD83. Bounds are transformed into EPSG:26910, densified on all edges, expanded to multiples of 10 m and represented by sample centers with a 5 m offset. The projected rectangle includes a small area outside the geographic crop. No vertical datum conversion occurs. Unknown vertical uncertainty stays null.

The preparer reads a bounded source window plus a two-pixel halo (maximum one million samples), inverse-projects each target center using PyProj and takes its containing PixelIsArea source cell: exact nearest-center sampling. Missing cells remain missing, without interpolation or hole filling. An independent GDAL coordinate transform plus Rasterio affine row/column calculation must agree at every center. Forward/inverse round trips must be within 1e-6 m. A 262144-sample output limit applies before output allocation. Source file bytes are fixed at 473964013 and checked by SHA-256; metadata is capped at 1 MB and also hash-checked. Reading and hashing the full source is offline work, not an interactive-time guarantee. This is a pinned benchmark tool, not a general GeoTIFF importer.

The initial approximate warp-mesh experiment disagreed with exact nearest-center indexing near cell boundaries. The final method uses exact inverse sampling and records that choice explicitly. Nearest sampling preserves original elevations but can produce blocky contours; it is not a claim of improved source resolution or smoothness.

CI runs two synthetic preparation tests without downloading real source data. The real-data acquisition, full comparison and output hashes are recorded separately in `docs/sources/3dep-benchmark-preparation.json`. No source sample grid or large derived product is committed.
