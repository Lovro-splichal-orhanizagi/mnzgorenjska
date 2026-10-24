# Provider Batch Rollout Implementation Plan

> **For agentic workers:** Use scoped isolated implementation tasks and independent review. The owner explicitly requested execution of the batch principle; no repeated plan approval is needed. Steps use checkbox syntax.

**Goal:** Deliver executable bounded batch imports and reusable Australian/German source support, with independent pass/HOLD outcomes and honest activation authority.

**Architecture:** Reuse existing import, pricing and native release gates in one bounded Actions job. Add actual-byte Dribl catalog/report parsing and capture-bound native normalization. Keep Germany’s sampled source batch separate from complete-season import evidence.

**Tech Stack:** Node 22 ESM, node:test, public JSON/HTML, existing Supabase importers and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-24-provider-batch-rollout.md`.

## Global constraints

- Exact reviewed scope/main SHA; initial write batch 1–5 inactive MLSZ candidates and a shared enforced request budget of 1–1000.
- German screen: 1–10 observed tuples, one shared total 1–80 requests, at most three sampled reports per league, six-second starts.
- Dribl recon: at most 20 new ordinary source reads, no retries after access/transport failure; collector and parser scope derives only from observed public endpoints.
- Source failures stop the source; semantic football failures stay local. No active-price override, guessed identities, arbitrary commands, inferred complete season or new historical exclusions.
- Capture-based import requires full original-byte replay and exact identities; partial/sampled/HOLD captures cannot enter native statistics.

## Review focus

- Per-league failure must not become a whole-country manual task; host failures must not leak into further source requests.
- Cached unused benches, member/profile namespace differences, halftime/additional time and role evidence must not create fictional appearances.
- Native numeric identity collisions, incomplete pages, changed scopes, malformed results and ambiguous writes fail closed.
- Claimed source completeness and keeper provenance must match actual source evidence; a callback seam is not an implemented release contract.
- New writers must participate in existing nightly/manual/global coordination.

### Task 1: Executable provider batch

**Files:** `scripts/provider-league-batch.mjs`, `scripts/provider-source-budget.mjs`, focused tests, `.github/workflows/uvoz-paketa-lig.yml`, coordinator recognition.

**Interfaces:** `runProviderBatch({candidates,transport,runCommand,strictProof,onCheckpoint,...})` executes fixed import/audit/price/release stages with durable results. Source budget state spans all sequential children. Production activation requires an implemented independently validated provider contract, not generic aggregate READY alone.

- [x] Write failure-isolation, tuple/scope drift, source-stop, budget, ambiguity and native-readback tests; observe RED.
- [x] Implement fixed stages and main-only credentialed workflow; preserve source-specific keeper policy evidence and separate unsupported release contracts.
- [x] Run focused tests, freeze implementation and independently review.

### Task 2: Dribl public data and native normalization

**Files:** `scripts/viri/dribl.mjs`, actual SHA-bound fixtures, offline CLI, `scripts/dribl-capture.mjs`, `scripts/dribl-import.mjs`, `scripts/viri/dribl-public.mjs`, focused tests and source documentation as evidence permits.

**Interfaces:** Source worker supplies `parseDriblCatalog`, `parseDriblSchedule`, `parseDriblReport`. Native normalization consumes reconciled complete reports and preserves tenant-scoped profile identities, exact team/scorer binding, minutes and scoring semantics. Capture/import admission distinguishes complete published inventory from default upcoming-only views.

- [x] Capture bounded actual public samples and freeze parser interfaces/provenance.
- [x] Write actual positive and held report regressions; observe RED, implement and verify.
- [x] Implement capture/import normalization only against the frozen schema; reject incomplete inventory, partial data and identity collisions.
- [x] Independently review source/identity/import boundaries before registration or source writes.

### Task 3: German shared-budget league screen

**Files:** separate batch module/CLI/workflow and tests; existing season/import admission unchanged.

- [x] Write shared-budget/cache, semantic continuation, technical stop and offline corruption tests; observe RED.
- [x] Implement durable batch evidence and main-only secret-free workflow.
- [x] Verify strict original-byte replay, freeze and independently review.

### Task 4: Integration and authorized operation

- [ ] Wire new tests and writer coordination, update operational docs.
- [ ] Run integrated smoke/build and required database checks if schema changes.
- [ ] Review the complete branch, merge and verify main deployment.
- [ ] Run only reviewed bounded live operations; record exact imported/active/held counts. Do not count tools or samples as activated leagues.

## Integration verification notes

- Initial integrated offline run: 118 tests, 117 passed, one explicit native
  disposable-container skip, zero failures. CI YAML parses and diff checks pass.
- Dribl identity SQL observed RED with its RPC absent. The first post-migration
  local run stopped at Docker metadata inspection (`docker inspect` timed out),
  before any migration SQL ran. Even `docker version`/`docker port` subsequently
  timed out or returned daemon HTTP 500. Do not change SQL-test expectations or
  restart other projects’ Docker services. Validate on the fresh Actions database.
- Fresh Actions schema generation preserves its types as an artifact so the
  checked-in types can be regenerated from actual migrations without secret-file
  access or handwritten RPC types.


## Integrated verification (24 October)

- Production MLSZ contract is installed, independently reviewed after exact
  missed-penalty and live schedule-row hardening; 230 integrated runner,
  budget, source-proof, Dribl and coordinator tests passed. This includes a
  closed six-club fixture through the actual native activation/readback path.
- Dribl parser and capture/native package were independently approved at
  `b7343e7e` and `6f13bbde`; their tests use retained real reports and explicitly
  synthetic full-inventory framing, never a claimed live complete season.
- Actual fresh Actions database generation produced checked-in schema types
  (artifact from run 40132857110). The first native identity test exposed only
  a locale-dependent test result ordering; production SQL was unchanged.
  Test ordering now uses bytewise C collation and is rerunning in fresh CI.
- Local production build passed. All 2,508 source tests completed with
  2,275 passes, 233 explicit native-database skips and no failures. The
  rendering smoke component passed with public placeholder configuration;
  the first unconfigured render attempt had stopped on missing Supabase URL.
  Fresh Actions type/build/render passed; Dribl identity native SQL passed.
  The remaining fresh-database CI checks are still running.
- No new leagues were activated during implementation. No Australian country
  registration, frontend routing or nightly operation is implied by adding
  the capture-bound adapter. Main review/deployment and bounded operations
  are the remaining release work.


## Final review fixes and operator integration

- Independent integration review found that the MLSZ byte bound buffered an
  entire cloned response before checking size. Finite 9 MiB streaming
  regressions reproduced the failure; the fixed reader cancels at 4 MiB,
  rejects oversized Content-Length before reading and combines a 30-second
  timeout with the caller signal. All 25 budget tests passed and review
  approved `5f8de8cb`. No provider request was used in these tests.
- Dribl hosted import admission is independently approved at `3ff6aa65`.
  It admits only a successful recent same-repository/main/commit capture,
  replays the selected full current and optional previous-year archive
  scopes, checks the inactive AU tuple and empty fantasy bootstrap before
  every writer, and denies source network during native import. It does
  not activate or register a league.
- Final changed-code runner/proof/budget/operator/native set: 112 tests
  passed, zero failed. CI YAML and whitespace checks passed. Independent
  integration review approved country binding, coordination, SQL privileges
  and MLSZ activation boundaries. Final branch CI and main deployment
  remain required before live dispatch.
