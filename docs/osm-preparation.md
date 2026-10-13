# Bounded OSM preparation

Run on Node.js 24. The browser does not contact a public Overpass server automatically. This is an explicit preparation tool for small study areas, not a production routing engine.

```sh
npm run osm:prepare -- fetch --config examples/osm-redmond.json --out data/raw/redmond-r1
npm run validate -- data/raw/redmond-r1/pack.json
npm run osm:prepare -- import --input data/raw/redmond-r1/source.osm.json --config data/raw/redmond-r1/acquisition.json --out data/derived/redmond-replay
npm run osm:compare -- data/raw/redmond-r1/source.osm.json data/derived/redmond-replay/source.osm.json
```

Fetch config has id/title/revision (default 1), display bounds, buffered sourceBounds and HTTPS endpoint. The tool generates a bounded road/restriction query and retrieval timestamp. Import config instead requires the recorded original query/fetchedAt; do not invent source provenance. Existing output directories are cached snapshots: the command refuses to overwrite them or refresh them implicitly. A new source snapshot gets a new pack revision and directory.

## Bundle and failure behavior

Every successful bundle has source.osm.json (exact acquired bytes), acquisition.json (query/endpoint/extent/time), pack.json (validated draft) and review-report.json. SHA-256 is computed from raw bytes; source database timestamp and generator are retained when present. Reimport of identical bytes/config/version is byte-reproducible. Raw data and packs stay in ignored data/raw and data/derived folders; no large extract is committed here.

The CLI stages files and reserves a fresh output directory before publishing the bundle. Invalid inputs/canceled work do not overwrite an existing snapshot; partial temporary directories are removed. Normal interruptions are handled; a hard process kill may leave a hidden staging directory for operator inspection/cleanup. No automatic destruction of prior source releases.

Maximum raw input/response is 32 MiB; source objects <=100,000. Generated pack must also satisfy the stricter 10 MiB/feature/coordinate limits. Response streaming, 30-second client timeout, cancellation and error/remark rejection are implemented. Redirects are rejected. One request per invocation; no automatic retries or endpoint hopping. On 406/429/503, returned retryAfterMs is at least 30 seconds and honors a longer Retry-After. Caller/operator chooses whether and when to retry; no delay loop hides failures.

## Geographic completeness and uncertainty

Original nodes/ways/relations, memberships, tags and metadata remain intact in the raw artifact. Display geometry and directed candidate edges use source node identities, not drawn-line crossings. Only full ways whose nodes fall inside sourceBounds are drawn; missing-node, outside-boundary and area-road cases are explicitly excluded rather than clipped into a false connection. Name availability is reported. Narrow acquisition can therefore omit important long ways; inspect the report before authoring content.

Supported explicit oneway=yes/1/true and -1 set candidate direction, and no/0/false permits both candidate directions. Absent/other/conditional direction rules are flagged. **Every driving edge has access=unknown**, including those with explicit direction: this preparation tool does not implement a legal access profile. Restriction relations are preserved and flagged as untranslated, with member references; missing members are separately reported. No scored exercises or reviewed status are generated. A later review/route-profile step must resolve permission/restriction questions before driving-route lessons.

Known data in the report means observed identities, complete in-extent geometry and name/tag presence. Unknown means direction/access/conditional/restriction interpretation needs review. Excluded means geometry/source members cannot support a verified lesson. Report counts are not road-network completeness percentages.

## Service policies reviewed 2026-10-12

Primary references: https://wiki.openstreetmap.org/wiki/Overpass_API , https://wiki.openstreetmap.org/wiki/OSM_JSON , https://wiki.openstreetmap.org/wiki/Relation:restriction . Policies change; recheck selected endpoint before operational deployment. Public instances can be overloaded. Keep calls identified, serial and small; reuse saved snapshots. Regular/app usage limits apply across users, and commercial/large-volume use needs a suitable self-hosted/paid service or extracts. No public endpoint availability guarantee.

The Node transport sends an identifying User-Agent for this project. Browser environments may restrict that header; any future browser acquisition needs separate CORS/referrer/policy review. Data license/attribution (OpenStreetMap contributors, ODbL) is separate from service permission and the application's MIT license.

Source comparison reports added/removed/changed original object identities and timestamps without mutating packs. Metadata-only changes are reported too. It does not prove unchanged lesson answers: a changed snapshot needs review and a new revision; an old lesson remains attached to its old source.
