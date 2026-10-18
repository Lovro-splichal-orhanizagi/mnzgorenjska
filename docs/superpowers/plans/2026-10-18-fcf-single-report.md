# FCF single-report implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make existing FCF --zapisnik read only its validated configured target.

**Architecture:** A synchronous optional provider preparation hook validates before writes and returns a reader. The importer prepares it early with competition and real season metadata, then dispatches it instead of full traversal. FCF reuses cache/freshness/temporary transfer guards and ordinary canonical parsing.

**Tech Stack:** Existing Node ESM, node:test/VM network spies, no dependencies.

**Spec:** docs/superpowers/specs/2026-10-18-fcf-single-report-design.md

## Global constraints

- No actual source/DB/Actions, push or merge; parent333 branch remains untouched.
- Validate target/configuration/season before provider reads/writes.
- Full imports, other providers and their options/filter remain unchanged.
- Reuse transport/cache/freshness and actual Calonge source guard.
- Root independent review before remote operations.

## Review focus

- Current registered block must not be replaced by a matching foreign override.
- Cached pages need the same route/group/season checks as fresh pages.
- Changed Calonge raw bytes must not poison accepted cache.
- Importer preflight must run before optional cleanup writes.
- One logical read does not weaken existing underlying retry/stop limits.

### Task1: Optional hook and bounded FCF reader

Modify scripts/viri/fcf.mjs and scripts/uvoz-zapisnikov.mjs; create scripts/test-fcf-single-report.mjs; add source-suite entry and source documentation.

- [x] Add authentic offline network-spy target regression; observe RED against old full traversal.
- [x] Implement synchronous provider preflight + returned target-only reader and early generic importer preparation/dispatch.
- [x] Verify malformed/foreign/out-of-range/season/config errors cause zero requests, target cache/freshness, source refusal/challenge/body drift, full-stream and fallback behavior.
- [x] Execute actual importer preflight/dispatch with external boundaries stubbed; verify its ordering before writes.
- [ ] Run focused/source/smoke checks, retained actual-full-body integration, diff check and isolated commit.
- [x] Save private base/head/log/stat/U10 diff handoff for root independent review.

Execution: isolated follow-up originally on3332634c, rebased ONLY this new patch onto merged main7a7c2ec1. The single package conflict preserved the entire new main suite and added only the target test.52 new tests,193 focused FCF tests and retained seven-full-body integration passed. Full smoke exposed four existing DFB/NCEL VM fragments that now need the importer's two earlier bindings; only those three contexts were supplied, all assertions retained. The74 affected/new tests pass. Final full smoke is running on the immutable review code; its result will be recorded in the external handoff. Root owns independent whole-branch review and all remote operations.
