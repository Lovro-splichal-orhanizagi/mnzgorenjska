# Bounded FCF Queue Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Root owns independent task/final review; this dispatched implementer does not spawn agents.

**Goal:** Allow explicit bounded FCF refreshes to wait for older serialized source work without changing ordinary imports.
**Architecture:** Change only the manual import workflow’s conditional job timeout and coordinator arguments. Exercise its checked-in shell and expressions through the existing isolated workflow harness.
**Tech Stack:** GitHub Actions YAML, Bash, Node.js native test runner.
**Spec:** The Specification section below records the approved `/private/tmp/slff-go-live-evidence/overnight/fcf-wait-brief.md`.

## Specification

Root amended the original brief before implementation: [GitHub-hosted jobs are limited to six hours](https://docs.github.com/en/actions/reference/limits), so the explicit budget is 300 minutes waiting plus 60 minutes work.

- `inputs.fcf_osvezi != ''` gets coordinator `--najvec 300` and job timeout 360 minutes (300 wait + 60 work).
- Empty refresh input retains the coordinator default of 120 minutes and job timeout 180 minutes.
- Inputs enter shell through environment variables; never interpolate GitHub input expressions directly into shell.
- Wait failure must stop cache eviction, schedule/report imports, pricing, readiness and nightly cache promotion.
- Invalid refresh modes still reject before the first data mutation; cancellation never promotes cache.

## Global Constraints

- Preserve serialization, source rate/refusal checks, readiness and cache promotion policy.
- Do not change coordinator global defaults or the older existing nightly workflow.
- Allowed product/test files: `.github/workflows/uvoz-lige.yml` and `scripts/test-osvezi-fcf-predpomnilnik.mjs`; minimal plan documentation only.
- No dependencies, provider HTTP, DB/keys, Actions, outreach, subagents, push, merge or deployment.

## Review Focus

- Explicit refresh must receive exactly the bounded 300-minute wait, while ordinary imports receive no override.
- Conditional timeout must evaluate to 420 for explicit refresh and 180 for empty input.
- Coordinator failure must retain the selected cached report bytes/mtime and prevent all downstream mutations/promotion.
- Existing incompatible refresh combinations remain fail closed before mutation.
- Cancellation and skipped/failed required steps remain unable to promote nightly cache.

### Task 1: Conditional wait and job budgets

**Files:** Modify `.github/workflows/uvoz-lige.yml` and `scripts/test-osvezi-fcf-predpomnilnik.mjs`.
**Interfaces:** Consume existing `FCF_OSVEZI` job environment; emit coordinator argv and job timeout. The harness observes actual argv, evaluated timeout, selected-file state and step ordering.

- [ ] Extend the existing harness to retain actual command argv and evaluate the job timeout; assert explicit argv `scripts/cakaj-na-uvoze.mjs --liga es-ct-elit --najvec 300`, timeout 360; ordinary argv without `--najvec`, timeout 180.
- [ ] Run `node --test scripts/test-osvezi-fcf-predpomnilnik.mjs`; record expected RED for missing explicit budgets before workflow edits.
- [ ] Add the conditional timeout and environment-driven bounded wait flag, retaining ordinary default invocation and failure propagation.
- [ ] Run focused FCF tests plus coordinator tests, YAML parsing and `git diff --check`; review all allowed-file changes. The default `npm test` accesses DB and is prohibited by scope; record this verification limitation.
- [ ] Commit owned changes and return exact HEAD plus ignored report with RED/GREEN commands/results and self-review. Root completes independent review and exact-HEAD CI before rollout.
