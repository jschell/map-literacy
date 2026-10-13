> Historical snapshot of the merged street-map idea. Earlier authorization/status statements are preserved as context; the new map-literacy scope and plans supersede them. See [source provenance](../research/sources.md).

# Street Map Learning

**Status: In Draft.** Context captured 2026-10-11 (America/Los_Angeles). This is a research handoff and an incomplete implementation specification. No application, map packet, field trial, or business validation has been completed.

A street-map learning system that connects ordinary printed maps, stationary digital practice, walking/passenger observation, and learner-driver preparation to improve orientation and understanding of road networks.

## Start here in a new conversation

Read this file and [research handoff](../research/research-handoff.md), then the repository's AGENTS.md and .claude/CLAUDE.md. These files should be sufficient to resume without the original conversation.

Suggested opening prompt:

> Review the In Draft street-map-learning idea in jschell/Ideas-for-projects. Read street-map-learning/README.md and research.md. Continue investigating a learning system for street-map reading, orientation and road-network understanding, including ordinary black-and-white printed maps and real-world practice for learners and future drivers. Raised maps are unnecessary. Separate confirmed user requirements from proposals; do not assume a stack, build an application, or mark the spec complete. First assess the minimum useful learning sequence, existing alternatives and a small validation experiment. Treat the claim of a deficit among current learner drivers as a hypothesis, not an established fact.

## Goal and origin

The broader conversation searched for hobby-scale ML/LLM or purpose-built applications that improve existing processes. It eventually focused on outdoors, conventional education, homeschool and practical family activities.

Candidate #102 was map-reading practice using topographic maps. The user proposed adapting it to **street maps and driving**, observing a possible deficit in learner drivers' spatial awareness concerning maps/navigation. This became the selected idea. The user then explored printable formats, physical practice, monochrome map sources, the actual benefits of print services, and software that interacts with OSM data.

The intended learning outcome is an understanding of **where I am, which way I am facing/traveling, how roads connect, and where destinations lie**. Memorizing a turn sequence or following a GPS arrow does not by itself demonstrate that understanding.

Potential audiences: learner drivers with parents/instructors; homeschool and school learners preparing for independent travel; adults wanting better wayfinding skills. These audiences are proposals, not validated customers.

## Confirmed user requirements and corrections

- Focus on street maps, navigation and relevance to learning drivers.
- Connect map learning to physical/real-world use.
- Ordinary printed maps are sufficient; **raised maps are not needed**. Hands-on means handling, rotating, drawing on and following paper maps.
- Black-and-white print readability matters, including street names and road connections.
- Explain concrete benefits of external map services over direct OSM access. Do not assume they provide better geographic data.
- Investigate OSM-compatible packages rather than depend on one map-printing website.
- Store the idea in Ideas-for-projects and label it **In Draft**.
- Capture enough context for a new conversation; no implementation was requested.

Prior technical preferences relevant if implementation is later authorized: vanilla JavaScript rather than React/Vue; Python with uv is familiar; modest operating cost. These do not settle this project's architecture.

## Learning goals and candidate exercises

| Skill | Example | What an answer could demonstrate |
|---|---|---|
| Compass orientation | Traveling south, identify east relative to the vehicle | Heading versus relative left/right |
| Map orientation | Align a paper map with two observed roads/landmarks | Page orientation versus geographic direction |
| Map-to-view translation | Match a junction sketch to an approach on a map | Perspective transformation |
| Connectivity | Explain a bridge crossing versus a junction | Geometry versus network connections |
| Route preview | Name major roads, landmarks and decision points | Overall route structure |
| Position updating | Locate yourself after simulated turns | Updating location and heading together |
| Return route | Find a route back through one-way/divided streets | Reverse travel is not always reversing instructions |
| Detour reasoning | Remove one connection and select another route | Flexible network understanding |
| Distance and scale | Measure an approximate route length | Map scale and road distance |
| Mental-map reconstruction | Hide the map and place roads/landmarks | Relative spatial knowledge |
| Explanation | Explain why a route works | Reasoning beyond guessing |

Distinguish map literacy from vehicle clearance judgment, traffic hazard perception and driving competence. Improvement in map exercises does not establish improvement in crash risk.

Candidate session: preview a small neighborhood, follow a simulated journey, hide the map, locate the endpoint and start direction, then construct a different return route.

## Paper and real-world learning sequence

Proposed sequence, not yet tested:

1. At a table, read a labeled neighborhood map and explain a route.
2. Mark routes and headings with pencil or dry-erase pen; optionally use an arrow token.
3. Rotate the paper while retaining awareness of compass direction.
4. Walk a reviewed route and stop at selected places to orient the map and locate yourself.
5. As a passenger, observe landmarks and relate the journey to the paper map; reserve exercises/questions for appropriate stops.
6. Before supervised driving, review the route while parked; do not introduce an interactive quiz into the learner's driving task.
7. Afterward, reconstruct the journey and explain alternatives.
8. Test on a different map and after a delay, so success does not mean memorizing one worksheet.

Initial packet proposal: one familiar neighborhood; fully labeled, partly labeled and blank maps; exercise sheet; instructor answers. Optional landmark cards and heading token. No special physical equipment required.

## Map sources, print formats and design

OSM is the underlying geographic database. The OSM website, printing services, GIS packages and browser map libraries are different ways to access or render it.

**Direct OSM export is a valid starting point.** The website's Share/Image workflow supports rendered exports including PDF/SVG; its data export is different from a finished printable map. Export readability must be tested on the actual printer. Services using OSM do not inherently have more accurate streets.

| Format | Proposed role |
|---|---|
| PDF | Main delivery format for reference maps and worksheets |
| SVG | Editable artwork and possible reusable exercise layers |
| PNG/TIFF | Raster imagery; resolution must fit physical output size |
| GeoJSON/GeoPackage | Geographic features for analysis and styling, not finished printouts |
| OSM XML/PBF | Raw source data, preserving OSM objects/tags/relations |
| GeoPDF | Optional georeferenced PDF; not necessary for ordinary lessons |

Proposed print settings: Letter landscape for a small neighborhood, initial scale around 1:5,000–1:10,000, light backgrounds, clear road hierarchy and readable labels. These are starting points requiring a physical print test. At 1:5,000, 1 cm is 50 m; at 1:10,000, 1 cm is 100 m. Print at the intended size for scale-measurement exercises. Use multiple sheets rather than shrinking labels for larger areas.

Include north arrow, scale bar, date/source attribution and a few landmarks. Preserve cul-de-sacs, one-way indications, bridges and divided roads when relevant. A rendering that looks detailed may still omit important routing restrictions.

Print-service roles:
- MyOSMatic: CartoOSM B&W grayscale style, Toner high-contrast style, PDF/SVG/PNG output, street indexes and multipage layouts.
- Inkatlas Urban: detailed monochrome street-map style, scale controls, multipage output and added points/tracks.
- Both prepare maps; neither was shown to generate this teaching sequence or assess understanding.
- For one clear neighborhood printout, their incremental benefit over direct OSM may be small.
- No same-area comparison or actual print test has been performed. Do not call one definitively superior.
- Service/export availability and pricing must be rechecked before a build.

## Architecture

### Folder layout

This specs repository contains:
- street-map-learning/README.md: scope, decisions, proposed workflow and implementation gaps.
- street-map-learning/research.md: source links, findings, limitations and package comparison.

No implementation folder layout is committed. A later design could separate source acquisition, validated map data, cartographic rendering, exercise generation, answer checking and learning records.

### Stack

**Unselected; JavaScript-first architecture proposed on 2026-10-12.** The user requested investigation of an all/mostly vanilla JavaScript implementation and then authorized recording these details. This is not authorization to implement or a final dependency selection. Candidates:
- QGIS + QuickOSM: retrieve raw features and design printable variants.
- OSMnx + NetworkX/GeoPandas: analyze roads, bearings, features and paths.
- Mapnik: automate cartographic rendering with explicit styles.
- Leaflet: lightweight JavaScript interactive feature selection and overlays.
- MapLibre GL JS: styled browser vector maps; requires a data/tile source.
- OSRM or Valhalla: dedicated route/maneuver support when driving restrictions matter.
- Pyosmium: lower-level processing of raw OSM files/relations.
- Geofabrik Washington PBF: local dated source extract.

Recommended investigation order, not an architectural decision: prove a paper learning sequence using QGIS/QuickOSM or direct OSM; evaluate OSMnx for generation; add a browser interface or routing engine only if needed.

A general shortest-path graph is not sufficient evidence that a driving maneuver is permitted. OSMnx simplification/consolidation can change how complex intersections are represented. Retain appropriate source topology and restrictions; verify teaching examples.

### JavaScript-first implementation proposal

Plain HTML/CSS/JavaScript with ES modules, DOM events and a small number of focused libraries could implement most of the system. No React/Vue is needed. Proposed first version: a static browser app, one reviewed neighborhood lesson pack, an SVG teaching-map renderer, orientation/position/route/detour exercises and matching printable worksheets. A backend is unnecessary for local practice; shared progress or synchronization would require a later service.

| Responsibility | Proposed implementation | Limit |
|---|---|---|
| Source acquisition | Bounded Overpass query or imported OSM snapshot | Respect service policies; retrieve complete required objects/relations |
| Drawing features | osmtogeojson converts OSM JSON/XML to GeoJSON | Drawing geometry alone is not a routing graph |
| Teaching map | JavaScript-generated SVG paths, symbols and text | Projection, clipping, styling and label placement need implementation |
| Area selection | Optional Leaflet map | Does not supply print cartography or source data |
| Geographic calculations | Selected Turf.js functions or tested small functions | Turf is not a driving-route engine |
| Exercise generation/scoring | Plain JavaScript over reviewed features and graph | Multiple valid answers and ambiguous cases need defined rubrics |
| Local records | IndexedDB; JSON import/export | Browser persistence is not a backup or cross-device synchronization |
| Worksheets | Dedicated HTML print view containing SVG; CSS print rules and @page | Test physical scale, margins, pagination and label readability |
| Desktop packaging | Optional TinyJS adapter | Desktop only; separate platform testing required |

#### Reusable lesson packs and topology

Proposed pack contents: source date/query/boundary/attribution; drawing features; original OSM nodes, ways and required relations; reviewed exercises/answers; label positions; print settings; optional generated routes and maneuvers with routing source/data version where available. These are candidate fields, not a finalized schema.

Build connections from shared OSM node identities, not crossings of drawn lines. Preserve one-way, access and restriction information; do not infer a permitted driving maneuver from geometric connectivity or missing tags. A bounded acquisition must retain relevant boundary connections and relation members or explicitly reject incomplete examples. Store synthetic lesson changes separately from the real source.

For small areas, SVG permits road selection, heading arrows, route traces and labeled/partial/blank variants from the same data. Initially permit instructor-adjusted label positions saved in the pack. Automatic label placement is a substantial later task. MapLibre GL JS is an alternative if larger vector maps or automatic map labeling justify additional tile/style/font infrastructure; it is not required for the initial neighborhood pack.

A dedicated print renderer should share features and lesson state with the interactive renderer, while fixing the paper extent and dimensions explicitly. Include north arrow, scale bar and attribution. Browser fit-to-page can change scale; verify actual paper output. Browser Save as PDF is an initial workflow, not a guarantee of identical output across platforms.

#### TinyJS assessment

Tarwin's tinyjsapp is a possible desktop wrapper, not a geographic renderer. Its plain HTML/CSS/JS frontend, JavaScript backend, native file dialogs and built-in SQLite fit a local lesson-pack editor or practice app. Keep browser-facing code independent of the injected tiny API through a small storage/file/export adapter.

macOS is the primary platform; Windows/Linux are beta. No iOS/Android target is documented. Small distribution size does not establish map performance or memory consumption. Its documented printToPDF behavior differs: macOS emits one tall page, Windows/Linux paginate. Test target OS printing before selecting it. It does not solve label placement, map correctness, exercise design or route generation. No installation/performance test was conducted.

### Turn-by-turn routing proposal

Three distinct scopes:
1. Route preview and printable directions: compute a route and display its maneuver list.
2. Stationary simulated navigation: advance a simulated position/heading and connect instructions to exercises.
3. Live GPS navigation: additionally track actual position, match it to roads, time prompts, detect deviations and reroute.

The first two are proposed for investigation before live navigation. Selecting a routing engine remains open.

| Engine | Candidate role | Directions |
|---|---|---|
| OSRM | Driving routes, alternatives and map matching | Request steps=true and geometries=geojson; structured maneuvers can be formatted with osrm-text-instructions |
| Valhalla | Driving/walking lessons and runtime route preferences | Maneuver narratives and text intended for spoken guidance |

Valhalla is a provisional preference because the idea includes walking and driving; OSRM remains a simpler driving-focused candidate. These established engines run outside pure browser JavaScript; the app can call a hosted HTTP API or a self-hosted container. Routing is separate from map artwork. Address entry additionally needs geocoding; selecting map coordinates avoids that dependency.

Self-hosting needs a regional OSM extract, graph/tile preprocessing, persistent routing-data storage, an HTTP service, refresh procedures and deployment/resource measurement. A production endpoint needs suitable HTTPS/CORS or a same-origin proxy; hosted credentials, if required, need appropriate protection. Public demonstration endpoints are for policy-compliant evaluation, not an assumed production dependency. Live traffic/closures require suitable additional feeds and integration.

Route request: start/end coordinates, optional intermediate stops and travel mode/preferences. Normalize the response into route geometry, distance/duration, legs/maneuvers and instruction text; preserve provider-specific details where useful. Alternative routes and lane details are conditional, not guaranteed. Save reviewed results in lesson packs with provider, options and data version when available; align map and route snapshots and flag inconsistencies.

A route engine response is not a complete live navigation application. Live use additionally needs HTTPS/location permission, continuous location updates, uncertainty-aware road/route matching, progress tracking, maneuver trigger rules, optional speech, missed-turn detection/rerouting, location-loss behavior and target-device background/screen-lock tests. Neither TinyJS packaging nor browser geolocation alone establishes reliable mobile navigation.

Learning uses: preview and explain directions; predict the next turn; identify heading after a maneuver; hide instructions and reconstruct a journey; compare a return route; inspect a reviewed detour. Interactive questions remain stationary. Do not treat the engine's preferred route as the only valid answer or conflate routing estimates with current road conditions.

## Components

Functional candidates only; no file/module interfaces are specified.

| Component | Purpose | Candidate inputs/outputs |
|---|---|---|
| Source acquisition | Obtain a bounded, dated OSM extract | Area -> source snapshot |
| Map preparation | Select, style and verify relevant features | Snapshot -> teaching layers |
| Print renderer | Produce consistent paper variants | Layers + layout -> PDF/SVG |
| Exercise generator | Choose questions with known answers | Verified area + skill -> exercise |
| Answer validator | Check location, direction, route and explanation | Response -> evidence/feedback |
| Learning record | Preserve attempts and skill-specific uncertainty | Attempt -> progress evidence |
| Instructor review | Approve maps, questions and ambiguous answers | Proposed content -> approved content |

Data model/types, emitted/consumed events, payloads, method signatures and blocking semantics remain unspecified. Do not invent these to satisfy the template. They must be defined before implementation readiness.

Application geometry/network logic should determine geographic correctness. An LLM may interpret explanations, offer hints and adjust wording. Adaptive selection may distinguish error patterns. Neither should invent road connections, restrictions or landmark locations.

## Settings

No settings contract is finalized. Decisions needed: area selection, intended travel mode, paper size, scale, label density, difficulty, permissible hints, source refresh interval, answer tolerances and record retention. Types/defaults/ranges/UI exposure/persistence and flush-failure behavior require specification.

## Startup Sequence

Not specified; depends on desktop, CLI, web or hybrid delivery. Later specify configuration loading, source selection, validation and ready state.

## Shutdown Sequence

Not specified. Later define saving attempts/exports, pending work and resource release.

## Single-Instance Behaviour

Unselected. A paper packet may need no running service; a later generator or web application needs explicit concurrency behavior.

## Error Handling

Design cases requiring explicit behavior:
- Source unavailable or rate-limited.
- Missing street name, landmark, access or restriction data.
- Map labels collide or become unreadable.
- Route leaves the verified extent or crosses disconnected roads.
- Answer is valid but differs from a suggested route.
- User's explanation is ambiguous.
- Input map/answer is rotated or resized.
- A source update changes an exercise's answer.
- Export or saving fails.

Do not equate absence of a mapped restriction with confirmed permission.

## UI / Tray / Interaction

Proposed outputs: printable map packet plus optional stationary browser practice. No tray application proposed. Detailed controls, accessibility behavior, status strings and notification behavior remain unselected.

Digital interaction candidates: select a road, place a heading arrow, trace a route, hide/reveal labels, reconstruct landmarks and explain an answer. Paper responses could initially be reviewed manually; photo-based checking is optional and unvalidated.

## Edge Cases

- Multiple correct routes: score explicit objectives, not exact match to one shortest path.
- Map familiarity: test familiar and unfamiliar areas separately.
- One-way streets: return path can differ.
- Bridges/tunnels: crossing lines may not connect.
- Divided roads/roundabouts: simplified graph may conceal meaningful detail.
- Road direction differs from its overall bearing: use the relevant segment.
- Changed restrictions/construction: date and review real-world materials.
- Zero suitable exercises: report insufficient verified examples.
- Unconfigured area: require selection rather than silently using a home address.
- No personal tracking: exercises can work without collecting live journeys.

## Deployment

Unselected; no deployment was requested. A printable packet can establish usefulness before an account system, hosted app or live tracking. Installation, update and hosting details remain specification work.

## Validation plan

Proposed exploratory pilot:
- Choose one reviewed real neighborhood and a small synthetic map set.
- Cover orientation, position updating, return routes and detours.
- Establish a baseline using ordinary map study/worksheets.
- Compare equivalent but different maps, controlling exposure time and familiarity.
- Measure position and heading accuracy, valid route choices, hints needed, explanation quality and delayed retention.
- Include unfamiliar-map transfer; distinguish trained-item improvement from general learning.
- Review usability with parents/instructors and learners.
- Consider real-world transfer only after stationary exercises are coherent; no claims of safer driving without appropriate evidence.

Participant count, recruitment, consent/privacy procedures, assessment rubric, delay interval and success thresholds remain undecided. A small pilot provides exploratory evidence, not proof of effectiveness or demand.

## Key Risks

- User-observed learner-driver deficit may not be widespread or specific to today's learners.
- Research association between GPS dependence and spatial performance does not prove causation.
- A good game score may not transfer to real-world wayfinding.
- Closely related tools may already serve the exact workflow.
- Map data and labels can be incomplete; route engines do not remove that limitation.
- Cartographic simplification can change the lesson's meaning.
- Maintaining readable labels and multiple map variants may dominate development.
- LLM explanations may be persuasive but geographically wrong.
- Live exercises could add driving distraction; keep interactive work stationary.
- Printing services may constrain automation; raw OSM and regional extracts allow alternatives.
- Public services have usage limits; cache bounded source data appropriately.
- Children's/location data needs deliberate minimization if records are later stored.
- Buyer, pricing and distribution are unknown; personal usefulness is a separate success criterion.

## Decision Log

| Question | Status | Rationale |
|---|---|---|
| Which selected idea? | User selected street/driving variant of #102 | Map literacy and navigation learning |
| Raised maps needed? | No, user clarified | Ordinary paper and physical practice suffice |
| Monochrome print? | Required consideration | Readable street names and network structure |
| Direct OSM adequate? | Potentially; test it | Print services improve presentation, not source accuracy |
| Primary file format? | PDF proposed, not explicitly selected | Easy delivery/printing |
| OSM software stack? | JavaScript-first proposal; not selected | SVG/browser lesson packs with focused libraries under investigation |
| TinyJS? | Optional desktop wrapper | Keep browser compatibility; test platform/export behavior |
| Turn-by-turn directions? | Route preview/simulation proposed | Valhalla provisional; OSRM alternative; live navigation separate |
| Driver interaction in motion? | Stationary exercises proposed | Avoid increasing driving-task distraction |
| Idea repository? | Ideas-for-projects, user selected | Preserve context under In Draft |
| Commercial opportunity? | Unvalidated | No buyer or competitor gap established |
| New implementation repository? | Not selected | Premature before validation |

## Next steps for the new thread

1. Reconfirm scope: younger map learners, learner drivers, or a staged curriculum spanning both.
2. Examine existing learning tools, instructor curricula and paper resources for this exact combination.
3. Compare the same bounded area through direct OSM, a monochrome print service and custom QGIS styling.
4. Design a short learning progression and manually verified exercises.
5. Define an exploratory test and measurable success criteria.
6. Test the JavaScript-first proposal: one bounded pack, SVG labels/interactions, JSON round-trip and actual-size monochrome print.
7. Compare OSRM/Valhalla on reviewed one-way, bridge, divided-road and return-route examples; evaluate stored route/map consistency and instruction clarity.
8. Only then select architecture and finish the repository template's implementation contracts. Evaluate TinyJS only if desktop functions justify it.

## Implementation Readiness Evaluation

**Not ready; deliberately In Draft.**
- Scope, user corrections, research sources, candidate tools and initial evaluation approach are captured.
- Data types, enums, event contracts, settings, methods, process lifecycle, exact error behavior, UI strings and deployment are not specified.
- Print quality, road-data correctness, learning effectiveness and user demand are untested.
- Do not mark Spec Complete or begin implementation based solely on this handoff.

## Address-system learning (candidate #115)

**Status: In Draft.** The user additionally selected #115 on 2026-10-11. Proposed consolidation: a module of this street-map project, not a separate product. See [selected candidates](https://github.com/jschell/Ideas-for-projects/blob/05776feb3bf2ea904ebf002b5d86a5a0297d0e07/docs/selected-candidates.md).

Purpose: use street names, numbered streets/avenues, address ranges and directional suffixes to infer approximate location and orientation, then verify against a map.

Initial examples:
- Compare similarly named addresses with different directional suffixes.
- Locate a numbered street within a local grid.
- Estimate a block from a supported address range, then check the result.
- Explain why two nearby-looking addresses may be separated by a disconnected road network.
- Distinguish compass direction in an address from the learner's current heading.

Address conventions vary by jurisdiction and have exceptions. Do not assume a universal odd/even side rule, numbering direction, grid or relationship between street and avenue. OSM may have incomplete address tags. Teach only documented local patterns, using verified examples; do not infer actual household locations from uncertain rules.

Validation: compare performance on familiar and unfamiliar addresses, position accuracy, reasoning and reliance on hints. Separate learning a local numbering pattern from general map literacy.

Data, exercises, instructional sequence and technical contracts remain unspecified. No packet or prototype exists for this module.
