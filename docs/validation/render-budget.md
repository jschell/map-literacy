# Initial browser budget and searchable selection

The initial browser renderer accepts at most 1,000 features, 10,000 feature-geometry coordinate positions and 200 authored labels. These are conservative defaults based on the measured neighborhood profile, not a guarantee of latency or memory on every device. File validation and preparation retain their larger schema budgets. Topology coordinates count against the shared schema budget, but not the feature-display budget.

A valid pack exceeding the browser budget receives render-limit-exceeded before the active pack, selectors, SVGs or trace are replaced. The message asks for a smaller prepared lesson; no geometry, topology, labels, source identity or scoring data is silently cropped. The same check applies to model creation and local authoring, so adding a 201st label fails without changing the working revision. Unsupported larger packs may still be prepared/validated outside the browser.

Feature, start-node and directed-edge lists use native selects with search fields. Search is literal and case-insensitive over the displayed name/ID/coordinate/edge description. At most 200 matching items are inserted, plus the current selection and placeholder when needed. All items remain searchable; there is no first-page-only data loss. Filtering preserves selection and does not change trace start or append an edge. An explicit selection/action is still required. Restrictions and access checks remain active on filtered edge choices.

## Recorded measurements

The same browser:perf methodology as [performance.md](performance.md) was used with 20 samples per interaction. [render-budget-report.json](render-budget-report.json) retains all samples, maxima, environment and runtime hashes; the prior report remains unchanged as historical evidence.

| Profile | Result | Import/rejection ms | Rotation p95 ms | Labels p95 ms | Selection p95 ms | Orientation p95 ms |
|---|---|---:|---:|---:|---:|---:|
| Neighborhood (1,000 features) | Accepted | 358 | 70 | 42 | 33 | 32 |
| Display ceiling (10,000 features) | Rejected before rendering | 816 | — | — | — | — |
| Graph ceiling (19,998 nodes / 40,000 edges) | Accepted, bounded selectors | 2,053 | 165 | 287 | 32 | 32 |

Graph import was about 18s in the prior recorded run and 2.1s here; final graph DOM count fell from 20,206 to 218. Trace-append p95 was 33ms. These are single container runs, not a controlled hardware-wide claim. Neighborhood rotation still had a 1,714ms maximum despite 70ms p95. The renderer budget prevents the demonstrated heavy display case but does not establish a release performance SLA or eliminate every pause.

The archived Redmond draft fits the budget: 918 features, 3,955 feature-geometry coordinates and no authored labels. Its import was about 232ms in the optional browser check. Source data, review status and topology were not changed. Native Safari/Firefox/tablet behavior and physical Letter calibration remain pending in [physical-print-check.md](physical-print-check.md).

## Validation

92 Node tests passed. Browser checks exercised selecting a feature beyond the first 200, empty-filter results with retained selection, node n12000 in the large graph, filtered edge addition, render-budget rejection with the old map/trace/install sequence retained, and atomic rejection of a 201st authored label. Existing source-credit, label editing/export, directed tracing, learner/instructor separation, both Letter orientations and narrow-screen checks passed with zero browser/CSP errors. The optional touch real-pack import now waits for its actual completed-install sequence.

The benchmark now records rejected display profiles instead of attempting to render them, and searches for the distant graph start node before tracing. Do not overwrite the historical ceiling report or reinterpret its former successful SVG rendering as current browser support. Plan 03 remains active for practical device-specific performance acceptance and physical/device checks.
