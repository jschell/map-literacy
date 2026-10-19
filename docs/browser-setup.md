# Browser setup, storage and recovery

## Run locally

Use Node.js 24 and the checked-in lockfile:

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:4173`. The server binds loopback and serves the allowlisted app assets, synthetic fixture and six public draft review packs. `MAP_LITERACY_PORT` can select another port, but changing protocol, hostname or port selects a different browser storage area. Use a consistent address/profile to find saved progress. Do not open index.html directly from the filesystem.

For a basic map, choose Explore and print, pan/zoom and choose Print this map. No lesson pack or session is required. Choose Practice → Load street basics → Begin lesson session for prepared exercises; use Review/edit materials for draft catalogue, feature inspection, independent tracing or label editing. See the [practice walkthrough](practice-workspace.md). The geographic preview opens at a documented Redmond example (zoom 15), with a Letter page-shape guide following the saved portrait/landscape setting. No device location is requested and no lesson pack or saved session is selected automatically. Begin lesson session offers reviewed exercises only; real Redmond content remains an unreviewed draft. Practice while stationary.

## Progress and view preferences

Progress saves after accepted actions. Wait for Saved in this browser before closing. If saving fails, the answer stays in memory: retry saving or download a session backup. Resume selected session loads the committed pack revision, attempts and hints; unfinished answers and review traces are discarded. Competing tabs never silently overwrite each other. Reload latest, discard changes explicitly replaces memory, while Save as new session copies committed attempts/hints into separate IDs and retains the original record.

Lesson labels, screen rotation/print scale, lesson Letter orientation and geographic Letter orientation save independently of progress. Preferences take effect immediately; their own status distinguishes pending/failed writes from saved choices. Saved choices apply when loading a map. Use pack view defaults explicitly restores labeled/north-up and the loaded pack's lesson print preset; it preserves geographic orientation. Legacy v1 preferences initially seed both orientations and retain the original stored record until an explicit change/import saves v2. Both preference versions are accepted in files/backups; the database stays version 1. Preferences never change source geometry, exercise answers/tolerances or pack revision. Instructor output, heading preview and review traces are not preferences. Units/reduced-motion settings are not yet offered.

Download session backup protects committed progress and its pack. Download view preferences protects the current view choices; Restore view preferences applies those values as an explicit new local preference change. A session-file restore accepts progress-only backups, while the storage API supports full backups including preferences and rejects conflicts atomically. The current UI does not restore full multi-session backups. Keep files outside browser storage and download again after changes. Browser saves are not protection against clearing site data, private browsing, eviction or disk failure.

Unsupported stored preference values produce visible defaults without automatically rewriting the original record. Unknown record versions remain read-only until a compatible app is used. Reload saved view preferences resolves a conflict by discarding local choices. Failed writes retain current memory choices for retry/download.

An incompatible database structure or newer database version prevents storage from opening. The app retains the original database and allows memory practice with file downloads. Use a compatible app to access existing records, or use a separate browser profile to restore a retained backup. Retrying cannot repair an incompatible schema; recovery never deletes or recreates it. Version 1 is the only implemented database version.

## Remove local data

Download any records you want to keep, then close all app tabs. Use the browser's site-data controls for the exact app address to clear its local storage. This removes stored packs, sessions, attempts and preferences; there is no account or server copy. Application recovery never deletes the database automatically. The current UI does not provide per-session deletion.

Clearing browser storage does not remove downloaded JSON files or original imported pack files. Remove those separately through your file manager if desired. Restarting the app after site-data removal begins with no saved progress/preferences. A retained session backup can restore its progress; a retained preference file can restore view choices.

## Static deployment requirements

No frontend compilation is needed. npm run release:build copies an explicit asset set into dist/site for Cloudflare/static hosts and dist/pages for GitHub Pages, with a deterministic local hash manifest. See [packaging and hosted setup](static-deployment.md). Code retains MIT licensing; synthetic content retains CC0 and the Redmond draft retains OpenStreetMap/ODbL attribution. Exclude raw data, artifacts, node_modules, .git and local configuration. Serve correct HTML/CSS/JavaScript/JSON MIME types over HTTPS. Use the canonical [static response/header policy](../scripts/static-policy.js) and [deployment instructions](static-deployment.md), including allowed OSM/USGS origins and blob image decoding, rather than an old copied CSP. GitHub Pages is live and automatically publishes successful main revisions; its meta CSP has weaker response-header coverage. Cloudflare remains an optional full-header host and has not been published here. Network access is required to load app assets; no guaranteed offline mode or synchronization is provided.

## Evidence and remaining release gates

| Surface | Evidence |
|---|---|
| Container Chromium 153 desktop and touch emulation | Automated app, storage, preferences and PDF checks pass |
| Container Chromium keyboard and browser semantics | Four exercises, retries/hints, focus after saving, downloads, print activation and 320/640-pixel reflow pass; screen-reader/device acceptance pending |
| Actual Safari/iOS or Firefox devices | Pending; no supported release matrix selected |
| Physical monochrome Letter portrait/landscape | Calibration/readability pending |
| Actual quota exhaustion, eviction and private browsing | Pending; unavailable/quota paths use injected test failures |
| Static package/local release | Reproducible Cloudflare and GitHub Pages packages; packaged browser and project-prefix/meta-CSP checks pass |
| Public static host | GitHub Pages deployed and checked after PR 68; automatic main publication gated by tests. Cloudflare optional/unpublished |

Run npm test, npm run fixtures:check and npm run browser:release for the packaged release checks. See the [integrated acceptance record and gate owners](reviews/2026-10-18-integrated-acceptance.md). See [keyboard/accessibility evidence](validation/accessibility.md), [storage evidence](validation/storage.md), [map/print usage](map-review.md) and [physical checks](validation/physical-print-check.md). Real lesson/curriculum review remains separate from technical correctness.


Geographic maps default to B&W and load bounded street detail automatically. Loaded map tiles can print while optional vector data is pending/unavailable; tile names stay fixed and vector-only controls/markings are unavailable. Vector readiness enables editable label/marking output; no lesson/session is required. Geographic appearance/names/markings are per-view choices, while Letter orientation retains saved settings. See [geographic source, controls and limits](geographic-browsing.md). Public-source availability is best effort, not offline or production availability.

