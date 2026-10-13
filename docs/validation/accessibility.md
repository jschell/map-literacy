# Keyboard and accessibility evidence

Run `npm run browser:check`. The accessibility helper uses real Tab, Enter, Home and arrow-key input in container Chromium 153. It reaches controls through sequential focus order; it does not click or programmatically focus them. Other browser helpers continue to check storage/recovery, pointer/touch interactions and Letter PDF output.

## Completed automated checks

- All three page shortcuts focus the map viewer, lesson heading or path-tracing heading. There are no positive tabindex values.
- All native inputs, selects and buttons have labels/names. Named map/lesson regions, the map image name and the answer group's prompt description are present in browser semantics. Native feature and directed-edge selectors provide alternatives to map taps.
- Keyboard practice completes heading, endpoint, route and detour exercises. Incorrect answers, retry, hints, missing answers and a closed-edge rejection retain explicit text feedback. The accepted route and detour use different directed-edge sequences.
- Keyboard lesson activation restores useful focus after saving: answer input or graph-start selector while practicing, Next exercise after a correct answer, Retry exercise after rejection, and Download session backup after completion. Mouse activation retains the existing behavior.
- A delayed completion fixture verifies that finishing an older save does not steal focus after the user tabs to another control. Only the initiating session/version can restore focus.
- Keyboard activation downloads session and view preference files, changes labels/Letter orientation and invokes printing. The print callback is intercepted for this keyboard check; the separate PDF checks verify real Chromium Letter portrait/landscape output.
- Every reached control has a visible keyboard outline. At 640- and 320-pixel viewport widths, the document has no horizontal overflow and the focused backup action fits the viewport. Forced-colors emulation retains focus outlines.

125 Node tests, reproducible fixtures and the full Chromium browser suite pass. These checks do not establish WCAG conformance, screen-reader usability, actual browser zoom behavior or learning effectiveness. SVG naming and native controls do not provide a complete nonvisual equivalent of spatial map instruction.

## Manual release checks still required

Record browser/OS/device and assistive-technology versions, date, scenario, observed result and any issue before selecting a supported release matrix. Do not replace pending entries with inferred passes.

| Check | Procedure | Evidence |
|---|---|---|
| Screen reader | On intended devices, verify region/heading navigation, control names and exercise prompt context. Confirm score, hints, save failure/conflict and completion are announced without losing position or excessive repeated announcements. | Pending |
| Keyboard on target browsers | Repeat four-exercise practice, retry, saved-session resume, downloads, native file restore and print-dialog navigation. Verify reverse Tab order and label editing without map taps. | Pending |
| Browser/text zoom | At actual 200%/400% zoom and enlarged text, inspect every control, prompt, source credit and focused outline. Check scrolling and clipping; viewport tests alone do not prove this. | Pending |
| Device touch and contrast | Inspect actual touch targets, focus/selection visibility and text contrast in normal/high-contrast modes on target devices. Emulation is partial evidence only. | Pending |
| Print | Verify physical monochrome Letter maps and worksheet readability in both orientations using the [physical print checklist](physical-print-check.md). | Pending |

See [setup and recovery](../browser-setup.md) and [storage evidence](storage.md). No supported Safari/Firefox/device matrix or public release is claimed.
