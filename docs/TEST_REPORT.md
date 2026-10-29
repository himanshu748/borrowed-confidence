# Verification report

Run date: October 25, 2026.

## Automated checks

- npm run build: passed TypeScript strict checking and Vite production build.
- npm test: 28 tests passed, 0 failed.
- Production HTTP smoke test: built SPA served successfully, /api/status reported live disabled and a source-path request did not expose the environment template.

Planner tests cover the zero-purchase base scenario, ₹850 stockout alternative, insufficient-budget partial plan, once-only purchase charging, unavailable dates, size mismatch, loan-window reuse, rejected items, borrowing limits, invalid dates, nonmutation, leap-year arithmetic, formal layer requirements, duplicate IDs and budget invariants.

Server tests cover disabled mode with no provider traffic, both enablement gates, trusted-Origin enforcement, consent and decoded-image validation, session isolation, deletion, provider request contract, safe URL restrictions, safe errors, persistent global daily caps, per-session caps, job metadata after restart and cancellable background polling.

Provider tests use injected fetch fixtures. They do not spend credits or prove live model compatibility.

## Browser checks

The published static interactive preview was opened in a real Chromium browser.

- Clicking Make blazer unavailable updated planned spend to ₹850 and kept 3 / 3 events covered.
- The changed banner correctly stated that the navy blazer was unavailable.
- Switching to Try-on studio explicitly displayed Live try-on not enabled and clarified that this static preview runs the planner locally.
- No fabricated generated output appeared in the result panel.
- A full-page desktop screenshot was inspected for layout and clipping.
- The final published preview version passed its render health check with no console errors or failed requests.

Landing-page browser regression added after the initial MVP:

- Desktop Chromium verified that the video decoded and playback time advanced beyond zero, with a duration of 61.9 seconds.
- Verified modal closure, stockout calculation, a ₹500 infeasible-budget case and navigation into and out of the full planner.
- A 390 × 844 mobile viewport verified menu expansion, in-page navigation, stockout controls, video-dialog opening and planner navigation without horizontal overflow.
- Additional 320, 375, 768 and 1024 pixel width checks found no horizontal overflow in either landing or planner.
- Desktop and narrow mobile screenshots were captured. The 390px hero was inspected visually.

These are emulated Chromium viewports, not tests on physical phones or Safari. Print styling is implemented but physical printing has not been verified.

## Not verified

- Broad YouCam compatibility beyond the two synthetic-input smoke tests in docs/LIVE_TEST.md and docs/OUTER_TEST.md
- Broad image-quality and latency evaluation or exact provider retention
- Actual campus stock, real prices or lender opening hours
- Student usability outcomes or student-award eligibility
- Hosted full-server deployment or public judge access

These are release gates, not reasons to present simulated evidence.

## Outerwear extension

Two additional fixture-backed tests confirm that outer reaches cloth-v4 unchanged with strict single-person filtering and that undocumented aliases are rejected instead of silently falling back. A separate authorized real outerwear request completed in 29 seconds and consumed exactly 2 units. Visual inspection found the white shirt present underneath the blazer with trousers and shoes consistent. See docs/OUTER_TEST.md for scope and limitations.
