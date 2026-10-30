# Reproducible planner evaluation

Run from the repository root with Node.js 24:

```sh
node --import tsx scripts/evaluate.ts
node --import tsx --test tests/planner.test.ts
```

The first command writes [evaluation-results.json](evaluation-results.json), asserts the seven expected outcomes, independently checks the final plans, and compares the selected objective against exhaustive enumeration of the scenario search space. It makes no network requests and spends no YouCam units. The JSON records full inputs, fixture/source hashes, the current checkout revision, selected item IDs, uncovered events, counts and local timings. A nonzero exit is a failed evaluation; generated output alone is not a pass.

## Inputs and method

All scenarios derive from the unchanged `DEMO_ITEMS` and `DEMO_EVENTS` exports in `shared/demo.ts`. Baseline settings are ₹1,500, size group M and at most one unique borrowed item. Only the listed scenario changes are applied. No inventory is added to improve a result. Prices, inventory, size groups and loan policies are fictional, and the dress model is deliberately simplified.

| Scenario | Explicit change from baseline | Covered | Purchase spend | Unique loans | Complete alternatives | Violations | Outcome |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Borrow the blazer | None | 3 / 3 | ₹0 | 1 | 4 | 0 | Fully feasible |
| Blazer unavailable | Navy blazer unavailable | 3 / 3 | ₹850 | 0 | 1 | 0 | Fully feasible |
| Replacement affordable | Navy unavailable; budget ₹850 | 3 / 3 | ₹850 | 0 | 1 | 0 | Fully feasible |
| Replacement unaffordable | Navy unavailable; budget ₹500 | 2 / 3 | ₹0 | 1 | 0 | 0 | Partial |
| Loan dates conflict | Navy loan shortened from 4 to 1 day | 3 / 3 | ₹850 | 0 | 3 | 0 | Fully feasible |
| User rejects garment | `rejectedIds = ['navy-blazer']` | 3 / 3 | ₹850 | 0 | 1 | 0 | Fully feasible |
| No complete wardrobe | All layer items unavailable | 1 / 3 | ₹0 | 0 | 0 | 0 | Partial |

“Complete alternatives” means distinct assignments of items to **all** events that satisfy all constraints, excluding the returned plan. They can cost more or use more borrowed pieces than the optimum. They are not recommendations, stock counts, visual variants or equally optimal results. The JSON separately reports assignments with maximum event coverage, including partial plans, and per-event candidate counts before global constraints. The two partial scenarios have no additional maximum-coverage alternatives in this fixture.

The independent final-state checker verifies inventory membership, unchanged constraints, required garment categories, availability, rejected IDs, size labels, formality, once-only purchase spending, unique borrowing limits, continuous loan windows, covered/uncovered summaries, and pickup/return dates. A separate brute-force traversal enumerates assignments without the planner's objective pruning. The selected objective—maximize coverage, then minimize spending, loans and total pieces—matched exhaustive enumeration in all seven cases. This checks this small fixture; it is not a proof over all possible inventories.

Each scenario was measured after five warmups, over 25 synchronous `makePlan` calls, on local macOS arm64 with Node.js v24.22.1. The recorded median solver times ranged from 0.0250 to 0.0430 milliseconds in this run. These are warm, tiny-fixture timings, excluding UI, startup, network and provider generation. They are not a scalability benchmark or an end-to-end latency claim. Reruns will vary; the machine-readable artifact contains exact observed values and environment.

## What the results establish

One borrowed navy blazer covers both formal interviews within its loan window, while the career fair uses owned essentials. Removing or rejecting it changes the selected wardrobe to one ₹850 purchase used for both formal events, so the illustrative change is ₹850 more purchasing and one fewer borrowed piece, with coverage retained. This demonstrates a cross-date access decision rather than a recommendation to buy a fresh outfit for each event.

At a ₹500 budget after the stockout, the shorter charcoal loan still covers the first interview and the owned essentials cover the career fair. The final interview remains uncovered. The app must show **2 / 3**, not imply that it solved the week. A navy loan-date conflict is recoverable at the baseline budget, through a purchase; a borrowing conflict does not automatically mean all planning is impossible. With every layer unavailable, only the career fair is covered regardless of the remaining budget.

YouCam generates an appearance preview. It does not decide availability, objective scores, dates, budget, physical fit or whether a garment should be accepted. Human acceptance or rejection changes planner inputs; the deterministic solver recomputes the consequences. The two preserved October 25 provider outputs establish two actual requests, including one outerwear example, separately from this evaluation. This evaluation does not rerun or measure YouCam.

## Evidence limits and product review

These are simulated scenarios, not validated student outcomes. There is no evidence here of money actually saved, employment outcomes, environmental impact, real lender availability, retailer conversion or a successful purchase. No student usability study was performed. The next useful impact experiment is to observe permissioned students trying their actual multi-event clothing problem, recording task completion and misunderstandings without claiming outcomes ahead of the study.

Reviewer B's assessment of the audited baseline: **Potential Impact 3 / 5; Quality of Idea 4 / 5**. The target audience and dates/budget/borrowing problem are concrete, and the solver supports the specific recovery claim. Actual student need, usable real inventory and real-world pickup assumptions remain unvalidated. The cross-event borrowing mechanism is a clear differentiator from generic try-on, but the baseline studio loses selected event/item context and provides no accept/reject loop from a rendered result. That disconnect makes YouCam look optional. Closing that loop, showing its real planning deltas and visibly labeling the actual historical replay are higher-value improvements than adding more recommendation features. These scores are an independent internal review, not official judging or a winning prediction.
