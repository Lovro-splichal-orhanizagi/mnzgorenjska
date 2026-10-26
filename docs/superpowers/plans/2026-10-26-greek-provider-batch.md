# Greek EPS Provider Batch Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development with disjoint ownership.

**Goal:** Prepare and strictly validate a multi-league EPS cohort in one dispatch, activating only leagues passing unchanged native gates.

**Architecture:** Extend existing provider batch orchestration with an EPS contract and EPS-only budget hook. Current imports use missing-only mode; complete original current/archive pages independently replay into native comparisons.

**Tech Stack:** Node22 ESM, existing Bash/Actions/Postgres native gates.

**Spec:** `docs/superpowers/specs/2026-10-26-greek-provider-batch-design.md`.

## Global constraints

No source calls during implementation, no emails, no secrets, no new waivers, no guessed dates/statistics, no active repricing, no production writes outside Actions. Reuse isolated `/tmp/slff-ro-md-release-20261023b`. Distinct agents own distinct files.

## Review focus

- Unknown/inert/skipped schedule rows and archive ownership must not produce a false complete proof.
- Per-host technical stops and overall UNKNOWN writes must persist across child processes.
- EPS additions cannot relax MLSZ scope or its canonical redirect rules.
- A missing future deadline must remain a native HOLD after successful preparation.
- Source/native snapshot drift after proof prevents activation; cached originals never gain a new capture time.

## Tasks

- [x] EPS proof module, exact catalog and focused real-fixture tests: new `scripts/eps-provider-proof.mjs`, `scripts/test-eps-provider-proof.mjs`, `scripts/policies/eps-batch-candidates.json`. Export EPS_BATCH_MAPPINGS; createEpsContract; produceEpsProof; replayEpsProof; loadEpsPage. Mirror existing MLSZ interfaces; test before implementation. Own only these files.
- [x] EPS request budget and actual child tests: new `scripts/eps-source-budget.mjs`, `scripts/test-eps-source-budget.mjs`. Export createEpsBudgetFetch and readEpsSourceBudget. Persist selected host binding + total cap<=1000 including prior6 diagnostic requests, per-host3s pacing/stops and raw hashes; allow exact DB origin without source counting. First write attempt only; interrupted requests stop the affected host. No other files owned.
- [x] Parent orchestration, workflow, registry and coordinator integration. EPS selector admits<=32 exact catalog tuples; MLSZ remains<=5 same-host. EPS skips archive rewrite, uses --samo-manjkajoce current, requires exact source proof. Every mutation rechecks inactive/no fantasy/custompolicy scope. Add focused red/green regressions and CI/package wiring.
- [ ] One integrated bounded review, meaningful offline/full required CI, merge/deploy, then one recorded source-budgeted Actions batch; retain READY/HOLD/source-stop/readback outcomes and honest counts.

## Verification ledger

- Reused isolated branch `codex/large-cohort-unlock-20261026` from merged main934e4a5e; dirty user checkout untouched.
- Source qualifier: six actual Piraeus GETs retained; three schedules lack official future dates, three past reports now parse completely. No source requests during implementation.
- Final independent review found and resolved two concrete issues: ambiguous native failures cannot use a log regex to continue otherhost writes; duplicate raw dismissal events cannot disappear through adapter deduplication. Both reproductions RED→GREEN and reviewer confirmed fixes.
- Actual EPS child→budget hook→loader regression corrected the copied MLSZ environment guard, counts prior6→7, and rejects legacy-only environment.
- Final focused provider/budget/proof suites247/247; coordinator51/51. Full source suite2484 passed/233 disposableSQL skips/0failures and renderer `VSE OK` with synthetic public configuration. Hosted CI and production batch outcomes remain pending.
