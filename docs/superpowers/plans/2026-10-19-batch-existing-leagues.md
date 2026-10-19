# Batch Existing League Catch-up Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one final branch review.

**Goal:** Catch up multiple inactive existing leagues through one bounded workflow, then use unchanged launch checks to identify and activate passing leagues.

**Architecture:** Extend the existing candidate workflow with an explicit refresh mode. Reuse ordinary schedule/report importers; add an inactive-current-EPS-only missing-report option and honor skip IDs before source reads. Reuse exact existing registry/commit scope, coordinator, cache and native activation. No new exception policy or database migration.

**Tech Stack:** Node 22, existing Supabase transport, GitHub Actions.

**Spec:** User request and implementation description in chat, 19 October 2026.

## Global Constraints

- Original dirty checkout untouched; isolated branch only.
- Refresh only inactive EPS candidates with unchanged registry tuple and no custom policy.
- Exactly selected candidates; maximum five per refresh. Existing apply still checks its selected scope independently.
- No FCF/FUSSBALL/PZPN/HNS requests; no source-policy relaxation, guessed statistics, price overrides or messages.
- Completed reports are skipped; incomplete/null-import reports remain eligible. Existing source pacing/cache/refusal behavior applies.
- Refresh has no activation side effect. Re-read all readiness checks afterwards; source refusal stops remaining same-source refreshes.
- Production league writes only through Actions on reviewed main with exact scope digest.

## Review Focus

- Selection or competition becoming active before refresh: fail before subprocess.
- A parser still fetching skipped IDs: retained real EPS fixtures and request trace.
- Null imported timestamp: remain eligible, never treated as completed.
- Source refusal/timeout/ambiguous child failure: no automatic rerun; retain partial outcome, no activation.
- Workflow refresh run must be recognized by existing coordinator as a writer.

## Tasks

- [x] Write and run failing EPS traversal and missing-import scope tests; implement skip filtering and missing-only flag.
- [x] Write and run failing batch refresh tests; implement bounded sequential normal imports with immutable scope checks and per-league outcomes.
- [x] Wire refresh into existing workflow, cache and coordinator; document commands, add focused CI coverage.
- [ ] Run relevant adapter, activation and coordination tests; one final review and address concrete issues.
- [ ] Merge passing branch, run one five-league refresh, inspect fresh preview, activate only passing selections through existing workflow, verify actual state.

## Execution ledger

Baseline: clean e010bfc6, existing activation tests pass. Read-only inventory confirms 14 EPS candidates with missing reports; source publication remains unverified. Normal nightly imports select active leagues only. EPS currently ignores traversal skip options, causing complete league traversal for a single report repair.

Review: one cheaper-model branch review; fixed schedule exit1/timeout domain-stop and added before/after progress journal. Core focused 29/29. Existing full coordinator suite local result63/65: two unchanged shell-waiter subprocess checks exceeded their10s local deadlines; exact batch/coordinator tests and Ubuntu CI remain required. No source requests or production league mutations during implementation.
