# Cleveland / Brown Street draft learning packet

This is a source-backed **material draft**, not an approved lesson or current route guide. Open the draft from Review/edit materials → Coordinator review catalogue, or import [pack.json](pack.json) into the prepared-map interface to inspect the map and print each selected question. Begin lesson remains disabled because independent review is pending. No new UI or scoring type is introduced.

The focus is a small portion of the retained downtown Redmond snapshot. A–D are authored reference points at recorded source nodes, not asserted physical landmarks. Required street labels and references appear in labeled/partial variants; blank is only for instructor-led reconstruction, not the four question sheets. The packet is not a complete road map; full selected way geometry is preserved and clipped for display, with other roads omitted. Unknown access/turn restrictions prevent approved route or detour use.

## Use and reproducibility

For each question choose Learner worksheet and Download lesson PDF; separately choose Instructor guide. Use Letter portrait or landscape at 100% actual size. Keep [instructor-manifest.json](instructor-manifest.json) and the instructor notes away from learner handouts: they contain answers. Download whole-lesson PDF exports all four questions in order; selected-question output remains available. PDF preview exposes every page and preserves separate learner/instructor output.

The retained `map-literacy-redmond-source-20261012.zip` supplies source.osm.json, acquisition.json, pack.json and review-report.json. Extract to a local working directory, then run:

```sh
node scripts/prepare-redmond-materials.js path/to/retained-bundle new-output-directory
npm run validate -- new-output-directory/pack.json
```

The preparation script rejects different checkpoint bytes and existing output directories. Compare generated pack/manifest to these committed files. Source/parent hashes, selected way IDs, marker-node IDs, label policy, questions and derived bearings are explicit. A same-source replay is not a newer snapshot comparison or current field verification.

OSM-derived content retains OpenStreetMap contributors attribution and ODbL-1.0; the repository MIT license does not relicense this pack. Source date is 2026-10-13T01:22:16Z. Full raw source and original review report remain in the retained checkpoint rather than git. Abbreviations: Ave = Avenue, St = Street, NE = Northeast. Review source names and exact junction identities before approving learner use.

See [learner activities](learner.md) and [instructor review notes](instructor.md). This is preparation for the first two stages and a concrete review draft for later stages of the [learning sequence](../../learning-sequence.md), not completion of the six-stage experience or pilot.

## Technical checks completed

All 225 Node tests pass, including packet hash/source lineage, draft-score boundaries and required labeled/partial clues in both Letter layouts. Exact regeneration reproduces pack and instructor manifest; a tampered checkpoint is rejected before output is written. Browser checks imported the draft, confirmed scored practice stays disabled, exported all four questions for both audiences/orientations (16 two-page Letter documents), and found no page errors or narrow-screen overflow. Representative learner map/question and instructor endpoint pages were rendered and inspected. These checks do not supply independent content approval or physical/device/learning observations.

Independent raw-source replay requires the retained checkpoint from the maintainer; the full raw bundle is not committed here. The public endpoint URL and recorded query do not promise identical bytes from a later fetch.
