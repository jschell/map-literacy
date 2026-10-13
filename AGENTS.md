# Contributor instructions

## Purpose and authorization

Map Literacy is a new implementation repository for street and topographic map learning. Design contracts and plans are established; no executable application is included yet. The ideas repository's specs-only rule applies there, not here. Implementation work follows the applicable plan and user task.

## Development principles

- Prefer plain JavaScript, HTML/CSS and ES modules. Use narrowly scoped, pinned libraries where justified. No React/Vue by default.
- Keep browser modules independent of TinyJS globals and routing-provider response shapes. Use explicit adapters.
- Keep script/style files external; use a self-hosted asset baseline and document CSP exceptions instead of adding inline code or CDNs.
- Separate display geometry, original topology, synthetic lesson modifications, instruction logic and scoring.
- Geographic correctness comes from verified data and deterministic code. LLMs are optional later assistance, never the source of road connections or correct answers.
- Preserve OSM identity, required relation members, provenance, attribution and data versions. Missing tags do not prove access or permission.
- Terrain inputs require resolution, coordinate reference system, vertical reference/units and nodata handling. Do not treat shaded map imagery as elevation data.
- Interactive learning is stationary. No active-driving quiz; live navigation is deferred.
- Do not collect household addresses, live tracks or learner names by default. No automatic location selection.
- Public APIs and demo servers have separate policies; do not make them a production dependency without review. Never commit secrets.
- Source data and large derived packs belong outside git unless a small licensed fixture is deliberately reviewed. Synthetic fixtures are preferred for deterministic tests.
- Existing historical source notes are evidence of review, not proof of current compatibility.

## Plans and review

Use docs/plans/{active,queue,complete}. The active implementation plan is 02; roadmap 00 and bootstrap completion record are navigation/reference documents. Maintain dependencies, acceptance criteria, evidence, blockers and next action. Do not mark a plan complete because files exist; verify its outcomes. After an authorized completed step, progress within the task scope without unnecessary confirmation.

Use a focused branch and PR; conventional commit messages. Keep changes reviewable but avoid repeated tiny PRs for one unresolved issue. Describe what changed, why and validation. Do not silently merge PRs.

Tests should cover projection/scale, topology, scoring, import/export, migration and meaningful route/elevation edge cases. Browser rendering, keyboard/touch and physical print checks require appropriate evidence. Do not write tests that merely repeat implementation structure. Do not claim effectiveness or safer driving from technical tests.

Record unresolved decisions explicitly. No offline availability guarantee, live GPS, accounts, paid providers, mobile app or TinyJS commitment is established.
