# Security and provider review — October 30, 2026

Scope: application HTTP boundaries, uploaded-image handling, the server-side YouCam adapter, SQLite metadata and quota persistence. This was an independent AI review of code and local tests, not an external penetration test or a claim of production certification. The baseline revision was `f686cfd077a51a67fad1cd2312a5f5f4928b3758`; finalization edits were uncommitted when this report was written. Release evidence must identify the final tested/deployed revision separately.

## Findings resolved

1. **High: vulnerable native image dependency.** The locked Sharp 0.34 release was flagged by `npm audit` for libvips/libheif/librsvg advisories. The application called native metadata parsing before checking the decoded format, so rejecting a declared PNG after decoding did not make unsupported native decoders irrelevant. Updated Sharp to 0.35.5 and the lockfile. Added JPEG/PNG signature checks before native parsing. The installed bundled binaries reported libvips 8.18.7 and librsvg 2.63.2. The advisory describes possible RCE under specific glibc Linux runtime conditions; no exploit or deployed compromise was observed. [Upstream advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [patched release](https://github.com/lovell/sharp/releases/tag/v0.35.5).
2. **Configuration: production trust origin was optional.** Missing `APP_ORIGIN` previously derived trust from the request Host. Production now refuses startup unless this is an exact HTTPS origin without path, query, credentials or trailing slash. The validated origin is captured at startup.
3. **Configuration: invalid spending caps silently enabled 30 jobs/day.** Invalid, zero and negative `MAX_LIVE_JOBS_PER_DAY` now fail startup. Live rendering is disabled explicitly with `ALLOW_LIVE_TRYON=false`.
4. **Privacy defense:** extended `no-referrer` and `nosniff` to HTML/media responses, and added frame denial. Owned API job responses continue to use `no-store`. Private signed result URLs remain direct provider capabilities; these headers do not revoke them.

## Local evidence

Node.js 24.22.1. `node --import tsx --test tests/server.test.ts`: **24 passed, 0 failed**. `npm audit --json`: **0 reported vulnerabilities** after the dependency update. `npx tsc --noEmit`: passed. `git diff --check`: passed. These checks used injected provider responses and spent **zero YouCam units**.

| Boundary | Expected and observed |
| --- | --- |
| Live opt-in | Both server gates required; disabled requests return 503 without provider traffic. |
| Consent | Missing/false consent rejected before provider traffic. |
| Formats/decoding | Nonimages, unsupported formats, disguised SVG/GIF, malformed Base64, MIME mismatch and invalid dimensions rejected. |
| Byte/body bounds | Input above 8 MiB rejected; JSON above 23 MiB returns 413. |
| Metadata | Both uploads are normalized JPEGs; EXIF, orientation, ICC and XMP are absent; orientation is applied to pixels. |
| Origin | Missing, mismatched, hostile and cross-site origins rejected; valid production origin succeeds with a Secure cookie. |
| Session isolation | Foreign, missing, cleared and expired session/job access returns 404; raw session token is not stored in SQLite. |
| Quotas/ingress | Per-session/global caps enforced; 13th same-peer request within one minute returns 429 with Retry-After; global spend survives clearing and restart. |
| Restart | Interrupted job becomes an explicit error, no automatic provider retry, no quota refund. Completed metadata retains ownership. |
| Provider errors | Authorization/throttling errors expose safe messages; malformed/oversized JSON fails safely. |
| Provider network | Fixed API origin, HTTPS S3 host allowlist, no redirects or uploaded Bearer credential; credential/transport headers rejected. |
| Timeout/retry | Polling terminates at the configured deadline; one paid task creation only; no automatic billable retry. |
| Release revision | `/api/status` exposes `revision` only for a valid lowercase 40-character SHA in `RELEASE_SHA`; invalid values and secrets are not returned. |

Machine-readable and stdout artifacts were saved under the mission workspace's `work/evidence/security/` (`routes.txt`, `npm-audit.json`). These local artifacts contain fixtures only, not keys, provider response bodies or private signed URLs.

## Provider contract checked against current documentation

No adapter API behavior change was needed. The [official integration guide](https://docs.perfectcorp.com/reference/ai_clothes) confirms Bearer authentication at the fixed API host, `POST /s2s/v2.0/file`, returned presigned PUT uploads, file IDs in cloth-v4 task creation, and asynchronous status/results polling. The [V4 task reference](https://docs.perfectcorp.com/reference/ai_clothes/v4.0/paths/~1s2s~1v2.0~1task~1cloth-v4/post) confirms `outer` and `filter_multi_person: strict`. Polling is an allowed fallback when webhooks cannot be used; the adapter has bounded polling and a five-minute total deadline.

The two historical genuine provider runs and their synthetic inputs remain preserved in `docs/LIVE_TEST.md`, `docs/OUTER_TEST.md` and `live-evidence/`. No new authorized live render, credit balance check, provider deletion test or hosted browser journey was performed by this review. Fixture passing does not replace any of those.

## Remaining operational boundaries

- Run one stable server process on Node 24 with private persistent writable storage. The queue is in memory and cannot resume source images after restart. Do not use ordinary stateless request functions or multiple workers against this queue/database.
- Daily limits bound accepted jobs, not a full-period provider budget. Keep public live rendering disabled until actual credits and the intended judging-period allowance are confirmed. Failure/cancellation can still be billed.
- Anonymous sessions are not user authentication. The direct-peer ingress limiter is coarse behind a reverse proxy. The host must enforce body limits and edge abuse controls, disable request-body logs, and keep SQLite outside public assets.
- Session clearing removes local metadata and attempts cancellation. It does not delete provider-held copies, browser caches, downloaded results, SQLite forensic remnants or host backups.
- Signed output URLs are returned only to the owning session and validated for host/protocol. The browser fetches the image directly from the provider; the application does not independently decode or moderate generated output. The provider can observe browser network metadata.
- The prototype does not independently verify photo ownership, age or subject identity. It does not infer physical fit, size, exact fabric detail or purchase outcomes.
- No physical phone, Safari, production TLS/reverse-proxy configuration or external denial-of-service test was exercised by this scoped review.

Technical rubric assessment for the audited backend and historical integration evidence: **3.5/5 provisional**. The server-side flow, solver boundary and security controls show nontrivial engineering. A fresh hosted end-to-end journey, reliable public availability and final demonstration remain necessary to justify a stronger complete-entry score. This is a reviewer estimate, not an official judge score.

## Follow-up UI concurrency review

Reviewed the connected planner and studio changes, then fixed two medium-severity races before finalization: a delayed FileReader could repopulate a cleared photo or attach an old reference to a new candidate; an asynchronous session DELETE could race a new submission or the first submission's cookie response. Reads now have cancellation/token guards, underlying file inputs reset, and session clearing locks uploads/render/replay while waiting for any in-flight creation response and then deletion. The result comparison uses the immutable submitted reference. A rejected inspection remains available as read-only history until the garment is reconsidered.

`npm run build` passed after these changes. `node --import tsx tests/journey.mjs` passed the historical replay journey, keyboard comparison, acceptance/rejection and recalculation, 320/390/768px reduced-motion layouts, HTTP-fixture progress/failure/no-automatic-retry checks, delayed file-read regressions, same-file reselection, and delayed creation-cookie/deletion regression. Replay/navigation made zero rendering submissions. The progress/deletion scenarios explicitly intercepted HTTP responses; none contacted YouCam or consumed credits. The read-only review found no additional critical or high-severity issue in the changed UI. Fresh live-provider and hosted verification remain separate gates.

## Subsequent release evidence and revised assessment

The remaining fresh UI and deployment gates above were subsequently exercised at source `28f251de93499a773cdc4ea1acca55147a411452`. One separately authorized real YouCam request completed in the private updated UI, and the public HTTPS application passed 17/17 fresh hosted replay/security/mobile checks. The private request consumed an observed 2 units with no automatic retry or refill; the public app stayed replay-only with no provider key. Its new result and the connected rejection/budget outcomes are documented in `docs/FINAL_LIVE_TEST.md` and `live-evidence/final-2026-10-30/`. This review independently inspected that image and the sanitized reports; it did not make another provider request.

The revised Technological Implementation assessment is **4/5**, superseding the earlier provisional 3.5/5 assessment for the now-demonstrated release. The production build passed 42/42 tests on Linux Node 24.22.2. The deduction reflects narrow repeated synthetic-input validation, the intentionally limited single-process queue and a public replay-only rendering policy. This is an AI engineering review, not an official score, broad model-quality validation or proof of continued judging-period uptime. Provider-held retention/deletion limitations remain unchanged.
