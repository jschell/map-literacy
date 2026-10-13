# Data foundation development

Requires Node.js 24.x for tools/tests. Browser modules in src/data and src/geo have no Node imports or third-party dependencies. No npm install is required. Package is private (not configured for npm publication); project code is MIT licensed. Synthetic JSON fixtures remain CC0-1.0; acquired third-party data retains its source license.

Commands:

```sh
npm test
npm run fixtures:check
npm run validate -- tests/fixtures/street-square.json
```

Use npm run fixtures to regenerate checked-in synthetic JSON. The CLI validates a single pack, prints a JSON result and exits 0 for valid input, 1 for rejected/unreadable files, 2 for missing/wrong arguments. It checks filesystem size before reading; browser readImport checks Blob size, strict UTF-8, JSON structure, limits and cancellation before returning a candidate. Neither function writes storage.

validatePack is synchronous and non-mutating. pack-schema.js contains the executable structural descriptor; validate-pack.js adds geographic, identity, reference and topology checks. Metadata hashes are format-checked during ordinary validation; possession and hash verification of actual source bytes is a separate acquisition/provenance responsibility. Tests verify synthetic source hashes against the committed raw artifact.

Structural validity is not a verified route, valid answer or current real-world permission. Draft/unknown-access cases may be structurally valid; later session/scoring modules enforce review and uncertainty. Exclusions require partial topology. Original OSM relation reconstruction is not implemented yet.

Synthetic fixture data stays distinct from real OSM. Bounded OSM acquisition/import and source comparison are now implemented; see [preparation guide](osm-preparation.md) and [live Redmond evidence](validation/osm-redmond-evidence.md). The live pack remains draft; real-neighborhood lesson review and a newer snapshot comparison remain in Plan 02. UI, SVG rendering, browser device checks, scoring and persistence are later plans. CI uses pinned checkout/setup-node action commits resolved from their official v4 refs during implementation; Node major 24 matches local testing.
