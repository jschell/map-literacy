# Decisions and open questions

| Item | Current position | Gate |
|---|---|---|
| Repository name/scope | map-literacy; street and topographic learning | User-created repository |
| Frontend | Plain HTML/CSS/JavaScript proposed | Plan 01 contracts |
| First renderer | Bounded SVG proposed | Plan 03 print/performance evidence |
| Storage | IndexedDB + explicit JSON backups proposed | Plan 05 recovery tests |
| Core correctness | Verified source + deterministic geometry/scoring | All plans |
| Street sources | OSM bounded snapshots proposed | Plan 02 policy/completeness review |
| Topo source | USGS 3DEP candidate for US terrain; no product selected | Plan 08 dataset evaluation |
| Route engine | Valhalla provisional; compare OSRM | Plan 07 measured fixture comparison |
| TinyJS | Optional desktop wrapper | Plan 09 concrete need |
| Live GPS | Deferred; route preview/simulation first | Separate future plan |
| Offline | No full-offline guarantee | Define separately if needed |
| Pilot | Small exploratory evaluation | Plans 01 and 06 define rubric/protocol |
| License | Not selected for application code | Decide before implementation distribution |

Unresolved before core implementation: pack schema/versioning, learner interaction/rubric, tolerances, projection, print scale error, content budgets, browser/device matrix, accessibility, state/event contracts, persistence failures and source refresh rules.

Unresolved before terrain implementation: DEM product, coverage/resolution, horizontal/vertical CRS, meter/foot handling, nodata, resampling, contour interval/generalization, depression styling, north references and source-to-map alignment.

Dependencies are not approved solely because a research link exists. Pin versions, inspect license/maintenance and run the relevant capability check before adoption.
