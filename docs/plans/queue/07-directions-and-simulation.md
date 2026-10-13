# Plan 07 — Turn-by-turn directions and simulation

Status: queued.
Dependencies: 05; 06 findings inform scope.

## Outcome

Add reviewed route previews, printable maneuvers and stationary playback while retaining vanilla frontend code.

## Work

- [ ] Compare current OSRM/Valhalla versions on reviewed walking/driving cases; verify API contracts, restrictions, formatting, license and policies.
- [ ] Select hosted/self-hosted model with resource/cost measurement; if self-hosted define region, preprocessing, persistent graph, refresh and HTTPS/CORS.
- [ ] Define normalized route/leg/maneuver schema with geometry, text, units, optional fields, provider/options/version and unknown data age.
- [ ] Implement adapter and OSRM text formatter if selected; map coordinates first, optional geocoder later.
- [ ] Store reviewed route results with map/route snapshot mismatch detection and cancellation/error behavior.
- [ ] Implement step selection, route highlight, simulated heading/position, pause/resume and associated prediction/reconstruction exercises.
- [ ] Generate printable direction lists and compare return routes.

## Acceptance and validation

- [ ] One-way return, roundabout, bridge, divided-road and unavailable/no-route fixtures are reviewed.
- [ ] Provider failure never yields fake straight-line turn directions; alternative/lane details are treated as optional.
- [ ] Map/route versions and source dates are displayed/retained; durations are estimates, not current traffic claims.
- [ ] Simulation is deterministic and does not request live GPS; stored route can be replayed without recalculating.
- [ ] Engine recommendation is not the only acceptable route answer.

## Risks and boundaries

Valhalla is provisional, not selected. Public demos are not assumed production endpoints. Live GPS needs its own future plan for tracking, map matching, timed speech, rerouting and background-device behavior.

## Execution record

No implementation completed. Record commits/PRs, test commands/results, manual evidence and remaining blockers here. Move to complete only when acceptance is supported. Next action: Compare current OSRM/Valhalla versions on reviewed walking/driving cases; verify API contracts, restrictions, formatting, license and policies.
