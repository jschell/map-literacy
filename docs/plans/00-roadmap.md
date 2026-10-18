# Plan 00 — Roadmap

Status: reference, reprioritized 2026-10-18 after PR 58. Plan 02 is active for one bounded reviewed neighborhood sequence. Existing street and synthetic terrain software is sufficient for initial material evaluation; Plan 08 returns to the queue with its acceptance gaps retained. Printing is usable in the user-reported workflow; independent material review and observed transfer remain open.

## Milestones

1. Define bounded pack, lesson, state, failure and print contracts (01).
2. Prove source integrity and SVG/print behavior (02–03).
3. Deliver four street exercise families and recoverable browser application (04–05).
4. Evaluate learning usability/transfer separately from technical correctness (06).
5. Add turn-by-turn preview/simulation (07) and topo learning (08) on the shared foundation.
6. Extend delivery only when evidence supports it (09).

## Gates and stopping criteria

The first usable application ends at Plan 05. Do not continue adding infrastructure merely to fill the roadmap. If sources cannot support a verified lesson, use an explicit synthetic fixture and report the gap. If printed labels are illegible, fix extent/style rather than shrink the page. If pilot results show confusion or no useful transfer, revise lessons before expanding product scope.

Topo includes new source and scoring requirements, not just a basemap toggle. Directions include maneuver correctness, not merely drawing a line. Neither live navigation nor terrain travel safety is an MVP requirement.

## Cross-cutting evidence

Keep source hashes/queries/version and attribution; deterministic fixtures; reviewed topology; scale calibration; keyboard/touch evidence; export/import recovery; unknown/ambiguous answer handling. Record target-browser and physical-print checks explicitly as pending until performed. No accounts, household location inference or live tracking by default.

## Completion discipline

Each plan records actual changes, validation and unresolved acceptance items. Use one focused PR per coherent work package or substantial slice; fix related issues together. Preserve open decisions rather than declaring implementation-ready based on prose alone.



## Authorized priority correction — 2026-10-18

The user approved returning from terrain feature expansion to practical map literacy. Execute in order: (1) verify the merged depression release; (2) prepare one reproducible neighborhood pack and matched instructor/learner sequence under Plan 02; (3) complete five equivalent eight-item synthetic sets under Plan 06; (4) resolve targeted material/device checks and coordinate actual observations; (5) use the existing revise/continue/pause criteria before further expansion. See [learning sequence and evidence ledger](../learning-sequence.md).

Do not implement more terrain capabilities, directions simulation or address scoring merely because their plans contain unchecked items. A concrete learner/material problem can justify a focused fix. Blocked independent review or participation is a recorded boundary, not permission to replace learning evidence with more code.
