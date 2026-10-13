# Browser setup, storage and recovery

## Run locally

Use Node.js 24 and the checked-in lockfile:

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:4173`. The server binds loopback and serves only the app assets and synthetic fixture. `MAP_LITERACY_PORT` can select another port, but changing protocol, hostname or port selects a different browser storage area. Use a consistent address/profile to find saved progress. Do not open index.html directly from the filesystem.

Load the synthetic map or import a validated pack. No location or saved session is selected automatically. Begin lesson session offers reviewed exercises only; real Redmond content remains an unreviewed draft. Practice while stationary.

## Progress and view preferences

Progress saves after accepted actions. Wait for Saved in this browser before closing. If saving fails, the answer stays in memory: retry saving or download a session backup. Resume selected session loads the committed pack revision, attempts and hints; unfinished answers and review traces are discarded. Competing tabs never silently overwrite each other. Reload latest, discard changes explicitly replaces memory, while Save as new session copies committed attempts/hints into separate IDs and retains the original record.

Labels, screen rotation, print scale and Letter orientation save independently. Preferences take effect immediately; their own status distinguishes pending/failed writes from saved choices. Saved choices apply when loading a map. Use pack view defaults explicitly replaces them with labeled/north-up and the loaded pack's print preset. Preferences never change source geometry, exercise answers/tolerances or pack revision. Instructor output, heading preview and review traces are not preferences. Units/reduced-motion settings are not yet offered.

Download session backup protects committed progress and its pack. Download view preferences protects the current view choices; Restore view preferences applies those values as an explicit new local preference change. A session-file restore accepts progress-only backups, while the storage API supports full backups including preferences and rejects conflicts atomically. The current UI does not restore full multi-session backups. Keep files outside browser storage and download again after changes. Browser saves are not protection against clearing site data, private browsing, eviction or disk failure.

Unsupported stored preference values produce visible defaults without automatically rewriting the original record. Unknown record versions remain read-only until a compatible app is used. Reload saved view preferences resolves a conflict by discarding local choices. Failed writes retain current memory choices for retry/download.

An incompatible database structure or newer database version prevents storage from opening. The app retains the original database and allows memory practice with file downloads. Use a compatible app to access existing records, or use a separate browser profile to restore a retained backup. Retrying cannot repair an incompatible schema; recovery never deletes or recreates it. Version 1 is the only implemented database version.

## Remove local data

Download any records you want to keep, then close all app tabs. Use the browser's site-data controls for the exact app address to clear its local storage. This removes stored packs, sessions, attempts and preferences; there is no account or server copy. Application recovery never deletes the database automatically. The current UI does not provide per-session deletion.

Clearing browser storage does not remove downloaded JSON files or original imported pack files. Remove those separately through your file manager if desired. Restarting the app after site-data removal begins with no saved progress/preferences. A retained session backup can restore its progress; a retained preference file can restore view choices.

## Static deployment requirements

No frontend compilation is needed. npm run release:build copies an explicit asset set into dist/site for Cloudflare/static hosts and dist/pages for GitHub Pages, with a deterministic local hash manifest. See [packaging and hosted setup](static-deployment.md). Both retain MIT code licensing and the synthetic fixture's CC0 notice. Exclude raw data, artifacts, node_modules, .git and local configuration. Serve correct HTML/CSS/JavaScript/JSON MIME types over HTTPS. Header-capable hosts use the same response CSP as the local server:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Also serve X-Content-Type-Options: nosniff. There are no runtime CDNs or inline scripts/styles. Cloudflare Workers Static Assets is the preferred full-header target; GitHub Pages has a prepared meta-CSP variant with explicitly weaker response-header coverage. Neither is published here. Network access is required to load app assets; no guaranteed offline mode or synchronization is provided.

## Evidence and remaining release gates

| Surface | Evidence |
|---|---|
| Container Chromium 153 desktop and touch emulation | Automated app, storage, preferences and PDF checks pass |
| Container Chromium keyboard and browser semantics | Four exercises, retries/hints, focus after saving, downloads, print activation and 320/640-pixel reflow pass; screen-reader/device acceptance pending |
| Actual Safari/iOS or Firefox devices | Pending; no supported release matrix selected |
| Physical monochrome Letter portrait/landscape | Calibration/readability pending |
| Actual quota exhaustion, eviction and private browsing | Pending; unavailable/quota paths use injected test failures |
| Static package/local release | Reproducible Cloudflare and GitHub Pages packages; packaged browser and project-prefix/meta-CSP checks pass |
| Public static host | Cloudflare preferred; GitHub Pages alternative prepared; neither published or externally verified |

Run npm test, npm run fixtures:check and npm run browser:check for automated checks. See [keyboard/accessibility evidence](validation/accessibility.md), [storage evidence](validation/storage.md), [map/print usage](map-review.md) and [physical checks](validation/physical-print-check.md). Real lesson/curriculum review remains separate from technical correctness.

