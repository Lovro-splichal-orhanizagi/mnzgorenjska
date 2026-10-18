# Source-closed G1/G9 FCF Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans after root-owned builder approval, task by task. No implementer delegation. Root owns independent review and integration; stop at each requested checkpoint. This document is a plan, not execution authorization.

**Goal:** Import and conditionally activate exact G1/G9 current-only targets through authenticated new-inventory admission, atomic existing all-four cleanup and a strict per-target same-transaction SQL gate.

**Architecture:** Preserve v1/v2 packet semantics and implement a separate new-inventory-only rollout wrapper, native-ID offline provider/import path and exact Actions receipt chain. Reuse existing all-four cleanup and ordinary inactive positions/pricing. Separate immutable cleanup history from selected-target current readiness so G1 users never invalidate later G9.

**Tech Stack:** Node22 ESM, node:test, existing artifact ZIP verifier/Supabase transport, PostgreSQL disposable rehearsal, GitHub Actions; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-18-fcf-v2-rollout-design.md`.

## Global Constraints

- Writer target allowlist is exactly `es-ct-segona-g1`/783 and `es-ct-tercera-g9`/797. G2 stays source HOLD; no fifth exclusion or G2 normal parsing/launch.
- Use reviewed inventory Task5 branded admission only. Keep all legacy/cache/audit execution closed; no source GET, broad fallback, archive invention, timestamp relabel or caller verified flag.
- Existing all-three schema1 and target schema2 stay unchanged. Add schema1/kind`fcf-current-target-rollout` wrapper only; raw text/SHA checks precede JSON parsing.
- Exactly four genuine originals, opaque SQL beforeImageText/SHA,126 appearances/14 goals and existing migration180200 atomic zero-user cleanup remain immutable. Do not rerun cleanup after activation/activity.
- Only selected target inactive/zero-user after cleanup. All-three fresh inventory checks source/calendar/policy identity; non-target prices/readiness/users neither authorize nor block target launch.
- Preserve normal official-GK plus labeled standard field-position estimates/community pipeline and actual existing pricer. Ban invented source GK roles/minutes/goals/identity and ad-hoc squad-forcing changes.
- Reserve migration `20261018210200_fcf_current_target_release.sql` after reviewed actual main and DE210000/HNS210100. Root owns generated types/current schema/integration. No include-all, old-migration edits, G13/catalog weakening or dirty user checkout edits.
- Actions-only production writes; workflow defaults unchanged. This assignment is design only: no implementation, source/DB/network/dispatch/production actions.

## Review Focus

1. Authentic parent but missing/refused child, wrong attempt or already consumed claim must fail before any DB call; sequential G1→G9 admission follows reviewed Task5 rules rather than a guessed retry policy.
2. Same-name/shirt players, renamed native clubs, anonymous/conflicting identities and same-date transfers must not create silent incorrect bindings; real native anchors decide or HOLD.
3. A successful first target with users must not force cleanup again or reject second-target readiness; all4 markers/original backup identity remain mandatory.
4. A complete-looking DB with duplicated/missing events, stale cache rows, repricing partial writes or a raced position/price/deadline must fail full canonical/recomputed-vector comparison under locks.
5. Source-closed code must remain closed with Request objects, dotted DNS, redirect, dirty cache, child-process environment loss and unknown methods; a committed-but-unretained SQL result must not be falsely reported or rerun.

## Files and responsibilities

- Create `scripts/fcf-target-rollout.mjs`: exact wrapper/replay, capability composition, native import plan and Actions-only stage orchestration; split CLI entrypoint into `scripts/uvozi-fcf-cilj.mjs` to keep imports side-effect free.
- Create `scripts/fcf-target-offline.mjs`: closed provider and Node preloader, source transport refusal, original packet loading; no source cache/network collection.
- Create `scripts/fcf-target-rollout-evidence.mjs`: authenticated all4-original stage and import/price/check/activation/recovery artifact readers; reuse existing immutable cleanup reader.
- Create `scripts/fcf-target-readiness.mjs`: fresh paginated DB snapshot, canonical/cache comparison, recorded position provenance, full pricing replay/witness wrapper; no implicit write.
- Modify `scripts/ovrednoti-igralce.mjs` only to extract the unchanged calculation into `scripts/lib/player-pricing.mjs` for read-only replay, with existing CLI behavior preserved. Coordinate shared-file ownership with root before edits. Existing role helpers remain normal, no match-role repair.
- Create the single reserved210200 SQL migration and focused Node/SQL tests: `scripts/test-fcf-target-rollout.mjs`, `scripts/test-fcf-target-offline.mjs`, `scripts/test-fcf-target-rollout-evidence.mjs`, `scripts/test-fcf-target-readiness.mjs`, `scripts/test-fcf-target-sql.mjs`.
- Modify `.github/workflows/uvoz-fcf-zgodovina.yml` only after the offline/SQL checkpoints are green, and `package.json` to register focused tests. Root owns types and integration. Inventory Task5 remains separately owned; do not port its unmerged code.

### Task1: Seal reviewed Task5 admission and source-closed provider

**Consumes:** final reviewed Task5 reader-issued target extraction and lifecycle contract; `readFcfCleanupEvidence`; `compileFcfTargetReleasePacket`/`verifyFcfTargetReleasePacket`; fresh explicit read-only inventory. **Produces:** `buildFcfTargetImportPlan(...) -> ImportPlan`, `loadFcfTargetOfflineProvider(...) -> ClosedProvider`, `fcfOfflineFetch(documents,network) -> fetch`, exact rollout wrapper/replay. Signatures/fields/bounds are in the spec; no production transport yet.

- [ ] Before code, root resolves builder items1–4 and provides approved Task5 commit/API. Record actual claim/consumption scope/retry/sequential rules in this spec; unsupported admission throws before transport. Do not invent a compatibility adapter.
- [ ] Write failing tests `only branded new inventory admits`, `legacy v1/v2 seam cannot select execution`, `copied proof fails`, `terminal parent cannot replace final receipt or offline audit`, `refused child fails`, `G1 claim cannot execute G9`, and `G1 then G9 uses distinct reviewed admission`. Assert zero transport calls on refusal and no G2 normal body access.
- [ ] Run `node --test scripts/test-fcf-target-rollout.mjs scripts/test-fcf-target-offline.mjs`; observe RED for missing interfaces.
- [ ] Implement exact wrapper/replay and capability composition using Task5's actual exports. Preserve raw timestamps/lineage and exact target packet text. Provider returns only strict source-derived selected-target schedule/reports/canonicals. Add preloader/cache refusal; all FCF network routes except exact packet GET are errors, database transport remains usable with redirect refusal.
- [ ] Add and pass dotted-DNS/subdomain/Request/method/query/hash/port/credential/redirect/unpacketized/cache/child-loader-loss tests; prove no source call even with a network spy. Run unchanged v1/v2/strict-parser/Task5 regressions plus these tests, report private skips and commit this offline-only boundary. Root independently reviews before native writer work.

### Task2: Genuine all-four staging and existing cleanup Actions adapter

**Consumes:** exact four retained originals/descriptors/receipts, expected actual artifact identities, existing prepare/apply RPC contracts, Task1 import-plan offline pass. **Produces:** `readFcfCleanupOriginalsArtifact({zipBytes,metadata,expected,now}) -> OriginalsProof`; Actions adapter modes `cleanup-originals`, `cleanup-prepare`, `cleanup-apply`; existing `readFcfCleanupEvidence` output. This checkpoint uses fake transport/disposable DB only, no actual dispatch.

- [ ] Write failing tests `all4 originals differ from3 inventory seeds`, `G2 original mandatory for G1`, `SQL numeric8.10 text preserved`, `prepare not apply`, `apply wrong prepare digest fails`, and `commit then retention failure does not reapply`. Pin exact workflow/job/step/artifact/member names from the spec and existing reader.
- [ ] Run `node --test scripts/test-fcf-target-rollout-evidence.mjs`; observe RED. Implement staging/reader and small RPC adapter using exact opaque SQL TEXT/SHA; never JSON-reserialize it. No source refetch and no relaxed marker upsert.
- [ ] Rehearse prepare/apply against owned disposable DB seeded with the actual full backup shape: exact126/14/four outcome, rollback on any preimage drift/user/vote/protected dependency, unchanged unrelated rows, same commit linkage across distinct runs, all4 marker readback. Confirm current schema/catalog expectations with root; no empty-FK bypass.
- [ ] Pass new evidence and unchanged cleanup46 checks; prove non-target activity after apply does not re-enter cleanup adapter. Commit reader/adapter (workflow entry modes still unexposed until Task7), obtain independent review. Missing real originals/staging artifact remains HOLD.

### Task3: Strict native identity planning and atomic selected-target import SQL

**Consumes:** Task1 closed import plan/v2 canonicals, Task2 applied cleanup proof, current actual schema after DE210000/HNS210100. **Produces:** private210200 schema/native binding/receipt tables and service-only `import_fcf_current_target(p_rollout_text,p_sha256)`, plus import CLI adapter. Target remains inactive. Root owns generated types.

- [ ] Write failing native-map tests: `16 native club category tuples bind full240 fixture sides`, `name only cannot bind`, `shirt collision cannot merge`, `same native reg transfers by actual date`, `same date conflicting club holds`, `duplicate or anonymous native identity holds`, `known import never pending`, `G2/foreign rows never mutate`.
- [ ] Run `node --test scripts/test-fcf-target-rollout.mjs scripts/test-fcf-target-sql.mjs`; observe RED for missing mapping/RPC. Implement native fixture anchors, exact registration mapping and private persistent16 bindings. Reject ambiguity before insert/update; preserve privacy and existing IDs. No generic importer permissive flag.
- [ ] Implement one atomic target import using temp expected tables and documented lock order/READ COMMITTED. Validate applied cleanup/all4 installed markers and selected inactivity/zero-user/protected dependencies; materialize only current target canonical rows; preserve unavailable markers and official results. Recompute project score/statistics caches and validate exact canonical/derived equality before commit. Store inventory claim/target/state receipt without activating.
- [ ] Test every appearance/goal field, duplicate multiplicity/null actor/native ID, starter/substitute interval/GK gap/overlap, own-goal scoring, pending/unavailable zero rows, removed/extra cache row, changed fixture/round/native club and out-of-scope mutation. Include forced failure midway and prove full rollback. Unknown nonempty **and empty** FK/dependent columns fail without G13 guard weakening.
- [ ] Pass focused native/SQL tests and existing parser/cleanup/common-policy regressions. Check PUBLIC/anon/authenticated denial, private-helper service_role denial, valid service-only import, SEARCH_PATH spoof refusal and no public bypass. Commit and independently review before price/activation work.

### Task4: Ordinary position/pricing pipeline and full readiness replay

**Consumes:** imported inactive target, existing role helpers, unchanged current pricer, current DB `stanje_lige`/`najcenejsi_kader`. **Produces:** `readFcfTargetReadinessSnapshot({targetSlug,dbTransport,now})`, `buildFcfTargetReadiness({importPlan,snapshot,sourceCommit,now}) -> readiness` and updated exact rollout wrapper. Pricing snapshot includes all normal model dependencies and full actual vector, not aggregate flags.

- [ ] Write failing tests `official GK role cannot be inferred from legal15`, `standard labeled field estimate allowed`, `community/admin protected`, `match roles unchanged by position helper`, `no-ad-hoc squad position repair`, `partial page/write rejected`, `full actual price vector recomputed`, `locked/prior model input bound`, and `price average alone cannot pass`.
- [ ] Run `node --test scripts/test-fcf-target-readiness.mjs`; observe RED. Extract unchanged pricing calculation as pure `computePlayerPrices({players,statistics,competition,priorInputs})` in the new library; existing CLI consumes it with byte-equivalent outputs for default, early-season threshold, ties,0.5 rounding, ceilings, locked values, value_start and valid higher-league priors. Preserve unrelated CLI modes.
- [ ] Run documented inactive position helpers then current full season2026/27 pricing. Read all actual rows with pagination, independently recompute expected complete vector from actual stats/positions/model dependencies, compare persisted fields, record position provenance and exact input hash. No active override, archive source calls or pricing model changes. Helper failure or zero computation holds.
- [ ] Validate actual16-club pool/source starting keepers/default share≤0.7/maxprice≥8/finite values and actual legal15 witness2/5/5/3,max3club,≤100. Test affordable-but-illegal, legal-but-unaffordable, arbitrary positions to force legality, duplicate player/foreign club/inactive member and stale derived statistics. Pass focused pricing/position regressions once and commit for independent review.

### Task5: Locked target gate, genuine future R6 and private authorization

**Consumes:**210200 native import state, complete readiness wrapper, Task5/cleanup receipt identities, actual project canonical/cache/pricing state. **Produces:** service-only `check_fcf_current_target(p_rollout_text,p_sha256,p_activate default false)` and private immutable activation receipt. No workflow exposure yet.

- [ ] Write failing SQL tests `full multiset and caches exact`, `all4 marker identities but no non-target normal proof`, `G1 users allow later G9`, `selected target user/house/vote/deleted-vote/protected reference holds`, `raced price/position/dependency changes snapshot hash`, `R6 not R7`, `expired or locked R6 holds`, `missing/source-stale kickoff holds`.
- [ ] Run focused SQL tests and observe RED. Implement exact closed wrapper and nested v2 text/SHA validation, new-inventory-only admission fields, target allowlist and full native/canonical/current source checks from spec. Validate selected zero-user surface, all4 markers/policies, actual derived caches and full pricing input/vector equality under deterministic locks and READ COMMITTED. Reconstruct actual legal15 witness and verify every member/price.
- [ ] Compute min actual R6 kickoff in Europe/Madrid minus six hours; enforce8 pending fixtures/day2026-10-24/unlocked future stored deadline and policy/competition round6 binding. Re-run capture-age rules against actual clock_timestamp at gate/activation; no date-only fallback or source request. Hold source/report mismatch or postlaunch missingness without a new exception.
- [ ] Configure allowed inactive deadline before authorization. In activation branch re-run full validation, invoke common private `authorize_release` with exact policy/targetPacket SHA, update active and read back future deadline/receipt within same transaction; no intervening mutation. Dry-run cannot authorize. Persist receipt only on committed success.
- [ ] Test repeatable-read/serializable refusal; two-session phantom fantasy/team/vote insert, stats/price/deadline change, competing activation and protected cross-target mutation; timeout/deadlock fails safely without partial activation. Test direct service update/generic RPC/GUC/private-helper ACL bypasses fail and same-XID/state authorization succeeds only for reviewed route. Commit after focused disposable DB suite green and root review of actual schema/type impact.

### Task6: Authenticated stage receipts and Actions-only CLI

**Consumes:** all reviewed prior APIs/RPCs and actual authenticated metadata transport. **Produces:** side-effect-free `importApprovedFcfTarget({inputs,expected,mode},{dbTransport,runChild,clock})`; dedicated executable CLI; pure stage/recovery readers. Modes and exact successful step/artifact names come from the spec. Each record uses its own expected run/attempt/commit.

- [ ] Write failing tests `wrong repository/ref/current checkout rejects`, `wrong stage job/step/attempt/digest rejects`, `separate linked dispatches accepted`, `import needs applied cleanup`, `price needs actual imported receipt`, `activate reruns gate not old preflight`, `copied artifact flag fails`, and `new main cannot relabel cleanup original commit`.
- [ ] Run Node stage/evidence tests; observe RED. Implement exact chain authentication, source-closed child invocation, fresh target rereads, private DB receipt binding/readback and bounded artifact serialization with no secrets. Require actual Task5 consumption lifecycle; no automatic retry/target loop/claim minting. Missing prior artifact is HOLD.
- [ ] Model commit-then-response-loss and upload failure for import/cleanup/activation. Require explicit authenticated readback-only recovery record tied to private SQL receipt/actual state; no reapply/second activation or automatic rollback. Refused/skipped/partial job can retain diagnostics but cannot issue success capability. Confirm fake transport and real reader adversarial tests pass; commit and independently review.

### Task7: Workflow exposure and complete disposable rehearsal

**Consumes:** independently green offline/native/cleanup/price/SQL/CLI checkpoints and root's integrated current main. **Produces:** explicit modes in existing history workflow, source-test registration, reviewable operational runbook and exact-head rehearsal evidence. No actual dispatch in implementation task without root instruction.

- [ ] Write workflow contract tests preserving current default/cache-export/inventory modes, fixed permission scope/pinned runtime, exact main checkout, service secret placement, target choice G1/G9 only, no include-all/source/cache restore/save/legacy seam, fixed cleanup names and one non-cancelling FCF writer concurrency group.
- [ ] Run tests to observe RED, then expose explicit cleanup-originals/prepare/apply and target-import/price/check/activate modes. Modes operate one target and explicit expected identities; no changed default or new permission question. Persist credentials false; readback/retention uses exact spec job/step/protocol constants.
- [ ] Rehearse full chain in disposable database with actual current schema: source replay→all4 preparation/atomic cleanup→G1 import/ordinary positions/prices/check/activation→add normal G1 user activity→fresh G9 inventory/import/prices/check/activation. Verify G1 data/users unchanged and G2 normal source hold unparsed/unactivated; inject failure at each boundary and inspect honest diagnostics/rollback. Do not manufacture real-source success from synthetic fixtures.
- [ ] Run focused affected Node/SQL/workflow suites, unchanged v1/v2/parser/common/cleanup/pricing regressions and syntax/diff checks once. Register tests; root runs full CI/type generation/integration with DE/HNS/shop changes. Preserve exact-head logs and report any private fixture skips/source holds clearly.
- [ ] Commit coherent final implementation with all defaults/protocol versions preserved. Send root exact commits/tests/spec/runbook/remaining HOLDs for independent review and future explicit Actions execution sequencing; FINAL. No source or production operation is part of completing this plan.

## Dependency and execution ledger

This design checkpoint changes only these two Markdown documents. Inventory Task5, actual successful477 capture/final receipt/admission, real all4 original staging, prepare/apply artifacts, final main schema, SQL210200 and writer jobs are prerequisites or future work, not verified outcomes. Old target cache/audit Task3 remains deferred/closed. Root reviews builder items and then assigns bounded implementation; no source work is smuggled into a readiness refresh.

Self-review mapping: capability/source closure→Task1; all4 lifecycle→Task2; authentic native identity/atomic canonical import→Task3; ordinary positions/full actual pricing/legal15→Task4; locks/ACL/races/future R6/common authorization→Task5; metadata/retention/recovery→Task6; unchanged workflow defaults/sequential rehearsal/integration→Task7. Every Review Focus class has named tests in its owning task. Proposed interfaces are explicit; the separately owned Task5 admission signature/lifecycle is the sole intentionally blocked interface and must be settled before Task1 code.
