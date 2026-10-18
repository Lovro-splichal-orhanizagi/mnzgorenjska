# Croatian women historical quality rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inactive Croatian women's league using 75 archive and 27 captured current played matches, mark exactly three approved historical reports unavailable, and activate only after strict data, pricing, future-cutoff and production gates pass.

**Architecture:** One versioned registry/classifier and service-only database availability contract shared with DFB; an opt-in HNS phase wrapper and midnight fantasy deadline; immutable offline capture packet; Actions-only guarded release.

**Tech Stack:** Existing Node ESM parsers/CLI and tests, PostgreSQL/Supabase migrations and generated TypeScript types, React/i18n, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-18-hr-women-historical-quality-design.md`

## Global Constraints

- Product implementation begins only after ROOT approves the design. This plan does not resume source collection or authorize production writes.
- Work in a new clean branch/worktree from ROOT's reviewed integrated main, not the dirty user checkout. Rebase after PR387/Spain importer integration; do not copy an old importer over newer work.
- Exactly HNS `114471617`, `114471627`, `114471629` are approved. Import archive container108043476 once; exclude supplemental21 from scope. Do not omit100511758 or fabricate90GKminutes.
- Shared availability fields/primitive/helper belong to HNS owner; DFB owner supplies exact descriptors and DFB bindings; Spain owns its in-flight importer hook.
- No unknown keeper, goal, card clock or substitution minute is silently zeroed. No future exception. Existing pricing270/default4.5 is unchanged.
- Production credentials and writes only in coordinated GitHub Actions jobs. No local service-key use, SSH writes or unreviewed activation.

## Review Focus

Check canonical registry/SQL hash agreement, strict raw-parser preservation, absence versus unavailable semantics across SQL/cache/UI/market, phase collision proof over all75, expiry-safe monotonic cutoff, provider/competition identity isolation and a non-bypassable release gate. Review all three unavailable rows and official scores verbatim against captured receipts.

---

### Task 1: Freeze the reviewed evidence and interfaces

Files: create `scripts/policies/historical-statistics-exclusions.json`, `scripts/lib/historical-statistics-policy.mjs`, `scripts/lib/historical-statistics-policy.test.mjs`; create `scripts/hr-zenske-paket.mjs` and its tests. Keep raw captures out of git.

- [ ] Obtain ROOT design approval; record approved scope and review reference. Verify clean integrated base and coordinate shared importer ownership.
- [ ] Write failing classifier tests: ordinary report unchanged; all three exact rows classify unavailable; SHA/club/date/score/source competition/phase/round mismatch throws; duplicate/unknown policy and future exception throw. Add DFB descriptors only after its owner supplies reviewed exact evidence.
- [ ] Implement `classifyHistoricalStatistics({competition,fixture,rawSha256,policy})` with the exact return union in the spec. Canonical policy hash excludes its own computed hash and uses one deterministic serialization in JS/SQL tooling.
- [ ] Build packet offline from existing receipts; fail missing raw bytes, unexpected supplemental IDs, duplicate sourceIDs, stale/mismatched receipt SHA, unsafe archive paths or policy drift. Preserve capture timestamps. Assert102main/99normal/3unavailable at snapshot.
- [ ] Run the targeted Node tests and offline packet validation. Review generated manifest against `audit.json`, phase receipts and all3raw hashes; commit this independently reviewable boundary.

### Task 2: Implement opt-in phase normalization without changing ordinary HNS

Files: create `scripts/viri/hns-zenske.mjs` and `scripts/viri/hns-zenske.test.mjs`; modify `scripts/viri/index.mjs`; modify `scripts/tekmovanje.mjs` after schema columns land. Reuse existing `hns.mjs` parser, changing it only for an additive phase-provenance extraction seam if needed.

- [ ] Write failing fixtures/tests from captured phase markup for42league+24playoff+9playout. Reproduce the3existing overwrite pairs before applying offsets.
- [ ] Wrapper factory must require provider`hns`, exact new slug and source_policy`hr-hnlz-v1`; all other leagues return the existing provider object. Preserve source_round/source_phase/sourceID.
- [ ] Map published base rounds1–14 unchanged, playoff1–12→15–26, playout1–9→15–23; reject absent/ambiguous/unrecognized membership. Current initial phase remains unchanged.
- [ ] Test all75real source fixture identities,3collision eliminations,75uniqueIDs, no internal(home,away,round) collision,0lost rows, report-round agreement and unknown future phase refusal. Retain100511758published51→52transition.
- [ ] Run HNS parser/provider regression tests plus new tests. Commit provider-only change; document first-phase handover gate.

### Task 3: Add the shared database availability primitive and masks

Files: one new timestamped migration in `supabase/migrations/`; generated DB types at the repository's existing types target; create targeted SQL integration tests following repository conventions. Inspect `20261002120000_statistika_igralcev_v_tabeli.sql` and current view/RPC dependency definitions before selecting replacements.

- [ ] Write failing integration checks for normal/pending/unavailable match states and canonical registry installation. Include refusal on active league, user-owned data, existing individual rows, wrong policy/hash/header or future date; idempotent identical reinstall only before launch.
- [ ] Add nullable competition source/deadline policy columns and match statistics_status/reason; default normal behavior is unchanged. Add service-only migration-pinned registry, `apply_historical_statistics_policy(...)` and `upsert_unavailable_historical_match(...)` signatures from spec. Revoke public writes and registry access.
- [ ] Keep unavailable imported_atNULL and atomically prohibit appearances/goals/points for those exact matches. Scheduled postactivation imports may recognize existing historical markers but cannot expand/mutate their registry. Never delete populated statistics to make an exception fit.
- [ ] Update the actual shared eligible-match relation and all dependent season-stat calculation/cache-refresh, pricing, scoring and market/absence paths. Preserve official-result standings. Ensure direct appearance consumers cannot convert missingness to zero.
- [ ] Test one player with valid+unavailable games: known totals stay known, denominator excludes unavailable, market absence does not penalize, unavailable score isNULL, and valid stats still score. Test public effective status pending when imported_atNULL except historical-unavailable; no service registry leakage.
- [ ] Apply/reset migration in disposable local test DB only, regenerate types, run SQL/typing checks, review dependency diff and commit. DE owner then binds its own guarded RPC to this shared primitive.

### Task 4: Integrate importer and readiness against one classifier

Files: modify `scripts/uvoz-zapisnikov.mjs` **after Spain hook is integrated**; create `scripts/preveri-hr-zenske.mjs` and tests; minimally modify shared readiness support only where needed. Review `scripts/ovrednoti-igralce.mjs` and existing `src/lib/pripravljenost.ts` gates without changing pricing thresholds.

- [ ] Coordinate Spain's prepared/read envelope: both `posamezniZapisnik` and full-stream paths expose verified raw hash plus header/fixture identity before individual derivation. Add one shared classifier invocation boundary, not two divergent exemption paths.
- [ ] Write failing tests that exception replay writes only the exact published header via atomic primitive and does not call individual import/RPC, while normal malformed reports still fail. Test wrong archive dataset, duplicate fixture overwrite and generic CLI bypass refusal.
- [ ] Keep full strict parser/audit for99normal reports. For exceptions, independently verify raw envelope and approved header identity; persist explicit unavailable marker without parsing missing facts as zeros. Expose separate complete/unavailable/pending counts.
- [ ] Dedicated readiness auditor validates75archive, source phase offsets, current played count/delta,3exactmarkers, cache/policy/source hashes, explicitGKs, identity isolation and first-phase handover. It must fail any new incomplete report. Do not loosen existing generic provider audits.
- [ ] Run offline replay over all102captured main reports. Compare99normal output with audited pure data and verify0individual rows for3exceptions. Produce machine-readable signed-by-hash release summary; run existing importer/FCF regression tests preserving Spain's hook; commit.

### Task 5: Display unavailable statistics explicitly

Files: `src/pages/Tekma.tsx`, player/club aggregate consumers that actually expose per-game/season metrics (`Igralec.tsx`, `Igralci.tsx`, `Klub.tsx`, `Lestvica.tsx` as needed), shared query types and relevant existing locale files including `src/i18n/hr/tekme.ts`.

- [ ] Add focused UI tests for unavailable match: official result remains, visible localized historical-quality notice, individual sections show unavailable/dash, no0points/no'notplayed' inference. Pending and complete matches retain existing behavior.
- [ ] Carry effective statistics status and coverage counts through public queries/views; label partial aggregate coverage without exposing private approval/hash metadata. Assist/card labels must not claim verified empty events for unavailable matches.
- [ ] Run typecheck and relevant UI tests; inspect representative complete, pending and unavailable views in the app. Check mobile rendering and all supported locale fallbacks. Commit UI separately; no new visual framework.

### Task 6: Implement the new-league date-only fantasy cutoff

Files: `scripts/razporedi.mjs`, `scripts/uvoz-razporeda.mjs`, their existing/new focused tests and a migration/RPC for the atomic opt-in deadline update if the current API cannot express it.

- [ ] Write failing tests: 2026-10-25Europe/Zagreb→2026-10-24T22:00Z; ordinary winter date; known kickoff offset; mixed round chooses earliest candidate; source kickoff remainsNULL; other leagues preserve existing defaults.
- [ ] Implement only persisted midnight-local-v1 opt-in. Publish a fantasy-cutoff reason/provenance, never a fabricated kickoff.
- [ ] Add DB race tests for locked history, expired-but-unlocked deadline and concurrent updates. Existing deadline must be future and unlocked; updates may only move this opt-in cutoff earlier. Never reopen an expired round by recomputing future source dates.
- [ ] Run schedule/deadline and DB checks; verify all existing active-league behavior unchanged; commit independently.

### Task 7: Add inactive registration and guarded Actions release

Files: new `.github/workflows/uvoz-hr-zenske.yml`, new `scripts/hr-zenske-izdaja.mjs` and tests, one registration/activation migration using repository conventions; minimal guard in `.github/workflows/uvoz-lige.yml`/shared CLI to prevent bypass; update `docs/viri/hrvaska.md` and operator documentation.

- [ ] Define prepare/import/activate modes pinned to reviewed main SHA, exact slug, source+policy+packet hashes and existing league concurrency key. Give secrets only to writer jobs. Dedicated importer accepts an immutable audited packet, not unchecked live cache files.
- [ ] Test draft-release evidence staging verification: correct repo/draft/assetID/archiveSHA, all file hashes, no paths/symlinks/oversize payload, old capture times retained. No source fetch in offline replay. ROOT performs actual authenticated staging after review.
- [ ] Register inactive competition with current114471579, archive108043476, sourcepolicy and dateonlypolicy; verify unique slug and exact identity. Do not use generic default kickoff or firstfantasyR8.
- [ ] If ROOT resumes source collection, fresh schedule/newly completed-report delta uses one schedule refresh plus at most5newly played unseen reports (≤6GETtotal) within original160, no archive duplicates,500msminimum/1spreferred, stop401/403/429/challenge. If more reads are needed, fail preparation and report budget rather than partial success.
- [ ] In Actions import75archive once and current normal reports plus3explicit unavailable markers. Run normal role/position/pricing scripts; do not manufacture positions or prices. Refresh caches, run strictsource+DBreadiness and actual defaultshare≤70/maxprice≥8/2-5-5-3under100max3perclub/≥6clubs gates. Default GK4.5 is allowed;270GKminutes is not a new launch gate.
- [ ] Guarded activation RPC independently rechecks DB gates, installed registry hash/exact3count, inactive/no-userdata state, a strictly future complete fantasy round and unreopened history in one transaction. Failure keeps league inactive; never activate from console recommendations alone.
- [ ] Workflow tests/mock runs verify wrongSHA, missingdelta, unreviewedexception, changedheader, pendingplayedreport, poorprices/roster, stale/expireddeadline and genericimportbypass all refuse. Run repository requiredCI plus focusedregressions; ROOT independently reviews before merge.
- [ ] ROOT coordinates merge/deploy, packet staging, prepare, inactiveimport and guardedactivation in that order. Retain Actions evidence and sourcebudget log, verify public UI after import before activation, delete staging draft after retainedartifact verification. No local production writers.

### Task 8: Close with factual release evidence

Files: private release evidence under ROOT's execution directory; final source/operator docs amended only with verified outcomes.

- [ ] Report expected/complete/unavailable/pending separately, original/fresh capture timestamps, active sourcephase, actual future fantasycutoff, identity/GK checks and real pricing/roster metrics. State exact3historic unavailable IDs visibly.
- [ ] If any gate fails, leave inactive and report smallest factual repair; do not widen exceptions or claim launch-ready. If activation succeeds, verify official results/stat-unavailable views and no player crosscompetition contamination read-only.
- [ ] Document owner/reminder for published current-phase handover before round14 ends and normal strict handling of all future reports. Do not imply a full later-phase schedule was already sourced.

## Binding ROOT builder amendments (2026-10-18)

- Competition keys and both shared RPC p_competition_id arguments are bigint. Approval metadata uses recordedAt plus the actual user-conversation/root-relay reference; recordedAt is the time evidence was recorded, not an invented user approval timestamp.
- Initial exception replay requires the verified immutable packet. Ongoing ingestion validates installed immutable DB policy+source ID+fixture binding and skips exact historical markers BEFORE provider fetch/strict parsing, including single-report entrypoints. All new reports remain strict. Historical source correction requires separate review.
- Database activation guard covers public.vklopi_ligo_sredi_sezone and direct competitions.active changes through preveri_vklop_lige/varovalo_vklopa_lige. Use a private immutable release authorization bound to exact verified quality state; a caller-spoofable GUC is insufficient. Ordinary leagues retain their path.
- Audit actual dependency graph; appearances already exclude nonobservations in several sums. Keep changes minimal. match_assist_status must expose official unavailable results; distinguish sezone played fixtures from complete reports. Prove existing market-window behavior unchanged for these bounded prelaunch exclusions rather than introducing a general absence/pricing model.
