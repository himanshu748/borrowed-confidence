# Borrowed Confidence

**Dress for the opportunity. Not the shopping cart.**

## Inspiration

An interview on Tuesday, a career fair on Thursday, a final round on Friday. A student may already own the essentials but still need a suitable layer. Finding something attractive is only one part of the decision: can they obtain it for every date, return it on time, and stay within budget?

Campus clothing closets are an existing access model. Borrowed Confidence explores the planning layer around that model. We have not partnered with a university or validated student outcomes. Our inventory, prices and lending policies are explicitly fictional.

## What it does

Borrowed Confidence plans several important events using clothes someone owns, can borrow, or could buy within a cap. It checks dates, availability, selected size group, dress requirements, unique borrowed pieces and a continuous loan window. A purchase is charged once even if reused across events.

The central journey is **plan → select a garment from an actual outfit → inspect a YouCam appearance preview → accept or reject → recalculate**. The selected garment and event travel into the studio. Accepting keeps the candidate in the shortlist; rejecting excludes that exact item across all events. The timetable then shows how coverage, purchase spending and borrowing changed. Nothing is automatically reserved or purchased.

## Why YouCam is essential

The solver can tell us which garments satisfy the modeled constraints. It cannot show what a shortlisted layer might look like on a person. YouCam Clothes Virtual Try-On supplies that visual evidence; the human decides whether to keep the candidate. Their decision becomes a real planning constraint rather than a disconnected generated picture.

The server registers two consented images, uploads them to the returned signed PUT URLs, creates a `cloth-v4` task with the selected category, and polls its status with bounded timeouts. A blazer uses `outer`; it is not silently substituted with `upper_body`. Keys remain server-side, and no render is triggered on page load or by automated tests.

The public experience offers a **clearly labeled replay** of a genuine October 25 authorized YouCam result. Its adult subject and blazer reference are synthetic demo assets. It does not use a visitor's uploaded photo or create a fresh render. Live rendering remains disabled until an operator securely configures credentials and verifies credits and spending limits. The functional adapter and its setup instructions are included.

## How we built it

React and strict TypeScript, Express, SQLite, Sharp and Zod. A deterministic bounded search maximizes covered events, then minimizes unique purchase spending, borrowed pieces and total pieces. Stable ties make the result reproducible. It reports a partial plan when a complete one is impossible and rejects searches beyond its explicit node cap.

SQLite persists session ownership, job states and quota reservations; source images stay in memory. A single stable Node 24 process serves the application and asynchronous queue. Interrupted jobs become explicit errors after restart. The deployment uses persistent private storage and HTTPS rather than stateless serverless functions.

## Design

The campus-editorial identity uses pine green, paper surfaces, garment schematics and a chartreuse opportunity ticket. The primary action opens the working planner. Each proposed outfit exposes its actual supported garments for inspection. A keyboard-operable before/after comparison, readable status states and a decision summary connect appearance to dates and spending. Illustrations, fictional stock, historical replay and live processing are labeled separately.

## Technical evidence and evaluation

Two genuine YouCam smoke tests completed on October 25. `upper_body` took about 31 seconds and replaced the base shirt; `outer` took about 29 seconds and retained a visible white shirt beneath the navy blazer. Each cost 2 API units. These were not a controlled single-variable comparison because both source outfit and category changed. Both original results and their limitations remain preserved.

The seven-scenario evaluation retains the original fixture and records explicit input deltas. Independent exhaustive enumeration checks the objective and constraints. The baseline covers 3/3 events with ₹0 purchase spending and one borrowed piece. Stockout or rejection produces 3/3 at ₹850 with no borrowed pieces. A ₹500 stockout budget covers 2/3; making all layers unavailable covers 1/3. All seven have zero independently detected constraint violations. These are simulated scenario findings, not measured customer savings or human outcomes. See `docs/EVALUATION.md` for alternative counts and narrowly scoped local runtime measurements.

A third authorized real outer request on October 30 completed through the updated private UI in 17.62 seconds and consumed exactly 2 units, verified by authenticated before/after balances. The white shirt remained visible under the blazer. The fresh 160-second video captures that request at actual speed, inspection, rejection, recalculation and the budget gap. Public access still uses the clearly labeled historical replay, with rendering disabled and no key on the public host. See docs/FINAL_LIVE_TEST.md.

The tested application is hosted at https://borrowed-confidence.52.202.25.181.sslip.io/ . A fresh anonymous Chromium context passed 17 hosted checks, including replay decisions, budget gaps, mobile layouts, origin/session behavior and exact revision. The current local automated suite has 42 passing tests, including consent, image validation, metadata stripping, origin/session isolation, persistent quotas, provider errors and interruption on restart. Chromium tests exercise the genuine replay decision loop and separately labeled HTTP-fixture progress/failure behavior. Fixture responses are never represented as newly generated live-provider evidence.

## Challenges and limitations

The first provider result taught us that a top replacement is not the same operation as adding an outer layer. We preserved that failure of expectation and added the documented outerwear category. Another challenge was joining the preview to the actual optimizer: the original studio lost its garment context. It now carries the selected item and event, and rejection changes real planner input.

Generated appearance does not prove physical fit, sizing, fabric fidelity or successful purchase. The sample size groups are not measurements. The loan model uses calendar days, one continuous loan and same-day pickup; it omits lender opening hours, cleaning, deposits, shipping and taxes. Anonymous sessions are not verified user identities. Clearing a local session does not delete provider-held images. We have no actual student usability research, real stock integration or measured social/environmental outcomes.

## What's next

A permissioned campus-closet pilot would test real availability policies and whether students understand the planning and preview decisions. We would evaluate garment quality across more consented inputs and improve lender scheduling before adding reservations. Those are future steps, not completed integrations.

## Exact custom form answers

- **28685 Submitter type:** Individual (participant confirmed).
- **28686 Country:** India (participant declaration).
- **28687 App Status:** New. Repository implementation began during this hackathon's submission period; this finalization enhances that implementation. If the participant identifies pre-period project work, choose Existing & Enhanced and use the update answer below.
- **28689 Existing update, if applicable:** Connected actual outfit selection to the YouCam studio; added before/after inspection, human acceptance/rejection and real replanning deltas; preserved both provider runs; added reproducible scenario evaluation, security fixes, browser coverage and persistent-host deployment configuration.
- **28690 Consumer value:** Use the project description above.
- **28691 Repository:** https://github.com/himanshu748/borrowed-confidence
- **28692 API surprise:** The first real upper_body request added the blazer appearance but replaced the underlying T-shirt. A later documented outer request, using a different synthetic base outfit, retained a white shirt beneath the blazer. We preserved both results and did not treat the two runs as a controlled experiment. The distinction between replacement and layering directly shaped the product.
- **28693 Under-discussed use cases:** Clothing-access services such as campus career closets could pair a visual shortlist with lending windows and multi-event planning. The opportunity is making an available borrowed piece easier to evaluate before a trip or a purchase. This is a proposed application; we do not claim that no one else has considered it or that we have a partner.
- **28694 Technical wall:** The asynchronous image API and the wardrobe optimizer originally lived in separate flows. We carried item/event context into the studio, made a human rejection an excluded item ID, and recomputed the actual plan with explicit coverage/cost/loan deltas. We also retained one persistent server process for SQLite and the in-memory queue, failed interrupted jobs explicitly on restart, and kept provider requests behind consent and operator enablement.
- **28695 Social link:** Omit unless an actual participant-authorized social post exists.

## Submission gates

Do not submit with an invented video URL or an unchecked declaration. Required final checks: public YouTube/Vimeo video, gallery screenshots, hosted free access through the end of judging, participant rules agreement, final project classification/team confirmation, and truthful Rising Star opt-in details. The participant confirmed individual entry, India residence, age eligibility, current enrollment, school-issued Devpost email and official-rules agreement. The connected account domain kmclu.ac.in was verified. Enrollment is participant-declared; no documentary enrollment evidence was requested or independently checked. Rising Star opt-in must be verified in the actual submission form. One project can win only one prize. No award or score is guaranteed.

Official sources checked October 30, 2026: https://youcam-api-skin-ai-ecommerce.devpost.com/rules and the authenticated Devpost submission-requirements API. The deadline is November 2 at 22:15 IST.

## Verified release receipt — October 30, 2026

Live app: https://borrowed-confidence.52.202.25.181.sslip.io/

Public narrated video: https://www.youtube.com/watch?v=MSZC_hIJOiA (160 seconds; English captions and Deepgram narration).

Devpost: https://devpost.com/software/borrowed-confidence — submission1272426 returned Submitted at2026-10-30T11:00:03.227Z. Fresh browser reload confirmed SUBMITTED,5/5 steps, and Rising Star Award opt-in106088. Eligibility is participant-declared with the connected school-domain email verified; no award is claimed.

Independent AI review estimate: Technology4/5, Design4/5, Impact3/5, Idea4/5 =15/20. Not official judging or a prediction of winning.
