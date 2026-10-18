# Reviewed DFB Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse the two reviewed current calendars while retaining strict unknown-anomaly and release refusal.

**Architecture:** One shared calendar validator consumes normalized fixtures and exact, minimal witness evidence. A hash-pinned factual JSON receipt supplies immutable authority; parser and canonical builders share validation while existing release versions reject calendar evidence.

**Tech Stack:** Node ESM, node:test, SHA256; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-dfb-reviewed-calendar.md`

## Global Constraints

- Exact four pairs/eight fixture IDs and 2026/27 scope only; no side rewriting.
- All fixture, round, club and unordered-pair cardinalities retained; two distinct participating witnesses.
- No raw HTML/personal data in new public receipts. Fresh page hashes are capture facts, not timeless pins.
- No SQL/writer policy expansion, historical registry changes, production activity or source GETs.
- Corrected normal pairings use ordinary validation without calendar evidence.

## Review Focus

- Proof-bearing otherwise normal fixtures must not smuggle foreign authority.
- Witness duplication/disagreement cannot masquerade as two participating sources.
- Native IDs and display names must both agree with reviewed fixture identity.
- A corrected pair can become strict while another reviewed pair remains anomalous.
- Calendar support must not bypass current-report/keeper completeness or authorize a release.

### Task 1: Shared receipt validation and parser evidence

**Files:** Create `scripts/viri/dfb-calendar.mjs`, `scripts/viri/dfb-calendar-receipts.json`, `scripts/test-dfb-calendar.mjs`; modify `scripts/viri/dfb.mjs`.

**Interfaces:** `dfbCalendarEvidence(code, fixture, witnesses)` returns a validated minimal version1 proof for a normalized fixture `{id,round,home,away,homeSourceClubId,awaySourceClubId}`; `verifyDfbCalendar({code,teams,rounds,fixtures})` verifies shape and optional per-fixture proof. Witnesses are `{club,url,sha256}`; only anomalous fixtures carry `calendarEvidence`.

- [ ] Add offline tests for exact reviewed pairs, wrong IDs/rounds/native clubs/season, missing/repeated/mismatching witnesses, unknown anomalies, ordinary resolved pairs, missing fixtures, unordered multiplicity and participant collisions. Independently hand-picked fixture identities come from saved receipts, not production helper outputs.
- [ ] Run `node --test scripts/test-dfb-calendar.mjs`; expect missing-support failure before implementation.
- [ ] Implement receipt pinning, shared shape/evidence validator and parser witness collection without changing parsed sides.
- [ ] Run new test plus `scripts/test-dfb.mjs` and `scripts/test-dfb-regije.mjs`; expect pass.

### Task 2: Canonical validation and bounded release refusal

**Files:** Modify `scripts/vklopi-dfb-regijo.mjs`, `scripts/dfb-historical-policy.mjs`, `scripts/test-dfb-calendar.mjs`, `docs/viri/nemcija.md`, `package.json`.

**Interfaces:** Canonical fixtures retain calendarEvidence only when needed; `sestaviSezono` and policy shape verification call `verifyDfbCalendar`. Existing approved manifest versions explicitly refuse calendar evidence; new receipt/module files enter parser source hash.

- [ ] Add red tests for canonical anomaly acceptance, mutated/missing evidence rejection, unchanged canonical statistics, and release refusal even for otherwise fresh complete manifests.
- [ ] Implement shared validation in builder and policy shape; keep Südwest policy scope strict. Reject evidence in existing release approval.
- [ ] Run focused new/parser/canonical/historical JS tests, and zero-network replay of original Nord/West 306-fixture captures; compare accepted reports/canonical arrays against base. Expect no statistical changes and no changed archive refusals.
- [ ] Document limits and register the test in existing DFB/source suites. Review diff, commit coherent changes, deliver evidence and commit without pushing.

Execution is already requested by root; continue inline. Broad source/smoke/database suites are excluded by the task's explicit focused verification scope. Fresh whole-branch review is delegated through the parent to avoid competing worktree writes.
