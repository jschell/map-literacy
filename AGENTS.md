# Contributor instructions

## Purpose and authorization

Map Literacy is a new implementation repository for street and topographic map learning. Design contracts and executable data validation are established; a browser map review interface and initial print renderer now exist. The ideas repository's specs-only rule applies there, not here. Implementation work follows the applicable plan and user task.

## Development principles

- Prefer plain JavaScript, HTML/CSS and ES modules. Use narrowly scoped, pinned libraries where justified. No React/Vue by default.
- Keep browser modules independent of TinyJS globals and routing-provider response shapes. Use explicit adapters.
- Keep script/style files external; use a self-hosted asset baseline and document CSP exceptions instead of adding inline code or CDNs.
- Separate display geometry, original topology, synthetic lesson modifications, instruction logic and scoring.
- Geographic correctness comes from verified data and deterministic code. LLMs are optional later assistance, never the source of road connections or correct answers.
- Preserve OSM identity, required relation members, provenance, attribution and data versions. Missing tags do not prove access or permission.
- Terrain inputs require resolution, coordinate reference system, vertical reference/units and nodata handling. Do not treat shaded map imagery as elevation data.
- Interactive learning is stationary. No active-driving quiz; live navigation is deferred.
- Do not collect household addresses, live tracks or learner names by default. Use the documented example view on startup; do not infer or request the user's location.
- Public APIs and demo servers have separate policies; do not make them a production dependency without review. Never commit secrets.
- Source data and large derived packs belong outside git unless a small licensed fixture is deliberately reviewed. Synthetic fixtures are preferred for deterministic tests.
- Existing historical source notes are evidence of review, not proof of current compatibility.

## Plans and review

Use docs/plans/{active,queue,complete}. The active implementation plan is 10: repair existing learner interactions and website workflows before pilot use. Plan 02 neighborhood preparation and Plan 06 materials retain their independent review gates. Plan 08 is queued for acceptance; pause new terrain capabilities. Synthetic contour lesson envelope v2 (terrain-contours-v1, with optional terrain-slopes-v1 for relative slope, terrain-profiles-v1 for complete synthetic transect questions, terrain-landforms-v1 for bounded ridge/valley recognition, and terrain-depressions-v1 for exact synthetic basin hachures) is implemented alongside street v1; broader terrain instruction, real-source alignment/answer review and device/paper acceptance remain open. Real geographic sidecars are draft display artifacts, not supported scored packs. Plan 05 is queued for remaining browser/device/accessibility acceptance; recovery/static packages are implemented, GitHub Pages is deployed and the user accepted the B&W print workflow. Plan 02 is queued behind Plan 10; Plans 03–04 remain queued for real lesson/source review and physical/device acceptance; the local address-system design is prepared but its proposed capability is not implemented. Roadmap 00 and bootstrap completion record are navigation/reference documents. Maintain dependencies, acceptance criteria, evidence, blockers and next action. Do not mark a plan complete because files exist; verify its outcomes. After an authorized completed step, progress within the task scope without unnecessary confirmation.

Use a focused branch and PR; conventional commit messages. Keep changes reviewable but avoid repeated tiny PRs for one unresolved issue. Describe what changed, why and validation. Do not silently merge PRs. The user explicitly requested autonomous continuation: after each user merge, verify CI, automatic Pages deployment and hosted behavior, then advance the next authorized plan item without waiting for a separate “continue”. User approval to merge remains separate.

Tests should cover projection/scale, topology, scoring, import/export, migration and meaningful route/elevation edge cases. Browser rendering, keyboard/touch and physical print checks require appropriate evidence. Do not write tests that merely repeat implementation structure. Do not claim effectiveness or safer driving from technical tests.

Record unresolved decisions explicitly. No offline availability guarantee, live GPS, accounts, paid providers, mobile app or TinyJS commitment is established.




## Learning priority gate

As authorized on 2026-10-18, prioritize reviewed street materials and screen/paper learning over new capabilities. Follow docs/learning-sequence.md and the Plan 10 usability work order. Reuse existing scoring, print and pilot tools. Do not add terrain types, hillshade, magnetic-north lessons, address scoring, simulation or reporting infrastructure without a concrete material/usability finding that justifies them. Distinguish implementation, content review, paper/device acceptance and observed learning. Source-backed technical checks cannot stand in for independent content review or participants. Continue autonomous preparation when external review is unavailable; record that blocker and prepare the next independent material rather than expanding scope.
