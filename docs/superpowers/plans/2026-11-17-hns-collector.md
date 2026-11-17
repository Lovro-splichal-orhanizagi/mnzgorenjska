# HNS Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect Croatian match data with a single durable source budget and import validated snapshots in GitHub.
**Architecture:** GitHub publishes a bounded manifest; a local collector caches public HNS pages and stages immutable batches privately; GitHub imports offline. Source refusals stop collection globally and persist across restarts.
**Tech Stack:** Existing Node parser/importer, pinned Python curl_cffi, SQLite request/queue state, private file staging, GitHub Actions, host-native scheduler.
**Spec:** docs/superpowers/specs/2026-11-17-hns-collector.md

## Global Constraints

- Planning only until the host and private staging access are confirmed; never silently install on Luka's avengers-hq.
- One source-wide reader; at least 10 seconds after response/failure; rolling 24 h caps 30/100/500 at the 2/10/all-league stages.
- Each pilot stage lasts at least 24 h before explicit expansion. Backlog target at most 300/day, correction audit at most 10/day, all within the same ceiling.
- One daily cycle at 06:30 Europe/Zagreb initially; optional targeted 21:30 later uses the same budget.
- 403, 429 or challenge persists BLOCKED, with no automatic transport/network fallback. Other transport failures end the run and defer at least one hour.
- Only active approved HR hns identities/current seasons; preserve closed HNLŽ policy and all other countries.
- No production database credentials on the collector; no public payloads or generic proxy.
- Snapshot import has no network fallback, never fabricates missing data, and remains idempotent.

## Review Focus

- Two processes, a restart or clock rollback must not reset the source budget or bypass a persistent block.
- A cold/incomplete cache must not cause history-wide reads or duplicate schedule/report requests.
- Interrupted uploads and wrong season/league IDs must not become importable batches.
- A replayed or partial batch must not duplicate points or overwrite good data with placeholders.
- Sleep, missed schedules, delayed imports and budget deferrals must remain visible as lag, not success.

### Task 1: Inventory and manifest contract
**Files:** Create `scripts/hns-collection-manifest.mjs`, `scripts/test-hns-collection-manifest.mjs`.
**Interfaces:** `buildCollectionManifest({competitions, completedReports, repairs, now})` emits versioned league/source/season bindings and bounded explicit work; `validateCollectionManifest(manifest, now)` rejects expired or invalid scope.
- [ ] Write failing tests for active/current selection, HNLŽ exclusion, wrong source/season, duplicate IDs, expired manifest and off-scope URLs.
- [ ] Run `node --test scripts/test-hns-collection-manifest.mjs`; verify the intended assertions fail.
- [ ] Implement manifest building/validation without fetching HNS or mutating the database.
- [ ] Run the test file; require all tests pass and inspect a read-only manifest preview.

### Task 2: Durable collector and caching
**Files:** Create `scripts/hns-collector.py`, `scripts/test_hns_collector.py`; extend `scripts/hns-http.py` for diagnostic Ray ID capture; reuse `scripts/viri/hns.mjs` through a small `scripts/hns-collection-parse.mjs` CLI.
**Interfaces:** `hns-collector.py --manifest PATH --state PATH --cache PATH --output PATH --max-attempts N` accepts only the configured pilot stage. Queue/state stores request attempts, last response time, block state, parsed report state and pending reason. Parser CLI emits source-bound JSON facts from captured HTML and never performs HTTP.
- [ ] Write failing tests using a fake clock, temporary SQLite state and injected HTTP boundary: parallel invocations, 10-second spacing, rolling cap after restart/midnight, clock rollback, blocked-state persistence, cache reuse, incomplete-report 24 h deferral and no immediate double-fetch.
- [ ] Run `python3 -m unittest discover -s scripts -p 'test_hns_collector.py'`; verify failures before implementation.
- [ ] Implement the source lock, persisted pre-request accounting, bounded queue and stop conditions from the spec. Cold starts retain budgets and prioritize the approved missing rounds.
- [ ] Run collector tests plus the existing HNS transport/parser suites; require no real HNS calls from unit tests.

### Task 3: Private batch staging and snapshot import
**Files:** Create `scripts/hns-batch.mjs`, `scripts/viri/hns-snapshot.mjs`, `scripts/test-hns-batch.mjs`, `scripts/test-hns-snapshot.mjs`; integrate the adapter at the existing provider factory boundary.
**Interfaces:** A ready manifest identifies immutable capture files by batch ID, exact URL, league/season/report IDs, captured time and SHA-256. `validateBatch(manifest, files, inventory)` admits only the requested source scope. Snapshot provider exposes existing HNS provider methods but returns only captured reports, with explicit pending counts.
- [ ] Write failing tests for truncated upload, missing ready marker, hash mismatch, stale/wrong season, duplicate IDs, path traversal, unknown URLs and forbidden live fallback.
- [ ] Implement restricted private staging with atomic ready publication. Decide host-specific paths only after confirming the selected server; never put credentials in repository files.
- [ ] Import one fixture batch into a disposable database twice; assert unchanged match/appearance/score counts on replay and no writes for missing reports.
- [ ] Verify schedule/report identity and score warnings against existing parser tests and closed-history policy tests.

### Task 4: Scheduling, coordination and operational visibility
**Files:** Create `.github/workflows/hns-collection-plan.yml`, `.github/workflows/hns-import-collected.yml`, `scripts/hns-collector-status.mjs` and host-specific scheduler configuration after host selection; update `scripts/cakaj-na-uvoze.mjs`, its tests and `docs/nocni-uvoz.md`.
**Interfaces:** Planning publishes inventory only. Import consumes a validated ready batch and coordinates with all HR writers. Status separates capture/import freshness, source block, pending matches and budget exhaustion.
- [ ] Write failing tests for HR writer coordination, no pending-ALL eviction, duplicate/missed scheduler ticks, replayed batches and persistent blocked/late status.
- [ ] Configure one daily local collection and private batch consumption; keep direct nightly HNS reads disabled. Do not install a general GitHub self-hosted runner on the user's computer.
- [ ] Run actionlint, coordinator tests and offline smoke with CI fixture environment.
- [ ] Confirm logs contain no secrets/player payloads and a stopped collection remains visibly blocked/late.

### Task 5: Measured pilot and gradual recovery
**Files:** Add pilot evidence to `docs/viri/hrvaska.md`; retain raw payloads only in private staging/cache.
**Interfaces:** Operator-selected stage controls eligible leagues and the global cap. Promotion is an explicit configuration change based on observed access, parser validity and import results.
- [ ] Confirm host/staging choices and run the two-page diagnostic from the actual collector host.
- [ ] Observe 2 leagues with a 30-attempt cap for at least 24 h, then 10 leagues with a 100-attempt cap for at least 24 h. A challenge stops the rollout.
- [ ] Measure request count, bytes, CPU/RAM, cache hit rate, publication delay and per-league freshness. Verify one staged league end-to-end before broader writes.
- [ ] Expand toward 139 leagues at max 500 attempts/rolling 24 h; backfill at most 300 missing reports/day within the same cap. No active-league repricing.
- [ ] Verify sampled scores/lineups/points, disclose pending gaps and record rollback/resume instructions. Consider targeted evening collection only after the daily pilot supports it.

## Decisions still required before installation

- Collector host: Jernej's Mac is proven reachable now; an always-on alternative must be tested independently. No machine has been selected.
- Private staging: proposed existing SLFF server; connectivity and scoped transfer access have not been confirmed.
- Whether to request an HNS-supported feed or explicit access/rate allowance. No external contact has been authorized or sent.

This plan does not promise to avoid Cloudflare challenges. Its guarantees are local:
bounded traffic, no accidental bursts/repeated history reads, clear stopping and
accurate reporting when collection cannot proceed.
