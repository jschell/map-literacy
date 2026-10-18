# Five draft street pilot sets — retained revision 1

**Superseded review candidate:** the [author desk review](../../reviews/2026-10-18-pilot-materials.md) found repeated transfer tasks. Do not use this revision as unfamiliar-transfer evidence. Use [revision 2](../pilot-v2/README.md) for the next review; original generated files and hashes remain unchanged.

These are **prepared materials awaiting independent review**, not approved pilot packs or learner results. They implement the existing five-set/eight-item requirement without adding a scorer, reporting system or app feature. All packs and exercises remain draft; importing a pack supports inspection/print, while Begin lesson is disabled.

| Set | Intended protocol role | Pack | Learner sheet | Instructor key |
|---|---|---|---|---|
| A | Baseline | [Map](set-a.json) | [Questions](learner-a.md) | [Answers](instructor-a.md) |
| B | Counterbalanced training | [Map](set-b.json) | [Questions](learner-b.md) | [Answers](instructor-b.md) |
| C | Counterbalanced training | [Map](set-c.json) | [Questions](learner-c.md) | [Answers](instructor-c.md) |
| D | Immediate transfer candidate | [Map](set-d.json) | [Questions](learner-d.md) | [Answers](instructor-d.md) |
| E | Delayed transfer candidate | [Map](set-e.json) | [Questions](learner-e.md) | [Answers](instructor-e.md) |

Every set has two heading, two endpoint, two route and two detour questions. All coordinates, streets, reference letters, access and closures are invented; content is CC0-1.0 and is unrelated to real travel permission. Street labels omit the word Road: Ash means Ash Road. All drawn roads are bidirectional in these exercises. The two directions of a closed road are both blocked. Route acceptance uses graph validity, not a shortest-path exact match. Answer files provide two examples per route/detour and explicitly allow other valid routes.

## Screen and paper review

Import the matching set file into Lesson map and print. Choose the exercise, then Learner worksheet or Instructor guide and Download lesson PDF. Repeat for the eight questions; the existing exporter saves one selected question at a time. The Markdown learner sheet provides the full question sequence; use it with the matching map. Keep instructor keys, `answers-*.json` and material-index.json away from learners. No approved interactive copy is provided before review.

Road labels are upright on north-up paper; small authored label-position offsets are retained in each source recipe. All required road names and reference letters appear in labeled and partial views. Blank maps are for separate reconstruction practice, not these scored questions. Street names and references are part of the task, not decorative labels. Inspect closures, start/end annotations and answer separation for each item. Paper remains north-up; screen rotation is practice only, unless a later assessment procedure explicitly controls it. First-response baseline/transfer blocks must follow the existing no-hint/no-coaching protocol.

Both Letter orientations use 1:1,000 scale with 8 pt minimum labels. PDF inspection is technical evidence; actual paper/device readability and participant use remain pending. Do not shrink labels to make a confusing sheet pass.

## Comparability and unfamiliarity review

The sets change central road connections, junction positions and extensions. Distinct node/road counts establish that these are not merely renamed or rotated copies; they do **not** establish unfamiliarity or matched learning difficulty. They still share small grid motifs and reuse short road-name vocabulary. Review whether that overlap enables memorized responses.

| Set | Nodes / undirected roads | Shortest route items (segments) | Shortest detours (segments) | Specific review concern |
|---|---|---|---|---|
| A | 7 / 9 | 3, 3 | 4, 3 | Simplest visual network; may make baseline easier |
| B | 8 / 11 | 3, 3 | 3, 3 | Training exposure must match C despite fewer roads |
| C | 9 / 12 | 3, 2 | 3, 4 | Near-south heading and shorter route differ from B |
| D | 8 / 12 | 2, 3 | 3, 4 | Northwest/southwest bearings; diagonal connections |
| E | 10 / 14 | 3, 2 | 4, 4 | Most labels and longer detours could bias retention downward |

The exact degree values, coordinates, alternative counts and per-file hashes are in [material-index.json](material-index.json) and the separate instructor keys. Edge counts are descriptive, not a calibrated difficulty score. Review visual density, inference demands, bearing estimation, clue count, route alternatives, closure salience and exposure time. Revise sets before approval if differences would confound the protocol. ConditionsComparable stays null until an independent review supports it.

## Review and release gate

| Required check | Current state | Needed evidence |
|---|---|---|
| Exact bytes and eight skill references per set | Technical checks | Generator, validator and hash/index consistency |
| Candidate answers and route alternatives | Technical checks | Existing scoring oracle; published drafts still return needs-review |
| Source/geometry and crossing clarity | Independent review pending | Review each node/junction; ensure no unintended visual connections |
| Question clarity, tolerance and equivalence | Independent review pending | Reviewer role/date, per-item findings and cross-set comparison |
| Screen/paper usability | Device/paper review pending | Actual device interaction, printed clue readability and scale |
| Permission, participation, unfamiliarity and delay | Pending | Coordinator-managed real observations under the existing protocol |

Retain per-item findings as passed/failed/pending with evidence and reviewer role/date. Automated technical checks are not that independent approval. A reviewer can inspect candidate paths/answers now without starting a scored session. If content is approved, record the actual review and create explicit new pack revisions, regenerated hashes and capture references together; do not silently flip a draft or treat this revision as approved. Preserve earlier files and participant references.

## Reproduce and capture

```sh
node scripts/generate-pilot-materials.js --check
node scripts/generate-pilot-materials.js
npm test
npm run pilot:summary -- docs/materials/pilot-v1/capture-template.json
```

The generation command writes only the named generated material files; --check compares exact bytes. Each source recipe includes its metric points, roads and invented permission policy, hashed independently of the pack hash. The generated [capture template](capture-template.json) pre-fills the five material identities and forty exercise/skill references, but keeps approval/comparability/factual-error flags null and participants/items empty. Copy it into ignored pilot-data before any observations. Its empty summary must remain pending-review with zero observations, not fabricated scores.

Follow [the existing protocol](../../learning-pilot.md) unchanged: 4–6 voluntary learners, appropriate permission/assent, counterbalanced B/C exposure, unfamiliar immediate and delayed observations, delayed window 5–9 days, and predeclared revise/continue/pause gates. No recruitment, permissions or participant results are implied by these files. The [Redmond packet](../redmond-r1/README.md) remains a separate real-source material draft; these synthetic sets do not approve it.

## Technical validation record

230 Node tests pass. Exact generated bytes, per-pack hashes and forty capture references agree; the empty capture summary stays pending-review with zero observations. Tests check multiple accepted route witnesses, both-direction closure rejection, draft scoring boundaries, no unmarked road intersections and all clues in labeled/partial Letter maps. Upright labels and clue preservation are checked at 336, 640 and 1000 pixel map widths; narrower devices and actual readability remain unassessed.

All forty questions were exported for learner/instructor audiences in both Letter orientations (160 documents). Draft sessions stay disabled, narrow pages do not overflow and all labels remain visible at the checked narrow viewport. Representative heading, route and closure map/question pages and the densest narrow diagram were rendered and inspected. The walkthrough corrected upside-down labels, narrow clue omissions and raw closure IDs on learner print. Instructor closure IDs and map closure geometry are preserved. These are technical checks, not independent content approval, actual paper acceptance or learner outcomes.


Final validation: all 160 exports contain two correctly sized Letter pages after the learner-print correction. Full packaged Chromium site/Pages release checks pass with zero browser errors, including existing street/terrain scoring, storage/recovery, accessibility and fixed-scale PDF regressions. Fixtures reproduce exactly and all 211 local Markdown links resolve. Actual material review, device/paper use and participant outcomes remain pending.
