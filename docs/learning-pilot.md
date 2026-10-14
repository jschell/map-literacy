# Exploratory learning pilot kit

Protocol version 1 operationalizes the [initial acceptance proposal](validation/acceptance.md). **No participants, observations or learning results exist.** This kit prepares coordination and reporting. The current four-exercise synthetic demo is not the required five-set, eight-item material; recruitment, reviewed packs and actual device/paper sessions remain pending.

## Preparation and permission

A coordinator selects 4–6 voluntary learners able to read short labels. Obtain guardian permission and learner assent where applicable; stopping/skipping is allowed. Keep contact, age and permission records separately under coordinator control. Nothing here recruits, contacts, verifies consent or uploads records.

Use P01-style local pseudonyms. Capture no names, household addresses, personal routes, audio or personal location. Keep observations/backups in ignored pilot-data/ or another controlled local folder; do not commit participant-level records. Pseudonyms do not make unrestricted publication appropriate. Share only coordinator-approved deidentified findings, considering small-group disclosure. Arrange retention/removal with participants and remove files manually; there is no automatic deletion.

Review five distinct synthetic sets, each with **two heading, two endpoint, two route and two detour items**. Record pack ID/revision, exact file SHA-256 and eight exercise IDs/skills. Validate the packs, answers/alternatives, topology/access and matched screen/Letter outputs. Different IDs, rotations or relabeled copies do not establish unfamiliar transfer; equivalence/content overlap need human review. Address/topographic/directions exercises are excluded.

| Set | Purpose | Exposure |
|---|---|---|
| A | Baseline | Eight first-response items before training |
| B and C | Training | One ordinary map/worksheet set and one interactive set, 15 minutes each |
| D | Immediate unfamiliar transfer | Eight new items after both training blocks |
| E | Delayed unfamiliar transfer | Eight new items at 7 days, allowed window 5–9 days |

Assign order and paper-set identity before seeing outcomes. Balance the four combinations paper-first/B-paper, interactive-first/B-paper, paper-first/C-paper and interactive-first/C-paper as evenly as the small cohort allows. Record actual exposure/assignment/deviations. Because everyone receives both treatments before D, this crossover feasibility pilot **cannot isolate which treatment caused a gain or establish superiority**. Collect condition-specific usability notes; comparative effects require a separately declared design.

## Session procedure

1. Confirm permission/material approval and record assessment-map familiarity: unfamiliar/somewhat/familiar.
2. Present A without hints/coaching. Capture first responses against the locked pack rubric. Explanation rubric: 0 missing/wrong relationship, 1 partly correct with a major omission, 2 correct relationship and reason. Use null if explanation was not assessed, rather than assigning 0.
3. Run the assigned 15-minute training blocks. Keep reviewed difficulty, question count and instruction comparable. Record actual minutes; primary-comparison eligibility requires 14–16 minutes for each and at most one minute difference. Preserve deviations rather than silently discarding the learner.
4. Present D without hints/coaching. Record first-response correctness, errors, hints, time and interface assistance. Retries are practice, not replacement first responses. Session-total hints after retry are not first-response hint counts.
5. Present E at 5–9 days, without reusing prior items. Record actual elapsed days. Missing/late follow-up leaves retention unresolved. No automatic reminder is configured.
6. Keep local learner/instructor notes about unclear labels/prompts, control problems, assistance, paper readability, confidence and stopping. Remove identifying context. Record factual map/rubric errors and unresolved items, including failures.

Paper responses may be transcribed and evaluated using the same reviewed rubric, but the summary tool does not grade answers, recompute pack scores or verify geometry. Preserve the pack/rubric and metric source locally. Paper measurement/calibration and explanation judgments need review; browser tests cannot validate them.

## Capture and reporting

Start with the empty [JSON template](examples/pilot-records.json):

```sh
mkdir -p pilot-data
cp docs/examples/pilot-records.json pilot-data/observations.json
npm run pilot:summary -- pilot-data/observations.json
```

The empty template reports pending-review, zero observed items and null retention metrics. Enter only actual approved material references and observations. Declare enrollment before outcomes; retain stopped/skipped learners as missing observations where the permission arrangement allows, rather than selecting only completers. The script cannot audit the roster. It reads at most 2 MiB and prints JSON to stdout; it does not transmit data or write files. Preserve the local raw record before editing. Unknown fields, duplicate first responses, invalid references/metrics and reused pack identities fail explicitly.

| Record | Fields |
|---|---|
| Run | protocolVersion=1; materialsApproved, conditionsComparable, factualError are true/false/null. Null means unassessed, not false. |
| sets A–E | Each null until selected; then packId, positive revision, lowercase SHA-256 of the exact pack bytes, exercises[{id,skill}]: eight distinct IDs, two per skill. This is not the source-manifest hash. |
| participants | At most six: id=P plus two digits, order=paper-first/interactive-first, paperSet=B/C, familiarity=unfamiliar/somewhat/familiar, permissionConfirmed boolean, paperMinutes/interactiveMinutes/delayDays number or null. |
| items | participantId, phase=baseline/immediate/delayed, exerciseId, skill=heading/endpoint/route/detour, status=correct/incorrect/needs-review/unanswered, hints integer 0–3, seconds 0–3600, explanation 0/1/2/null, interfaceAssistance boolean, headingErrorDeg/endpointErrorM/routeValid. Inapplicable/unmeasured metrics are null. |

Every item resolves to its phase's declared exercise/skill. Heading error is 0–180 degrees; endpoint error is nonnegative metres with a conservative 10 km capture bound; route validity is true/false/null for route/detour only. First-response records are unique per person/phase/exercise. No names or free text belong in this shape.

Missing rows mean missing observations, **not unanswered trials**. Unanswered means an item was presented without a valid response. Needs-review means scoring/evidence is unresolved, not incorrect. Observed accuracy is correct/(correct+incorrect+unanswered); needs-review is excluded with count/denominator visible. A primary assessment needs all eight items, two per skill, no needs-review, no assessment hints and no interface assistance. Partial observed accuracy is descriptive, not a completed assessment.

Reports retain individual/skill counts, metric means and measurement denominators, valid/invalid/unknown routes, missing items, familiarity/order and eligibility/improvement denominators. Missing measurements remain null and actual zeros remain zero. Permission/equivalence/review flags are coordinator assertions; the tool does not prove them.

## Predeclared gates

Apply in order, without changing thresholds after viewing results:

1. Any factual map/rubric error pauses use until corrected.
2. More than 20% needs-review **recorded assessment trials** triggers item revision. Missing rows and unanswered learner trials are separate. This fixes the initial proposal's ambiguity denominator before data collection.
3. Interface assistance for at least two enrolled learners triggers interaction revision. Training hints are separate from assessment interface assistance.
4. Unapproved/missing materials, unknown factual-error review or unconfirmed equivalence produce pending-review.
5. Fewer than four eligible baseline/immediate pairs means usability-only. Missing permission, unequal exposure or coached assessments cannot create an eligible pair.
6. Every enrolled learner must have eligible immediate and in-window delayed comparisons to resolve retention. Missing/late/coached follow-up stays unresolved; do not silently report only completers as everyone returning.
7. An exploratory continuation signal needs at least 75% of **all enrolled learners** improving unfamiliar immediate accuracy over baseline and positive median delayed improvement. For 4/5/6 learners, at least 3/4/5 must improve. Otherwise revise or pause learning scope. A signal is advisory, not automatic approval to expand.

No p-values, population efficacy, treatment superiority or safer-driving claims follow. Report failures, unresolved outcomes, recruitment/exposure/deviations and small nonrandom-sample limits. Usability, technical correctness and learning transfer/retention are separate gates. Plan 06 stays queued until materials, coordination and release prerequisites are ready.
