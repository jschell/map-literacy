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

## Session lifecycle and derived coverage — 2026-10-18

Keep database version 1, the strict Session fields and backupVersion 1 unchanged. The historical stored status `completed` is a closed lifecycle state; it never proves all questions were answered or answered correctly. Derive item coverage from the recorded answer links, and accuracy from their last validated immutable attempts. A valid legacy three-answer/four-question closed record displays **Ended early · 3/4 answered**, while a four-answer record displays **All questions answered** with correctness separately. Missing coverage/attempt links do not imply completion; corrupt full bundles still fail validation rather than losing records or inventing results.

Pause is an in-memory presentation state of a saved `active` session, not a new persisted lifecycle. Pause clears unfinished answers/traces and keeps committed attempts/hints intact. Resume in the same view returns to its previous practice/feedback phase. After reload or file restore, explicit opening resumes the existing last-committed-answer behavior; a paused unfinished retry is not persisted. End remains irreversible for that session; use Pause to continue later, or begin a separate session after ending. No migration, rewritten legacy status, reopening of closed records or backup-envelope expansion is needed.

The bounded saved-session API now derives a title and recorded coverage in a read-only sessions/packs transaction. Its counts describe recorded answer links; opening the session still validates all attempts and revision-locked scores. Exact IDs, timestamps and lifecycle values stay in optional details and backups. Scorer precision is unchanged; readable feedback and instructor print keys round only for presentation and must not conceal a tolerance boundary.


## Separate paper settings and complete document previews — 2026-10-18

Plan 10 package D uses independent geographic and lesson Letter orientations. The existing printScale setting is lesson-only; geography still derives scale from its area/zoom. Preference record v2 adds geographicOrientation while keeping the original orientation key for lessons. A valid v1 shared value seeds both controls without rewriting storage; only an explicit save/import writes v2 through the existing CAS lease. Both versions round-trip without losing fields or rewriting the stored v1 record on open. Unsupported versions remain read-only; no DB or backup-envelope migration occurs. Pack defaults preserve the geographic value.

Browser printing and PDF text pagination are existing distinct renderers. Rather than present a map-only preview as a full document, the browser preview now shows every DOM print page and the PDF preview shows the exact encoded page samples used by its download. Their labels distinguish browser counts from PDF counts. Whole-lesson PDF output reuses the same question renderer, frame/scale, answer isolation, source credits and bounded image encoder, with document-wide numbering and cancellation of stale selections. A page selector avoids keeping 64 decoded full-resolution canvases in memory. The PDF is still raster output; technical visual checks are not tagged-PDF/screen-reader or physical-paper acceptance.

The public catalogue is a read-only index of existing draft metadata and separate learner/instructor links. Only six named, small draft packs are added to the explicit release/preview allowlists. Opening one permits map/PDF inspection while its draft flags continue to disable scored sessions. The remaining content, source, equivalence, device and participant gates are unchanged.
