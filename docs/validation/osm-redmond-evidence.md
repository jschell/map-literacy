# Redmond source preparation evidence

Status: successful live acquisition and reproducible draft; not a reviewed lesson pack. Recorded 2026-10-12 (America/Los_Angeles).

Candidate display extent: [-122.127,47.672,-122.123,47.675]. Buffered source extent: [-122.129,47.670,-122.121,47.677]. Public downtown blocks, not an inferred household location. See examples/osm-redmond.json and docs/osm-preparation.md for acquisition/replay commands.

Endpoint: https://overpass-api.de/api/interpreter . Generator: Overpass API 0.7.62.11 87bfad18. Retrieval timestamp: 2026-10-13T01:23:50.930Z. Database snapshot timestamp: 2026-10-13T01:22:16.000Z.

Exact raw SHA-256: 103fa2e3a00e1c178393314137ea3f9f96e3c1545a8f294c8fd0301bb9ae7564 . Raw response 1,284,136 bytes; generated pack 4,615,577 bytes; report 528,350 bytes. Source carries OpenStreetMap contributors attribution and ODbL-1.0.

| Observation | Count |
|---|---:|
| Source objects | 4,829 |
| Drawn highway ways | 918 |
| Candidate directed graph edges | 5,839 |
| Edges with unknown driving access | 5,839 |
| Named/unnamed drawn ways | 136 / 782 |
| Outside-boundary ways excluded | 116 |
| Area-road ways excluded | 5 |
| Conditional-rule issues | 6 |
| Restriction relations preserved but untranslated | 41 |

The 2,721 report issues also include 853 unknown-direction and 918 unreviewed-access entries. One way can have multiple issues. Highway ways include paths/sidewalks/service geometry; these counts are not a count of legally drivable streets. Missing names do not imply source incompleteness of every geometry. No required relation members were reported missing in this snapshot, but no maneuver correctness is claimed.

Observed name examples include 161st Avenue Northeast, 162nd Avenue Northeast, Gilman Street and Brown Street. Names are source observations, not independently surveyed facts.

## Verification performed

- Source byte hash matched the manifest.
- Generated pack passed CLI structural/reference/geometry validation.
- Importing the saved raw bytes and acquisition metadata into a fresh directory reproduced pack, source and report bytes exactly.
- Comparison of original and replay source reported no added/removed/changed objects. This is a replay check, not a later real-world refresh comparison.
- Source bundle checkpoint preserved as map-literacy-redmond-source-20261012.zip, containing exact raw source, pack, report and acquisition metadata. It is outside git; a later fetch is not guaranteed to return identical source bytes. Use the retained checkpoint for exact replay.

The first wider candidate exceeded the report issue budget; narrowing the area produced the successful bounded bundle. An initial public status-endpoint request returned 406, while later identified interpreter fetches worked. No authentication requirement was inferred and no automatic retries were introduced.

## Still required

Review usable road/landmark content, restrictions and excluded boundary geometry; create reviewed exercises; inspect rendered labels and printed extent; perform a genuinely newer source comparison when available. Pack remains draft with zero exercises and access unknown. Plan 02 is not complete.
