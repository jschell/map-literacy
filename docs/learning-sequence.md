# From map practice to practical map literacy

Priority decision: approved 2026-10-18. Build a complete street-learning experience with existing capabilities before adding more terrain types. The aim is to orient a map, identify position and landmarks, understand connected routes, reconstruct a return and explain a detour on an unfamiliar map. Real-world observation follows stationary practice; no active-driving interaction is required.

## Current evidence

| Outcome | Available evidence | Still needed |
|---|---|---|
| Software behaves consistently | Street scoring/recovery; five synthetic terrain demos; 223 Node tests and packaged browser checks through PR 58 | Hosted depression checks passed 2026-10-18; repeat after relevant changes |
| Maps are usable on paper | Letter portrait/landscape downloads; user-accepted geographic B&W workflow; inspected sample PDFs | Sequence-specific sheet inspection and remaining actual device/paper measurements |
| Questions and answers are suitable | Deterministic synthetic answers, source preparation and draft Redmond pack | [Bounded draft packet](materials/redmond-r1/README.md) prepared; independent content review and equivalent pilot materials pending |
| Learners can complete the activities | Automated keyboard/reflow checks | Observed learner/instructor usability, assistance and explanation quality |
| Skills transfer and persist | Existing pilot protocol and reporting tool | Actual unfamiliar-map immediate/delayed observations; no learning outcome established yet |

Technical review, independent content approval, device acceptance and observed learning are separate records. A merged PR or valid pack cannot close the latter three.

## First complete practice sequence

Use one bounded public example neighborhood, not a learner's home. Keep a common map extent and pack revision across screen and paper. Begin with a labeled map, reduce clues only when the task remains solvable, and use a different map for assessment.

| Stage | Learner task and purpose | Existing implementation | Evidence to review |
|---|---|---|---|
| 1. Orient | Align north and state a marked heading, including a rotated map | Heading answer and map rotation | Geographic north stays fixed; instructor rationale explains rotation |
| 2. Locate | Identify a marked position and describe two map clues or landmarks | Endpoint answer; instructor-reviewed explanation | Target and visible clues are unambiguous; tolerance is justified |
| 3. Connect | Trace a valid route between supplied points and explain connections | Directed route tracing | Every accepted connection/access assumption is reviewed; crossings do not create junctions |
| 4. Return | Reconstruct a return route and explain why simply reversing the outbound route may fail | Another route question using existing topology; paper annotation | One-way restrictions and valid alternatives are explicit; no new route type required |
| 5. Detour | Adapt to an authored closure and justify the alternative | Existing detour exercise | Closure is synthetic and labeled; feasible alternatives and unavailable routes are reviewed |
| 6. Reconstruct | Hide the route, redraw/describe it with landmarks, then check against the map | Blank/partial paper plus instructor rubric | Explanation and reconstruction are manually reviewed, not falsely auto-scored |

Each learner sheet states the purpose, necessary clues, task and answer space. The instructor sheet supplies accepted answers/alternatives, explanation cues and ambiguity notes. Do not call an unavailable exercise supported merely because this sequence describes it: authored neighborhood content and independent review are pending.

After table practice, prepare a separate stopped walking/passenger observation card: orient the paper map, identify a visible landmark, estimate position/heading, and compare the observation to the map. Parked route preview and post-trip reconstruction can follow. No new GPS, live navigation, location collection or automated explanation grading is needed. Observation claims require actual records.

## Material packet and review ledger

For each packet retain:

- Pack ID/revision and exact-byte hash; source product/acquisition/version/hash, transformation recipe, license and attribution.
- Extent and included/excluded geometry; known/unknown access, unresolved restrictions and source limitations.
- Item ID, skill, prompt, required visible clues, accepted alternatives, tolerance and answer rationale.
- Labeled/partial/blank availability by item; identical screen/paper reference identities; separate instructor answers.
- Review rows with check, evidence location, reviewer role/date and passed/failed/pending status. Record technical author checks separately from independent content review.
- Letter portrait/landscape PDF inspection, required clues/labels, handwriting space and scale; actual paper/device checks remain distinct.

Do not globally approve an unresolved pack to unlock scoring. Narrow the scope or keep unresolved items draft. A newer-source comparison must use a genuinely newer snapshot, not a replay.

## Preparation order and decision gate

[Plan 02](plans/active/02-source-and-lesson-packs.md) owns neighborhood preparation. First reproduce/inventory the source checkpoint, select a small usable subset, then prepare the sequence and review packet. If the checkpoint is unavailable, record that fact and reacquire reproducibly. Independent review is a blocker to approval, not to drafting the next independent material.

Five [candidate eight-item sets](materials/pilot-v1/README.md) are prepared; next independently review their content, overlap and comparability under [Plan 06](plans/queue/06-learning-pilot.md): baseline A, training B/C, immediate unfamiliar transfer D and delayed transfer E. Each has two heading, two endpoint, two route and two detour items. Match clues, exposure and difficulty; do not reuse one worksheet under different IDs. Keep this controlled assessment distinct from the six-stage coached practice sequence.

Use the existing [pilot protocol](learning-pilot.md), capture template and summary tool. Run an internal material walkthrough before recruitment, then coordinate actual permissions and observations with the user. Apply the predeclared factual-error, ambiguity, assistance and transfer/retention gates unchanged. Missing participation means pending evidence, not failure or success.

Pause new terrain capabilities, optional lesson hillshade, magnetic-north lessons, address scoring and directions simulation. A concrete material/usability finding can justify a focused change; otherwise the next deliverable is reviewed learning material rather than another feature. Existing terrain demos remain available for later evaluation.
