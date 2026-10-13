# Implementation plans

Plans are work packages with evidence-based completion, not claims that an application exists. One implementation plan is active. Move finished plans into complete and update links here.

| Plan | Status | Dependency | Outcome |
|---|---|---|---|
| [00 Roadmap](00-roadmap.md) | Reference | — | Scope, sequence and gates |
| [Bootstrap record](complete/00-repository-bootstrap.md) | Complete: documentation only | — | README, contributor guidance, context and plans |
| [01 Contracts and validation](complete/01-contracts-and-validation.md) | Complete: design contracts | Bootstrap | Contracts and measurable acceptance |
| [02 Source and lesson packs](active/02-source-and-lesson-packs.md) | Active: implementation not started | 01 | Reproducible, validated source packs |
| [03 SVG and print](queue/03-svg-and-print.md) | Queue | 01; 02 for real-map validation | Readable interactive/printed variants |
| [04 Street lessons](queue/04-street-lessons.md) | Queue | 02, 03 | Deterministic exercises and rubric |
| [05 Persistence and browser release](queue/05-persistence-and-browser-release.md) | Queue | 04 | Recoverable local app and static deployment |
| [06 Learning pilot](queue/06-learning-pilot.md) | Queue | 05 | Exploratory usefulness/transfer evidence |
| [07 Directions and simulation](queue/07-directions-and-simulation.md) | Queue | 05; 06 findings inform scope | Reviewed maneuvers and stationary playback |
| [08 Topographic learning](queue/08-topographic-learning.md) | Queue | 01–05 shared core | Terrain layers and contour lessons |
| [09 Delivery extensions](queue/09-delivery-extensions.md) | Queue | 05; demonstrated need | TinyJS/sync/scale decisions |

Topographic data research can occur earlier without blocking street delivery. No dependency on routing is required for contour-reading lessons. Plan 09 is optional; live navigation remains separate future scope.
