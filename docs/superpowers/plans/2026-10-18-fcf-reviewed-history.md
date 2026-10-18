# Reviewed Catalan historical gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Prepare and activate the three approved Catalan groups only after exact historical cleanup and current-source, keeper, pricing, squad and future-deadline validation pass.

**Architecture:** Reuse one common historical-availability contract. Add a narrowly bounded FCF wrapper, an exact-four cleanup transaction and an Actions-only policy-aware release gate. Preserve all ordinary active leagues.

**Tech stack:** Existing Node ESM tests/provider scripts, Supabase/PostgreSQL migrations and disposable SQL tests, GitHub Actions. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-18-fcf-reviewed-history-design.md`.

## Global constraints

- Exactly source reports4109388/4116215/4118352/4118358 in the three named inactive competitions; no future exception.
- Current-season-only route is explicitly approved for these groups; no archive coverage is claimed or inferred from prices.
- Preserve official scores, match/player IDs and the Calonge75-minute correction. No invented statistics.
- Common upsert still refuses populated rows; only the separate exact cleanup can remove the approved individual rows after backup and drift/user-data checks.
- Source refusals stop; no source requests or production writes during implementation/review. Production writes Actions-only.

## Review focus

- Wrong/foreign source tuple or stale canonical preimage must stop before any source read/deletion.
- A new user-owned row/vote or dependency must abort the entire cleanup, preserving every old row.
- Unavailable markers cannot become fake empty reports, zero performances or market absence penalties.
- Normal source defects and failed/stale release proof cannot be renamed successful coverage.
- Generic/direct activation and expired/locked deadlines cannot bypass the private transaction gate.

### Task 1: Bind evidence and the common contract

**Files:** shared owner's `scripts/policies/historical-statistics-exclusions.json`; new `scripts/fcf-historical-policy.mjs` and focused tests; source/provider files only by coordinated patch.

**Interfaces:** consume `getHistoricalStatisticsPolicy`, `classifyHistoricalStatistics`, `historicalStatisticsPolicySha256`; common policy fields and installed-marker API from the reviewed shared checkpoint.

- [ ] Incorporate reviewed common prerequisite commits on a clean main-based branch; obtain fresh builder check of this design before product code.
- [ ] Write RED tests for four exact descriptors, namespace/group/category/season/raw/header drift, normal malformed reports, unknown policy and foreign ID collisions.
- [ ] Coordinate the single registry writer to add three FCF policies and exact approval reference; verify pinned raw receipts offline. Implement minimal adapter; normal full/single report behavior remains identical without opt-in.
- [ ] Verify installed markers skip fetching/derivation in both paths, while unknown/new reports keep strict validation. Run affected FCF/Calonge tests, commit and obtain independent review.

### Task 2: Exact inactive cleanup with backup binding

**Files:** new timestamped FCF-specific migration; `scripts/fcf-historical-release.mjs`; `scripts/test-fcf-historical-release.mjs`; `supabase/tests/fcf-historical-cleanup.sql`.

**Interfaces:** service-only prepare/cleanup contract, bigint competition keys, common apply/upsert functions unchanged. Builder chooses descriptive RPC names, keeping them private/service-only and documenting exact signatures before integration.

- [ ] Write RED SQL tests with four exact targets plus an unrelated valid match in the same round. Assert cleanup removes only the126/14 approved rows, retains official results/IDs, and leaves no stale individual cache/score rows.
- [ ] Add canonical before-image/hash preparation, authenticated artifact transport and exact commit/policy/snapshot assertions. Implement one atomic cleanup/install/upsert transaction with locks and all zero-user/dependency guards.
- [ ] Mutation tests cover changed counts/row fields/fixture/policy, newly added team/roster/lineup/vote/confirmed-assist, active target, foreign report and unexpected FK. Each must abort without changing any row.
- [ ] Rehearse transaction failure/rollback and backup restoration in a newly created owned disposable DB. Check RLS/permissions and generated types via shared owner, commit and independently review.

### Task 3: Current-source packet and guarded release

**Files:** dedicated `.github/workflows/uvoz-fcf-zgodovina.yml`; FCF release script/tests; FCF-only wrapper and activation migration; source docs.

**Interfaces:** same country/league writer coordinator; verified packet/main/policy/before-image hashes; private source-policy activation authorization established by common schema.

- [ ] RED tests require exact current normal-report sets plus four unavailable markers; reject extra/missing/duplicate/foreign/unplayed-to-played/fabricated-empty entries, failed/stale source proof and inconsistent DB canonicals.
- [ ] Implement prepare, inactive cleanup/import/reprice and guarded activate modes. Give secrets only to writer jobs; reject arbitrary URLs/policy JSON, generic import/activation bypass and source-refusal fallbacks.
- [ ] Keep ordinary strict FCF parsing and all23 active groups unchanged. Preserve source capture age and share courteous FCF access; root starts actual fresh capture only after code review.
- [ ] Activation SQL independently rechecks exact installed policy/coverage, keeper/identity evidence, actual default share≤70%, maxprice≥8, ≥6clubs, valid2/5/5/3under100max3club, no user activity, future unlocked round/deadline and canonical equality while locked.
- [ ] Prove Palafolls R4 keeps the existing R6 price wait without fake zero/absence; R7 can resume when complete. Test concurrency, generic/direct activation refusal and expired/locked deadline refusal.
- [ ] Run required smoke/type/security/fresh-DB/affected-provider checks, inspect common unavailable UI integration and obtain whole-branch review before root merge/deployment.

### Task 4: Execute and verify actual passing groups

**Files:** private reviewed packets and release evidence; source documentation updated only with verified outcomes.

- [ ] Root verifies deployed exact main/UI, stages immutable proof and before-images, then runs prepare and inspects real source/DB gates. Any source failure or new defect holds the group; do not extend the four exceptions.
- [ ] Execute reviewed cleanup/import/reprice in Actions; verify exact markers, honest complete/unavailable/pending counts, unchanged unrelated data/Calonge, actual prices/roster and future deadline before activation.
- [ ] Run guarded activation only for passing groups. Read back active status, first fantasy round, published results, individual unavailable presentation and player/club coverage. Preserve artifacts and backup; report factual counts, gaps and remaining holds.
