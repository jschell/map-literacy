# Plan 00 — Roadmap

Status: reference, 2026-10-12. Current authorized deliverable: planning foundation and reviewable PR.

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
