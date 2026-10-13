# Local address lessons — draft specification

This specifies the remaining address-system work in Plan 04. Address exercises are not implemented in the current pack validator, scorer, browser or print renderer. The initial study context is **unincorporated King County, northeast addressing area**. A Redmond postal label does not establish that jurisdiction; City of Redmond and Seattle rules are outside this context unless separately documented and reviewed.

## Evidence and limits

The county's *Street Addresses and Road Names* handout is visibly dated November 2020 and was read on 2026-10-13. Its jurisdiction is unincorporated King County. Pages 2–3 describe directional prefixes for east–west road classes and suffixes for north–south classes, even numbers on north/east sides, odd numbers on south/west sides, and increasing numbers north/east in the northeast area. These are local addressing conventions, not exact bearings along every curve or a universal geocoder. The document also distinguishes mailing-city labels from jurisdiction and temporary from final assignments.

Documented name examples include **NE Union Hill Road** and **228th Avenue NE**. They can illustrate prefix/suffix position; this specification does not acquire their geometry or assign them address points. The county address-grid catalog says its Seattle representation is not authoritative. Therefore neither that grid nor the handout licenses silently applying county rules to incorporated cities.

| Source | Evidence location | What remains unverified |
|---|---|---|
| [County handout](https://cdn.kingcounty.gov/-/media/king-county/depts/local-services/permits/building-land-use-permits/a/street-addresses-and-road-names.pdf?hash=2FDB9B627CC73CBC74721ADCD468B2CB&rev=0d4bdc2baaea4d97b5e775a65aa0f816) | Visible November 2020 date; pages 2–3 | Current assignments, exact segment geometry and exception coverage; the URL's hash parameter is not an acquired SHA-256 |
| [County address-grid catalog](https://www5.kingcounty.gov/sdc/?Layer=kcaddrgrid_line) | Jurisdiction/purpose and Seattle authority note | Data redistribution terms, actual export/version, coordinate system and file hash |

No source bytes or GIS export were archived in this step. Real lesson publication requires a retained source artifact/hash and product/version, reviewed jurisdiction/extent, licensing and verified targets under the source-pack process. The dated handout is evidence for a draft design, not a claim that today's addresses or roads were verified. Only primary county material is used; a Seattle PDF/archives fetch was blocked and its contents are not used here.

## First useful exercise

Teach the learner to use the **complete address**, map street context and an explicitly supplied local rule card to select an authored marker. Start with invented streets, blocks and destination markers. Do not import household address points or choose the learner's location.

The initial interaction is a bounded native selector of marker IDs, plus optional map selection. Each marker has an authored accessible description containing the same street/block/side information visible on the map. Selector labels must not simply repeat the complete target address and give away the answer without map interpretation. A screen-reader presentation needs an equivalent structured street/marker description, not only an SVG title.

The question supplies the complete address and locality. The map supplies street names/directionals, a north arrow, authored block ranges and distinguishable candidate markers. The rule card is visible during initial practice and printed on the learner sheet; later recall without the card is a separate pilot condition. Authored expected marker IDs determine correctness. The application does not derive a location from arithmetic or parcel interpolation.

| Learning task | Intended response | Boundary |
|---|---|---|
| Preserve directional/type | Distinguish otherwise similar labeled streets and choose a marker on the requested one | No universal abbreviation parser or assumed missing directional |
| Use side/block clues | Choose a reviewed marker using the supplied local card and authored block facts | Odd/even alone does not establish an actual entrance or exact position |
| Keep north geographic | Select the same marker after map rotation | North is not screen-up; road classification is not instantaneous travel heading |
| Recognize insufficient evidence | Request review when locality, target assignment or authoritative evidence is unresolved | No confident wrong/correct label based on a guessed city rule |
| Explain the choice | Describe street, directional, block and side clues | Explanation is instructor-reviewed; no LLM auto-grading |

## Proposed extension boundary

Do not overload endpoint tolerance scoring to mean an address answer. Before interactive implementation, propose a documented address-v1 capability and address-choice exercise type with strict validation and explicit rejection by older apps. These are **proposals**, not supported v1 fields. Current street packs and saved attempt schemas stay unchanged.

The design should carry the following bounded authored records; final names/JSON shape belong in a reviewed contract revision:

- Context ID, jurisdiction identifier/label, applicability extent and northeast-area convention selection. Postal city is a separate display field. No jurisdiction is inferred from postal text.
- Evidence source IDs, document/product version/date, source artifact SHA-256, licensing, reviewed rule/exception notes and draft/reviewed status. Source IDs must resolve; mixed or unknown target jurisdiction prevents reviewed automatic scoring. Distractors outside a rule context may be compared as authored labels, but cannot acquire inferred numbering/side claims from that context.
- Target IDs linked to existing point/marker features; address number remains text, preserving letters, fractions and ranges. Store complete display text and explicitly authored components/aliases. Do not discard suffixes or coerce the number with parseInt.
- Authored street/block/side descriptions and entrance/marker references. Coordinate, feature and street relationships must be verified, not inferred from the nearest road or building centroid. Multiple entrances require explicit accepted alternatives and an appropriate prompt.
- Candidate IDs and reviewed accepted target IDs per exercise; candidate count initially capped at 20 and address targets at 200 per pack. IDs/labels/text retain existing bounds, renderer budgets and no executable markup.
- Answer shape containing the exercise's selected target ID. Attempts must recompute the address rubric and preserve context/pack revision through persistence and backup. No learner name, entered home address or travel history is required.

Case/whitespace handling and aliases may normalize an authored display lookup, but they cannot manufacture missing locality or directional information. The first scorer compares selected IDs against reviewed authored alternatives. Unknown IDs/missing answers are unanswered; an incorrect candidate in a fully reviewed, resolved exercise is incorrect; unresolved source/context/assignment yields needs-review. Multiple equally valid targets are accepted only when the author explicitly reviews them. Ambiguity cannot be solved by choosing the lowest ID or nearest coordinate.

## Draft cases for review

[Address design cases](examples/address-design-cases.json) are **not lesson packs or scored attempts**. Their invented markers and address strings illustrate future expected behavior. They contain no coordinates or real household records. All are draft; expected results are design assertions that the future implementation must test, not current scoring evidence.

| Case | Expected design behavior |
|---|---|
| Even-numbered NE street / odd alternative | Select the authored north-side marker using the supplied context |
| NE versus SE directional | Preserve the complete directional and select the NE candidate |
| Rotated display | Expected marker stays unchanged at 0°, 90°, 180° and 270° |
| Wrong known marker | Incorrect when every prerequisite is reviewed/resolved |
| Missing answer | Unanswered; no attempt accepted |
| Missing directional | Needs review; never fill it from the northeast context |
| Incorporated-city or unknown jurisdiction | Needs review; county rules do not resolve it |
| Letter/fraction/range number | Preserve the literal value and use an authored target; no parity inference |
| Multiple reviewed entrances | Accept either named alternative; no closest-point rule |

## Screen, paper and review gates

Interactive and printed questions must share the same context, candidates, pack revision and accepted alternatives. Marker identities and necessary street/block clues must survive the chosen labeled/partial/blank view; otherwise that question/view combination is unavailable with an explicit message. A blank-address worksheet is not solvable merely because generic blank maps exist.

Use the existing **8.5 × 11 inch Letter portrait/landscape** renderer, source-credit pagination and minimum label sizes. Instructor sheets include the accepted markers and explanation; learner sheets omit those answers. Color cannot be the only marker/side cue. Verify candidate text, rule cards and answer spaces fit without shrinking labels, and record actual monochrome print observations separately from PDF tests.

Before implementation/pilot use: review the locality/evidence, create a reproducible synthetic drawing, validate candidate/target references, check ambiguity and exception cases, and revise the pack/application/scoring/print contracts together. Then test rotation, missing/unknown choices, alternative entrances, context uncertainty, backups and old-app rejection; run keyboard/touch/assistive-technology checks and physical Letter review. Current automated street checks do not prove address-learning transfer or real-world navigation safety. Expansion beyond the initial street scope remains subject to the [roadmap/pilot gate](plans/00-roadmap.md).
