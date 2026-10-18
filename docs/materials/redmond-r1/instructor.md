# Instructor draft and review ledger

Independent reviewer role/date: **pending**. This is not approval to start a scored session or send participants into the area.

## Answer rationale

| Item | Expected response | Review boundary |
|---|---|---|
| orient-ac | Initial great-circle bearing A→C approximately 18.95°, with candidate ±15° tolerance | Geographic bearing stays the same when paper rotates. Review whether an estimate with this tolerance is teachable from the print; screen heading control uses degrees. |
| orient-ab | A→B approximately 111.03°, candidate ±15° | B lies east and south of A; straight bearing differs from the road's local tangent. |
| locate-b | B, source node 53196765 at Brown/Cleveland | Candidate 10 m tolerance; independently review junction identity and whether labels provide sufficient clues. |
| locate-a | A, source node 2459700408 at 161st/Cleveland | Candidate 10 m tolerance; source identity is distinct from B. |

Exact coordinates/rubrics and pack-byte hash are in instructor-manifest.json. Explanation is manually reviewed: 0 = no relevant clue/wrong relationship; 1 = one relevant clue with incomplete reasoning; 2 = correct relationship and two relevant clues. This draft explanation rubric is for coached practice, not a new automated score or a changed pilot threshold.

For the later-stage prompts, source-node identities connect the A–B Cleveland chain and the B–D Brown chain in the retained candidate graph. All access remains unknown, absent oneway information is flagged and restriction interpretation is incomplete. Neither forward nor reverse travel is approved. The focus map has no reviewed alternative for an A–B closure; recognizing insufficient evidence is appropriate. Do not invent an acceptable real detour or classify a guessed route as correct. These prompts require independent review before participant use.

## Evidence ledger

| Check | Result | Evidence / reviewer |
|---|---|---|
| Retained checkpoint hashes | Passed | Technical preparation, 2026-10-18; four hashes in manifest |
| Exact current-tool replay of original source/pack/report/acquisition | Passed | Byte equality with retained files; no new acquisition |
| Subset structural validation and exact regeneration | Passed | Existing validator and deterministic preparation script |
| Geometry/node identities and unknown access preserved | Passed, technical | Eight original way geometries, 31 nodes, 60 unknown-access candidate edges; independent source review pending |
| Required labels and map references | Passed, technical model | All seven labels fit both fixed-scale Letter models; independent readability review pending |
| Independent source/question/ambiguity review | Pending | Reviewer/date and evidence required |
| Route/access/restriction approval | Pending | No route/detour scoring included; full report/raw source retained |
| Draft browser/PDF preview | Passed, technical | Draft session blocked; no page errors; learner/instructor portrait/landscape exports; sampled map/question pages and narrow map visually inspected |
| Physical paper and target-device use | Pending | Record observations separately from PDF rendering |
| Learner/instructor usability and transfer | Pending | No participant observations |
| Genuinely newer source comparison | Pending | This is an exact old-source replay |

## Next preparation

Review candidate tolerances and required clue placement, inspect all four questions in both orientations, then obtain independent content review. Revise the packet rather than overriding draft status. If routing remains unresolved, keep the map-reading packet narrow and prepare the already-specified synthetic pilot sets independently. Do not mark the whole neighborhood release complete or add a new scorer to work around this review boundary.
