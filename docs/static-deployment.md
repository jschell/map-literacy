# Static packages and hosting

The same vanilla JavaScript application can run on Cloudflare Workers Static Assets or GitHub Pages. Packaging copies reviewed public assets; it does not bundle/transpile JavaScript or add a runtime service. Both prepared packages contain the synthetic map only. Real lessons, actual-device acceptance and publication remain pending.

## Reproduce and preview

Use Node.js 24 and the repository lockfile:

```sh
npm ci --ignore-scripts
npm test
npm run fixtures:check
npm run release:build
npm run release:preview
```

Open http://127.0.0.1:4173. Preview verifies file hashes and the asset inventory first, then serves dist/site with the response-header policy. The development server still serves source assets with npm run dev. Preview and development use the same storage origin if the address/port/profile are identical.

| Output | Purpose |
|---|---|
| dist/site | Cloudflare/static host package with _headers |
| dist/pages | GitHub Pages package with early HTML meta CSP and .nojekyll |
| dist/release-manifest.json | Local SHA-256/size inventory for both packages; do not publish the enclosing dist directory |

Packages include index.html, styles.css, src JavaScript modules, the synthetic street-square.json fixture, MIT LICENSE and a CC0/data NOTICE.txt. Raw data, other test fixtures, node_modules, preparation tools, local configuration and browser state are excluded. Symlinks and unexpected source entries fail packaging. A rejected source asset leaves the previous package intact. Preview detects changed hashes, extra files and incompatible policy. File bytes and manifest reproduce without timestamps; hashes detect accidental changes, not authenticity against an attacker who can replace both files and manifest.

Run npm run browser:release to build and run the full Chromium suite from the packaged assets. On Linux CI/container environments, use MAP_LITERACY_PORTABLE_CHROMIUM=1; other environments require an installed compatible Playwright Chromium or MAP_LITERACY_BROWSER_EXECUTABLE. It also serves dist/pages locally under /map-literacy/ without CSP response headers, verifying relative module/fixture requests, meta-CSP inline-script blocking, saved progress/preferences after reload, backup download and portrait Letter PDF output. This does not test the actual hosted services or reproduce all their caching/redirect behavior.

## Hosting choice

Reviewed 2026-10-13. Cloudflare Workers Static Assets is the preferred target when the complete response-header policy is required; GitHub Pages is a viable zero-cost synthetic-demo option with the limits below. No host is provisioned and no domain or account is assumed.

| Option | Current baseline cost | Fit and limits |
|---|---|---|
| Cloudflare Workers Static Assets | Static requests and asset storage have no additional charge; no paid plan is required for this asset-only package | _headers can apply CSP/nosniff. Cloudflare recommends Workers for new projects. No Worker script, database, functions, domain purchase or runtime package is needed. |
| GitHub Pages | Available for this public repository on GitHub Free | Static HTML/CSS/JS, HTTPS and a project URL. Manual Actions workflow publishes only dist/pages. Meta CSP protects resources but does not meet the complete response-header requirement. |

GitHub Pages documentation provides a static publishing workflow, but no supported project-level custom-response-header mechanism was identified. Cloudflare's _headers file is not a GitHub Pages configuration. The Pages HTML policy retains self-only script/style rules, an Overpass-only connect exception and an image exception for https://tile.openstreetmap.org, object blocking and base/form restrictions, while omitting frame-ancestors because browsers do not support it in a meta element. It does not set nosniff or cache response headers. Do not report Pages as passing those response-header gates; use Cloudflare or another configured header-capable host when they are required. A meta policy applies after the element is parsed, so the generator inserts it before styles/scripts.

Progress/preferences remain local to the browser origin. Moving between localhost, github.io, workers.dev or a custom domain requires exported backups; there is no sync. Project paths under one github.io hostname share an origin and therefore do not isolate databases. Multiple Map Literacy copies on that hostname share the current map-literacy database name. Use a dedicated domain/origin if that separation is needed.

## Prepared Cloudflare setup

After publication is explicitly authorized, use a Cloudflare account with Workers access. Build/test the exact revision above. The checked-in deploy/wrangler.json points only to dist/site, has no Worker entry script and disables SPA fallback for missing assets. Review the name for account-specific availability. Wrangler 4.150.0 is the pinned optional deployment tool reviewed here; it is not an application dependency.

```sh
npx --yes wrangler@4.150.0 deploy --config deploy/wrangler.json --dry-run
npx --yes wrangler@4.150.0 login
npx --yes wrangler@4.150.0 deploy --config deploy/wrangler.json
```

The final command publishes; do not run it as part of ordinary validation. These provider CLI commands have not been executed here. Keep provider credentials outside the repository. After publication, record the actual HTTPS URL/revision and inspect HTML, CSS, modules and fixture response MIME/CSP/nosniff, missing-path 404 behavior, save/reload/backup and both Letter outputs. Existing no-store headers avoid intentionally caching unhashed application files; host behavior still needs observation. Do not add analytics, bindings or run_worker_first as part of this asset-only setup.

## Prepared GitHub Pages setup

The manually triggered workflow is [.github/workflows/pages.yml](../.github/workflows/pages.yml). It is installed for Pages preparation; merging code does not publish anything. When ready to publish the synthetic demo:

1. Merge the Pages preparation PR. The workflow runs manually on main; pushes/merges do not trigger publication.
2. In repository Settings → Pages, choose GitHub Actions as the publishing source. Confirm environment/branch protection rules for github-pages.
3. Run Publish reviewed static demo from Actions on main. It validates the fixture and tests both packages before uploading only dist/pages. The deploy job receives pages/id-token write permissions; the build job has read permissions.
4. Use the URL returned by deployment. For the default project URL it should be https://jschell.github.io/map-literacy/; availability is not claimed until deployment succeeds. Keep the trailing slash so relative asset paths resolve correctly.
5. Repeat hosted MIME, meta CSP, import, save/reload, backup, keyboard and Letter checks. Record the response-header limitations above separately from successful application behavior.

The publishing workflow is prepared, but repository Pages setup and a manual deployment run are still required. This does not establish a live Pages site. A static synthetic demo does not establish a supported learner/browser release.

## Sources

- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) — preference for new static projects.
- [Static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) and [headers](https://developers.cloudflare.com/workers/static-assets/headers/) — asset-only cost and response-header support.
- [Static-site setup](https://developers.cloudflare.com/workers/static-assets/get-started/) and [Wrangler 4.150.0 release](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%404.150.0) — optional provider tooling.
- [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https) and [custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) — static hosting, eligibility and publication setup.
- [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) — meta-policy limitation.

Geographic browsing adds an img-src exception for https://tile.openstreetmap.org to both policies. It uses ordinary browser image requests/caching on startup and while browsing, not fetch, a proxy, inline code or a CDN runtime. Automated navigation uses intercepted tile responses, including the Pages prefix smoke check. See [provider review and browsing limits](geographic-browsing.md).

Vector street acquisition adds https://overpass-api.de to connect-src in both policies; its endpoint is isolated in src/data/geographic-source.js. The packaged browser harness intercepts both external services for every context. Real source hosting/quotas need operator review before a broader rollout; the static package does not provision a backend. Both Pages and header-policy packages include all four new geographic modules without a frontend dependency.

## Browser cache and release updates

GitHub Pages was observed serving module files with Cache-Control: max-age=600. A later device attachment matched the prior PDF byte-for-byte even after the page-fill deployment succeeded. That establishes that the submitted file still had the older layout; an already loaded page, cached module graph or previously saved snapshot can keep old output in use.

Static packages now give the entry module, stylesheet and every current relative static module import one deterministic release fingerprint (?v=...). The fingerprint covers the public asset inputs and header policy. Changing a deep exporter module therefore also changes the URL of otherwise unchanged importers and the root entry. Raw development sources are not rewritten. Both header-hosted and Pages-meta CSP packages use the same version. Existing open tabs still need to reload to run a new release; this does not force reloads or discard local progress. Refresh the page and use Download Letter PDF to generate a fresh snapshot after an update.

Downloaded PDFs include a UTC generation timestamp in the filename, making a newly generated snapshot distinguishable from an older saved PDF. The existing generated-snapshot link still refers to its previously prepared file until Download Letter PDF is used again. No margin/layout change is made by this cache fix; the page-fill layout remains the one introduced by PR 38.

Validation: 160 Node tests pass, including deterministic rebuilds and invalidation of an unchanged importer after a leaf-only change. Complete packaged Chromium checks pass for host-header and Pages-meta CSP, including consistent version queries across the loaded module graph, timestamped PDF names and the enlarged one-page PDF occupancy checks. This does not update an already running tab automatically or replace an already saved PDF.
