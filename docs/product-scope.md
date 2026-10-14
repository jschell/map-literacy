# Product scope

Planning date: 2026-10-12, America/Los_Angeles.

## Requirements and interpretation

User-established direction: street-map and driving-relevant learning; ordinary physical maps (no raised-map requirement); legible monochrome output; real-world application; OSM-compatible tooling; explore mostly vanilla JavaScript; include directions options; broaden the project to accommodate topographic maps. The user created map-literacy and requested plans. Initial print target: US Letter (8.5 x 11 inches), with portrait and landscape available; other paper sizes are later goals.

Planning defaults: browser first, shared lesson packs, SVG teaching maps, local records, street-first delivery and topo expansion. These are reversible design proposals, not user-selected library/provider contracts. Target browser/device matrix, learner age, commercial audience and pilot size remain open. Include touch/tablet testing without assuming a specific device was chosen for this project.

## First useful release

- Open a usable geographic map and print the selected area without importing a pack or beginning a lesson; no inferred device/home location.
- Default B&W cartography, readable source street names, independent label controls and print resolution/layout independent of screen size.
- One reviewed real neighborhood and synthetic maps with known answers.
- Orientation/heading, endpoint location, connectivity/route tracing and detour exercises.
- Labeled, partial and blank map variants with consistent extent.
- Local pseudonymous progress, clear feedback and JSON backup.
- Printable US Letter worksheet in portrait or landscape and separate instructor answers, north arrow, scale and attribution.
- Resume after refresh, recover from malformed import and show incomplete/unreviewed content clearly.

Route-preview and simulation are subsequent capabilities. Address-system lessons require locally documented patterns. Topographic lessons need elevation/contour data and a separate correctness model.

The current geographic raster print is not acceptance of these requirements. The next work is the [print cartography correction](print-cartography.md); reviewed packs add exercises and worksheets without blocking basic map use.

## Learning progression

Table practice -> map rotation and route reconstruction -> reviewed walking observation with stops -> passenger observation -> parked pre-drive preview and post-drive reflection. Use unfamiliar maps and delayed checks. Successful exercise completion does not demonstrate driving competence or crash-risk reduction.

Topo progression: contour interval and elevations -> slope comparisons -> ridges/valleys -> relate map and terrain -> route profile and explain choices. Do not derive a safe off-trail route solely from slope or a road engine.

## Deferred scope

Additional paper sizes (including A4, Legal and larger sheets), live GPS navigation, background tracking, production traffic feeds, accounts/synchronization, public map authoring, automated photo grading, commercial payments, nationwide processing, fully offline availability and desktop packaging. Define a separate plan before implementing these. Offline execution may be possible for loaded assets but is not a promised product capability.

## Release gates

Contract/schema definition; geographically reviewed packs; reproducible automated checks; target-browser interaction evidence; print-to-PDF inspection and actual-size monochrome paper checks for both Letter orientations; backup/recovery; documented limitations. Learning usefulness is a separate exploratory pilot gate, with transfer/retention results and no unsupported efficacy claim.

Geographic browsing is a usability prerequisite added after hosted-demo feedback: open the default Redmond example at zoom 15, use a Letter orientation guide, pan/zoom to an area, or jump by coordinates/OpenStreetMap link. It does not infer device location or replace a pack/session. Reviewed lesson creation from the selected area, integrated geocoding and terrain previews remain follow-up work; see [geographic browsing](geographic-browsing.md).


Basic map viewing and printing must not depend on a lesson pack. Print this map prints the current geographic frame directly in the selected Letter orientation. Reviewed packs add learning activities, customized labels and worksheets; they are additive.
