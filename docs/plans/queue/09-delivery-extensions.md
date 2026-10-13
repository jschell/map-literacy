# Plan 09 — Optional delivery extensions

Status: queued.
Dependencies: 05 and demonstrated need.

## Outcome

Make evidence-based choices about desktop packaging, shared progress and larger map delivery.

## Work

- [ ] Identify a concrete workflow needing native file dialogs, pack editing or local SQLite; compare browser capability before TinyJS adoption.
- [ ] If TinyJS justified, pin release, preserve browser adapters and test target OS print behavior and distribution/update lifecycle.
- [ ] Assess sync only if cross-device/shared progress is needed; define identity, privacy, storage conflict and backup behavior first.
- [ ] Assess MapLibre/PMTiles only if measured SVG pack size/performance or labels require larger vector-map delivery.
- [ ] Record costs, maintenance and go/no-go decision for each extension; leave unneeded items deferred.

## Acceptance and validation

- [ ] Browser core has no hard dependency on injected TinyJS globals.
- [ ] Native print is validated on chosen OS, including macOS tall-page behavior if still applicable.
- [ ] Any sync design has explicit consent/data model and recoverable conflicts; no hidden telemetry.
- [ ] Each extension has evidence of benefit and its own implementation scope; unsupported options remain deferred.

## Risks and boundaries

Not a requirement to implement every extension. Live navigation, traffic services, mobile apps and nationwide datasets need separate plans.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Identify a concrete workflow needing native file dialogs, pack editing or local SQLite; compare browser capability before TinyJS adoption.
