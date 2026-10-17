# FCF cached public evidence implementation

Spec: `docs/superpowers/specs/2026-10-18-fcf-cached-evidence-design.md`.

Base: `ffce7d31957aac311069d3175070953202f7f7e0`; isolated worktree `/private/tmp/slff-fcf-wait`, branch `codex/fcf-cached-evidence`. Root retains the user's dirty original checkout and owns all remote operations. User already requested autonomous completion while asleep; no additional approval needed for this read-only source recovery.

## Global constraints

- Export only the seven fixed acta IDs and two exact fixed cache snapshots in the spec; original bytes and provenance, never inferred freshness.
- No provider HTTP, DB/keys, imports, eviction, save/promotion, pricing, activation, outreach or extra agents by workers.
- New script/test/manual-workflow/source-doc only; leave existing parsers, package commands and shared workflows untouched.
- Restore-only cache with cache-hit exactly true AND exact matched-key validation, input-free workflow, read-only permission, finite timeout, bounded allowlisted artifact only.
- Reject symlinks throughout cache/output paths, nonregular or oversized members, unsafe metadata/output; missing members are explicit. Failures retain bounded audit evidence and nonzero status without copying unapproved bytes.
- TDD meaningful filesystem regressions before implementation. No default DB-mutating npm test. Root gates merge on independent task/final review and exact-head CI.

## Task 1

Create `scripts/izvozi-fcf-predpomnjene-dokaze.mjs`, `scripts/test-izvozi-fcf-predpomnjene-dokaze.mjs`, `.github/workflows/fcf-predpomnjeni-dokazi.yml`, and `docs/viri/katalonija-predpomnjeni-dokazi.md`.

1. Read the existing FCF literal cache path and source interfaces, spec and ledger. Write focused real temporary-filesystem tests covering literal byte/hash/mtime preservation, both exact cache associations, missing members, symlink ancestors/targets, nonregular files, size bounds, invalid metadata/cache mismatch, output safety, no cache mutation or unrelated output. Cover CLI fail-closed behavior with a real subprocess. Exercise actual workflow shell/environment wiring for exact-hit, miss, partial-match and restore-error branches. Run RED before product code.
2. Implement the finite helper and metadata manifest. Separate exported validation/copy entrypoint for meaningful filesystem tests from the CLI environment handling. Avoid new dependencies or generic interfaces. Validate the entire selected set before copying; invalid files cannot partly export unrelated cache contents. A failure manifest may describe only fixed selected IDs and sanitized reasons.
3. Write input-free two-job matrix workflow using official restore-only cache action, the exact two keys, Node already on runner (setup-node allowed), no npm install, fixed helper invocation and fresh output. Run the helper even after restore failure and forward restore outcome, cache-hit and matched key via environment, never shell interpolation of arbitrary input. `actions/upload-artifact` always uploads only this output, bounded public files/manifest, retention90days. No secret references and no save action or provider calls.
4. Document invocation, snapshot limitations and explicit missing/invalid outcomes. Run focused tests, syntax/diff and YAML parse; inspect full staged scope; report commands/results, commit. No dispatch/push by implementer.

## Review and integration

Independent task reviewer receives one complete diff/report, spec/global constraints and ledger. Fix findings in batched rounds using original implementer, capped by SDD. Fresh whole-branch final review on the most capable available model before root merges. Root then runs the read-only workflow on merged reviewed main and downloads only its bounded artifacts for offline report analysis. Recovered bytes remain historical until a separate normal authorized refresh proves current state.
