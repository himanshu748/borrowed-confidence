# 50 verifiable release requirements

Generated during finalization on October 30, 2026. `verified-working-tree` means the behavior was exercised but is not yet attached to an authorized release commit. No such row is a claimed completed release gate until the final manifest resolves its SHA. Prepared, pending, blocked and ongoing rows are not complete.

Every record in [release-checklist.json](release-checklist.json) includes changed files, command, expected behavior, observed behavior, artifact and commit field. The delivered output copy will carry the exact tested/deployed SHA after commit and hosted verification. A tracked file cannot embed its own containing commit SHA.

| ID | Group | Requirement | Status | Evidence |
|---|---|---|---|---|
|1|Implementation|Node 24 clean dependency install|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|2|Implementation|All unit and HTTP tests pass|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|3|Implementation|Strict TypeScript and production build|verified-working-tree|build stdout|
|4|Implementation|Preserve original solver and fixture|verified-working-tree|docs/evaluation-results.json|
|5|Implementation|Nonmutating exact bounded optimization|verified-working-tree|tests/planner.test.ts|
|6|Implementation|Original media and evidence intact|verified-working-tree|docs/PUBLIC_UPLOAD.md|
|7|YouCam|Current primary provider contract reviewed|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|8|YouCam|Exact outer category and strict filtering|verified-working-tree|tests/server.test.ts|
|9|YouCam|Two genuine historical results preserved|verified-working-tree|docs/LIVE_TEST.md; docs/OUTER_TEST.md|
|10|YouCam|Replay never implies new generation|verified-working-tree|test-results/youcam-replay-desktop.png|
|11|YouCam|No automatic paid request or retry|verified-working-tree|tests/journey.mjs|
|12|YouCam|Server gates and visitor-key independence|verified-working-tree|tests/server.test.ts|
|13|YouCam|Fresh authorized live UI render|blocked|docs/SECURITY_FINALIZATION.md|
|14|Journey|Select actual outfit garment and event|verified-working-tree|tests/journey.mjs|
|15|Journey|Person/garment consent and category|verified-working-tree|tests/journey.mjs|
|16|Journey|Upload/render/complete/failure progress|verified-working-tree|tests/journey.mjs|
|17|Journey|Before/after keyboard comparison|verified-working-tree|test-results/youcam-replay-desktop.png|
|18|Journey|Accept keeps inspected candidate|verified-working-tree|tests/journey.mjs|
|19|Journey|Reject changes real planner input|verified-working-tree|tests/journey.mjs|
|20|Journey|Show coverage/budget/borrowing changes|verified-working-tree|test-results/recalculated-desktop.png|
|21|Journey|Preserve navigation and invalidate stale context|verified-working-tree|tests/journey.mjs|
|22|Evaluation|Borrowed blazer covers all|verified-working-tree|docs/evaluation-results.json|
|23|Evaluation|Blazer unavailable|verified-working-tree|docs/evaluation-results.json|
|24|Evaluation|Replacement within budget|verified-working-tree|docs/evaluation-results.json|
|25|Evaluation|Replacement over budget|verified-working-tree|docs/evaluation-results.json|
|26|Evaluation|Borrow dates conflict|verified-working-tree|docs/evaluation-results.json|
|27|Evaluation|Inspected garment rejected|verified-working-tree|docs/evaluation-results.json|
|28|Evaluation|No complete wardrobe|verified-working-tree|docs/evaluation-results.json|
|29|Security|Image formats,dimensions,body limits|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|30|Security|Explicit server-side consent|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|31|Security|Session ownership and deletion|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|32|Security|Origin and production cookie protection|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|33|Security|Rate and persistent quota limits|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|34|Security|Provider URL and credential boundary|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|35|Security|Metadata stripping|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|36|Security|Restart and timeout behavior|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|37|Security|Patched vulnerable dependency|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|38|Security|Privacy disclosure and secret checks|verified-working-tree|docs/SECURITY_FINALIZATION.md|
|39|Deployment|Stable Node24 persistent host|prepared|docs/DEPLOYMENT.md|
|40|Deployment|Isolated container and HTTPS route|pending|docs/DEPLOYMENT.md|
|41|Deployment|Correct origin and secure cookies|pending|docs/DEPLOYMENT.md|
|42|Deployment|Tested source equals deployed SHA|pending|release-manifest.json|
|43|Deployment|Fresh hosted desktop/mobile journey|pending|hosted-browser.json|
|44|Deployment|Free judge access through judging|ongoing|docs/DEPLOYMENT.md|
|45|Demo|Fresh real application recording|pending|borrowed-confidence-demo.mp4|
|46|Demo|Honest provider evidence and latency labels|pending|demo-verification.json|
|47|Demo|Permitted public video link|blocked|Devpost project video field|
|48|Submission|Actual draft, description, exact answers|verified-working-tree|https://devpost.com/software/borrowed-confidence|
|49|Submission|Gallery and source links|pending|Devpost project gallery|
|50|Submission|Eligibility, rule agreement and submitted state|blocked|Devpost submission1272426|
