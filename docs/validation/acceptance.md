# Validation and acceptance matrix

Initial budgets and pilot parameters are engineering proposals; record measured revisions. Automated pack/scoring/storage, Chromium keyboard/touch-emulation and PDF evidence exists; actual device, physical-print and participant-pilot acceptance remains pending. See [accessibility evidence](accessibility.md), [storage evidence](storage.md) and the [pilot kit](../learning-pilot.md).

| Gate | Evidence and pass rule | Execution owner/plan |
|---|---|---|
| Pack integrity | Required types, limits/references, all rejection fixtures, source manifest round trip | Implementer / 02 |
| Topology/scoring | All fixture expected outcomes; multiple routes and unknowns preserved | Implementer / 02,04 |
| Projection | Forward/inverse round trip <=0.1m; independent distances/rotation, max 0.5% extent distance error | Implementer / 03 |
| Print scale | PDF page/slots as specified; printed known scale distance within 1%, 8pt minimum labels readable | Implementer PDF / 03; user/device operator paper / 03 |
| Interaction | Keyboard equivalent for every pointer action, visible focus, semantic labels, 44 CSS px control targets, feedback not color-only | Implementer/device operator / 03–05 |
| Storage | Transaction failures, quota, conflict, export/import and migrations preserve prior state | Implementer / 05 |
| Performance | Agreed max pack: parsed/validated <=1s, first map <=2s, feedback <=100ms, p95 pan/input response <=100ms | Implementer + target tablet operator / 03–05 |
| Release | No inline scripts/styles/CDNs, no required accounts/location, no blocked-path dead ends | Implementer / 05 |
| Routes | Reviewed maneuver fixtures, snapshots and no-route failures | Implementer/reviewer / 07 |
| Terrain | Units/CRS/nodata, known hill/valley/profile, map alignment | Implementer/reviewer / 08 |
| Learning | Protocol below, complete anonymized results including failures | User/instructor coordinator / 06 |

Proposed target browser matrix: latest stable Chrome and Firefox desktop, latest stable Safari on macOS, and Safari on a touch iPad. Record exact OS/browser/hardware at execution; no presumed version numbers or claimed compatibility. Aim to test an older user-available tablet as a performance stress case; exact device pending. Dev-machine performance is provisional until physical tablet runs. Unsupported capability shows an actionable message. Browser automation is useful but cannot replace physical touch/paper/pilot evidence.

## Exploratory pilot protocol

The original proposal below is retained as planning history. The [version-1 pilot kit](../learning-pilot.md) now specifies five sets, exact capture fields, comparison eligibility, denominators and ordered gates; use that protocol for preparation/reporting. No observations or recruited participants exist.

Proposed scope: 4–6 voluntary learners who can independently read short street labels; exact ages/recruitment pending coordinator. Obtain guardian permission/learner assent where applicable; no automatic invitations/contact. Use local pseudonymous IDs; export no names, home addresses, tracks or audio. User coordinator controls participation; no one has been recruited.

For each learner: baseline 8 items (2 each heading, endpoint, connectivity, detour), then 15 minutes of ordinary map/worksheet study versus interactive practice on two distinct equivalent synthetic sets. Counterbalance order across learners; baseline familiarity rated unfamiliar/somewhat/familiar for real area. Use third unseen map for immediate transfer, and a fourth after 7 days (+/-2 days) for delayed transfer. Do not reuse trained items for transfer scores. Small crossover practice effects and nonrandom recruitment limit conclusions.

Record first-attempt correctness, heading error, endpoint meters, valid-route objective, hints, time and explanation rubric. Explanation 0=missing/wrong relationship, 1=partly correct with a major omission, 2=correct relationship and reason; instructor review, retain ambiguity notes. Report correct/incorrect/needs-review/unanswered counts with denominators, per-skill changes and individual results; no p-values or general efficacy claims from small pilot.

Initial revision gates: any map/rubric factual error blocks use until fixed; >20% ambiguous/unscorable items triggers item revision; inability of >=2 participants to complete without interface assistance triggers interaction revision. Explore continuation if >=3 of 4 (or proportionate 75% for 5–6) participants show improved unseen-map accuracy over baseline and median improvement persists at delayed check. Treat as directional pilot evidence, not proof of superiority. Missing follow-up means retention unresolved. If fewer than 4 finish, usability observations only. Driving safety is not measured.

Record actual recruitment/age mix, exposure, protocol deviations and familiarity before interpreting results. Printing and cognitive-transfer findings remain separate gates; passing software tests does not complete Plan 06.
