# Browse a real area

The hosted demo originally rendered only an imported lesson pack. Its SVG always fit the pack bounds, so users could not pan to another neighborhood. The geographic browser now provides a separate area preview in plain JavaScript, without a frontend mapping dependency.

1. Choose **Enable geographic map**. It starts at a world overview, without requesting device location or selecting a household.
2. Drag with a mouse or finger. Use Zoom in/out, or pinch on touch devices. Focus the map to use mouse-wheel zoom or arrow keys and +/−. World view resets the preview.
3. Enter **latitude, longitude** or an OpenStreetMap URL containing `#map=zoom/latitude/longitude`, then choose Go to location.
4. For a place name, use Find place on OpenStreetMap. Search opens the provider's website in another tab. Copy that site's map URL into the location field to return to the desired area here. Open this view on OpenStreetMap also preserves the current center/zoom.

The preview has raster street labels supplied by OpenStreetMap. It is not a draft/reviewed lesson, route graph, topographic elevation source or printable custom worksheet. Browsing never installs a pack, changes saved answers or modifies Letter print output. Import a prepared pack for those features. Integrated place search and a selected-area preparation/review workflow remain the next usability work; live GPS/turn-by-turn navigation remains deferred.

## Service review, 2026-10-14

The [OSMF raster tile policy](https://operations.osmfoundation.org/policies/tiles/) permits human interactive browsing with attribution and ordinary browser identification/caching. This low-volume prototype requests only visible tiles at the current zoom, after explicit enablement; drag redraw is debounced. It does not prefetch, download areas, provide offline archives, use a proxy or override browser cache/request headers. Keep the browser Referer enabled. The attribution link remains visible in the viewport. Areas viewed are disclosed to the tile provider; no location is persisted by this feature. The service is best effort and can block usage; there is no production availability guarantee. Tile failures produce feedback and an explicit retry control without automatic retries.

Both header and GitHub Pages meta CSP add only `https://tile.openstreetmap.org` to img-src. Scripts/styles/connections stay self-hosted. Provider constants and URL generation are isolated in src/map/explorer.js; switching currently requires a release and a corresponding CSP/provider-license review. Runtime provider configuration and an operator/contact policy should precede larger-scale deployment.

The [public Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) has application-wide rate, caching and switching requirements, no autocomplete, and explicit restrictions on generic geocoding generated through no-code/LLM platforms without an informed developer decision. This implementation does not call that API; it links to the normal OpenStreetMap website search. Choose and review a suitable geocoding service before adding integrated place-name results.

## Verification and remaining acceptance

Node checks cover projection round trips, coordinate/link validation, visible tile bounds and dateline/polar behavior. Browser checks intercept every tile request and exercise explicit activation, coordinate/link jumps, mouse drag/wheel, keyboard pan/zoom, touch Pointer Events, reset, invalid inputs and isolation from lesson installs. The same checks run against the Pages package under its project prefix and meta CSP. Automated checks never pan or zoom against the public service. Actual touch hardware, network/provider behavior, screen-reader usability and hosted Pages acceptance still require manual evidence. Geographic preview tiles are excluded from the existing Letter print flow.

Validation result: 142 Node tests, reproducible fixtures and the complete packaged Chromium suite pass, including geographic navigation under the GitHub Pages meta policy. Mocked tile decode failures recover through Retry; the enabled browser fits a 320-pixel viewport. Existing saved-session, preference, scoring and both Letter print checks continue to pass.
