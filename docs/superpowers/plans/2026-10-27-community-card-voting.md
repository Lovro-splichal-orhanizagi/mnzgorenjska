# Community card voting implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent source, database and UI tasks. Root integrates the native path and reviews the complete feature. Continuous execution is authorized by the user's 'ok sure go'; do not repeat approval questions.

**Goal:** Implement league-specific recipient voting and verified correction of real FUSSBALL card events, including pending red-card reports.
**Architecture:** Immutable source envelope plus recipient-only community overlay. Database consensus queues closed raw replay; only an atomic verified native write confirms recipients and scoring.
**Tech stack:** Node22 ESM, PostgreSQL/Supabase, React/TypeScript, existing voting and source-proof infrastructure.
**Spec:** `docs/superpowers/specs/2026-10-27-community-card-voting-design.md`.

## Constraints

- Shared RPC/envelope names and digest formulas are in the spec.
- Default strict importer and every non-opted-in league remain unchanged.
- No source requests, photos, private identity reconstruction or production writes from this workstation.
- Votes never fabricate90-minute appearances; pending individual data is unavailable.
- Respect existing user restrictions, anonymization and confirmed assist preservation.

## Review focus

1. Changed source bytes/roster or concurrent vote invalidates an in-flight apply.
2. Wrong-side/unused/private/foreign player cannot become a recipient or appearance.
3. Second-yellow and red/substitution conflicts cannot become confirmed statistics.
4. Pending reports never silently become zero stats or final round results.
5. Ordinary/nightly/bulk replay and initial launch use the same explicit policy.

### Task1: Source evidence, overlay and typed pending report

Owner: source worker. Files: `scripts/viri/fussball*.mjs`, `scripts/fussball-season.mjs`,
`scripts/fussball-capture-evidence.mjs`, `scripts/fussball-import.mjs`, new focused
source module/tests/fixtures as needed. Do not edit root-owned native factories,
bulk rollout, source pilot/workflows, policy JSON or SQL/UI.

- [x] Write failing genuine anonymous-card envelope/replay tests; cover both validator layers, byte/recipient tampering and unrelated profile errors.
- [x] Implement exact shared envelope builder and opt-in `cardPolicy` propagation/replay.
- [x] Export `replayFussballCardEnvelope(envelope, resolutions)` returning one full native `{id,url,z,nastopi}` report only after all strict checks.
- [x] Pending source results/batches include `pendingReports`, `cardEnvelopes`, and all candidate identities; complete source coverage accounts separately for pending. Complete reports can carry their `cardEnvelope` for yellow voting.
- [x] Run focused tests and all FUSSBALL tests; report exact exports/changes for root integration.

### Task2: Native voting, pending status, apply and launch scope

Owner: database worker. Files: one new migration plus focused SQL/disposable tests.
Read latest existing voting and pending/activation functions before modifying.

- [x] Write meaningful failing RLS/consensus/fixture/revision/atomic rollback tests using explicit disposable database only.
- [x] Implement all five RPCs from the spec, private evidence/votes, candidate mapping and exact per-league settings/policy opt-in.
- [x] Add distinct pending_cards availability handling, safe public NULL projections, score removal and shared finalization/pricing guards for unresolved red matches.
- [x] Add narrow FUSSBALL community launch policy hooks; do not relax ordinary provider or historical-exclusion gates.
- [x] Validate complete appearance/goal input keys before existing atomic replacement, preserve assists, atomically recompute and confirm.
- [x] Test restricted users, cross-league insiders, foreign candidates, changed evidence, duplicate votes, concurrent consensus/apply, source replacement and rollback.

### Task3: Match-page voting UI and per-league controls

Owner: UI worker. Files: new card voting component, `src/pages/Tekma.tsx`, match
types/translations, admin per-league controls and focused render/behavior checks.

- [x] Add failing UI behavior tests for safe RPC projection, identity/profile link errors, pending/queued/confirmed and auth/restriction failures.
- [x] Use `match_fussball_card_votes` and `vote_fussball_card` exact RPCs. Load by actual match, not menu league. No public voter IDs, raw source IDs, photos or implementation details.
- [x] Show card time/type/team and exact public historical candidates with shirts and vote counts. Label red-pending statistics unavailable, and community attribution distinctly from the source.
- [x] Expose per-league threshold and enable setting through authorized admin controls; default disabled. Support German, English, Slovenian and established fallback conventions across locales.
- [x] Run type/render and relevant UI checks; no unrelated layout redesign.

### Task4: Native/worker and source-pack integration

Owner: root. Files: source factories, `scripts/uvoz-zapisnikov.mjs`, new retained
replay worker/helper and workflow, bulk source/native proof/transport/rollout,
nightly/pilot/paired loaders, policy JSON, docs and integration tests.

- [x] Add tests proving pending typed reports stage official fixture/candidates without appearances; genuine parser errors still prevent admission.
- [x] Register envelopes after exact fixture/player identity mapping; complete yellow reports retain established verified statistics, red pending reports do not.
- [x] Add bounded service-only retained replay worker (no source reads); SQL apply receipt must be atomic and match revision/consensus.
- [x] Enable only Baden's reviewed candidate for community cards, bind capture/pair/ordinary/nightly/bulk to exact opt-in flag and native policy settings.
- [x] Extend native proof/activation only for exactly registered pending-card reports and preserve all existing keeper/price/affordability/deadline/cache/readback gates.
- [x] Add source-free integration tests for an unresolved red, invalid consensus, valid correction, repeated import and competing source update.

### Task5: Review, deploy and verify

- [ ] Run meaningful source, database, type/build/render and clean-runner checks for the final feature.
- [x] Independent review of complete source/native/RLS/scoring path; fix load-bearing findings and recheck only changed scope.
- [ ] Merge/deploy through Actions with immutable reviewed SHA. Verify migration/served commit and source-free card workflow operation.
- [ ] Report what is implemented/deployed and any remaining league-data holds. No new collection run until this feature is verified; retained incomplete evidence never becomes full admission.

## Execution ledger

- Recon complete: existing assist threshold3 and same-league insider trust; old card voting absent.
- Isolated branch `codex/community-card-voting-20261027`, base4486fc21. Source count961/5000.
- User's approved voting behavior is the execution authority; implementation interfaces are recorded above to avoid repeated design questions.

- Implementation complete and independently reviewed. Four concrete findings fixed: pending archive staging, original-revision fingerprinting, pre-apply pending clearance, and distinct same-minute assist restoration.
- Local FUSSBALL suite: 391 passed, 4 explicit disposable/private skips; bulk suite: 91/91. Existing DFB importer regression: 26/26; final focused review runtime/import/context: 21/21. Worker: 8/8; coordination: 59/59 including real shell waiters.
- All 389 baseline migrations plus feature applied in an owned no-network/no-port database. Expanded native/RLS/atomic/concurrency fixtures: 4/4. Genuine retained report → real SQL votes → invalid second yellow HOLD → valid APPLIED → repeated import UNCHANGED: 1/1.
- Type/build passed (493 modules); app/server smoke passed. Card UI: 12 checks, pending round UI: 3 checks, cumulative points regression passed. Only dummy localhost API settings were used.
- Broader source run initially exposed two VM harness imports (fixed, targeted 26/26) and a real-shell coordination timeout under concurrent load (unchanged timeout passed complete focused run). Final GitHub CI must run on the frozen commit before merge/deployment.
- No new source requests, photos, outreach or league activations in implementation; budget remains 961/5000. Baden's failed partial capture remains inadmissible.
