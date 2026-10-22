# West prelaunch availability implementation plan

> **For agentic workers:** Use test-driven implementation with one bounded policy delegate and a whole-branch review. Steps use checkbox syntax for tracking.

**Goal:** Launch West using complete verified reports and exactly ten clearly marked prelaunch omissions.

**Architecture:** Register an exact revised West policy with eight archive and two current entries. Reuse closed capture replay, immutable unavailable markers and native launch gates; narrowly admit the reviewed current semantic failures while retaining strict postlaunch and transport rules.

**Tech Stack:** Node 22, PostgreSQL, GitHub Actions, existing DFB provider and release RPCs.

**Spec:** `docs/superpowers/specs/2026-10-22-west-prelaunch-availability.md`

## Global constraints

- Exact policy `de-dfb-west-prelaunch-unavailable-v2`; no extra report IDs or guessed statistics.
- Both new entries season 2026/27 and strictly before verified first fantasy day.
- Current capture age at most 12 hours; archive at most seven days; replay never refreshes age.
- No local production writes; no source requests needed for this implementation.
- Preserve all existing provider, policy, goalkeeper, pricing, squad and deadline checks outside the exact extension.

## Review focus

- Current capture with an additional semantic failure or any transport/refusal failure must fail.
- Changed raw bytes, ID, date, score, team or strict diagnostic must fail.
- Exception on or after the first fantasy day must fail.
- Old source closure and original Actions lineage must remain independently pinned after parser changes.
- Native markers must point to the correct current or archive season and contain no individual rows.

## Task 1 Exact policy and parser classification

**Files:** `scripts/policies/historical-statistics-exclusions.json`, `scripts/viri/dfb-historical-receipts.json`, `scripts/lib/historical-statistics-policy.mjs`, `scripts/dfb-historical-policy.mjs`, relevant policy/provider tests and two retained HTML fixtures.

**Interface:** Existing `dfbPolicyBinding`, `collectDfbHistorical`, `verifyDfbPolicySeason` and installed-marker validation accept only the revised exact West policy and use each exception's reviewed season. Other policies remain unchanged.

- [x] Add failing behavior tests for exact two current exceptions, wrong season/identity/hash/diagnostic and postlaunch rejection; run and observe failures.
- [x] Register revised policy and immutable receipts; minimally support its exact season overrides and expected per-season sets.
- [x] Run DFB and shared historical policy/provider tests; observe green.

## Task 2 Authenticated release and native SQL

**Files:** `scripts/dfb-replay-proof.mjs`, `scripts/ponovi-dfb-regijo.mjs`, replay tests, new forward SQL migration, DFB historical SQL fixtures/tests, replay workflow choice.

**Interface:** Exact West v2 may replay the complete authenticated current capture with exactly the two reviewed semantic failures; SQL consumes honest 298+8 / 114+2 coverage and looks up each unavailable marker's actual season. Other current captures remain strictly successful.

- [x] Add failing tests for the exact closed current capture and rejection of extra/transport failures, changed lineage and current postlaunch markers; observe red.
- [x] Pin the original e4 parser closure from `/tmp/slff-next-pl-de-20261022/original-e4-parser-closure.json`; never infer it from absent git objects.
- [x] Add a forward migration registering the new policy without mutating v1; preserve native gates and correct the exact current-marker season lookup.
- [x] Run relevant JS and disposable PostgreSQL tests, including legacy Nord/Südwest behavior; observe green.

## Task 3 Review and rollout

**Files:** `docs/viri/nemcija.md`, durable release evidence outside the source checkout.

- [ ] Run required project checks and whole-branch review; resolve material findings with regression tests.
- [ ] Merge/deploy reviewed changes through the existing pipeline under the user's rollout authorization.
- [ ] Replay both retained seasons on the merged implementation, with the verified same first-fantasy date; prepare and review the exact manifest digest.
- [ ] Import through Actions, calculate prices, run native guards and activate only when all pass.
- [ ] Verify native active status, unavailable markers, priced public players and actual future deadline; save provenance and report actual league counts.

## Execution ledger

- Baseline: clean isolated linked worktree at e4bdca52b315b8f5ce7fc4edfafb787e5737ef4b; branch `rollout/west-prelaunch-20261022`.
- Archive offline and real Actions replay pass with 298 complete plus eight approved exclusions. Fresh current capture is complete transport, 114 complete plus two reviewed semantic failures.
- Ruling: apply the owner's existing reviewed German prelaunch-exclusion authorization to the two exact current-season reports; preserve strict validation for every postlaunch report. Cost if wrong: two prelaunch reports remain unavailable instead of blocking all West participation; no individual facts are fabricated.
- Method: bounded cheaper policy delegate plus root release/SQL implementation, with one final independent branch review. Existing rollout authorization supplies the execution and deployment decision; no repeated plan approval.

- Task 1 complete: exact mixed-season classification, installed-marker/runtime season checks, copied raw SHA proofs. Policy/provider/registry/installed-marker tests pass.
- Task 2 complete: original e4 closure independently pinned; current parent checks reject extra errors/refusals; new SQL migration passes West bootstrap/check/activation rollback and Nord/Südwest/strict legacy regressions.
- Shared SQL regression covers immutable v1 and v2 independently in rollback subtransactions; the initial duplicate-round fixture assumption was corrected without changing production policy installation.
- Local full E2E command stops before any request because local API keys are absent; no environment file or production secret was read. Source/parser and disposable SQL coverage plus CI remain the relevant release checks.
