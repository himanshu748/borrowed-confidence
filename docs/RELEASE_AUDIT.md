# Independent deployment and submission audit

Read-only audit on October 30, 2026, initially against `f686cfd077a51a67fad1cd2312a5f5f4928b3758`. Implementation improvements are being made separately. This report does not certify a final deployment, video or submission.

## Reviewer D: deployment and reliability

The existing Express/SQLite/in-memory queue needs one stable server process and a writable persistent disk. A stateless serverless deployment does not preserve its contracts. The checked-in code had no container or deployment configuration and no hosted app was identified in the original evidence.

Read-only inventory found no DigitalOcean droplets, no EC2 instances across the default AWS account's 18 enabled regions, and one existing running Lightsail host. The AWS connector required reauthentication; the local authenticated CLI worked. The active GCP project's Compute Engine API was disabled. No cloud API was enabled and no instance was provisioned.

The existing Lightsail host has 2 vCPU, 2 GiB RAM, a 60 GiB system disk, a static IP, Docker and Caddy. At inspection, 21 GiB disk and 1120 MiB RAM were available. It already runs EmbodiWeave, DecisionDebt and DOHRA. All three HTTPS roots returned HTTP 200 before changes. Those applications, credentials, data and existing network rules must be preserved.

After parent authorization, one exact current-peer `/32` SSH rule was added and temporary Lightsail SSH credentials were used privately. No secret value was printed. The host inspection was read-only except for that narrow access rule and pulling/inspecting the pinned Node 24 base image. No app was deployed by this audit. The temporary access rule must be removed after release work.

The prepared deployment isolates the new app in a resource-limited, nonroot container/network and a dedicated persistent data directory, with the shared proxy connected to that network only. See `DEPLOYMENT.md`. Reuse creates no new AWS instance/disk/IP, but existing hosting remains billable under the owner's current account. No no-cost hosted claim should be made.

The user subsequently confirmed use of the existing connected host. Open gates: final tested commit authorization, actual image build/route deployment, certificate issuance, matching public revision, browser acceptance at the hosted origin, restart behavior, source/data isolation and unchanged health of existing apps. The historical proxy-delivered YouCam credential is unavailable in the current execution environment. Live rendering must remain off unless a securely supplied credential, available credits and permission to spend units are explicitly confirmed. A clearly labeled genuine historical replay is the authorized fallback.

Free Render web services have ephemeral disks and do not satisfy this backend's persistence requirement. New Fly volumes are billable. Railway documents free/trial volumes, but no authorized existing account or sustained free allowance was verified; changing hosts is unnecessary if the existing host passes isolation checks. Sources: [Render free limitations](https://render.com/docs/free), [Fly volume pricing](https://fly.io/docs/about/pricing/), [Railway volumes](https://docs.railway.com/volumes/reference).

## Reviewer E: eligibility and submission

The official authenticated submission form and rules were checked. The deadline API reports `2026-11-02T16:45:00Z`, equal to November 2 at 10:15 PM IST. The rules and dates API differ on the judging start/end details; preserve access through the later API judging end, `2026-11-20T22:00:00Z`, and recheck before final submission.

Required material includes source/setup access, project description, screenshots, and a publicly viewable 1–3 minute end-to-end video showing the working app and explaining YouCam. The rules specify YouTube or Vimeo; use one of those to avoid the overview's broader Youku wording. A direct GitHub-hosted MP4 alone is not a verified substitute. The preserved 62-second video predates both real API tests and cannot establish the final integration journey.

Required custom answers currently are:

| ID | Field | Verification needed |
| --- | --- | --- |
| 28685 | Submitter type | User's actual Individual/Team/Organization status |
| 28686 | Country of residence | India, explicitly confirmed by the user |
| 28687 | App status | New or Existing & Enhanced, based on project chronology |
| 28689 | Existing-project update | Required in substance if preexisting; field itself optional |
| 28690 | Functionality and value description | Match final implemented/tested behavior |
| 28691 | Code repository URL | Public repo is available and MIT-licensed |
| 28692 | Moment the API surprised you | Honest upper-body versus outer observation |
| 28693 | Under-discussed industry/use case | Specific access-and-lending hypothesis, without novelty claim |
| 28694 | Technical wall and workaround | Actual integration/deployment challenges, without invented evidence |
| 28695 | Social posts | Optional; no post or bonus claim invented |

No Borrowed Confidence project ID was identified by the current tools: a direct project-slug lookup returned not found, and the visible limited project list did not include it. That does not prove no draft exists under a different slug. Check the account's actual hackathon project list before creating a duplicate. No registration, terms agreement, opt-in or submission occurred in this audit.

The user explicitly confirmed residence in India, being above the legal age of majority and current student status. These are participant declarations, not independently checked identity or enrollment documents. Other exclusions/conflicts still require a truthful participant declaration before submission.

The Rising Star rule is: “Submissions from teams with at least one member who is a currently enrolled student and provides a valid school-issued email address (e.g., .edu) at the time of submission”. A valid school-issued email has not been provided, and opt-in is unverified. Award eligibility is therefore incomplete despite the student declaration. Do not fabricate an address or submit an unsupported eligibility answer. The rules also state: “A Project can only win one (1) prize.” First place is $2,500 and Rising Star is $1,000; neither is secured.

Before the final submit action, obtain the participant's confirmation of remaining truthful eligibility/required personal answers and rule agreement. This is required by the Devpost connector's action contract. Rule agreement is still pending. YouTube/Vimeo publishing access is also unavailable; prepare the finished local video before requesting the final upload access. Complete concrete app/video/screenshots/answers first so the user can review the actual result.

## Baseline scoring limits

Submission readiness is currently a failed release gate until the hosted app and final public video are verified. This prevents a credible final 20-point score. From the original code/evidence alone, a provisional skeptical assessment is Technology 3/5, Design 3/5, Impact 3/5, Idea 4/5 = 13/20. The specific wardrobe-access workflow is strong; disconnected try-on decisions, missing deployment/video, synthetic-only inputs and no human study constrain confidence. This is an independent engineering assessment, not an organizer score or predicted placement. Re-score only after the final journey and release evidence are inspected.

Official sources: [rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules), [overview and rubric](https://youcam-api-skin-ai-ecommerce.devpost.com/). Authenticated Devpost `get_submission_requirements`, `get_key_dates`, `get_prizes` and project lookup were also used.
