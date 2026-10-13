# Renderer performance measurements

Measured 2026-10-12 (America/Los_Angeles), Node 24.19.0 and headless Chromium 153.0.8010.0 on a Linux x64 container reporting AMD EPYC 9V74 and 9 logical CPUs. This is container evidence, not an iPad, Safari/Firefox or physical-printer result. Raw samples, heap observations, environment and runtime file hashes are in [performance-report.json](performance-report.json).

## Method and reproduction

```sh
npm ci --ignore-scripts
MAP_LITERACY_PORTABLE_CHROMIUM=1 npm run browser:perf
```

The command owns/stops a loopback server and browser. Existing executable/portable flags match browser:check. MAP_LITERACY_PERF_SAMPLES accepts 20–100 (default 20). Generated packs, exact source recipes, PDFs and report.json are ignored intermediates under artifacts/performance; large packs are not committed. The generator is deterministic, source recipes are hashed and synthetic data is CC0-1.0. No external data or routing provider is fetched.

Three profiles start from an empty app; previous-profile garbage collection occurs before the import timer. Import time includes automation file delivery, parse/validation, selectors, screen/paper setup and two animation-frame boundaries. Interactions dispatch native control events inside the browser and wait for two requestAnimationFrame boundaries. This captures handler/layout/frame scheduling, not isolated CPU or raster cost. Cold and cached interactions are mixed in a fixed sequence. p95 uses nearest rank (19th of 20); raw maxima are retained because a small p95 sample can hide an outlier. No machine-independent timing gate has been selected.

## Pack profiles

| Profile | Compact bytes | Features | Labels | Nodes | Edges | Restrictions | Coordinate positions |
|---|---:|---:|---:|---:|---:|---:|---:|
| Neighborhood | 392,354 | 1,000 | 200 | 0 | 0 | 0 | 10,200 |
| Display ceiling | 3,881,127 | 10,000 | 2,000 | 0 | 0 | 0 | 100,000 |
| Graph ceiling | 8,622,853 | 1 | 0 | 19,998 | 40,000 | 5,000 | 100,000 |

Limits interact: the display profile allocates 98,000 geometry coordinates plus 2,000 anchors. The graph profile allocates two feature coordinates, 19,998 node positions and 80,000 edge positions. A pack cannot simultaneously use all independent maxima under the shared coordinate and byte budgets. Stress graphs use coincident but separate identities to exercise selectors/indices; they are not realistic road networks or teaching maps. No maximum exercise/restriction-history complexity or all-metadata worst case is claimed.

## Results

| Profile | Import ms | Rotate p95 ms | Labels p95 ms | Selection p95 ms | Orientation p95 ms |
|---|---:|---:|---:|---:|---:|
| Neighborhood | 299 | 68 | 33 | 32 | 36 |
| Display ceiling | 5,078 | 390 | 8,153 | 5,500 | 392 |
| Graph ceiling | 17,957 | 164 | 315 | 32 | 32 |

Graph-ceiling trace append p95 was 33 ms over 20 alternating permitted directed edges from an explicitly chosen node. Both ceiling packs produced one-page Letter PDFs without browser/CSP errors. Neighborhood, display and graph final DOM counts were 6,445, 62,352 and 20,206. Used JS heap after explicit GC was about 5.0, 26.5 and 17.7 MB respectively; embedder heap was about 7.9, 66.0 and 37.7 MB. These are CDP observations, not whole-browser or device memory limits.

Do not treat the ceiling packs as an acceptable initial performance envelope. Display label/selection p95 remains several seconds, graph import remains slow, and even the neighborhood rotation maximum was 3,088 ms despite its 68 ms p95. Headless scheduling/resource contention can affect these observations; the measurements do not identify every cause. Repeated runs varied substantially. Establish a practical pack size and latency/memory budget on the selected devices before release. The neighborhood profile supports keeping initial lessons neighborhood-sized; it does not validate a nationwide or tablet-scale deployment.

## Changes and boundaries

The initial exploratory display run showed about 8.2s label p95. Avoidable SVG replacement was identified in the code. The implementation now reuses screen geometry for label/selection-only updates, changes only the selected road classes, preserves unchanged paper SVGs across screen interactions, and limits each model cache to four recent entries. Large selector contents are inserted in batches. Browser regression checks verify geometry identity, label variants, actual selected styling, stable paper geometry and existing import/edit/trace/exercise behavior.

Typical label-update median improved in exploratory runs (about 294 ms before reuse vs 45 ms in the recorded run), but high-percentile ceiling latency did not reliably improve. Do not claim a completed ceiling-performance fix from these optimizations. More work may involve bounded/searchable selectors, reducing SVG/DOM work, preparation of smaller extents or off-main-thread geometry; choose against actual device evidence rather than adding a framework by default.

Remaining release checks and the observation template are in [physical-print-check.md](physical-print-check.md). Automated geometry tests now include two separate parallel road strokes at both neighborhood scales; actual monochrome distinguishability, label completeness for a reviewed exercise and physical scale accuracy remain manual checks. Plan 03 remains active.
