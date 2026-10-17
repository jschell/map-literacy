# Implementation plans

Plans are work packages with evidence-based completion, not claims that an application exists. One implementation plan is active: 08. Plans whose implementation is delivered but whose acceptance is unfinished remain queued, not complete. Move finished plans into complete and update links here. Status reconciled through merged PR 45 on 2026-10-17; merge/deployment success is not curriculum or device acceptance.

| Plan | Status | Dependency | Outcome |
|---|---|---|---|
| [00 Roadmap](00-roadmap.md) | Reference | — | Scope, sequence and gates |
| [Bootstrap record](complete/00-repository-bootstrap.md) | Complete: documentation only | — | README, contributor guidance, context and plans |
| [01 Contracts and validation](complete/01-contracts-and-validation.md) | Complete: design contracts | Bootstrap | Contracts and measurable acceptance |
| [02 Source and lesson packs](queue/02-source-and-lesson-packs.md) | Queue: validation/preparation implemented; reviewed lessons and newer-source comparison pending | 01 | Reproducible, validated source packs |
| [03 SVG and print](queue/03-svg-and-print.md) | Queue: physical/device acceptance pending | 01; implemented 02 slice | Readable interactive/printed variants |
| [04 Street lessons](queue/04-street-lessons.md) | Queue: core scoring/sessions implemented; address design prepared; curriculum/device acceptance pending | Implemented 02–03 slices | Deterministic exercises and rubric |
| [05 Persistence and browser release](queue/05-persistence-and-browser-release.md) | Queue: implementation delivered; Pages deployed and B&W print accepted; broader device/accessibility acceptance pending | Implemented 04 slice | Recoverable local app and static deployment |
| [06 Learning pilot](queue/06-learning-pilot.md) | Queue: protocol/reporting kit prepared; reviewed packs and participants pending | 05 | Exploratory usefulness/transfer evidence |
| [07 Directions and simulation](queue/07-directions-and-simulation.md) | Queue | 05; 06 findings inform scope | Reviewed maneuvers and stationary playback |
| [08 Topographic learning](active/08-topographic-learning.md) | Active: terrain integration/alignment next; exact-endpoint contour chains/rings and branch review implemented; USGS composite and terrain-focused reference views implemented; source-reported contour details and elevation-grid foundation, benchmark DEM preparation and contour segments implemented; topology integration/terrain lessons pending | 01–05 shared core | Terrain layers and contour lessons |
| [09 Delivery extensions](queue/09-delivery-extensions.md) | Queue | 05; demonstrated need | TinyJS/sync/scale decisions |

## Remaining work and completion methods

| Plan | Remaining work | Completion method |
|---|---|---|
| 02 | Reviewed neighborhood lessons, access/restriction decisions, genuinely newer source comparison | Source/content review plus reproducible preparation and comparison |
| 03 | Pack performance, geometry/label readability, both-orientation worksheet calibration | Target-device observations and measured physical paper checks |
| 04 | Curriculum acceptance; address implementation only if supported by pilot | Instructor/content review and device completion; later contract/code work |
| 05 | Supported browser matrix, screen reader/zoom, actual storage-pressure behavior | Recorded device/assistive-technology observations; future migrations need version-specific automated fixtures |
| 06 | Five matched reviewed packs/sheets, participation, transfer and retention | Material review followed by actual participant observations |
| 08 | Real contour topology review, terrain pack contract, display/print alignment, terrain exercises | Automated known-answer checks and source/content review, then device/paper and learner evidence |

Automated checks and historical execution records already support several implementation tasks. They do not close manual acceptance. User feedback establishes usable page fit/B&W printing for the reported workflow; it does not establish ruler calibration, every map mode, every worksheet or a complete browser matrix. See [print evidence](../validation/physical-print-check.md). Plans 07 and 09 remain unstarted/deferred; they are not required merely to complete the roadmap.

Topographic data research can occur earlier without blocking street delivery. No dependency on routing is required for contour-reading lessons. Plan 09 is optional; live navigation remains separate future scope.



