# Map Literacy

Learn to understand where you are, which direction you face, how routes connect and how terrain shapes travel. Map Literacy is a vanilla JavaScript application in development combining stationary interactive exercises, ordinary black-and-white printed maps and real-world observation.

Street lessons cover orientation, roads, landmarks, addresses, return routes and detours. Topographic lessons will add contours, elevation, slope, ridges, valleys and terrain interpretation. Both use shared map, lesson, print and progress components.

**Current state:** a vanilla JavaScript geographic browser opening on a Redmond example at zoom 15, with direct map printing and a Letter portrait/landscape print area, mouse/touch panning, zoom and coordinate/OpenStreetMap-link jumps, alongside a map review interface with pack import, rotation, label variants, heading arrows, feature selection and fixed-scale print output. Data validation and OSM preparation are implemented; the Redmond draft renders but remains unreviewed. Reviewed street lessons now support heading, endpoint, route and detour scoring in revision-locked sessions, with hints, retries and multiple valid routes. Accepted progress saves in this browser with explicit saved-session resume, failed-save retry and conflict recovery. Session backup download/restore preserves committed attempts and hints; unfinished answers remain memory only. Labels, screen rotation, print scale and Letter orientation now save independently. Reviewed real lessons and routing deployment remain pending.

Geographic printing is currently a color-raster prototype. It does not yet meet the intended B&W, street-label control or print-clarity requirements. The [print cartography correction](docs/print-cartography.md) defines the next work.

## Start here

- [Browse real areas: controls and provider limits](docs/geographic-browsing.md)
- [Scope and first release](docs/product-scope.md)
- [Architecture proposal](docs/architecture.md)
- [Plan index and dependencies](docs/plans/README.md)
- [Next work: persistence and browser release](docs/plans/active/05-persistence-and-browser-release.md)
- [Setup, saved progress, preferences and data removal](docs/browser-setup.md)
- [Static packages: Cloudflare and GitHub Pages](docs/static-deployment.md)
- [Local address lessons: draft design and evidence](docs/address-lessons.md)
- [Exploratory pilot kit and local reporting](docs/learning-pilot.md)
- [Run the map review interface](docs/map-review.md)
- [Renderer validation evidence](docs/validation/render-evidence.md)
- [Lesson-pack contract](docs/contracts/lesson-pack-v1.md)
- [Application contract](docs/contracts/application-v1.md)
- [Validation gates](docs/validation/acceptance.md)
- [Run the data foundation checks](docs/development.md)
- [Prepare OSM sources](docs/osm-preparation.md)
- [Live source preparation evidence](docs/validation/osm-redmond-evidence.md)
- [Sources and evidence limits](docs/research/sources.md)
- [Decisions and open questions](docs/decisions.md)
- [Original merged idea handoff](https://github.com/jschell/Ideas-for-projects/tree/main/street-map-learning)

The first useful release is a browser application with one reviewed neighborhood pack, synthetic test maps, orientation and route exercises, local progress, JSON backup and printable US Letter (8.5 x 11 inch) labeled/partial/blank worksheets in portrait or landscape. Other paper sizes are later goals. Turn-by-turn preview and simulation follow as a separate phase. Topographic data and lessons have dedicated plans rather than being treated as a street-map style.

## Technical direction

Use plain HTML/CSS/JavaScript, ES modules and a bounded SVG renderer. The current validator uses no external dependencies; Node.js 24 runs preparation tools and tests. Focused libraries are allowed; React/Vue are unnecessary. Candidate helpers include osmtogeojson, selected Turf.js functions and optional Leaflet. Keep geometry, topology, scoring and printing independent of the interface. Dependencies are pinned and checked when adopted.

A static web deployment is the initial target. No accounts, live location or server are needed for the first release. The IndexedDB adapter, automatic progress saves and JSON backup APIs are implemented; persistence is not a backup. OSRM/Valhalla and optional TinyJS packaging are later integrations.

## Working on the project

Read [AGENTS.md](AGENTS.md) and the applicable plan first. Plans live in docs/plans/active, queue and complete. Complete evidence and update the plan before moving it. Physical print and learner-device checks may remain pending until someone can perform them; never report them as passed from screenshots alone.

This repository now owns implementation planning. The Ideas-for-projects draft remains the historical handoff. Creating this repository and its plans does not settle unresolved curriculum, dependency, service or terrain-source choices.

## License

Project code and original documentation are licensed under [MIT](LICENSE). Generated synthetic fixture JSON retains its [CC0-1.0 designation](tests/fixtures/README.md). Third-party map/elevation data and quoted research retain their own licenses and attribution requirements; the MIT license does not relicense them.

