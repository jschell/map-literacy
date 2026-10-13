# Fixture specification

Plan 01 design cases, not implemented fixtures. Plan 02 creates machine-readable files and expected outputs.

Use synthetic origin [0,0], tiny coordinates in degrees and source manifest kind=synthetic with hash of actual generator output. nodes A=[0,0], B=[0.001,0], C=[0.001,0.001], D=[0,0.001]. Four edges AB, BC, AD, DC each directed, drive/allowed, explicit shapes and recomputed lengths. They form two permitted A->C paths [AB,BC] and [AD,DC]; original source contains no claim about actual roads. Reviewed note records fixture recipe. Features/labels map these identities; sourceBounds encompasses all coordinates.

Full envelope materialization must include every required field in lesson-pack-v1; the following examples define content and expected behavior without fake hashes.

| Case | Input | Expected result |
|---|---|---|
| heading-wrap | Expected 0, tolerance 15; answers 359,15,16 | correct, correct, incorrect; errors 1,15,16 |
| endpoint-boundary | Expected A, tolerance 20m; points constructed 19.9/20/20.1m from A | correct, correct, incorrect |
| two-valid-routes | any-valid A->C; AB+BC or AD+DC | Both correct |
| disconnected-order | A->C; BC+AB | incorrect start/connectivity |
| one-way-return | A->B contains AB only, no BA | Reverse use unavailable; no-route; no invented inverse edge |
| bridge-crossing | Add lines whose coordinates cross but node IDs do not join | No connection at intersection drawing |
| detour | Close BC; A->C answer AD+DC | correct; AB+BC incorrect closure |
| only-turn | only=[AB,BC]; answer AB then another permitted branch | incorrect restriction |
| unknown-access | BC access unknown | needs-review, never correct |
| incomplete-relation | Source relation members missing | Exclusion; exercise using it not approved |
| zero-distance | start=end A; empty edgeIds | correct only under stated rubric |
| no-exercises | Reviewed pack exercises=[] | preview-only success |
| bad-reference | Edge from nonexistent node | invalid-import, prior pack remains |
| future-topo | module topographic, capability terrain-v1 | unsupported-capability, no writes |
| future-route | street-core + directions-v1 | unsupported-capability, no writes |
| unsupported-version | schemaVersion 2 | unsupported-version |
| stale-save | Two tabs use same session version | One commits, other conflict |
| rollback | Backup contains one conflict | No partial imports |

Real-neighborhood candidate: a public-road area around downtown Redmond, WA, approximately bounds [-122.130,47.670,-122.110,47.680]. This is a proposed public study area, not an inferred home address. No local topology, names, restrictions or lesson suitability have been verified. Plan 02 must choose buffered sourceBounds under size limits, acquire current OSM, inspect crossings/access/labels and exclude ambiguous cases. A different public area may be substituted with recorded rationale.

No real route directions, DEM values or geographic correctness claims are inferred from this candidate. Keep synthetic and real datasets explicitly distinguishable.
