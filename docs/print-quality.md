# Measuring B&W print quality

Run `npm test` and `npm run browser:release` before presenting a print change. The packaged browser suite produces `artifacts/browser/print-quality-report.json` and paired `print-quality-standard.pdf` / `print-quality-print.pdf`. Render both PDFs with an independent PDF reader and inspect contours, small text, pale lines and page fit. The generated fixture is synthetic, with no real geography or source-data requests.

## What is measured

The fixture has a 640 × 496 source image, colored one-pixel contour curves, small text, road/building context and 11 pixel-aligned grayscale lines (levels 80 through 254). It is enlarged onto a 2200 × 1700 Letter page. The baseline is standard grayscale plus the former JPEG quality 0.95 export; the candidate uses stronger midtones plus lossless grayscale export.

- Nominal contour contrast is background luminance minus the grayscale contour stroke color. Require at least 25% improvement. This is a known-color measurement, not recognition of real contours.
- Check that each of the 11 grayscale levels remains below white after tone mapping, and sample the center of each line after page enlargement. Require all 11 sample centers to remain below white. This does not establish human visibility of an almost-white line or full-line continuity.
- Decompress the actual PDF image stream and compare every sample with the composited page canvas. Require exact equality (zero mean and maximum added compression error). Measure baseline JPEG error against its own page canvas, so intentional tone changes are not counted as compression error.
- Existing browser gates verify one-page Letter geometry in both orientations, decoded map occupancy, attribution, B&W/color output, source failure/retry and native print activation under both packaged CSP profiles. Unit checks cover the raw fallback and compressed grayscale/RGB sample equality.

## Measured example — 2026-10-15

Packaged Chromium fixture results (8-bit values):

| Measurement | Standard + JPEG | Stronger lines + lossless |
| --- | ---: | ---: |
| Contour stroke luminance | 163 | 132 |
| Background luminance | 248 | 248 |
| Nominal contour contrast | 85 | 116 (+36.5%) |
| Thin-line sample centers retained | 11 / 11 | 11 / 11 |
| Mean added compression error | 0.0622 | 0 |
| Maximum added compression error | 7 | 0 |
| PDF size | 191,949 bytes | 199,533 bytes |

Both generated PDFs were independently rendered and visually compared. Midtone curves/text darken; pale lines/background remain. File sizes, JPEG error and timing can vary with browser/font versions. Lossless encoding removes an avoidable export degradation; the baseline already retains all 11 sampled lines in this fixture.

## Limits and next acceptance

The stronger profile is a monotonic pointwise curve: deepen midtones, preserve grayscale 235–255 and black/white endpoints. It has no spatial filter or hard threshold. It also darkens non-contour midtones, including baked-in shading. Use Standard grayscale when that is preferable.

These checks do not increase tile resolution or recover source detail/compression losses. A 640-pixel map printed almost 10 inches across still provides roughly 65 source pixels per inch, even on a 200 dpi PDF page. Real USGS contour labels can remain soft. Higher-resolution source imagery or separately rendered vector contours is a later improvement.

The user accepted the previous physical page fit. Compare this treatment on the same area, paper, printer and actual-size settings before claiming better physical readability. Check small elevation labels, adjacent contours and light lines in representative terrain, on the target Safari device as well. Chromium and synthetic metrics are not a physical-print or Safari acceptance result.

Encoding uses the browser's optional [Compression Streams standard](https://compression.spec.whatwg.org/) with `deflate` (zlib wrapper) for PDF FlateDecode, falling back to exact uncompressed samples when unavailable. No runtime dependency is added.

Execution evidence: all 162 Node tests, fixture reproduction, synthetic pack validation and the complete packaged Chromium release suite pass, including the GitHub Pages project path/meta-CSP profile. The new measurement gate passes; native vector printing, exact Letter downloads and page occupancy regressions remain covered.
