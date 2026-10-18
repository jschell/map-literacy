# Synthetic relative-slope lessons

Status: first bounded slope comparison supported in envelope v2. Requires exactly the ordered capabilities `[terrain-contours-v1,terrain-slopes-v1]` and the existing validated synthetic contour payload. Contour-only packs remain valid and cannot silently accept slope exercises. Earlier readers reject the new companion capability before writes. No database or backup envelope version changes.

## Exercise and derived answer

`type: relative-slope` retains common exercise/review/source fields, with null scenario and the single synthetic grid source. Rubric: `{spanA,spanB}`. Each span is `{fromFeatureId,fromVertex,toFeatureId,toVertex}`; indices are nonnegative integers resolving to vertices of the validated contour LineStrings. There is no authored expected choice or grade.

Each span must connect levels exactly one declared interval apart (absolute difference, 1e-9 m numerical tolerance), with at least 0.1 m horizontal run. A/B spans cannot have geometrically coincident endpoint pairs, including reversed pairs and duplicated ring-closing indices (1e-6 m coincidence threshold). Different locations with equal rise/run are allowed.

Endpoints are projected through the pack's local metric frame. Run is the straight Euclidean distance in that frame; rise is the absolute difference of validated contour elevations. Average grade magnitude is `rise/run`. Equal grades satisfy `abs(a-b) <= 1e-9 * max(1,a,b)`, a numerical tie tolerance. Otherwise the greater grade determines A or B. This compares endpoint average magnitude along the marked straight span; it does not establish a maximum local slope, continuous monotonicity, walking distance, legal access or traversability.

Answer: `{type:relative-slope,choice:A|B|equal}`. Missing/other choices are unanswered. Reviewed content produces correct/incorrect; draft content needs review. Result metrics `gradeA` and `gradeB` are numerical ratios, not percentages; rubricVersion remains 1. Stored attempts recompute these results and reject added answer fields or fabricated scores.

## Presentation and teaching scope

The map marks each span with a black connector and two end ticks. A/B labels sit outward from the first endpoint and do not lengthen the measured span. Instructions state the same elevation change explicitly; compare distances **between ticks**, not label positions. Screen rotation changes neither geographic endpoints nor answers. Learner sheets omit the derived comparison and runs; instructor criteria provide the choice, rises and metric runs. The direct Letter PDF retains the fixed paper-model scale. Routing and label editing remain unavailable for these terrain-only packs.

The demo keeps the original analytic hill and separate pack identity. East/west runs are 5 m and the north run is 10 m, all crossing a 5 m rise. Questions deliberately swap A/B and include a symmetric equal case, rather than always rewarding one label or map direction. This is technical fixture review, not independent curriculum review or evidence of retention/transfer. Other slope tasks, real DEM answers, ridge/valley/profile teaching and field/device/paper acceptance remain Plan 08 work.
