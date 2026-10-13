# Map Literacy

Learn to understand where you are, which direction you face, how routes connect and how terrain shapes travel. Map Literacy is being planned as a vanilla JavaScript application combining stationary interactive exercises, ordinary black-and-white printed maps and real-world observation.

Street lessons cover orientation, roads, landmarks, addresses, return routes and detours. Topographic lessons will add contours, elevation, slope, ridges, valleys and terrain interpretation. Both use shared map, lesson, print and progress components.

**Current state:** planning foundation only. No application, lesson pack, routing deployment or learning-effectiveness result exists.

## Start here

- [Scope and first release](docs/product-scope.md)
- [Architecture proposal](docs/architecture.md)
- [Plan index and dependencies](docs/plans/README.md)
- [Next work: contracts and validation design](docs/plans/active/01-contracts-and-validation.md)
- [Sources and evidence limits](docs/research/sources.md)
- [Decisions and open questions](docs/decisions.md)
- [Original merged idea handoff](https://github.com/jschell/Ideas-for-projects/tree/main/street-map-learning)

The first useful release is a browser application with one reviewed neighborhood pack, synthetic test maps, orientation and route exercises, local progress, JSON backup and printable labeled/partial/blank worksheets. Turn-by-turn preview and simulation follow as a separate phase. Topographic data and lessons have dedicated plans rather than being treated as a street-map style.

## Technical direction

Use plain HTML/CSS/JavaScript, ES modules and a bounded SVG renderer. Focused libraries are allowed; React/Vue are unnecessary. Candidate helpers include osmtogeojson, selected Turf.js functions and optional Leaflet. Keep geometry, topology, scoring and printing independent of the interface. Final dependency releases and interfaces are selected during Plan 01.

A static web deployment is the initial target. No accounts, live location or server are needed for the first release. IndexedDB plus JSON export/import is proposed for local records; persistence is not a backup. OSRM/Valhalla and optional TinyJS packaging are later integrations.

## Working on the project

Read [AGENTS.md](AGENTS.md) and the applicable plan first. Plans live in docs/plans/active, queue and complete. Complete evidence and update the plan before moving it. Physical print and learner-device checks may remain pending until someone can perform them; never report them as passed from screenshots alone.

This repository now owns implementation planning. The Ideas-for-projects draft remains the historical handoff. Creating this repository and its plans does not settle unresolved curriculum, dependency, service or terrain-source choices.
