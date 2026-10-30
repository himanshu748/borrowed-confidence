# Historical submission working draft

For the current finalization narrative and form answers, see [DEVPOST_FINAL.md](DEVPOST_FINAL.md). The original draft below is retained for provenance and does not describe the final release status.

Do not submit this draft unchanged. Complete the live integration and validation gates first. Distinguish implemented features from plans everywhere, including the video.

## Name

Borrowed Confidence

## Tagline

An interview-week wardrobe from what you own, what you can borrow and only what you need to buy.

## Inspiration

A student preparing for several interviews should not have to build a new wardrobe for each one. Campus clothing closets already make professional clothing more accessible, but an inventory list alone does not tell a student which items will cover their events, work with owned clothes or remain available through the last interview. We built a visual planning layer around those decisions.

## What it does

Borrowed Confidence builds a multi-event wardrobe under a spending cap. Users enter event dates, dress requirements, size group and a borrowing limit. The planner combines owned items with available loan items and illustrative purchase options. It checks borrowing windows, counts each purchase once and returns a pickup/return shortlist. If an item becomes unavailable, it calculates a new plan or honestly reports the events it cannot cover.

The prototype's fictional sample starts with three owned essentials and a borrowed navy blazer. When that blazer becomes unavailable, the app can cover the same events with an ₹850 purchase option under the sample ₹1,500 budget. These are demonstrative figures, not measured savings or real retail offers.

## YouCam integration

The full server app implements YouCam Clothes VTO: register image files, upload bytes to the returned signed URLs, create a cloth-v4 task and poll for a generated result. Only a real successful response populates the result panel. Secrets stay on the server. Processing requires explicit image consent and deliberate operator enablement. The interactive static preview does not call YouCam.

Current evidence status: adapter implemented and contract-tested with injected fixtures, followed by one genuine cloth-v4 call using synthetic adult and garment inputs on October 25, 2026. It completed in about 31 seconds and consumed 2 API units, confirmed by an observed debit of 2 units. The output is preserved in live-evidence. It replaced the T-shirt rather than preserving layering, so it does not prove reliable outfit composition. The current walkthrough was recorded before this test. Never call fixture responses live proof.

## Why it is different

Virtual wardrobes and try-on tools already exist. Our focus is the access-and-scheduling problem: can this student actually obtain these clothes for all these dates without overspending? The stockout replan makes the distinction visible. We do not claim to be the world's first wardrobe app or to guarantee employment outcomes.

## How we built it

React and TypeScript frontend, a pure deterministic constraint solver, Express backend and SQLite job metadata. The solver optimizes event coverage before cost, borrowing and item count. The provider adapter handles asynchronous work with session ownership, bounded queue concurrency and safe error reporting. Source photos stay in memory and are not persisted by the application. Generated imagery is explicitly not sizing advice.

## Limitations to disclose

- Sample inventory and prices, not a live university or retail integration
- Size groups, not measurements or verified fit
- Calendar-day loan model with one loan per item
- Same-day pickup assumption; no opening-hour, cleaning or transport model
- A generated preview may change garment details
- No automatic reservations or purchases
- User research not yet performed
- Student eligibility not yet confirmed

## Rubric evidence checklist

Technology: show real YouCam requests completing, nontrivial solver tests and a stateful replan.
Design: show the continuous brief-to-plan-to-preview-to-shortlist flow on the intended device.
Impact: collect actual student usability observations and identify remaining barriers.
Idea quality: explain the cross-date lending constraint and contrast it with a generic AI stylist.

## Three-minute demo script

00:00–00:20: Three interviews. One partial wardrobe. A limited budget. Introduce the student scenario without implying it is a real measured case.

00:20–00:45: Enter dates and budget. Show own / borrow / buy item labels and the initial zero-purchase plan.

00:45–01:25: In the full deployed app, upload consented real photos and complete a real YouCam Clothes VTO request. Label any time compression. Explain that the image is an appearance preview, not a fit guarantee.

01:25–01:55: Return to the event calendar and the pickup/return checklist. Explain that the displayed items are sample inventory unless a real partner is secured.

01:55–02:25: Mark the navy blazer unavailable. Show updated cost and event coverage. Briefly show an infeasible case with no invented stock.

02:25–02:45: Explain the deterministic constraints and the server-side YouCam flow.

02:45–03:00: Report genuine test observations, state the next pilot step and close: Most shopping assistants help you buy more. Borrowed Confidence helps you show up ready with less.

Do not record a fake result as if it came from YouCam. Do not claim student tests happened until they did.

## Award and submission checks

Rules checked October 25, 2026. Deadline November 2, 2026 at 11:45 am EST, equivalent to 10:15 pm IST. Recheck the official page before submission.

Rising Star: at least one currently enrolled student must provide a valid school-issued email and opt in. All entrants must meet general eligibility. A project may win only one placement or special prize, not both. No win is guaranteed.

Provide a repository, English description, screenshots and a 1–3 minute public demo video. The project must be accessible free for judging through November 20. Do not expose provider credentials in the repository or video. Publicly sharing the demo for bonus credits has its own disclosure and claim requirements in the rules. Do not imply social sharing improves judging scores.

Sources: https://youcam-api-skin-ai-ecommerce.devpost.com/rules and https://docs.perfectcorp.com/reference/ai_clothes

## Follow-up outerwear evidence

A second authorized real V4 request used the documented outer category. It completed in about 29 seconds and cost 2 units, confirmed by an observed debit of 2 units. The white collared shirt remained visible beneath the navy blazer and the trousers and shoes remained visually consistent. Both inputs were synthetic. This is one successful layering example, not a physical-fit or general reliability guarantee. See docs/OUTER_TEST.md. The old walkthrough still predates these live tests and needs replacement for the final submission.
