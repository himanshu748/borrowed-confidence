# Borrowed Confidence

Dress for the opportunity. Not the shopping cart.

A student interview-week wardrobe planner combining owned, borrowed and purchase-option clothing. The deterministic planner considers dates, availability, selected size group, borrowing limits and budget. The connected YouCam studio carries a garment and event from the plan into visual inspection. Accept keeps the candidate; reject excludes it across all events and recalculates coverage, spending and borrowing.

## Landing page

The root opens the premium campus-editorial landing page. Its primary CTA opens the working planner. The secondary 62-second historical walkthrough is labeled as predating the provider tests. A live sample uses the same planner engine for availability and budget changes. The full planner is accessible at #planner. See docs/LANDING.md for media provenance and photography licensing.

## What works now

- Three editable event briefs with dates and dress requirements
- Twenty clearly fictional inventory items with own / borrow / buy labels
- Add an owned item and filter inventory
- Exact bounded outfit planning with honest partial results when constraints cannot be satisfied
- Stockout replanning: the sample changes from a free borrowed blazer to an ₹850 purchase option
- Purchase cost charged once per unique item, not once per event
- Borrow-window checks and a printable pickup/return shortlist
- Real YouCam adapter with file registration, presigned uploads, asynchronous jobs and bounded polling
- Consent, image validation, metadata stripping, session ownership, origin checks and daily quotas
- SQLite persistence for job metadata, session hashes and quotas
- No simulated image is ever presented as a live YouCam output

## What is deliberately not claimed

This is a functional hackathon prototype with explicit release gates, not a production service. The public deployment defaults to a labeled replay of genuine provider evidence; it does not generate a new result for uploaded visitor photos. Two real YouCam cloth-v4 requests using synthetic inputs completed successfully on October 25, 2026. The initial upper_body request replaced the shirt. The second used the documented outer category and visually retained a white shirt underneath the added blazer, with trousers and shoes consistent. It took about 29 seconds and consumed 2 API units. These are two smoke tests, not broad compatibility or quality validation. See docs/LIVE_TEST.md and docs/OUTER_TEST.md. Inventory is sample data, not university stock. Prices are illustrative. Nothing is reserved or purchased. Physical fit is not inferred. The planning-board illustrations are original SVG schematics, not photographs or YouCam outputs. Skin Analysis is not used.

Wardrobe edits, event details and uploaded photos stay in browser memory and reset on page refresh. Source image bytes are not persisted by the server. Job metadata persists for up to 24 hours. See docs/SECURITY.md for exact privacy and retention boundaries.

## Requirements

Node.js 24 or newer and npm. The server uses built-in node:sqlite. Node may emit its experimental SQLite warning. A single writable local disk is required for the prototype metadata database.

## Local development on your own machine

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies /api to the Express server on port 3001. The planner works with no provider credentials. The studio is disabled honestly by default.

To enable live try-on, configure the server privately using .env.example as a template. Set YOUCAM_API_KEY and explicitly set ALLOW_LIVE_TRYON=true. Never put a real key into source control, the frontend or a chat message. This repository does not contain a key. Confirm current provider credits, pricing, terms and regional requirements first.

Input images must be JPEG or PNG, under 8 MiB, at least 512 by 384 pixels in either orientation and no side over 4096 pixels. Full-body reference images must show the worn outfit. Use a single garment for product references, not a top/bottom collage. The studio supports upper-body, full-body and dedicated V4 outerwear requests. Use outer for a blazer over existing clothing; upper_body may replace the base top. Generated images are not measurements or fit guarantees.

## Verification

```sh
npm test
npm run build
```

The automated suite covers planner invariants, partial feasibility, stockouts, size checks, unique purchase costs, loan windows, session isolation, consent, disabled mode, safe provider errors, quotas and the provider request contract using injected fixtures. No provider units are spent by tests. A mocked contract test is not a live integration test.

## Production prototype deployment

```sh
npm ci
npm run build
APP_ORIGIN=https://your-host.example COOKIE_SECURE=true DATA_DIR=/private/persistent/data NODE_ENV=production npm start
```

Set APP_ORIGIN to the exact external HTTPS origin with no trailing slash. Set COOKIE_SECURE=true. Set DATA_DIR to private persistent storage. Set PORT to the host's assigned listener port. Use one process with this SQLite-backed in-memory render queue. Do not deploy the queue to a stateless request-only function host as-is.

The Express app serves only dist, not the source directory. Put it behind an HTTPS reverse proxy with a Host allowlist, edge rate limits and request-body logging disabled. Live requests remain off until both enablement gates are set. Default maximum is 30 accepted live jobs per UTC day and five per anonymous session. Failed or cancelled requests may still be billed by the provider and consume the app quota. Full production operation needs authentication, a durable distributed queue, moderation and a verified data-retention policy.

## Self-contained interactive preview

```sh
npm run build
npm run preview:artifact
```

preview.html embeds the built frontend and enables static-preview mode. The local planner works but no API requests or live renders are attempted. It is suitable for reviewing the product journey, not as evidence of a completed YouCam integration.

## Planner model

The search maximizes the number of covered events, then minimizes unique purchase spending, unique borrowed pieces and total pieces, in that order. Every outfit contains a top, bottom and shoes. Formal events also require a layer. Every selected item must meet the user-selected formality level and size group. This is a simplified sample dress model, not a universal rule about professional appearance.

One borrowed item has one continuous loan period beginning on its first selected event date. Reborrowing is not modeled. Loans use calendar days, not business days. Pickup is assumed feasible on the first event day, so real lender hours and lead time must be confirmed. Physical dimensions, cleaning, travel, shipping, taxes, deposits and returns costs are not modeled. The UI states that the shortlist is not a reservation. Ties are stable by inventory order. A 250,000-node cap rejects overly broad searches instead of silently presenting a heuristic result as optimal.

## Project map

- src/Landing.tsx and src/landing.css: editorial landing page and video modal
- src/Garment.tsx: original reusable garment illustrations
- src/media/: licensed photographs and actual product recording
- src/main.tsx: page routing, responsive planner interface and studio
- src/style.css: visual system and responsive/print styles
- shared/planner.ts: pure constraint solver
- shared/demo.ts: fictional demo items and events
- server/index.ts: HTTP API, sessions, queue and SQLite metadata
- server/youcam.ts: fixed-host provider adapter
- tests/: planner and server tests
- docs/SECURITY.md: privacy, threat boundaries and deployment caveats
- docs/SUBMISSION.md: honest draft narrative, demo script and remaining evidence
- scripts/artifact.mjs: self-contained preview packaging

## Sources

- Hackathon: https://youcam-api-skin-ai-ecommerce.devpost.com/
- Official rules: https://youcam-api-skin-ai-ecommerce.devpost.com/rules
- YouCam Clothes API: https://docs.perfectcorp.com/reference/ai_clothes
- Existing lending workflow example, not a partner: https://careers.college.indiana.edu/about/explore-our-center/crimson-closet/index.html

## Browser checks and reproducible evaluation

```sh
npx playwright install chromium
npm run build
npm run test:browser
npm run evaluate
```

Chromium checks cover the existing landing/video, connected item/event context, genuine replay comparison, acceptance/rejection and actual replanning, mobile widths, keyboard/reduced motion, stale-context invalidation, and separately labeled HTTP-fixture progress/error behavior. No browser test spends provider units. The evaluation preserves the original fixture with explicit deltas and independent constraint/objective enumeration; see docs/EVALUATION.md.

## Finalization evidence

- FINALIZATION_STATUS.md: release status and blockers
- docs/DEVPOST_FINAL.md: current submission narrative and exact form answers
- docs/SECURITY_FINALIZATION.md: security review and 24 route/provider checks
- docs/JUDGING_REVIEW.md: independent product/design review with limitations
- docs/DEPLOYMENT.md: isolated persistent-container deployment and recovery
- docs/RELEASE_CHECKLIST.md: 50 release requirements and evidence pointers

Use Node 24. On a machine with a global libvips installation, `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci` selects Sharp's bundled binaries. This environment-specific repair does not change production behavior.

## Final release evidence and remaining submission gates

1. Three synthetic-input live tests are complete, including a fresh updated-UI outerwear run on October30 (17.62 seconds, exactly2 units). See docs/FINAL_LIVE_TEST.md. Broader compatibility remains unvalidated.
2. A new160-second recording captures the real updated-UI render and complete rejection/replanning journey. The old landing walkthrough remains clearly historical.
3. Replace or supplement the sample inventory with permissioned real garment photos.
4. Test with students and report actual observations, not invented metrics.
5. Participant confirmed student eligibility and rules agreement; connected Devpost email has school domain kmclu.ac.in. Verify actual Rising Star opt-in.
6. Full app deployed on an existing persistent Node24 host with HTTPS. Public rendering stays off; labeled replay is functional. Hosted checks17/17 pass. Final public-video/submission receipts are recorded in delivered release artifacts.
7. Keep free judge access available through November 20, 2026.

## Media packaging for connected GitHub uploads

The connected GitHub upload action accepts text files. To preserve the actual images and video without corrupting binary bytes, this repository stores a reversible Base64 media bundle under .asset-pack. The manifest includes SHA-256 hashes for every original file and chunk. This is storage encoding, not a link to private thread files or a runtime API dependency.

The prebuild and predev hooks restore original JPEG and MP4 files automatically before Vite runs. To restore media and synthetic test evidence separately:

```sh
npm run assets:restore
```

Restoration validates hashes, allows only media destinations under src/media and live-evidence and refuses to overwrite modified files. The original restored files are ignored by Git because the bundle is the checked-in source. No PAT or API key is needed for decoding, local planning, tests or the recorded walkthrough. Live YouCam requests still require secure server credentials and explicit operator enablement.

Public evidence reports retain the observed API-unit costs but omit account-balance totals. Generated build output, local databases, credentials and test screenshots are not included.
