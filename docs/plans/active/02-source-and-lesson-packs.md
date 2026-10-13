# Plan 02 — Source and lesson packs

Status: active; implementation not started.
Dependencies: 01.

## Outcome

Produce validated reproducible packs while retaining topology needed for correct lessons.

Contract baseline: [lesson-pack v1](../../contracts/lesson-pack-v1.md), [application v1](../../contracts/application-v1.md), [fixtures](../../validation/fixtures.md), [acceptance](../../validation/acceptance.md).

## Work

- [ ] Implement the normative v1 schema as executable validation and materialize every fixture/expected result from Plan 01; include full valid envelope examples and future-capability rejection.
- [ ] Build JavaScript bounded OSM fetch/import preparation; review endpoint policy, timeout/retry/cancellation and caching.
- [ ] Preserve nodes, ways and required relations separately from GeoJSON display features; check boundary completeness and tag coverage.
- [ ] Record query, extent/buffer, source/fetch times, hashes, transformation versions, licenses and attribution.
- [ ] Add review status and explicit exclusions for missing/ambiguous connectivity, access, addresses or restrictions.
- [ ] Build one reviewed neighborhood pack and source-refresh comparison; preserve exercise revisions when source changes.

## Acceptance and validation

- [ ] Fresh synthetic import yields repeatable validated outputs; malformed/oversized/unsupported files fail without changing existing records.
- [ ] Bridge crossing stays disconnected unless source topology connects it; one-way and incomplete relation fixtures are recognized.
- [ ] Real pack can be reproduced from recorded acquisition/transform steps and carries attribution.
- [ ] Completeness report distinguishes known, unknown and excluded cases; no unnamed/missing-tag inference is treated as fact.

## Risks and boundaries

Public APIs are not unlimited; regional PBF/nationwide processing is deferred. Keep large source files outside git; review redistributed fixtures and metadata.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Implement synthetic fixtures and versioned validation from Plan 01.
