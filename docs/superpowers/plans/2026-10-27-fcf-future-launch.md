# FCF future launch implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch the still-inactive G1/G9 targets through a genuinely future, untouched round rather than the expired round-6/24-October release window.

**Architecture:** Add a versioned continuation and release path alongside the closed existing protocols. Bind one deterministic source/native launch selection into the approved packet and independently recompute it under SQL locks; do not silently move an approved packet to another round.

**Tech Stack:** Node 22 ES modules, GitHub Actions, PostgreSQL/Supabase.

**Spec:** The scope and acceptance requirements below, the active rollout goal, and the existing contracts in `docs/viri/fcf-missing-inventory-admission.md`.

## Scope and acceptance requirements

- Targets are only `es-ct-segona-g1`/783 and `es-ct-tercera-g9`/797, season2026/27, their existing exact source blocks.
- Keep old wire schemas, consumed claims and immutable six-exclusion policy bytes unchanged. Reports4109409/4118365 and the requested517 cap are NOT approved at plan creation.
- Actual accounted source spend is37, not22. Current cap remains478; an infeasible two-group refresh must refuse, not reset its ledger. A separate feasible G9-only plan may be considered within the same cap.
- Never relabel old originals or cache mtimes as fresh. Reauthenticate old attempts for accounting; source readiness requires genuine complete current evidence.
- Pick a round from all240 authenticated source fixtures and complete native identities/dependencies. It must contain eight pending fixtures, all16 clubs once, unambiguous official Europe/Madrid times, a genuinely future official deadline and future match dates.
- Selected fixtures/round must have no imported report, appearances, goals, locked lineup or user activity. Earlier unresolved source facts continue to hold the target.
- Selection alone is a pure proposal, not source authentication, price approval or activation authority. Bind it to the source fingerprint, complete native projection and reviewed writer commit before execution.
- Existing explicit keeper coverage, canonical source/native comparison, privacy, persisted varied prices and affordable legal15 gates remain mandatory. SQL independently checks the same source/native round, deadline, untouched state and approval under locks.
- An expired/changed selection holds. A fresh reviewed packet is required; never reopen a played/locked round or choose a replacement during apply.
- No local production writes or federation reads. Production work uses reviewed main Actions only. No outreach.

## Current evidence

Read-only Actions run40531464697 produced a complete native preflight for four inactive groups on main086021b2. None passed. G1/G9 passed keeper, pricing and legal-squad checks but have old invalid statistics and missing reports. Tentative native openings were G1 round7, deadline28October13:30UTC, and G9 round7, deadline31October10:30UTC; these are NOT source authorization.

The old source prover (`fcf-current-source-proof.mjs`/`fcf-historical-release.mjs`), compiler/readiness and migrations20261018232000/20261019150000 require R6/24October. Import normally sets `prvi_fantasy_krog=6`, so its current seed value1 alone is not a bug.

## Task1: Pure future-round selection

- [x] Add `scripts/fcf-future-launch.mjs` and focused `scripts/test-fcf-future-launch.mjs` with a closed, documented pure input contract compatible with source canonicals and native mapping projections.
- [x] Write failing tests for expired R6 followed by a valid future round, G1/G9 target identities, mismatch/duplicate/omitted fixture identities, unknown/ambiguous kickoff, expired deadline, native import/statistics/user/lock dependencies and no remaining legal round.
- [x] Implement deterministic selection and explicit verification of an already-selected round at a later clock. Verification must not fall forward silently. Include a stable source/native projection digest and immutable return values; no IO or caller-written readiness capability.
- [x] Run only focused tests on Node22. Clearly label synthetic calendar/mapping examples as test-only; no fixture test proves production source readiness.

Task1 verification:94 focused tests pass. Fresh selection follows the existing distinct-played-round rule and can skip a mixed/elapsed current round; verification never substitutes another round for an expired approved proposal. Pending-source/native-import or statistics conflicts hold globally. This is not integrated with a production caller yet.

## Task2: Accounted fresh continuation

- [x] Authenticate terminal run39238757730 and its consumed claim, both diagnostics and final receipt, adding its15 GETs to the earlier22.
- [x] Add the proposal-only `future-g9-after-six-v1` protocol: honest37 baseline,240 fresh G9 originals,277 planned cumulative under478, no reuse. Its history-keyed namespace is not an execution claim; consumed-claim integration remains open.
- [ ] Build new source admission using actual fresh originals, exact approved exclusions and the chosen future opening boundary. Pending user decisions may require a separate immutable policy namespace; do not pre-approve it here.
- [ ] Add focused protocol/expiry/budget/claim tests and actual retained-evidence reauthentication. No provider execution until scope, new approval assets and claim are concretely reviewed.

Accounting subpiece: `fcf-post-six-accounting.mjs`/`test-fcf-post-six-accounting.mjs` authenticate the genuine raw artifacts into an accounting-only WeakMap brand.35 tests pass with the explicit retained-evidence directory and no skips. The reader grants no capture, claim, source admission or activation capability. Root's combined Node22 verification passed129/129, with zero failures/skips; subsequent protocol/integration tasks remain open.

## Task3: Compiler, writer and SQL agreement

- [ ] Add a new packet/rollout version in source proof, target release/readiness/native plan and stage evidence. Bind the Task1 selection into source/native fingerprints, writer closure, reviewed artifacts and stored receipts.
- [ ] Add a new migration and explicit adapter routing. Preserve old RPC contracts; independently derive/verify the opening under locks and retain canonical, keeper, price, legal15, privacy and readback gates.
- [ ] Separate immutable historical cleanup authorization from the chosen opening date. Review all original before-images; do not merely relax an old round6 guard to make a test pass.
- [ ] Test expiry/change between prepare/import/check/activate and altered dependencies with meaningful disposable SQL checks. Keep any constructed rows explicitly test-only.

## Task4: Reviewed execution

- [ ] Obtain the pending policy/budget decisions and review exact new source/writer artifacts before source execution or production mutation.
- [ ] Run the bounded source capture once, count all failures, audit source completeness, then prepare/import/reprice/check through Actions.
- [ ] Activate only candidates passing every gate and read back exact active state, unchanged approved data, official opening/deadline and deployed commit. Keep all failures explicit.

Future source subpieces (27October): `fcf-future-source-plan.mjs` fixes the G9-only proposal above and requires the actual reader-issued accounting proof. `parseFcfFutureAuditDocument` shares the strict normal-report checker while permitting completed/scored current-season rounds1–30; legacy R6 behavior is unchanged. All six historical IDs stay outside normal parsing, and actual4109409/4118365 closed no-score pages still hold. Neither helper grants source/claim/admission/activation authority. Root verified the combined plan/accounting/parser/legacy suite:131 passed,2 existing private Calonge fixture skips,0 failures; all new retained-evidence cases passed. Separate bounded independent reviews approved both subpieces. These local changes are not a deployed or executable continuation.

Task2 claim/capture integration (local): the explicit future union now accepts only the registered/re-authenticated37 ledger, and issues distinct schema5 execution claims, schema4 consumption and schema4 inventories. The history-keyed protected claim and actual source-clearance proof remain mandatory. The collector fetches all240 G9 reports afresh, starts journal sequence38, preserves every failure and refuses reuse, sibling/seed injection or retries. All three approved G9 historical headers must retain the immutable reviewed facts; fresh wrapper bytes do not replace original cleanup evidence. The two unapproved closed-score cases remain errors. Legacy evidence admission explicitly refuses this protocol instead of interpreting it as the old16-request baseline.

Verification: claim/legacy-claim103 passed; future collector13 passed; future historical observations12 passed; combined future-boundary/plan/historical49 passed. Shared collector regression7 passed (all actual six-history cases),39 unavailable older private fixtures skipped,0 failed. One independent integration review found no blockers. No federation/DB/GitHub source execution occurred for this implementation. Future evidence admission, Actions preparation/capture wiring and the future native compiler/SQL path are still outstanding; inventory-complete remains statisticsAudit:not-run and cannot activate a league.
