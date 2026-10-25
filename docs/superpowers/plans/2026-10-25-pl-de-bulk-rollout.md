# Poland and Germany bulk rollout implementation

**Goal:** One catalog selection stages many leagues, validates them independently, and automatically activates only complete passing leagues.

**Architecture:** Provider capture/replay modules produce a common source pack; a coordinator owns host budgets, inactive native import, source proof, native readiness, activation and durable receipts. Existing importers and activation RPC remain authoritative. All production mutation stays in Actions.

**Execution:** Inline coordinator implementation with three bounded delegated file sets. User-approved design: `docs/superpowers/specs/2026-10-25-pl-de-bulk-rollout-design.md`.

1. Provider modules: `bulk-poland-source.mjs`, `bulk-germany-source.mjs`, their exact catalogs and captured-byte tests. No live calls during implementation. Separate worktrees and commits.
2. Native proof and adapter: `bulk-native-proof.mjs`, `viri/bulk-captured.mjs`, focused proof tests. Full source-to-native comparison, offline imports, no exclusions.
3. Coordinator: `bulk-league-rollout.mjs`, `bulk-source-packs.mjs`, `bulk-source-budget.mjs`, focused behavior tests. Stage all candidates before writes; isolate semantic failures and host stops; never replay an ambiguous write.
4. Integration: source factory hook, main-only workflow, existing import coordination, CI and npm test inclusion. Add fresh source and deployment documentation.
5. Validation: meaningful RED/GREEN coordinator tests, provider captured-byte tests, installed-contract integration, one independent final review, required CI. Merge/deploy only with evidence. Run a bounded reviewed operational scope after assessing catalog and recorded source budgets; report actual outcomes, not projected league counts.

## Ledger

- Design accepted in chat; isolated parent branch `codex/pl-de-bulk-rollout-20261025` from main `53968463`.
- Provider and native proof tasks delegated with disjoint ownership. Implementation in progress.

- Poland and Germany installed source packs, native proof and lazy offline adapter integrated; original-byte positive tests pass.
- Full installed PL pipeline passes source replay through native activation; altered scorer is held with no activation.
- Coordinator holds semantic failures independently, counts/isolates source refusals, skips active/fantasy-owned leagues and checkpoints ambiguous registration/import/activation as UNKNOWN.
- Independent review fixes: durable registration receipt, propagated native-gate DB failures, closed-directory admission sidecars, complete host-reader pagination, rejected reader reruns and 24h source/1h pricing freshness.
- Final review identified nightly complete-report cache bypass; cache repair in progress before deployment. No source or production database calls have been made for this build.
