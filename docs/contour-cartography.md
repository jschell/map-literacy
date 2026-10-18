# Synthetic lesson contour cartography

The synthetic terrain lesson renderer uses dark intermediate contours and heavier index contours every fifth interval, measured from synthetic zero. At the current 5 m interval, index levels are multiples of 25 m. The original 80/85/90 m hill contains only intermediate contours; the legend shows both conventions without inventing an extra contour or changing pack revisions.

The map legend states interval, index spacing and the synthetic vertical reference. No hachures are drawn: a closed ring alone does not establish a depression. Depression symbols, index/label treatment for real geographic sidecars and optional lesson hillshade remain future reviewed work. This does not change the separate USGS reference-map composition.

Terrain maps reserve a legend band and bottom scale-bar clearance. Screen maps fit within the remaining space. Paper contours retain the selected metres-to-millimetres factor and north-up geometry; the extent-fit check includes the reserved bands, and an oversized extent is rejected rather than silently shrunk. Source geometry is neither smoothed nor generalized.

One upright metre label per contour is attempted on a long segment. Conservative text boxes must remain within the clipped map extent and avoid other contour labels and exercise marker boxes. Labels that do not fit are omitted. Blank variants omit these labels; the interval legend and required exercise references remain. The ordinary street-label renderer is unchanged.

Elevation-reading lessons suppress all automatic numeric contour labels on screen and learner worksheets, including before a session starts. Their explicit reference elevation and A marker remain the teaching inputs. Instructor maps may show numeric labels. Profile lessons show labels alongside their S/E transect and chart. Map-only output shows elevations when labels are enabled. Changing print audience cannot reveal instructor labels on the independent learner practice map.

The same SVG renderer supplies the screen, print preview, native worksheets and direct fixed-size PDF snapshot. Native/direct output shares line weights and legend; the PDF exporter freezes presentation attributes before rasterization. Existing scoring, session backups and pack schema/revisions are unchanged. Session guidance now describes active marked questions rather than repeatedly asking the learner to begin.

## Validation and remaining acceptance

Node checks cover index spacing (positive, negative, fractional and zero), rotated/clipped labels, blank output, marker exclusion, original geometry and learner-label policy. Packaged browser checks cover legend display, index/intermediate stroke distinction, learner/instructor separation, label visibility changes, profile guidance and narrow label bounding boxes, alongside the existing scoring, save/reload and Letter PDF checks. Physical B&W readability, screen-reader use and target Safari behavior remain device acceptance gates. After merge, verify automatic Pages deployment and repeat the visible lesson/print checks on the hosted revision.


Validation: all 214 Node tests pass; fixtures reproduce exactly, the street fixture validates and 161 local Markdown links resolve. The complete packaged Chromium site/Pages suite passes with zero browser errors, including contour cartography, profile/slope scoring, storage/backup/conflict recovery, keyboard/reflow and native/direct Letter output. Measured PDF scale bars remain 20.0237 mm and 49.9957 mm for nominal 20/50 mm. Narrow-screen cartography and representative profile learner/contour instructor PDFs were independently rendered and visually inspected. First hosted verification of this cartography change remains pending merge and automatic deployment; target Safari/physical-paper and real-source acceptance remain open.
