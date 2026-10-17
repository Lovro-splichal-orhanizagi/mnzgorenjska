# Extend bounded Catalonia release waiting

Spec: `docs/superpowers/specs/2026-10-18-catalonia-release-wait-design.md`.
Base: ffce7d31957aac311069d3175070953202f7f7e0. Isolated worktree `/private/tmp/slff-germany-spain-live`, branch `codex/catalonia-release-wait`; completed Südwest SDD archived, original user checkout untouched.

## Global constraints

- Only existing Catalonia workflow, its existing CI-executed test file, and the one exact Catalonia coordinator argv expectation in scripts/test-cakaj-na-uvoze.mjs may change beyond these plan/spec files.
- Fixed wait300/job360, same ES coordinator scope and existing serialization; no bypass, parallelism, global default or ordinary import change.
- All permissions/inputs/concurrency/secret bindings/SHA/helper/artifact/failure semantics unchanged. Failed wait must prevent prepare and activate helper execution.
- No provider HTTP, DB/keys, imports, source/scoring/price changes, activation, Actions/push/deploy/outreach or nested agents by implementer/reviewers. Root alone owns remote operations.
- Meaningful RED/GREEN actual workflow shell tests; no default DB-mutating npm test. Independent task/final reviews and exact-head CI before merge.

## Task 1

1. Read spec, actual workflow/test and existing workflow harness patterns in `scripts/test-osvezi-fcf-predpomnilnik.mjs`. Add focused tests in `scripts/test-vklop-katalonije.mjs` that execute the actual fixed coordinator shell against a recorder stub (not the production coordinator/DB), assert ES+300-minute bounds and timeout360, and demonstrate a coordinator failure prevents a later helper marker for both modes. Run RED before workflow edit. Keep meaningful minimal tests; no prose checks or copying implementation logic.
2. Set only job timeout360 and explicit fixed `--najvec 300` coordinator flag. Update the existing coordinator integration test's exact Catalonia argv expectation to include that finite argument; retain every case and assertion. No other behavior edits. Run GREEN, actual helper tests, YAML parse/syntax/diff checks. Document actual commands/results/RED in ignored report and commit clean. Root owns all source and release operations.
3. Independent task review and fresh whole-branch final review; one batched fix loop if needed. Root gates merge on exact-head CI, queues selected-three prepare after their three older refreshes using reviewed immutable commit, reviews actual manifests, then guarded activation only passing groups. Queue budget never changes a quality/readiness criterion.
