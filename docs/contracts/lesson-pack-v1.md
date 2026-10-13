# Lesson pack v1

Status: street-core v1 structural/reference validation implemented. An initial SVG/print renderer is implemented; scoring and persistence remain later work; terrain/routing payloads remain later-plan contracts.

## Envelope and primitives

JSON UTF-8 object. Unknown schemaVersion rejected before writes; v1 uses integer 1. Required keys are below; reject unknown structural keys except namespaced extensions. IDs are case-sensitive strings matching ^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$. OSM identities are strings (never JS Number conversions). Revision is a positive safe integer. All numerical inputs finite; dates UTC ISO-8601 strings; null means explicitly unknown, not zero.

Implementation clarification: dates are canonical UTC with millisecond precision (YYYY-MM-DDTHH:mm:ss.sssZ). No extension keys are documented/supported yet, so extensions must be empty. All arbitrary metadata text is bounded to 2,000 characters; JSON traversal is bounded to 1,500,000 values and at most 1,000 reported errors. Ordinary validatePack checks hash format, not upstream source-byte possession. Acquisition verifies byte hashes separately.

| Field | Type/rule |
|---|---|
| schemaVersion | integer 1 |
| id, title, revision | ID; text 1–120 chars; positive integer |
| module | street or topographic |
| capabilities | unique list of street-core, terrain-v1, directions-v1 |
| review | {status: draft/reviewed/rejected, reviewedAt: date/null, note: text <=2000} |
| bounds | [west,south,east,north], EPSG:4326 longitude/latitude, nonzero extent |
| sourceBounds | same form; contains bounds |
| sources | Source[]; nonempty |
| features | GeoJSON FeatureCollection, feature IDs unique |
| topology | {nodes: Node[], edges: Edge[], restrictions: Restriction[], completeness: complete/partial, exclusions: Exclusion[]} |
| labels | Label[] |
| exercises | Exercise[] |
| print | PrintPreset |
| extensions | object; only documented namespaced keys, initially empty |

Reviewed pack requires reviewedAt and a review note describing checked extent/features and exclusions. A reviewed pack can have partial topology, but no scored exercise may use excluded/unresolved parts. Draft content can be previewed with a visible unreviewed indicator; scored practice starts only on reviewed, supported exercises. Rejected content is not offered for practice. Review does not establish current real-world conditions.

Street-core application imports only module=street and capabilities=[street-core]. Future topo/directions capabilities are recognized but rejected with unsupported-capability before persistence. They cannot be silently ignored. This preserves an extension boundary without pretending later modules are implemented.

Limits: 10 MiB file, 10,000 features, 100,000 total coordinate positions, 20,000 nodes, 40,000 directed edges, 5,000 restrictions, 2,000 labels, 200 exercises, nesting depth 32, individual free text 2,000 chars. Check byte size before parse; validate budgets before rendering/writes. Geographic support: abs(latitude)<=70 degrees, no dateline crossing, display diagonal <=5 km; source extent <=10 km diagonal. Exceeding these returns extent-unsupported. These are initial bounded-SVG limits, not geographic-data limitations.

## Sources

Source = {id, kind, url, query, fetchedAt, sourceAt, version, sha256, license, attribution, transforms}.
kind = osm/synthetic/elevation/routing. url is HTTPS or null for synthetic. query string/null; sourceAt/version nullable when not supplied; sha256 is 64 lowercase hex of exact acquired bytes, not normalized JSON. license/attribution nonempty text. transforms=[{name,version,parameters}] with JSON-only parameters. Derived imports retain source byte hash and transformation lineage; reviewer identity need not be personal.

Synthetic source URL may be null, with generator/recipe in transforms. Do not fabricate upstream version/date. Acquiring a new source or changing any scored/printed content increments pack revision.

## Drawing and topology

Features: Point, LineString, Polygon, MultiLineString or MultiPolygon; coordinates [longitude,latitude], within sourceBounds. properties contain sourceId, role (road/landmark/water/building/trail/contour), name text/null and tags object of text values. SourceId resolves to sources. Terrain roles unsupported in street-core. No imported HTML, scripts, external images or executable styles.

Node = {id, coordinate:[lon,lat], sourceId, sourceObjectId:null/string}.
Edge = {id, from, to, featureId, sourceId, mode:walk/drive, access:allowed/unknown/blocked, lengthM:positive, shape:[[lon,lat],...]}.
Each directed edge has explicit mode/access; opposite direction is another edge. Shape begins/ends at node coordinates within 0.1 m validation tolerance. lengthM recomputed geographically with error <= max(0.1m,0.001*computedLength).
Restriction = {id, edgeSequence: ID[2..16], rule:forbidden/only, mode:walk/drive, sourceId}. A only sequence requires the final edge after the matched prefix; forbidden disallows the complete sequence. Unsupported conditional/via semantics remain raw source with exclusion; do not approximate as ordinary turns.
Exclusion = {id, objectIds:ID[], reason:text}. Original OSM source records must be retained in the preparation output or a manifest-addressed sidecar before claiming reproducibility; this simplified graph never replaces original relation evidence.

An exclusion requires topology.completeness=partial. Exclusion objectIds may identify unresolved source objects, so they need not resolve to derived graph IDs. Exercise endpoint references still resolve to nodes. Heading exercises do not take closure scenarios. Reviewed-route approval also requires later path/source review; structural validation alone is not proof of a permitted or available route.

Label = {id, featureId, text, anchor:[lon,lat], rotationDeg:finite [-180,180], visibleIn:labeled/partial, priority:integer 0..100}. Labeled mode considers all authored labels; partial mode considers only visibleIn=partial. Blank mode considers none. Without authored labels, the renderer generates a deterministic initial name subset for review; these generated labels are not approval of content. Omit labels for blank view. Duplicate label IDs rejected. Text is literal, <=120 chars.

The local authoring editor applies label additions/updates/removals atomically to a cloned, validated pack. New/changed anchors must lie inside bounds. Each edit increments revision, sets pack review to draft with reviewedAt=null, and sets every exercise review to draft. Undo restores the prior label array as a new draft revision rather than reusing an exported revision. Source metadata/hashes, display geometry and topology stay unchanged. Standalone pack export validates the entire copy and enforces the import byte limit; this is not a progress backup or a persistence transaction.

## Exercises

Common = {id, type, prompt:text, review:reviewed/draft, sourceIds:ID[], hints:text[0..3], rubric, scenario:null/Scenario}.
Scenario = {id, closedEdgeIds:ID[], label:text}; closure is synthetic and applies to the exercise only. No source mutation.

| type | rubric | Answer |
|---|---|---|
| heading | {expectedDeg:[0,360), toleranceDeg:(0,45]} | {type:heading, degrees:[0,360)} |
| endpoint | {expected:[lon,lat], toleranceM:(0,100]} | {type:endpoint, coordinate:[lon,lat]} |
| route | {startNodeId,endNodeId,mode:walk/drive,objective:any-valid/max-distance,maxDistanceM:null/positive} | {type:route,edgeIds:ID[0..1000]} |
| detour | same route rubric; scenario required, nonempty closedEdgeIds | {type:detour,edgeIds:ID[0..1000]} |

Defaults supplied by pack author, not silently invented by scorer: heading tolerance 15 degrees, endpoint tolerance 20 m. They are pilot starting values and recorded per exercise; changing them increments revision. Route max-distance requires positive maxDistanceM; any-valid requires null.

Answers/exercise type must agree. Heading error=min(abs(a-b),360-abs(a-b)); boundary inclusive. Endpoint uses geographic great-circle distance with earth radius 6371008.8 m; boundary inclusive.

Routes: resolve edges -> start/end -> adjacency -> mode/access -> restriction sequences -> scenario closures -> objective. Any violation known from complete reviewed content gives incorrect. Unknown access, ambiguous restrictions or excluded geometry gives needs-review, never correct. Empty path valid only for start=end and no positive-distance requirement. Missing required answer gives unanswered. A valid alternative is correct; no shortest-path exact-match scoring. Path search used for fixture verification applies identical turn/sequence state, not nodes alone.

Score result={status:correct/incorrect/needs-review/unanswered, metrics:JSON numeric/null fields, reasonCode:text, rubricVersion:1}. No free-text automatic grading in v1. Hints counted separately; do not change correctness or silently lower score. Manual explanation rubric belongs to pilot, not deterministic status.

## Print preset and geometry

Initial product target: US Letter (8.5 x 11 inches), selectable portrait or landscape. Other paper sizes are deferred. At 10 mm margins, the target page and printable dimensions are:

| Orientation | Page width x height (mm) | Printable width x height (mm) |
|---|---|---|
| Portrait | 215.9 x 279.4 | 195.9 x 259.4 |
| Landscape | 279.4 x 215.9 | 259.4 x 195.9 |

PrintPreset={paper:letter,orientation:portrait/landscape,marginMm:10,scaleDenominator:1000/5000/10000,labelMinPt:8,mapRotationDeg:0}. Both orientations are accepted by the v1 validator and renderer. A pack supplies its default orientation; the viewer may override it without mutating the pack. Reserve the following vertical slots:

| Orientation | Map width x height (mm) | Questions width x height (mm) | Footer width x height (mm) |
|---|---|---|---|
| Portrait | 195.9 x 208.5 | 195.9 x 30 | 195.9 x 20.9 |
| Landscape | 259.4 x 145 | 259.4 x 30 | 259.4 x 20.9 |

Additional questions use separate Letter pages. Center the geographic extent in the map box; do not stretch axes independently. Changing orientation changes available space, not geographic scale or north-up orientation. If extent/labels cannot fit requested scale, report print-extent-too-large and offer another orientation, extent or scale preset; do not silently rescale. Both orientations preserve minimum label size, north arrow and source attribution.

Street projection: local spherical azimuthal equidistant centered on bounds midpoint, radius 6371008.8 m. Geographic center must be fixed per pack revision; forward/inverse tested with independent known distances and angular cases. Screen x=easting and y=-northing; displayed clockwise rotation is separate. True heading is measured clockwise from true north, not the page top. No magnetic/grid heading lessons in v1. Scale error across declared extent <=0.5%; paper calibration target <=1%. Terrain must supply its own horizontal/vertical CRS contract in Plan 08.

## Example and rejection cases

A complete machine-readable synthetic street pack is in [street-square.json](../../tests/fixtures/street-square.json). The executable structural descriptor is [pack-schema.js](../../src/data/pack-schema.js); [validate-pack.js](../../src/data/validate-pack.js) adds geometric/reference checks. [Fixture expectations](../../tests/fixtures/expected.json) distinguish current import tests from future lesson/storage behavior. Schema key rules here remain normative.

Future topographic envelope example: schemaVersion=1, module=topographic, capabilities=[terrain-v1], with elevation source metadata. Future route envelope: module=street, capabilities=[street-core,directions-v1], route provider/version/options and maneuvers in a documented extension. Both are explicit unsupported-capability in street-core, before writes. Plan 07/08 must finish their payloads before support is advertised.

Reject: duplicate IDs, wrong coordinate order/range, missing source reference, nonexistent node/edge, invalid type/rubric pair, missing synthetic closure, unsupplied hash, unknown capability/version, unsupported geometry/extent, nonfinite number, imported limits exceeded. Pack import is all-or-nothing; correctness unknown is not a structural import failure when the pack records exclusions.


