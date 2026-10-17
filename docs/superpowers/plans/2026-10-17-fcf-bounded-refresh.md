# Bounded FCF Refresh Implementation Plan

**Goal:** Refresh only proven corrected report pages for inactive upper FCF groups, retain ordinary source/activation gates, and hand the authentic refreshed cache to the scheduled importer.
**Spec:** `docs/superpowers/specs/2026-10-17-fcf-bounded-refresh-design.md`
**Architecture:** One narrow helper invoked by existing coordinated `uvoz-lige.yml`, with optional report-id input and success-only ES nightly cache publication. No new source traversal or database writer.

## Review focus

- Entire input/competition/filesystem validation precedes the first selected-cache removal; no path or symlink escape.
- Selected deletion leaves all other source bytes and mtimes untouched; source refusal/rate checks remain unchanged.
- Existing ES writer coordination precedes cache/import operations; actual workflow paths are tested.
- Explicit refresh restores latest ES nightly/country cache before any per-league fallback, avoiding stale whole-directory promotion. Ordinary restore behavior stays unchanged.
- Promotion is main-only, explicit-refresh-only and success-only, uses the exact nightly cache family, and preserves authentic source file mtimes.
- DFB source fingerprint and every active league data/price state remain outside this change.

### Task 1: Guarded helper and workflow

Files: add `scripts/osvezi-fcf-predpomnilnik.mjs` and focused tests; modify `.github/workflows/uvoz-lige.yml`, standalone CI test step, and existing Spain source documentation.

- [ ] Write meaningful RED tests for stale selected cache and every Review Focus negative case.
- [ ] Implement Actions-only target validation and safe complete-prevalidated selected-cache deletion with reviewable audit artifact.
- [ ] Wire optional bounded input after wait/restore/league validation and before ordinary import; reject incompatible modes before source mutation. Add success/main/explicit-only cache publication and artifact upload.
- [ ] Run focused GREEN and affected coordination/workflow tests, YAML parse, diff check and type/build/smoke as appropriate. Commit and report. Independent task review plus final whole-branch review and same-HEAD CI before merge/deploy.

### Task 2: Verified rollout

- [ ] After checked code lands, run targeted normal imports on main for inactive Elit/G4/G17 with only proven corrected report ids. Preserve existing active 20 groups.
- [ ] Re-read complete data and prepare selected eligible groups with the existing activation workflow; inspect new exact SHA and current future-round/readiness evidence.
- [ ] Activate only passing candidates with same checkout/list/SHA, full readback and public verification. Hold irreducible conflicts or incomplete data.

User authorization already includes implementation, reviewed merge/deploy, source refresh and verified activation; no additional permission or outreach is needed.
