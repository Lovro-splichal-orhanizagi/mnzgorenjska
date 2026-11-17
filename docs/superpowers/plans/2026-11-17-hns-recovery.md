# HNS Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Croatian imports with verified transport and lower source load.
**Architecture:** Opt-in Python curl_cffi transport under existing HNS guards; keep cache shards and gate Croatian runs by time/country. Verify on a GitHub runner before reactivation.
**Tech Stack:** Node 22, Python 3.12, curl_cffi 0.17.0, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-11-17-hns-recovery.md

## Global Constraints

- Only public HNS GET paths; no redirects, user cookies, proxy or challenge solving.
- Existing HNS parser/refusal guards and historical women workflow remain intact.
- Keep HR 3 buckets/cache keys; 5-second base delay, 15 seconds per shard.
- HR cadence 05:17 UTC daily; 17:17/21:17 Friday–Sunday; weekday fallback retained.
- Runner probe must succeed before removal of HNS exclusion.

## Review Focus

- Abort/process failure must not leak requests or fall back to unguarded fetch.
- Non-200, challenge and non-HTML must never reach cache or database.
- Delayed schedules, manual HR-only dispatch and DST must not activate other countries.
- Existing cache keys must survive recovery; completed reports should be reused.
- Manual HR jobs must serialize with nightly HR jobs to preserve source pacing.

### Task 1: Verify GitHub network
**Files:** .github/workflows/hns-probe.yml
**Interfaces:** Produces bounded two-page HTTP/marker evidence, no database credentials.
- [ ] Run the fixed two-page probe from the branch on Ubuntu/Python 3.12.
- [ ] Read logs: require HTTP 200, schedule and report markers, no challenge.
- [ ] If refused, stop production reactivation and investigate a workable execution location.

### Task 2: Guarded transport
**Files:** scripts/viri/hns.mjs; scripts/hns-http.py; scripts/hns-http.mjs; scripts/hns-requirements.txt; scripts/test-hns-http.mjs
**Interfaces:** `hnsHttp(url, { signal }) -> Promise<Response>` selected by `SLFF_HNS_TRANSPORT`.
- [ ] Write tests covering subprocess bytes/status, refusal guard, abort, missing runtime, off-scope paths and invalid transport.
- [ ] Run tests and verify missing transport behavior fails.
- [ ] Implement pinned helper and opt-in adapter, with no fallback on transport error.
- [ ] Run new tests and existing HNS transport/parser/women tests.

### Task 3: Workflow cadence and recovery
**Files:** .github/workflows/uvoz-zapisnikov.yml; .github/workflows/uvoz-lige.yml; scripts/nocni-urnik.mjs; scripts/test-nocni-urnik.mjs; scripts/nocni-kosi.mjs; scripts/cakaj-na-uvoze.mjs; docs/nocni-uvoz.md; docs/viri/hrvaska.md
**Interfaces:** Schedule helper emits boolean eligibility per country from event/schedule/time; runtime selects verified transport.
- [ ] Write failing schedule tests for daily, evening, overnight, fallback, manual country filter and delayed jobs.
- [ ] Add early job-step eligibility gate, optional manual country input, Python setup for eligible HR jobs and source serialization.
- [ ] Remove HNS exclusion only after Task 1 success; update operational docs and regression expectations.
- [ ] Run workflow validation, targeted tests, source suite and smoke.
- [ ] Fresh whole-branch review; open PR, integrate verified fix and run HR-only recovery, inspect counts and failures.

## Execution status

- Task 1 verified: Ubuntu run 44188224527 and macOS run 44188451796 both
  returned 403/challenge. Rechecked local request: 200, 180 parsed fixtures.
- Task 2 implemented as opt-in only; default transport and HNS exclusion remain.
- Task 3 timing prepared; HR-only dispatch deferred to avoid displacing all-country queued runs. Runtime installation in production workflows,
  HR source serialization, removal of exclusion and backfill are pending a
  working execution location. Do not merge this as a completed incident fix.
- User was asked which machine should collect pages; no machine chosen yet.

## Review corrections

- Exact HTTP 200 plus an HTML document envelope are required; partial 206 and
  JSON mislabeled as HTML are rejected before caching.
- Buffer at most 8 MiB through curl's content callback, rather than checking
  after the entire decompressed body is allocated.
- Use three non-overlapping weekend cron expressions, not wall-clock hours.
  Both admission and full/incremental scoring use the cron identity.
- HR-only dispatch is deferred: sharing the ALL concurrency group can evict
  a queued nightly run; separate groups need HR source-wide coordination.
