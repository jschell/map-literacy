# Plan 05 — Persistence and browser release

Status: active; saved progress/preferences, backup recovery and setup guidance implemented; release acceptance remains pending.
Dependencies: implemented scoring/session slice of 04; address-system and external acceptance remain queued.

## Outcome

Deliver a recoverable local browser application and documented static-host deployment.

## Work

- [x] Implement version-1 IndexedDB initialization/transactions, schema compatibility checks and explicit multi-tab conflict behavior; blocked/canceled/failed upgrade fixtures pass. Actual future migration transformations need version-specific fixtures.
- [x] Implement pack/progress JSON backup APIs with validation and atomic conflict rules, plus explicit single-session UI download/restore and backup guidance.
- [x] Add failed-save retry, unavailable-storage memory/export mode and versionchange/blocked-open recovery messages; Saved is shown only after transaction completion. Actual quota/eviction/device and future migration checks remain pending.
- [x] Document no-build static assets, pinned install/local serve and the implemented external-asset CSP; host publication remains pending.
- [x] Select hosting using deployment requirements and cost; reproducible local packages/preview and hosted setup prepared. Cloudflare Workers Static Assets is preferred for full headers; GitHub Pages is a prepared meta-CSP alternative. Publication/provider validation remain pending.
- [ ] Run meaningful automated checks and target-browser keyboard/touch/accessibility/render evidence; container Chromium keyboard/semantics/reflow checks pass. Screen-reader, actual target-browser/device and physical-print acceptance remain pending.
- [x] Document current limitations, backup recovery and manual browser site-data/file removal; no automatic deletion or public release is implied.

## Acceptance and validation

- [ ] Attempts survive reload; failed import/migration does not destroy old records; export/import round-trip preserves revision/provenance.
- [ ] No credentials, household defaults, trackers or learner names are required.
- [ ] Static release works on declared browser matrix; data remains understandable when network/source acquisition is unavailable.
- [ ] Release evidence distinguishes completed checks from pending device/paper checks; no guaranteed offline mode claimed.

## Risks and boundaries

No accounts or sync are required. Deployment choice is open; this plan does not authorize public hosting publication by itself.

## Execution record

Implemented version-1 IndexedDB stores, immutable pack revision insertion, validated atomic pack/session/attempt commits with expected-version leases, immutable attempt checks, exact attempt-order metadata, validated reloads, cancellation, quota/unavailable error normalization and versionchange close/reload notification. Same-content pack insertion is idempotent independent of JSON object-key ordering; changed content at the same revision is rejected. Returned write success occurs only after transaction completion. Late failures roll back pack, session, attempts and metadata together; no database deletion is used as recovery.

Record validation checks reviewed exercise order, revision references, timestamps, counted hints, last-attempt links and recomputed score records before opening writes. Session bundles are limited to 1,000 attempts and 16 MiB, independent of future full-backup limits. Settings/meta stores were created in the foundation slice; backup/resume support follows below. Settings writes, migrations beyond initial creation and automatic UI save states remain pending. The current browser UI is still explicitly memory only; no automatic persistence is enabled by this slice.

Validation: 113 Node tests and Chromium browser checks pass. Actual IndexedDB checks cover pack idempotency/conflict, complete attempt round-trip, close/reopen durability, competing writers (one winner), invalid records, cancellation after a successful request, late multi-store rollback and versionchange handling. Quota normalization is tested with an injected DOMException, not an actual full device. See [storage evidence](../../validation/storage.md).

Backup/resume follow-up: version-1 UTF-8 progress envelopes enforce 50 MiB/20 packs/100 sessions/10,000 attempts, full revision/reference/score validation and unique IDs. IndexedDB full/per-session export uses a consistent read transaction; full import is atomic and rejects any differing existing record or attempt order. Identical records are idempotent. Settings must currently be empty; unsupported settings fail explicitly instead of being dropped.

The controller resumes committed attempts/hints and the locked revision, discards unfinished answer drafts, presents prior committed feedback and keeps completed sessions completed. Timestamp handling prevents a slower local clock from corrupting resumed records. Browser controls download one-session backups and restore exactly one session with its pack. Restore validates before replacing state, rejects renderer budgets and cancels stale reads; invalid restore retains the prior map/session. These controls do not silently write IndexedDB or claim automatic Saved status.

Validation: 118 Node tests, fixture regeneration and Chromium browser checks pass, including full/per-session backup round-trip, idempotent restore, conflicting import rollback, controller retry/next/end after resume, malformed/oversized UTF-8 files, downloaded session restore after refresh, retained hints, duplicate-submit prevention and invalid/render-budget restore retention.

Automatic-save follow-up: begin, hints, accepted attempts, retry, next and end now commit the locked pack/session/attempt snapshot. Controls prevent overlapping mutations; preflight and transaction failures retain memory progress and a visible not-saved indicator. Retry retains the prior version lease. A bounded 100-item paginated saved-session picker requires explicit selection; no map/location is chosen on startup. Resume reads/validates the committed revision and discards numeric drafts/review traces. Switching pack/session while a write is pending or memory changes lack a backup is guarded; a downloaded backup permits explicit replacement after failure.

Conflicts never use last-writer overwrite: reload latest explicitly discards memory changes, or Save as new session clones committed attempts/hints into fresh session/attempt UUIDs. The original stored session remains. Pack-revision conflicts require a different reviewed revision rather than an ineffective session fork. Focus re-reads detect changed versions; transaction leases remain authoritative. Unavailable/blocked storage permits memory practice and file export. Versionchange/pagehide close connections; BFCache return reopens them. Progress events cover accepted/scored answers, hints, reset and completed/failed saves.

Validation: 121 Node tests and real Chromium browser checks pass. Checks cover commit-only Saved timing, retained lease/retry after injected quota failure, rejected concurrent snapshots, saved-session resume after reload with no automatic map selection, competing real tabs, fork without overwrite, explicit latest-version reload and backup download with IndexedDB unavailable. Existing fixture, map, Letter-print and touch-emulation checks pass.

Preference follow-up: versioned labels/rotation/print-scale/Letter-orientation records save with transaction leases independently of lesson scoring. Rapid changes apply immediately and serialize/coalesce to the latest value. Failed writes retain memory choices for retry/download; explicit reload resolves conflicts. Invalid known values use visible defaults without rewriting storage; unknown record versions remain read-only. Preference JSON files and full progress-backup preference records are supported; progress-only session files stay separate. Full backup preference conflicts roll back the entire import.

Setup/recovery guidance now documents consistent browser origins/profiles, local installation, static asset/CSP requirements, saved-progress/prefs recovery, no automatic location selection, manual site-data removal and pending browser/device/print/release evidence. No host was published.

Validation: 125 Node tests and real Chromium checks pass, including preference serialization/retry, reload/file restore, competing tabs, retained invalid stored values and atomic full-backup preference conflicts. Existing lesson, source, map, print and touch-emulation checks remain covered.

Database compatibility follow-up: opening validates the exact version-1 store/key/index structure before returning APIs. Incompatible structures and newer versions report retained data and a compatible-app recovery path. Real Chromium fixtures verify a blocked open canceled before the blocker closes, unsupported upgrade rejection, rollback of destructive queued migration changes, clean retry after partial initialization, and retained records across eight malformed schema variants. Production supports version 1 only; the version-2 rollback fixture does not implement a migration. Validation: 125 Node tests, reproducible fixtures and full Chromium checks pass.

Keyboard/accessibility follow-up: page shortcuts focus map/lesson/trace targets; native labeled controls provide keyboard alternatives to map taps and answer groups reference exercise context. Keyboard lesson actions recover useful focus after saving, without moving focus after newer navigation or a changed session/version. Real Tab/Enter/Home/arrow-key checks complete all four exercises with retry, hints, missing-answer and closed-edge feedback, session/preference downloads and print activation. Browser semantics, visible outlines, 320/640-pixel reflow and forced-colors emulation pass. Validation: 125 Node tests, reproducible fixtures and full Chromium checks. This is not screen-reader, actual zoom/device or WCAG acceptance; see [accessibility evidence and manual gates](../../validation/accessibility.md).

Static deployment follow-up: deterministic asset-only packages include app modules, the synthetic map and MIT/CC0 notices, excluding raw data/tooling/local state. SHA-256 verification rejects changed/extra assets and symlinks; failed source validation retains the prior package. Cloudflare header policy is shared with the local preview. GitHub Pages gets early HTML meta CSP and .nojekyll; project-prefix/meta-only browser checks cover map/lesson reload, preferences, backup and portrait PDF. CI runs the full suite from the packaged Cloudflare assets plus the Pages smoke check. Provider configuration and a dormant manual Pages workflow template are prepared; neither publishes from a merge. Validation: 130 Node tests, reproducible fixtures and packaged Chromium checks pass. See [deployment details and header limitations](../../static-deployment.md).

Pages preparation follow-up: the user requested GitHub Pages preparation after merging PR 23. The pinned manual workflow is now installed at .github/workflows/pages.yml and the redundant dormant template is removed. It validates the fixture, runs tests and uploads only dist/pages before deployment. Only workflow_dispatch on main can publish; merging/pushing does not deploy. Repository Settings → Pages must select GitHub Actions, then a manual run and hosted/device checks remain pending. No hosted success is claimed.

Next action: hosted validation requires explicit publication authorization/account access and must preserve each provider's evidence/limitations. Screen-reader and actual target-browser/device acceptance require manual evidence. Actual future migration transformations require their own fixtures. Physical print/quota/eviction and real lesson approval remain pending. Plan 05 remains active until these acceptance decisions are resolved.





Geographic usability follow-up (2026-10-14): hosted-demo feedback identified that a fixed pack viewer cannot browse to a desired area. The authorized scope now includes a separate vanilla-JavaScript geographic preview with explicit tile-service activation, mouse/touch/keyboard panning, anchored zoom, coordinate/OSM-permalink jumps and an external place-search link. It leaves pack/session/Letter output unchanged. Provider/CSP review and limits are recorded in docs/geographic-browsing.md. Integrated search and turning the selected area into a reviewed lesson pack remain next usability milestones, not implemented capabilities.

Validation: 142 Node tests, fixture reproduction and the full packaged Chromium suite pass, including mocked tile navigation/failure recovery, 320-pixel enabled-map reflow and GitHub Pages project-prefix/meta-CSP checks. Existing lesson/progress/Letter checks pass. No hosted publication, actual touch-hardware or real provider availability success is claimed.

Startup and print-shape correction: the user requested an immediately visible default map and zoom, with movable focus and orientation from settings. The geographic browser now starts on the documented Redmond example at zoom 15; no device location is requested. A centered Letter page-shape guide follows the shared orientation value, including loaded/saved/restored preferences, before any pack is loaded. This supersedes the previous explicit tile-activation step. The guide indicates page aspect only, not exact print scale or a generated lesson for the browsed area. Automated browser contexts intercept startup tiles as well as navigation.

Correction validation: 143 Node tests and packaged Chromium checks pass for default startup, both page aspect ratios, saved-orientation reload, navigation and existing Letter output. Location search is placed below the map so the map/settings appear first.

Direct-print usability correction: the user reported that the lesson-pack prerequisite blocked basic map printing. A separate Print this map action now snapshots and prints the outlined geographic area from startup or after pan/zoom, in the shared Letter orientation, with required attribution. It does not load a pack, create a session or infer lesson answers. Lesson printing remains a separate optional enhancement. Browser startup printing also uses this geographic output when no lesson is loaded. Only already-viewed tile URLs are used; print does not prefetch higher-resolution tiles or another area.

Validation: 143 Node tests, reproducible fixtures and the packaged Chromium suite pass, including one-page startup/moved-area map PDFs in both orientations, printed imagery/attribution, normal startup print shortcut, and existing lesson worksheet PDFs. Rendered portrait/landscape PDFs with synthetic tile images were visually inspected. No public tile service was used by automated checks.

Safari invocation correction: the user reported a non-opening print button in Safari with the direct-print revision successfully deployed. Remove the awaited hidden-image decode prerequisite and its ten-second timeout. Validate already-visible required tiles synchronously, call the native print function inside the click, and provide opening/closed/error status. A regression fixture leaves image.decode unresolved and verifies immediate invocation in both orientations while existing basic-map and lesson PDFs continue to render. This fixes an identified invocation gate; actual Safari-device confirmation is still pending.

Print acceptance reset: the user supplied an iOS Safari portrait Letter PDF, establishing actual browser PDF output, then identified missing B&W choice, insufficient street labels and poor alignment with map-learning operations. Raster enlargement is not print-quality acceptance. [Geographic print cartography correction](../../print-cartography.md) is the next implementation slice, before pilot expansion: source-backed vectors for the browsed extent, B&W/color and label controls, physical-unit type/scale and direct basic printing independent of lesson/session state. Existing vector and OSM modules are foundations; geographic integration and target-device/paper acceptance remain unimplemented gates. No physical-print success is claimed.

Geographic cartography implementation: the browsed-area printer now uses a separate source-backed SVG model, default B&W/color and labeled/partial/blank controls, measured 8.5-point paper names, 12-pixel minimum preview text, calibrated north/scale and explicit source/label coverage. The same center/zoom/orientation gives the same paper extent on phone and desktop. Basic print, attributed SVG/raw-source download, S/E/route markings and heading work without a lesson/session. Existing lesson output and scoring remain separate. Whole ways/node IDs/tags/provenance are retained and drawings clipped, not discarded at bounds. The bounded Overpass prototype is coalesced, throttled, cached and canceled with stale-result protection; its public-backend/operator limits are recorded in geographic-browsing.md. No production availability or routing correctness is claimed from it.

Validation: 150 Node tests, fixture reproduction and packaged Chromium checks pass, including Pages project-prefix/meta CSP, one-page vector portrait/landscape PDFs, readable phone preview, paper extent equality, label/style modes, source/SVG attribution export, keyboard markings, source failure and synchronous printing. Manual default-footprint API/CORS/source-shape probes succeeded; actual Safari vector PDF and physical monochrome acceptance remain pending. Print-source geometry is implemented; broader context layers, production hosting, geography-specific saved choices, real-lesson approval and directions/topography remain distinct work. Plan 05 is not marked complete.


### Basic-print readiness recovery (2026-10-14)

After the vector slice was published, a user reported an unclickable Print button. The UI had gated all printing on Overpass, even with a visible tile map. A fresh bounded source probe returned HTTP 406 without CORS; the prior successful probe was not an availability guarantee. Basic printing now independently checks current-frame tile readiness, preferring current-view vector output when available. Tile fallback is explicitly identified, uses selected Letter orientation and B&W/color, preserves attribution, and has fixed names/no practice markings. SVG/source exports remain vector-only. Pending/failed source, invalid geometry and unsupported query extents cannot force a visible ready map’s Print button to stay disabled. Printing neither fetches extra tiles nor awaits image decode. Browser regressions cover delayed source, invalid source, rejection, both fallback paper orientations and no stale geometry. Actual Safari/device and physical-paper acceptance remain open.


### Safari B&W and page-budget correction (2026-10-14)

The user’s post-PR-30 Safari PDF had two portrait Letter pages: a trailing map strip and attribution appeared on page two, and the B&W tile fallback remained colored. This is device evidence of two failed gates, beyond a successful print-dialog invocation. Geographic sheets now budget 15 mm margins, 24 mm vertical browser-chrome reserve and a 10 mm attribution row; the same map footprint is retained and physical scale is recalculated. Geographic page rules are isolated from lesson sheet pagination. Loaded tiles request anonymous CORS; B&W fallback uses actual grayscale canvas pixels synchronously inside the print click, rather than a CSS filter Safari may omit. Color fallback retains images and vector output remains SVG. No provider or CSP-origin expansion is made. Browser regressions use a colored synthetic tile, verify equal RGB channels, keep native invocation within the click, and check both one-page orientations with headers/footers and enlarged 24 mm margins. Actual Safari reprint and physical paper review remain acceptance gates. User source imagery/locations are not committed.


### Pages release resize-race correction (2026-10-14)

Pages run 38603952814 failed in the packaged browser gate on phone-label readability; all 150 Node tests passed and the same merged commit’s ordinary CI succeeded. The SVG could change rendered size after the viewport resize callback, while typography still used the earlier rounded frame width. The vector preview now observes the frame itself and measures its fractional rendered width. A frame-width marker lets the browser regression wait for a current, nonempty, readable preview instead of accepting a transient/empty set and immediately repeating a racy assertion. The 12-pixel criterion is retained. A frame-only 223.5-pixel resize and repeated 641/375/321/320-pixel viewport resizes verify convergence and unchanged geographic paper extent/scale. Build, print limits, grayscale conversion and deployment checks remain in place. This is a browser gate failure, not a Pages artifact-upload or deployment-permission failure.


### Isolated resize regression and Pages recovery (2026-10-14)

Pages run 38616895273 passed 150 Node tests but failed the frame-only browser assertion: actual 232 px versus requested 223.5 px. The app legitimately rewrites inline frame dimensions while responsive layout settles; the test’s direct inline write did not own the target size. Ordinary CI for the same merge passed. The regression now temporarily controls frame geometry with a same-origin CSSOM rule, including explicit priority, and removes the rule in finally. It deliberately schedules a late inline layout write and verifies 231.5/227.25/223.5-pixel frames. A single polling predicate requires the requested actual width, matching preview width, nonempty street labels and the existing 12-pixel readability criterion. It then checks restored normal layout and repeated viewport resizes, retaining paper extent/scale checks. Production map and print code and deployment gates are unchanged.


### Blank Safari trailing page and readable street labels (2026-10-14)

The post-PR-33 device PDF showed sharp B&W vector streets and all map/attribution content on page one; page two contained only browser chrome. The previous grid/fixed-height sheet and element-level named-page boundary were still possible flow triggers. The superseded PR-34 implementation used one root/body page context, a fixed layer, hidden unrelated body children, automatic attribution height, and a refreshed beforeprint snapshot. The existing map footprint and physical box are retained rather than reduced again. A tall named-page trailing sentinel exercises isolation in the browser regression.

Label review identified full names that did not fit their local line segments, road lines visible through word spaces, and clutter around north/scale furniture. Display labels now use standard English abbreviations with full-name/source-ID retention, bounded nearly straight runs, same-name continuity only through shared source node identities, off-line text, central-junction/label/point-marker collision checks and protected legend plates. Short/curved roads can use horizontal callouts with clear text boxes and noncrossing leader lines; omitted names remain counted. Minor unnamed service geometry is lighter and does not block named-street placement. These connections serve cartography only and do not create a valid route graph.

154 Node tests cover identity/provenance, abbreviations including prototype-like words, bounded baselines, callouts, junctions and shared versus grade-separated node identities, alongside prior tests. Packaged browser checks retain one-page vector and tile output, source fidelity, modes, grayscale, native invocation, resize readiness, storage/lesson/accessibility coverage. A single bounded manual default-source probe and locally intercepted replay supported visual inspection; raw extracts and user imagery/locations are not committed. WebKit runtime dependencies were unavailable and installation failed under host permissions; no WebKit/Safari pass is claimed. Actual Safari reprint and physical-paper acceptance remain open.


### Safari blank-output regression (2026-10-14)

The post-PR-34 device PDF contains one blank page with Safari chrome and no map or attribution. The fixed print layer inside zero-height root/body elements failed on the affected device; a one-page count alone was insufficient acceptance evidence. That layout is superseded: the geographic layer now participates in normal block flow, with automatic root/body heights, a single inherited page context, hidden unrelated content and an unfragmented map/credit block. Existing map dimensions, label placement and synchronous native print remain unchanged.

The browser regression requires positive map/body flow height and checks generated PDF content streams for street paths and map text, in addition to page count, Letter orientation and absence of raster images. A deliberately hidden map with browser headers/footers must fail that content check. Local Chromium evidence does not establish Safari behavior; affected-device printing remains required after deployment.


2026-10-14 device follow-up: after PR 35 the user supplied a single-page Safari street PDF with visible map, attribution, north and scale, reporting improvement. This supports the affected street-print regression fix for that sample; broader physical/device acceptance is still open. The next authorized slice adds optional USGS Topo raster browsing/printing, documented in [topographic browsing](../../topographic-browsing.md) and Plan 08. Topographic device acceptance is separate from the successful street sample.


2026-10-14 orientation follow-up: Safari topo output contained the map and attribution on one page but retained a portrait MediaBox for landscape selection. Add a separate geographic Download Letter PDF path with explicit page dimensions; preserve synchronous native Print. Exact-page PDFs use a bounded 200 dpi raster snapshot, with street vector fidelity retained through native print/SVG. Host/Pages CSP permit self-generated blob SVG images. Track actual iOS file download/open/print and physical scale separately; see ../../pdf-output.md.


PDF download device follow-up: a user-supplied file confirms one actual landscape Letter sheet but has excess whitespace from retaining native-print browser reserves. Fit downloaded maps proportionally to the available page with 8 mm margins and measured attribution. Keep extent/aspect ratio, rescale the generated topo scale statement, and verify actual decoded PDF image occupancy. Native print remains unchanged; physical-size and iOS follow-up remain acceptance checks.

2026-10-14 stale-output follow-up: two submitted files had exactly the same bytes and the older 197 × 152 mm map footprint. PR 38 was merged/deployed and a direct hosted exporter request showed the new layout import, with a 600-second HTTP cache lifetime. Do not infer another layout failure from this old file. Version the full current static module graph and stylesheet per release, and timestamp generated download names. Keep browser reload/snapshot semantics explicit; page-fill/device acceptance still needs a genuinely regenerated file.
