# Security and privacy

## Live processing is opt-in

The server requires Node 24 or newer. Set `YOUCAM_API_KEY` privately and set `ALLOW_LIVE_TRYON=true` to enable actual rendering. Both are required. Without them, `/api/status` reports configuration required and submissions return HTTP 503. No fake or demo result is presented as a live render. A valid key and provider credits are not included with the app.

The API key is used only in server-to-server Bearer authentication to `https://yce-api-01.makeupar.com`. It is never sent to the frontend, included in errors or logged. Do not use a `VITE_` prefix for secrets. The direct server entry point loads a local `.env` if one exists. Keep that file out of source control.

## Consent and images

Every submission requires the literal value `consent: true`. Use only images you have permission to process. Consent is supplied by the user interface and enforced again by the API. This app does not independently verify ownership, age or the identities of people in images.

Only base64 JPEG and PNG data URLs are accepted. Arbitrary client image URLs, SVG and animated files are rejected. Each input is limited to 8 MiB. JSON bodies are limited to 23 MiB. Sharp checks MIME against the decoded format, limits pixel count and fully decodes images before re-encoding as JPEG. Dimensions must be at least 512 by 384 in either orientation with a maximum side of 4096 pixels. EXIF and GPS metadata are not forwarded. Transparent backgrounds are flattened to white.

Source images exist in server memory only. They are not written to disk or stored in SQLite. The queue holds at most 12 jobs, two renders can run at once and at most two image-validation operations run at once. Buffers become eligible for garbage collection after completion or cancellation. This is not a claim of cryptographic memory erasure. Reverse proxies and hosting platforms should also disable request-body logging and use bounded request limits.

Submitting sends both images to Perfect Corp's YouCam service. Provider retention, backups and deletion policies are controlled by Perfect Corp. The app cannot revoke provider retention or guarantee deletion of an image already uploaded. Clearing a session cancels local work where possible and deletes local job records. It does not delete copies already held by the provider, downloaded images or browser caches. Review the provider's current terms and privacy policy before enabling live use.

## Provider contract and network boundary

The adapter follows the [official AI Clothes documentation](https://docs.perfectcorp.com/reference/ai_clothes):

1. Register each image with `POST /s2s/v2.0/file` using `content_type`, `file_name` and `file_size`.
2. Upload bytes with the returned PUT URL and returned headers.
3. Create `POST /s2s/v2.0/task/cloth-v4` using `src_file_id`, `ref_file_id` and `garment_category`.
4. Poll `GET /s2s/v2.0/task/cloth-v4/{task_id}` for `data.task_status` and `data.results.url`.

Only `upper_body`, `full_body` and the V4 `outer` categories are accepted. Outerwear requests set filter_multi_person to strict and do not silently fall back to upper_body. Provider file IDs are used instead of caller-supplied URLs. Registration and task requests go to a fixed API origin. Returned upload URLs and output URLs must use HTTPS with a hostname exactly matching `yce-[a-z0-9-]+.s3-accelerate.amazonaws.com`, such as the documented `yce-us.s3-accelerate.amazonaws.com`. Credentials and non-default ports are rejected. All fetch redirects are disabled. Returned upload headers are preserved except that credentials and unsafe transport headers cause the operation to be rejected. Bearer credentials are never attached to S3 uploads.

No output proxy exists. The frontend receives the validated provider URL directly. The URL may contain a signed capability and must be treated as private. Anyone with that URL may be able to access its image until provider expiry. Because browsers fetch it directly, Perfect Corp or AWS can observe browser network metadata. If the provider changes its storage hostname, this adapter will fail closed until an operator verifies the new host and updates the allowlist. Provider responses are bounded at 256 KiB. Individual network requests time out after 30 seconds and a render is bounded by a five-minute overall deadline and 120 polls.

## Sessions and request protection

Sessions use cryptographically random 256-bit cookies with `HttpOnly`, `SameSite=Strict` and a 24-hour lifetime. Only a SHA-256 hash of each cookie is persisted. Cookies are `Secure` in production or when `COOKIE_SECURE=true`. Use HTTPS for production. A job is visible only to its owning session. Unknown, expired and other-session job IDs all return HTTP 404.

Every API write requires an exact `Origin` match. Configure `APP_ORIGIN` to the external frontend origin with no trailing slash. The development default is `http://localhost:5173`. If unset in production, the server uses the direct request origin. There is no permissive CORS configuration. Cross-site Fetch Metadata requests are rejected. In development Vite must proxy `/api` to the backend. In production the same server serves only the built `dist` directory and the SPA fallback, never the project root or metadata directory.

The server does not trust forwarded headers. If deployed behind a TLS reverse proxy, set `APP_ORIGIN` explicitly and enforce an external Host allowlist at the proxy. Do not expose the internal HTTP listener directly. These controls assume a trusted same-origin frontend. A compromised frontend or an XSS flaw can act as the current session.

## Persistence and expiry

SQLite stores session hashes, job IDs, timestamps, states, result URLs, generic error messages and daily quota counters. It does not store source images, provider API keys or provider response bodies. Set `DATA_DIR` to a private writable directory, or use `SQLITE_PATH` for an explicit database file. The default is `.data/spindle.sqlite`. Keep the database and its WAL files outside `dist`, restrict filesystem access and encrypt storage and backups where appropriate.

Jobs and sessions expire after 24 hours. Reads enforce expiry immediately and an unreferenced one-minute cleanup timer removes old records. Startup also performs cleanup. Interrupted jobs become errors on restart because their source images are intentionally not persisted. Expiry is logical removal, not guaranteed forensic erasure from SQLite free pages, WAL files or host backups. Storage administrators must apply an appropriate backup and media lifecycle policy.

## Spending and abuse bounds

The default global cap is 30 accepted jobs per UTC day, configurable with `MAX_LIVE_JOBS_PER_DAY`. Each session may submit five accepted jobs per UTC day. SQLite atomically reserves both counters before starting work. Failed or cancelled attempts consume the reservation because provider work may already have been billed. Clearing a session does not refund the global counter. A fresh anonymous session can obtain a new per-session allowance, so this is not user authentication or a strong anti-abuse identity boundary.

An additional in-memory ingress limit permits 12 submissions per direct peer IP per minute. All clients behind a reverse proxy can share that peer IP. The ledger persists across process restarts. Use one application process per database: the render queue is in memory and startup marks unfinished records as interrupted. For a public deployment, add authenticated accounts, edge rate limiting, a distributed queue and explicit budget monitoring. These controls are a bounded prototype, not a substitute for infrastructure-level denial-of-service protection.

## Verification and limitations

`npm test` runs HTTP tests and an injected-fetch provider contract suite without a browser, a real API key or live image uploads. It covers disabled configuration, consent, origin rejection, MIME checks, session isolation, session deletion, ownership persistence, quotas, safe errors and URL restrictions. Injected responses are test fixtures only. The application has no mock live-rendering path.

Two authorized synthetic-input cloth-v4 calls were verified on October 25, 2026 with the securely configured credential. The initial upper-body example succeeded in about 31 seconds but replaced the shirt. A second outer-category example succeeded in about 29 seconds and visually retained the shirt beneath the blazer. Each consumed 2 API units. Two examples are not broad quality validation. Source pixels were synthetic, not photos of a real person. The credential remained proxy-delivered and was used only in documented authentication headers; the process did not inspect or persist its real value. Generated clothing is a visual approximation, not evidence of actual fit, sizing or exact garment detail. The app does not perform content moderation or biometric identification. Do not treat generated output as an accurate measurement or make consequential decisions from it.
