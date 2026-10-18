# Synthetic ridge and valley lessons

Status: bounded synthetic interpretation questions using the shared terrain v2 envelope, scoring, storage and print pipeline. Requires `terrain-contours-v1` first and optional companions in canonical order: slopes, profiles, landforms. Earlier readers reject the unknown capability before writes. Existing pack revisions and database/backup envelopes are unchanged.

## Supported question

Exercise `terrain-form` uses the common review/source/prompt/hint fields and null scenario. Its rubric is exactly `{axis, halfWidthM}`. Axis contains two LOCAL_METRIC metre points, each coordinate bounded to ±1e9. Axis length is 2–1000 m; transverse half-width is 1–100 m. There are at most 16 landform questions per pack. All seven section endpoints must fit the lesson map extent; source grid and regenerated contour geometry retain the v2 limits.

The processor samples one longitudinal axis and six half-sections perpendicular to it, at 25%, 50% and 75% along the axis. It uses the existing bounded profile sampler, retaining cell crossings, midpoints and bilinear extrema. Spacing is max(0.1 m, section length / 32), with at most 500 samples per section. No missing/outside samples or partial totals are accepted. Each section must have at least 1 m end-to-end relief and every retained adjacent sample must change consistently in that direction by more than 1e-9 m. Flat portions or reversals require review. All six outward half-sections must agree: rising away from the axis means valley; falling away means ridge. The axis must itself be monotone. H marks its higher end, L its lower end, regardless of endpoint order or screen rotation.

This is a bounded stencil test, not a general terrain segmentation algorithm. The unprobed area between the three transverse sections can contain other forms. Review must ensure the contours and prompt unambiguously teach the marked form; arbitrary passing input does not establish whole-landscape classification. Synthetic technical review does not establish curriculum effectiveness, real-source approval, a stream's presence, navigability or travel permission.

Answer `{type: terrain-form, choice: ridge|valley}` is compared with the derived classification. Missing/wrong-type/unknown choices are unanswered; draft content needs review. Numeric result metrics are `alongFallM` and `minCrossReliefM`, rubricVersion 1. Stored/restored choices and scores are strictly revalidated. The correct class is not a second authored rubric field.

## Fixture and interface

**Load ridge/valley lesson** loads a separate CC0 9×9 metre grid with a piecewise-linear ridge and valley. Recipe: `z = 140 - x/2 + (y <= 40 ? abs(y-20)-30 : 10-abs(y-60))`, x/y 0–80 m by 10 m. The recipe string is hashed and retained in source transforms; grid and source metadata agree. Consecutive 10 m contours from 80 to 140 m are regenerated, with actual 100 m index contours. This map includes both forms; H/L/A identifies the current question. Four axes cover valley, ridge, reversed valley and reversed ridge; the final narrower half-width remains a ridge.

Begin/resume enables a labeled Ridge/Valley choice. Hints, missing/wrong feedback, keyboard retry, save/reload, backups, invalid-import retention and conflict-safe fork reuse the common controller. Learner maps show contour elevations, the axis and H/L/A without a class label. Instructor output additionally gives the derived class and section evidence. The independent print exercise selector works with native and direct fixed-size Letter documents in both orientations. Map-only guidance no longer describes every synthetic terrain pack as a hill.

## Teaching references and acceptance

[USGS topographic map symbols](https://www.usgs.gov/ngp-standards-and-specifications/us-topo-map-symbol-guide) explains equal-elevation contours, index weights and intervals. [NWCG Basic Land Navigation](https://fs-prod-nwcg.s3.us-gov-west-1.amazonaws.com/s3fs-public/publication/pms475.pdf) illustrates valley bends pointing uphill and ridge bends downhill. These explain the contour convention; our analytic fixture and section tests establish this demonstration's numeric answers. Independent curriculum/transfer review and broader real-source questions remain open.

The user authorized treating the current output as acceptable and continuing after hosted PR-56 checks passed. This accepts the current workflow for continued development; it is not a new Safari, physical-ruler, screen-reader or unfamiliar-terrain pilot measurement.


Validation: all 219 Node tests pass; fixtures reproduce exactly, the new landform pack validates and 164 local Markdown links resolve. The full packaged Chromium site/Pages suite passes with zero browser errors, including all four ridge/valley outcomes, reversed axes, keyboard retry, hints, save/reload, backup fork, invalid-import retention, narrow labels and four direct plus four native learner/instructor Letter documents. Existing street/contour/slope/profile recovery and PDF scale checks also pass. Narrow maps and representative native/direct learner/instructor PDF map/question pages were rendered and visually inspected. A label-placement regression merges collinear runs only for label candidates, preserving all source/rendered geometry. First hosted verification of this slice remains pending merge and automatic deployment; independent curriculum/real-source/pilot gates remain open.
