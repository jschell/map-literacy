# Browser map review and printing

## Run and inspect

```sh
npm run dev
```

Open http://127.0.0.1:4173 . The server binds loopback only and serves the UI/modules plus the synthetic demo. It does not serve .git, credentials or raw data. Import a prepared pack.json using the file picker; no automatic source request or geolocation occurs. A production deployment is not configured here.

The viewer supports labeled/partial/blank maps, 90-degree page rotation, a true-heading arrow and road selection by click or native feature list. Labels retain 13 CSS-pixel size on narrower screens; collision/edge suppression is reported. Imported labels are literal text. Invalid imports leave the previous map intact.

Geometry and topology remain separate. Source bridge tags receive white casing; tunnels are dashed; explicit supported one-way tags receive arrows. These are source display symbols, not driving permission. A draft badge remains on unreviewed real content. Synthetic fixture revision 2 explicitly describes EF bridging over GH, directional source ways and midpoint labels.

Manual labels supplied in a pack override automatic name placement. In labeled view all labels are candidates; partial view keeps authored visibleIn=partial labels. When there are no authored labels, a deterministic priority/ID order, name deduplication and alternating subset supply an initial review view. Approximate text-width collision checks are provisional; suppressed labels must be inspected before approving exercises. The authoring controls below edit/export labels; tracing and scoring routes remain pending.

## Label editing and pack export

Select an authored label from the label list, including labels currently suppressed by collision/edge rules. Change text, longitude/latitude, rotation, priority or labeled/partial visibility, then Apply label. To add a label, choose "New label for selected feature" and select a feature on the map or in the native feature list. "Place anchor on map" accepts a click/tap inside the lesson extent and handles screen rotation; coordinate fields provide the keyboard alternative. Placement only fills the form; Apply commits the change. Screen and both paper layouts regenerate from the same geographic label anchor.

Remove label deletes the selected authored label. Undo restores the last label content as another draft revision; it does not reuse an exported revision or reinstate review approval. Every applied edit/removal/undo increments the pack revision and clears pack/exercise review. Original geometry, topology, source metadata and hashes remain intact. Invalid edits leave the prior pack unchanged. The form is a draft authoring tool, not a way to mark geography or exercises reviewed.

Edits live in memory. Export lesson pack downloads validated standalone JSON within the import byte limit; re-import that file to verify/reuse placements. Loading another pack or refreshing loses local edits. No browser persistence or learner-progress backup is available. Source credit remains in the exported pack. Adding the first authored label to an automatically labeled pack switches to the authored label set; removing the last returns to automatic names. Collision suppression still applies after editing: inspect labeled/partial/blank output and both print orientations before approving a lesson.

## Printing

The shared geographic model produces a separate north-up paper view. US Letter (8.5 x 11 inches), selectable portrait or landscape, with 10 mm margins. Landscape uses a 259.4 x 145 mm map; portrait uses a 195.9 x 208.5 mm map. Both reserve 30 mm for the worksheet and 20.9 mm for the footer. Other paper sizes are deferred. Text is at least 8pt. Controls are omitted; north arrow, scale bar, source attribution/date and draft status remain. Screen rotation never changes the printed geographic scale or north-up orientation.

Supported scales: 1:1,000, 1:5,000 and 1:10,000. The new 1:1,000 preset makes the approximately 111m synthetic map useful on paper; neighborhood defaults remain 1:5,000. A pack's scale and orientation defaults are selected on import; the controls override the view without rewriting the pack. If its extent cannot fit the chosen physical scale, printing through the button is disabled and the print sheet explains the problem. No automatic rescaling or label shrinking.

Print at 100% / actual size, turn off browser headers/footers and use Letter with the orientation selected in the app. Verify the print dialog matches; browser/printer settings can override CSS page sizing. Physically measure the bar: at 1:1,000 a 20m bar must be 20mm (or a 50m bar, 50mm); at 1:5,000 a 200m bar must be 40mm. Require <=1% error and readable monochrome labels on the real printer. Inspect collisions and road connections, especially complex crossings; PDF geometry does not establish printer calibration or correct driving maneuvers.

Current worksheet text is a generic map prompt. Exercise-specific questions and instructor answers belong to the lesson phase; do not treat the current sheet as a completed curriculum.

## Automated browser checks

Core Node tests need no package install. Browser QA has exact pinned dev dependencies and a lockfile:

```sh
npm ci --ignore-scripts
MAP_LITERACY_PORTABLE_CHROMIUM=1 npm run browser:check
```

The script owns a loopback server, exercises synthetic views/imports/selection/rotation/literal text/both Letter layouts, one-page PDF page dimensions, orientation-specific fit failures/recovery and a 390px touch emulation, then stops its server/browser. CI uses the portable Chromium package on an unprivileged Ubuntu runner; no map source is fetched. Browser tools retain their own licenses and do not ship in the browser UI.

Optional MAP_LITERACY_REVIEW_PACK points to a local real pack for additional import/screenshots/PDF checks. MAP_LITERACY_URL targets an already running server instead of starting one. MAP_LITERACY_BROWSER_EXECUTABLE selects an existing Chromium executable; root containers that cannot apply tar archive ownership may need this route or manual no-owner extraction of the packaged binary. MAP_LITERACY_PORTABLE_CHROMIUM supplies the portable browser launch flags. Outputs in ignored artifacts/browser are QA intermediates.

Source formulas: USGS Map Projections—A Working Manual, https://pubs.usgs.gov/publication/pp1395 . The implemented spherical azimuthal-equidistant transform is bounded to the street pack contract, and tested against known equatorial distances, forward/inverse consistency and local scale tolerances. No ellipsoidal or magnetic-heading capability is advertised.

