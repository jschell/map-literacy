# Geographic print cartography correction

## Problem and priority

The geographic browser initially printed a crop of public raster tiles enlarged to Letter paper. This made basic printing available without a pack, but does not satisfy the product: the Safari example had approximately 29 pixels per inch, no B&W choice, and insufficient readable street names. Native print invocation and one-page output are transport checks; they do not establish a useful teaching map.

This correction is part of active plan 05, ahead of pilot expansion. The existing SVG renderer and bounded OSM preparation code are reusable foundations. The implementation/remaining-acceptance section below records current status.

## User flow and defaults

Open the map, choose the focus area by pan/zoom, select Letter portrait or landscape, and print. No lesson pack, lesson session, manual authoring or source-file export is a prerequisite.

Expose print appearance beside the geographic controls:
- B&W is the default: white paper, black roads and text, road hierarchy through line weight/dashes, restrained outlines for context. Grayscale conversion of colored tiles is not the intended cartography.
- Color is an optional appearance, preserving the same geometry, labels and selected extent.
- Street names default to labeled. Partial and blank variants are available for recall and annotation, using a stable selection when labels are partially hidden.
- Landmarks/context labels can be controlled separately from street names.
- Orientation, north arrow, a true scale bar and attribution accompany basic printed output.

Lesson packs add reviewed questions, hints, scoring, authored variants and learner/instructor worksheets. Print availability must never depend on lesson review or session state.

## Data and rendering boundary

Replace the geographic raster print snapshot with a vector road/context model for the selected extent. Use OSM road geometry and source names through an explicit adapter; retain source IDs, timestamps, attribution and acquisition/transformation provenance. Use the existing bounded preparation and SVG modules where they fit this flow.

Source delivery must support normal browsing without a mandatory pack-import step. Select and review a concrete bounded acquisition/cache strategy before implementation uses a new public endpoint. Document provider terms, limits, failure/retry behavior and the narrow CSP change; do not assume a public service is a production dependency. Avoid acquiring data on every pointer event. Keep source snapshots separate from lesson packs and allow source/provenance download as an optional operation.

Preserve crossing/bridge/tunnel distinctions and original road identity. Clip drawings at the display boundary; do not drop a road merely because its complete way extends outside the chosen area. Missing source names must remain missing, with coverage information distinguishing unavailable names from labels suppressed by layout. Do not invent street names, access permissions, connections or correct route answers. Basic map rendering needs no approved exercise graph; automatic route scoring still requires its own reviewed data.

Create print geometry in physical page units. The paper model must be independent of viewport width, screen zoom pixel count and device pixel ratio. Preserve the selected geographic extent across phone/tablet/desktop when the extent is held constant. Show the actual print area, not an approximate page-shape guide with a different output extent. Keep road geometry and text vector-based in SVG/PDF, with a minimum 8-point printed label target. Use a local geographic projection and compute the scale bar from that projection; do not infer ground scale from raster tile zoom.

Place labels within the printable frame, prevent collisions and handle long names/multiple source ways predictably. Label placement is a paper-layout calculation, not an upscaled screenshot. When all source names cannot fit legibly, show coverage and a useful smaller-area recommendation before printing; do not silently present a blank-looking labeled map.

## Operations to support

Basic use: select a real area, read named streets and landmarks, identify north/heading, and print an ordinary usable paper map.

Optional practice: hide/reveal names, mark a start and destination, annotate a route, compare return routes and detours, and rotate the learning view while preserving north-up print defaults. Connectivity or driving-validity feedback must come from verified topology/rules, not visual line intersections or user-drawn annotations. No live-driving interaction is introduced.

Topographic layers remain a later extension with separate elevation/contour metadata and correctness checks; adding terrain must not undermine the street print workflow.

## Acceptance criteria

- Startup-area and moved-area basic printing work without importing a pack or beginning a lesson.
- Explicit B&W and color controls affect preview and output consistently. B&W has a white background and vector strokes/text, without colored tile imagery disguised by a filter.
- Labeled, partial and blank street-name modes produce distinct, reproducible outputs for the same source and extent.
- A dense named-road fixture verifies legible labels, hierarchy, clipping, long names and missing-name coverage. Bridges/crossings retain their identity.
- The same extent prints consistently from 320-pixel phone and desktop viewports, in both Letter orientations. Printed labels remain at least 8 points; streets/text remain vector, not 29-ppi image magnification.
- One-page fit, usable margins, attribution, north arrow and calibrated scale bar are verified in rendered PDFs. Inspect the actual pages, not only PDF dimensions or a mocked print-call count.
- Existing lesson variants, worksheets, scoring, saved progress and preference recovery continue to work.
- Native printing is invoked directly from a ready user's click, preserving the Safari invocation correction. Source preparation runs before print readiness, not as an awaited hidden-image decode prerequisite.
- Actual Safari/iOS and physical monochrome-paper acceptance are recorded separately from automated checks. The reported raster PDF is evidence that current print quality fails this gate.
- Automated tests mock external services and never pan/zoom bots against public tile servers.

## Implementation sequence

1. Build the source-backed geographic display/print adapter and extent model; cover whole-way clipping and provenance before connecting acquisition.
2. Connect an approved bounded source/cache strategy to the browsed area, with visible readiness and failure states. Keep it independent of lesson/session state.
3. Connect physical-unit SVG print rendering and B&W/color plus street-label controls to that model; ensure preview matches output.
4. Complete a single reviewable change covering source, cartography, basic operations and rendered print checks. Avoid shipping a standalone grayscale switch as if it fixes readability.
5. Validate target-device output and actual-size monochrome paper before proceeding to pilot expansion.

Source strategy, context-layer coverage and whether existing preference records need a new version are implementation decisions still to resolve. Basic print must remain usable during this work; do not replace it with a reviewed-pack gate.

## Implemented slice and remaining acceptance

The geographic data/print adapter, automatic bounded prototype source acquisition, fixed paper extent, B&W/color and name controls, physical vector print, north/scale, source/SVG export and optional markings/heading are now implemented. The native print call stays synchronous. Preview names use a larger screen minimum; their placement/coverage can differ from the paper layout while extent, style, source and label mode remain shared. See geographic-browsing.md for concrete resource limits, source-class exclusions, policy evidence and validation.

A low-volume Overpass prototype endpoint is selected and reviewed; sustainable larger-scale hosting is not resolved. Landmark/context coverage is intentionally limited to the named acquisition classes. Geographic view choices are memory-only; the existing saved Letter orientation remains shared without a database/schema change. Automated and manual API-shape evidence does not close actual Safari/physical-paper acceptance or curriculum/route correctness. The plan therefore remains a reference for those remaining gates, not a claim of full completion.


## Safari blank-sheet and label-layout revision

A later device PDF confirmed sharp B&W vectors and attribution entirely on page one, followed by a blank page bearing only Safari chrome. The print document now uses one root/body page context and a fixed geographic layer, hides all other body content, and removes grid/fixed-height trailing space. The physical map extent is retained. This removes flow/page-context triggers; actual iOS PDF acceptance remains separate from Chromium checks.

Street display names use explicit common English abbreviations; full names and source IDs remain in SVG/source exports. Labels follow sufficiently long nearly straight runs, with shared-node identity required to continue across same-name ways. They sit beside road lines and avoid central junctions and other labels. Short/curved streets can use horizontal callouts with fine, noncrossing leaders; crowded names remain omitted and counted. North/scale furniture has opaque white backing. Point-label boxes scale with their actual font size. Unnamed service context remains visible but is de-emphasized and cannot suppress named-street labels. These display links are not a reviewed routing graph.

A bounded manual default-area source probe succeeded, followed by local replay for visual QA; no automated requests went to public providers and no live extract or user imagery/location was committed. WebKit download was available, but its required host libraries could not be installed in this runtime. Consequently this revision does not claim a WebKit or actual Safari print pass.
