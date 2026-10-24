# Country League Preview Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Produce a bounded, read-only country diagnostic batch for exact reviewed inactive candidates, with no source access or activation authority.

**Architecture:** Select candidates by country from the existing reviewed registry, verify every tuple against a fully paginated fresh database inventory, and delegate one candidate at a time to the existing preview API. Persist plan, pagination evidence and child results; downgrade READY to PROVISIONAL_READY with NEEDS_STRICT_SOURCE_AUDIT. Run only on exact main SHA in Actions; dependency injection supports offline verification.

**Tech Stack:** Node ESM, node:test, existing REST preview transport, GitHub Actions.

**Spec:** Parent task dated 2026-10-24 and `../league-rollout-evidence/2026-10-24-next-countries/automation-design.json`.

## Global Constraints

- Only new script, test, workflow and this plan; no registry, provider, package, schema or production changes.
- Uppercase two-letter country, limit 1–5, bounded offset and inventory pagination; exact 40-character main SHA and repository/ref guard.
- Database-only transport, no `.env`, no source GET, apply, refresh, dispatch or write RPC.
- Child READY never grants activation eligibility. Inventory timestamps do not establish source freshness.
- Infrastructure failure stops and records; an individual football-data HOLD continues.

## Review Focus

- Inventory metadata and duplicates fail closed rather than silently selecting a different country.
- Pagination truncation/page exhaustion must not imply inventory completeness.
- Main SHA drift and missing Actions identity stop before database access.
- Injected preview infrastructure failure must stop remaining children while preserving prior results.
- Empty DE catalog must explain generic-route limits, without implying Germany has no leagues.

### Task 1: Bounded country diagnostic

**Files:** Create `scripts/country-league-preview.mjs`, `scripts/test-country-league-preview.mjs`, `.github/workflows/predogled-drzave.yml`.

**Interfaces:** Export `parseArguments(args)`, `assertExecution({expectedSha,headSha,env})`, `loadRegistry()`, `createReadOnlyTransport({url,key,fetch})`, `runCountryPreview({country,limit,offset,expectedSha,registry,inventory,transport,previewRunner,now,onCheckpoint})`. The runner returns a serializable report with exact selection, immutable scope digest, pagination, typed skips/HOLDs and downgraded results. `inventory({offset,limit,country})` returns ordered database rows; existing `runBatch` supplies preview only.

- [x] Write offline tests for country paging, tuple/country drift, duplicate metadata, skip policies/active, honest empty DE, isolated HOLD, READY downgrade, infrastructure stop, read-only HTTP boundary, CLI bounds and execution identity.
- [x] Run `node --test scripts/test-country-league-preview.mjs` and observe RED because the new behavior does not exist.
- [x] Implement the minimal API and main-only workflow with an always-uploaded `country-preview-<run>-<country>` artifact and contents/actions read permissions.
- [x] Run focused new and existing preview tests; inspect output and `git diff --check`.
- [x] Commit frozen implementation. Parent owns full integrated smoke and independent review; do not run database-dependent suite or live systems.

## Execution notes

Ruling: Parent explicitly supplied implementation scope and execution method; proceed without another plan approval. Native worktree creation failed with “not a git repository”; use authorized git fallback at `/tmp/slff-country-preview-20261024`, based on `1d05c29a`.

Verification: initial 13-case suite observed RED with the new module absent, then GREEN. Added real default-runner integration; child HOLD retention and durable CLI guard-failure tests observed RED, then GREEN after fixes. Final focused command: `node --test scripts/test-country-league-preview.mjs scripts/test-vklop-obstojecih-lig.mjs` — 50 passed, 0 failed. `git diff --check` clean. No live source/database calls, workflow dispatches or production writes. Parent owns integrated smoke and independent review.

Ruling: Reuse existing local node_modules via ignored worktree symlink; no dependency installation or package changes. Inventory uses 500-row pages and a conservative 10,000-row ceiling; an exactly full ceiling remains incomplete/HOLD rather than assuming completeness. Offset applies to freshly verified eligible candidates and is not a durable national-catalog cursor.
