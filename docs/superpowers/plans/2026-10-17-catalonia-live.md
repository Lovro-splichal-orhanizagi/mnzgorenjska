# Catalonia Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate every already-imported eligible Catalan group whose complete production data passes guarded readiness.
**Architecture:** New narrow Actions-only two-phase activation using existing state/readiness/pagination helpers and existing service RPC. A stable approval manifest binds validated state; the existing import coordinator serializes ES writes. No schema/scoring/source/pricing change.
**Tech Stack:** Node ES modules, existing Supabase client/RPC, GitHub Actions.
**Spec:** `docs/superpowers/specs/2026-10-17-catalonia-live-design.md`

## Global Constraints

- Exactly 27 configured FCF upper groups; ES/source fcf/current season; Quarta, FAS, and Novanet excluded.
- User confirmed FCF permission received on 2026-10-17; record this truth in the existing Spain docs. No outreach.
- No SQL/RPC/schema/scoring/source-parser/price/position changes, production keys outside Actions, or retroactive fantasy.
- All readiness/source-quality/pagination/deadline checks are mandatory; source-pending games remain pending.
- The existing RPC performs the only mutation, after approved SHA and current-state guards and import coordination.

## Review Focus

- Pagination must not truncate appearances at 1000 or lose goals/matches.
- A correct goal total with the wrong beneficiary, starter/keeper counts, unresolved warning, or overdue match must block.
- Prices/stats/deadline changed after approval must refuse activation.
- The future first fantasy round must be unplayed and future, including RPC early-played-future-round semantics.
- The new activation workflow must participate in both sides of ES import coordination; no quiet concurrent-write window.

### Task 1: Guarded Catalan activation operation

**Files:** Create `scripts/vklopi-katalonijo.mjs`, `scripts/test-vklop-katalonije.mjs`, and `.github/workflows/vklop-katalonije.yml`. Modify `scripts/cakaj-na-uvoze.mjs` and its existing coordination tests, `.github/workflows/ci.yml` activation test step, and `docs/viri/spanija.md` permission/status/procedure. Modify `package.json` only when the Bayern writer has finished. Reuse `src/lib/pripravljenost.ts` and `scripts/strani.mjs`.

**Interfaces:** Export pure quality/manifest functions for tests; CLI prepare defaults to reviewable per-league and batch artifacts without writes; activate requires approved SHA and repository Actions credentials; use the existing RPC `vklopi_ligo_sredi_sezone` and typed readback. Concrete helper names may follow existing style.

- [ ] Write meaningful RED tests covering a real-shaped valid league and all Review Focus failure cases.
- [ ] Implement a complete paginated snapshot, strict quality + existing roster readiness, stable manifest/SHA, Actions-only write flag, and post-RPC verification.
- [ ] Add workflow with default prepare and artifact, SHA approval for activation, fixed ES batch concurrency/older-import coordination. Register family and test both directions.
- [ ] Run focused GREEN, source/coordinator covering tests, and typecheck/build/smoke as needed; negative cases must not call the mutating RPC. Commit and report.
- [ ] Complete independent task/final review and full CI before merge/deploy.

### Task 2: Production rollout

**Files:** No product changes expected; exact Actions artifacts and local operation ledger.

**Interfaces:** Prepare/activate workflow, approved SHA/state/readback, public competitions.

- [ ] Run actual read-only prepare for eligible groups; inspect per-league quality, counts, legal roster, and future first-fantasy deadline.
- [ ] Review the exact manifest hash for each passing candidate; activate with the same checked source commit and SHA. Block stale or changed state and reprepare if necessary with a new review.
- [ ] Verify active flags, unchanged prices/positions, future first fantasy round, public/ES, and nightly ES inclusion. No household teams, outreach, or unrelated mutation.

Self-review: All spec guards are owned by Task 1 tests; Task 2 uses only existing reviewed interfaces. Snapshot/approval hash and coordinators were reviewed together with the workflow; no handwritten readiness algorithm duplication. The user already instructs execution/deployment, and permission is confirmed; no additional approval flow.
