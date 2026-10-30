# Fresh YouCam UI verification — October 30, 2026

One newly authorized **real YouCam Clothes VTO** request completed through the updated application's actual browser UI, Express server and existing provider adapter. This was a private local live session, with no mocked provider responses. The public application remains **replay-only** and never requests a visitor API key.

Tested application source: `28f251de93499a773cdc4ea1acca55147a411452`. This evidence was added afterward; the source revision above identifies the application that actually handled the request.

## Request and cost evidence

| Field | Observed |
| --- | --- |
| Provider / API | YouCam / `cloth-v4` |
| Garment category | `outer` |
| Person filter | `strict` |
| Started | October 30, 2026, 10:42:35.847 UTC / 4:12:35.847 PM IST |
| Recorded elapsed time | 17.62 seconds |
| Saved output | JPEG, 1792 × 2400 pixels |
| New paid task attempts | 1 |
| Automatic paid retries | 0 |
| Listed cost checked before rendering | 2 units per result |
| Observed account debit | 2 units |
| Automatic refill | Remained off |
| New purchases | None |

The balance API's `amount` and `amount_dec` are alternative numeric representations. Their independently calculated deltas both showed 2 units; they were not added together. Exact account balances are intentionally omitted. The sanitized credit report records HTTP 200 for the balance read and the observed debit, without credentials or account totals.

The recording uses the existing synthetic adult person and single navy blazer reference from `live-evidence/outer-test/`. The UI explicitly confirmed image-processing consent before submission. These are generated demo inputs, not a real student's photos, user-research evidence or an endorsement. The landing page's stock portrait subjects were not sent to YouCam.

## Connected journey exercised

The browser selected the navy blazer from the proposed Graduate role interview outfit, preserved that garment/event context, supplied the synthetic person and garment reference, confirmed consent, explicitly submitted once, displayed real progress and showed the genuine completed result. The user-facing before/after comparison used the actual source and output.

The same session then rejected the garment and recomputed the real planner inputs:

| State | Events covered | Purchase spending | Unique borrowed pieces |
| --- | --- | --- | --- |
| Before rejection | 3 / 3 | ₹0 | 1 |
| After blazer rejection | 3 / 3 | ₹850 | 0 |
| After lowering budget to ₹500 | 2 / 3 | ₹0 | 1 |

Inventory, prices and loan assumptions remain fictional. These are deterministic sample-scenario outcomes, not observed customer savings. YouCam generated the visual appearance; the deterministic solver handled dates, availability, rejected item IDs and spending. No garment was purchased or reserved.

## Independent visual inspection

The saved new image was inspected separately from the capture process. The white shirt and collar remain visible beneath the navy blazer; the chest stays covered. The charcoal trousers, black shoes, stance and background remain broadly consistent with the synthetic input. This is one additional successful outerwear example using the same input pair. It is **not** broad subject/garment validation, exact garment fidelity, verified sizing, physical fit or fabric accuracy.

The October 25 upper-body result that replaced the shirt remains preserved in `docs/LIVE_TEST.md`. The earlier successful outerwear example remains in `docs/OUTER_TEST.md`. Neither historical result was overwritten or relabeled as this new run. The old 62-second walkthrough still does not prove the new live journey.

## Preserved sanitized evidence

- `live-evidence/final-2026-10-30/youcam-result.jpg`: exact copied saved result; no visual retouching by this evidence-packaging step.
- `live-evidence/final-2026-10-30/verification.json`: request, timing, source revision, dimensions, planner outcome, visual-review scope and SHA-256 hashes.
- `live-evidence/final-2026-10-30/credit-verification.json`: observed debit, alternative balance representation check and refill/purchase facts; account totals omitted.
- Source input: `live-evidence/outer-test/synthetic-person.jpg`.
- Garment reference: `live-evidence/outer-test/synthetic-blazer.jpg`.

Result SHA-256: `251f125d6036a5f085bd1810025c65bcae28225373fdee93c13ab73c23ff17d0`.

The saved JPEG decoded successfully and contained no EXIF, XMP or IPTC metadata. No API key, signed result URL, session cookie, provider task ID, raw provider response or SQLite database is included in this evidence directory. Session deletion still cannot delete provider-held images.

## Hosted and automated evidence boundaries

The [public application](https://borrowed-confidence.52.202.25.181.sslip.io) reports the same application revision. A fresh HTTPS browser check passed **17/17** checks at that revision: the historical replay comparison, accept/reject/recalculation, insufficient-budget partial plan, navigation persistence, 320/390px reduced-motion layouts, origin rejection, secure session clearing, unknown-job isolation and source/data nonexposure. The replay/navigation journey made zero rendering POSTs. This hosted check did **not** generate a new provider image.

The Linux deployment build separately passed `npm ci`, **42/42 tests**, TypeScript and the Vite production build on Node 24.22.2. The local security review passed **24/24** focused route/provider tests with injected responses. Those automated tests spent no provider units and do not replace the newly authorized real UI request above.

The mission workspace retains screenshots, browser recording and deployment/browser reports under `outputs/live-demo/`, `outputs/hosted-browser.json` and `outputs/deployment.json`. Final video editing/public upload, Devpost submission, continued judge-period availability and real student usability outcomes are separate release evidence; none is inferred from a successful render.

## Updated technical assessment

**Technological Implementation: 4/5**, an independent AI engineering assessment, not an official score or prediction. The updated source now has a demonstrated nontrivial server-side YouCam integration, genuine UI request/result/decision flow, deterministic multi-event replanning, security regression coverage and a working stateful HTTPS deployment. The earlier provisional 3.5/5 backend assessment predates these release proofs. Remaining deductions reflect narrow synthetic-input quality evidence, the intentionally limited single-process queue and the public app's replay-only live-processing policy. This evidence does not establish long-term production reliability or guarantee placement.

No additional provider requests were made to create this document or package the evidence. Do not rerun the live test without separate authorization to consume units.
