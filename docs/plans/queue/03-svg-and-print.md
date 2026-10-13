# Plan 03 — SVG rendering and print

Status: queued.
Dependencies: 01; 02 for real-map validation.

## Outcome

Render interactive and monochrome paper variants from shared geographic data.

## Work

- [ ] Implement calibrated geographic-to-display/paper transforms and extent clipping.
- [ ] Draw road hierarchy, landmarks, water, crossings, selected one-way symbols and SVG interaction layers.
- [ ] Separate labels from geometry; add manual placement overrides and deterministic collision policy.
- [ ] Create labeled/partial/blank views, heading arrows, road selection and route overlays with keyboard/touch equivalents.
- [ ] Create external print CSS, Letter landscape preset, questions/instructor pages, scale bar, north arrow, source date and attribution.
- [ ] Measure bounded-pack performance and inspect target-browser PDF output; provide actual-paper calibration procedure.

## Acceptance and validation

- [ ] Known distances/angles match Plan 01 tolerances and all variants preserve extent.
- [ ] Bridge/junction and divided-road cases remain distinguishable at chosen scale.
- [ ] Keyboard/touch targets work without color-only feedback; labels do not obscure required answers.
- [ ] PDF inspection passes layout checks; physical monochrome print calibration/readability is separately performed or explicitly pending.
- [ ] User sees readable limits when area is too large rather than silently reducing labels below the agreed threshold.

## Risks and boundaries

SVG does not solve cartographic labeling automatically. Browser fit-to-page changes scale; screenshots cannot verify paper dimensions.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Implement calibrated geographic-to-display/paper transforms and extent clipping.
