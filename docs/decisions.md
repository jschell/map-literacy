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
| License | MIT for project code and original documentation; CC0 synthetic fixture JSON | User selected MIT on 2026-10-12; third-party data retains its licenses |

Unresolved before core implementation: pack schema/versioning, learner interaction/rubric, tolerances, projection, print scale error, content budgets, browser/device matrix, accessibility, state/event contracts, persistence failures and source refresh rules.

Unresolved before terrain implementation: DEM product, coverage/resolution, horizontal/vertical CRS, meter/foot handling, nodata, resampling, contour interval/generalization, depression styling, north references and source-to-map alignment.

Dependencies are not approved solely because a research link exists. Pin versions, inspect license/maintenance and run the relevant capability check before adoption.

## Plan 01 contract decisions (2026-10-12)

Street-core v1 uses built-in browser APIs and SVG, with no mandatory runtime library for synthetic fixtures. This is an implementation baseline, not a claim that all OSM preparation can avoid libraries. Plan 02 evaluates/pins osmtogeojson or a focused converter only when its actual fixture behavior/license/release are checked. No package was installed during design.

Pack coordinates are longitude/latitude; local spherical azimuthal equidistant supports bounded areas <=5km diagonal and abs(latitude)<=70. Projection/scale tolerances require independent tests. Rubric defaults are 15 degrees/20m, explicitly serialized per exercise and revisable after pilot. Future terrain/directions capabilities fail clearly before writes until Plans 08/07 define their payloads.

Browser target matrix and 4–6 learner pilot protocol are proposed test targets, not available devices or recruited participants. See contracts/validation documents for budgets and ownership. Application code and original documentation are MIT licensed following the user's 2026-10-12 instruction. Copied research and acquired third-party data retain their own rights.

Primary browser lifecycle/concurrency references reviewed: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB and https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API . Web Locks are not required; IDB transaction/version checks are authoritative and notifications optional.
