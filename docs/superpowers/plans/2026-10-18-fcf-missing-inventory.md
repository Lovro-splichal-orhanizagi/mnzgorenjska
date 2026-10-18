# FCF missing target inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline only after root's fresh builder approval. No implementer delegation. Root owns independent review and any eventual source dispatch. This document is a plan, not permission to fetch.

**Goal:** Add an explicitly bounded477-GET maximum inventory stage for exactly G1 then G9, retaining authenticated original bytes and requiring separate offline strict proof before continuation or target composition.

**Architecture:** A fixed hashed parent plan consumes authenticated original-marker seed evidence. A one-attempt sequential collector seals240-body child inventories; separate offline audits and authenticated readers produce evidence for the reviewed target packet. A GitHub-only conservative ES coordinator protects source pacing without DB secrets.

**Tech Stack:** Node22 ESM, built-in fs/crypto/zlib, existing FCF RSC/header/statistics/policy helpers, GitHub Actions artifact metadata and existing bounded ZIP-verification primitives. No new package dependency.

**Spec:** `docs/superpowers/specs/2026-10-18-fcf-missing-inventory-design.md`.

## Global constraints

- Preset exactly `g1-then-g9-missing-v1`; G1/id783/block4109388–4109627/max239; G9/id797/block4118349–4118588/max238; combined477 native attempts, no retry/resume/redistribution.
- No new source authority for old61/41 protocols; markers4109388/4118352/4118358 reuse exact original bytes/receipts/source commit. G2 and Calonge remain held; exact-four cleanup stays separate.
- Actual route/season/group/header-side native club-category/date/round validation happens after raw retention and before the next GET. Inventory is not statistics readiness.
- Any observed new defect/refusal/unknown header/unsafe output latches global stop; preserve sealed earlier child, reject partial later child.
- GET-only exact URLs, manual redirects, honest existing UA,90-second timeout,3000ms×finite factor>=1 after previous completion including child boundary;45-minute shared source window and15-second retention margin.
- Each raw member/prefix<=2MiB; each manifest<=8MiB; expanded child<=192MiB; actual ZIP<=100MiB; reserve worst-case next-body/overhead before fetching.
- No source CLI/workflow dispatch in implementation/tests, DB credentials/access/writer, cache restore/save, normal importer, prices, activation, email, migration180400 or other-country behavior change.
- Capture manifest schema1/kind`fcf-missing-target-inventory`; plan kind`fcf-missing-inventory-plan`; separate offline audit kind`fcf-missing-inventory-offline-audit`. No arbitrary protocol substitution.

## Review Focus

- A late G9 refusal must preserve independently authenticated G1 proof while preventing any additional GET, retry or partial G9 admission (Tasks2–4).
- Seed upload age/commit must never replace genuine original capture age/commit, and a local manifest is not an authenticated Actions artifact (Tasks1,3).
- Coordinator source-only mode must not touch Supabase and must remain bidirectional with normal ES readers/writers, including already queued work (Task4).
- Chunked oversize/refusal/timeout/write failure must leave honest bounded receipts without either dropping the stop latch or claiming full-body hashes (Task2).
- Freshly captured headers can hide bad normal stats; mandatory offline audit and later age/known-imported checks must preserve current strictness (Tasks3,5).

---

## File map and dependencies

Create `scripts/fcf-missing-inventory-plan.mjs` for fixed scope, original pins, seed/plan validation and pure header/calendar inventory validation; `scripts/fcf-missing-inventory-capture.mjs` for attempt/byte retention and bounded one-attempt transport; `scripts/fcf-missing-inventory-evidence.mjs` for authenticated ZIP readers, strict offline audit and target bridge; `scripts/fcf-inventory-source-coordination.mjs` for the no-DB Actions-only wait path. Add one corresponding `scripts/test-*.mjs` per module plus `scripts/test-fcf-missing-inventory-workflow.mjs`.

Modify `scripts/cakaj-na-uvoze.mjs` only for early source-only delegation and bidirectional enumeration/crossing; `.github/workflows/uvoz-fcf-zgodovina.yml` only for explicit new mode/sequential jobs; `scripts/dfb-artifacts.mjs` only for a separate fixed inventory ZIP kind if needed by the new reader; `scripts/fcf-target-evidence.mjs` only for an explicit new composition input branch once root's target checkpoint is integrated. Register tests in `package.json`/relevant existing CI source checks and document the actual new stage in `docs/viri/spanija.md`. Do not edit another author's worktree or port unmerged implementations ad hoc. Root must first reconcile the approved target-packet checkpoint; this plan is based on main e9192fc9, which does not contain that implementation.

### Task1: Fixed parent plan, genuine seed binding and header-only closure

**Files:** Create `scripts/fcf-missing-inventory-plan.mjs`, `scripts/test-fcf-missing-inventory-plan.mjs`.

**Interfaces:**

- `readFcfMissingInventorySeed({zipBytes,artifact,run,jobs,expected,now}) -> SeedEvidence`: authenticates explicit actual retention artifact; rehashes three exact originals and original receipt-manifest; preserves sourceCaptureCommit versus retentionCommit. `expected` supplies actual seed artifact/run/attempt/job/commit/digest/originalManifestSHA and policy hashes. No network.
- `buildFcfMissingInventoryPlan({sourceCommit,seedEvidence,policyHashes,now}) -> MissingInventoryPlan`; `validateFcfMissingInventoryPlan({plan,expectedPlanSha256,now}) -> ordered child descriptors`: exact wire fields/values/hashing from spec; absent seed yields error before transport exists.
- `deriveFcfInventoryHeader({targetSlug,id,bytes}) -> InventoryHeader`: exact route/header/side identity and known status/date validation, no individual parser. InventoryHeader fields `id,targetSlug,round,playedOn,kickoff,status,homeGoals,awayGoals,home,away`; side fields `sourceClubId,sourceCategoryId,name,href`.
- `validateFcfInventoryHeaders({targetSlug,headers,complete}) -> HeaderCalendar`: incremental contradictions always fail; complete=true additionally requires240/30/8/16/directed-pair closure.

- [ ] Write failing tests asserting child fetch lengths239/238, parent477, exact source blocks and marker exclusion; SHA changes for any target/policy/seed/execution pin mutation; no user-provided round for a fetch; no G2/budget input/unknown property/invalid plan hash.
- [ ] Add seed tests for each spec SHA/length/original timestamp, wrong upload/capture-commit substitution, absent original manifest, invalid exact marker classification, expired/foreign artifact and metadata that only says verifiedtrue. Synthetic artifact metadata remains explicitly test-only.
- [ ] Add raw header tests for wrong/conflicting embedded route, old season/foreign group, missing/conflicting header-side links, club17, repeated club/round or directed pair, native name drift; assert actual reordered rounds are preserved and240/30/8/16 closure succeeds only on a complete test calendar. Header test bodies are labeled synthetic, never production provenance.
- [ ] Run `node --test scripts/test-fcf-missing-inventory-plan.mjs` and confirm intended missing-module/assertion failures.
- [ ] Implement the named pure interfaces using existing RSC/header/policy helpers; no request-capable import side effects. Keep individual statistics out of InventoryHeader.
- [ ] Run the same focused test command; require all pass; commit only this unit.

### Task2: Durable byte-first capture and stop semantics

**Files:** Create `scripts/fcf-missing-inventory-capture.mjs`, `scripts/test-fcf-missing-inventory-capture.mjs`.

**Consumes:** Task1 validated child/plan/header validators.

**Produces:** `collectFcfMissingInventoryChild({plan,targetSlug,seedEvidence,execution,batchState,root,request,pause,clock}) -> ChildCaptureResult`. `request(url,init)` is injected native fetch in offline tests; production wrapper is the sole native boundary. `batchState` carries immutable parentSHA/window start/prior child actual count/last completed attempt/stop state authenticated from retained G1 when G9 begins. Child result contains `status,evidenceReady,manifestSHA,actualSourceGETs,firstSourceUTC,lastCompletedUTC,stopReason`; no canonical statistics. Separate `sealFcfMissingInventoryChild({root,plan,targetSlug,execution})` rehashes exact members and exposes only owned complete/failed diagnostic output for upload.

- [ ] Write failing fake-external-fetch/clock/filesystem tests for exact239/238 attempts; first pause and>=3000ms after completion; global477 boundary; cross-child timing; invalid factor; expired45-minute source window;90-second timeout/15-second retention reserve; no GET from malformed plans/unsafe preexisting or symlink output.
- [ ] Add tests proving attempt receipt precedes native fetch and full bounded bytes/receipt precede the header parser. On malformed header/challenge/invalidUTF8/BOM/empty response retain original bytes but fail. On401/403/429/3xx/5xx/network/timeout assert no second call and stop propagates into the other child even if body drain/cancel fails.
- [ ] Add chunk-reuse, stream-failure and>2MiB tests: prefix is bounded, prefixSHA separate, full rawSHA absent, body-complete time null. Add per-child expanded/compressed reserve limits, write/fsync/rehash/upload failure and exact successful241-member inventory versus complete failed diagnostic tests. No averages or timestamp relabeling.
- [ ] Run `node --test scripts/test-fcf-missing-inventory-capture.mjs`; confirm intended failure; implement named interfaces with owned exclusive files, durable attempt/receipt recording, bounded raw streams and one native request per ID. Do not wrap `fcfFetch` or generic retry transport.
- [ ] Run Task1/Task2 tests together; require all pass; commit capture unit.

### Task3: Authenticated replay, separate offline audit and failed-parent isolation

**Files:** Create `scripts/fcf-missing-inventory-evidence.mjs`, `scripts/test-fcf-missing-inventory-evidence.mjs`. Modify `scripts/dfb-artifacts.mjs` with separately named fixed inventory member/bounds handling only if sharing its extractor; retain older kinds byte-equivalent.

**Consumes:** Task1 seed/plan/header proof; Task2 retained exact ZIP/manifest/receipts; existing strict `parseFcfCurrentAuditDocument`, exact historical classifier, `validateFcfCurrentReleaseCalendar` and target document proof.

**Produces:** Spec interfaces `readFcfMissingInventoryArtifact(...) -> MissingInventoryProof`, `auditFcfMissingInventoryOffline(...) -> OfflineInventoryAudit`, `readFcfMissingInventoryAuditArtifact(...) -> AuditedInventoryProof`. MissingInventoryProof contains byte-preserving documents/receipts/header closure/authenticated lineage and never implies stats success. Audit uses actual source time, original marker provenance and protocol identity unchanged. Strict audit does not read DB or source. Audit artifact is a bounded single `manifest.json` with exact source artifact/hash/policy/execution binding; no mutable canonical claims accepted.

- [ ] Write failing actual-ZIP tests for duplicate/traversal/symlink/foreign members, size/decompression limits, original/normal body mutation, missing/extra descriptor, wrong ordered attempts, fabricated timestamps, expired artifact, wrong commit/ref/workflow/job/attempt/required-step and forged success booleans. Expect strict inventory rejection before any normal-statistics parsing.
- [ ] Add genuine retained Calonge overlap regression through strict offline audit as a labeled negative fixture; no G2 inventory can be built. Add complete-looking header/normal keeper-gap/overlap, unknown goal event, missing XI, source-warning and old marker reclassification tests; inventory can seal but audit fails without network. Synthetic pass fixtures cannot be reported as real source proof.
- [ ] Add failed-parent tests: successful exact G1 job and all its required steps plus later G9 failure and a successful authenticated parent receipt retains G1 admissibility; G1 capture/upload/audit job failure cannot emit AuditedInventoryProof; missing/foreign later-failure receipt cannot justify parent failure. Reject all partial G9 packets. Older artifact kinds still require their unchanged successful run semantics.
- [ ] Run `node --test scripts/test-fcf-missing-inventory-evidence.mjs scripts/test-fcf-history-artifact.mjs`; confirm new failures before implementation.
- [ ] Implement exact reader/audit interfaces without network clients; pin source/inventory workflows and exact step names from the spec; independently rebuild audit from raw. A successful child is authenticated independently of later target outcome.
- [ ] Run Task1–3 suites and existing artifact/source-proof/current-release tests; require all pass; commit this unit.

### Task4: No-DB ES coordination and explicit sequential Actions stage

**Files:** Create `scripts/fcf-inventory-source-coordination.mjs`, `scripts/test-fcf-inventory-source-coordination.mjs`, `scripts/test-fcf-missing-inventory-workflow.mjs`. Modify `scripts/cakaj-na-uvoze.mjs`, `.github/workflows/uvoz-fcf-zgodovina.yml`, `scripts/test-cakaj-na-uvoze.mjs`.

**Interfaces:** `waitForFcfInventorySourceSlot({execution,listRuns,listJobs,pause,clock,maximumWaitMinutes:300}) -> SourceSlotReceipt` is GitHub-only and fail-closed; test callbacks are fake authenticated metadata, not HTTP. SourceSlotReceipt binds run/attempt/commit, observed earlier run ordering and clearance time; source stage revalidates expected execution, not caller success. `--fcf-inventory-source-only --drzava ES` branches before Supabase client creation or DB reads; other args refuse this mode.

- [ ] Write failing coordinator tests for queued and running older ES/manual/public/badge/nightly jobs, same-timestamp runId ordering, later work waiting on history missing-inventory, cache-export source-free classification, conservative unknown/manual-other-country waits, API error/incomplete pagination/missing jobs, max300min, no Supabase constructor/DB lookup and unchanged existing modes. Use paginated run/job fixtures, never live Actions queries in tests.
- [ ] Add static/behavior workflow tests for explicit mode/preset only; exact main+planSHA+seed authentication before source; G1 then G9 needs-success; inventory upload before offline audit; reauthenticated upload bytes; required fixed step names; always() diagnostic parent receipt; exact uploaded child IDs/digests; G1 independent preservation if G9 fails. Assert no DB secret/Supabase/cache-save/importer, no dispatch/retry/resume/budget selector, checkout credentialsfalse and scoped token.
- [ ] Run new coordinator/workflow plus existing coordinator tests to observe intended new failures.
- [ ] Implement source-only coordinator and bidirectional registration. Preserve current normal coordination semantics; unknown metadata holds. Integrate explicit workflow jobs with360min wall/300min wait/45min shared source window, quota239/238 and fixed477 parent. G9 imports/authenticates G1 receipt/audit and latches previous failure. Authenticate independently actual artifact IDs/digests; no circular manifest-ID invention.
- [ ] Implement parent receipt generation with actual successes/failures/skipped children and total attempts. It reports diagnostic failure honestly; it never admits a partial child. Do not run the workflow. Missing authenticated seed transport remains a pre-GET hold requiring root staging, not an implementation fallback.
- [ ] Run Task1–4 tests plus existing coordinator/cache-export suites; require all pass; commit workflow/coordinator unit.

### Task5: Explicit bridge to target evidence, regression and execution handoff

**Files:** Extend `scripts/fcf-missing-inventory-evidence.mjs` and its tests; modify the integrated `scripts/fcf-target-evidence.mjs` and target evidence tests only through an explicit new inventory composition branch; `package.json`, relevant source-test list in `.github/workflows/ci.yml`, `docs/viri/spanija.md`.

**Interface:** `composeFcfCapturedTargetEvidence({inventoryProof,auditProof,targetSlug,now}) -> TargetEvidence`. Consume only matching authenticated full child+offline audit. Reproduce exact240 current documents with true capture/original lineage, run unchanged age/R6/known-imported strict checks at target composition, and feed the reviewed target compiler without ever using old cache/audit kind labels. The target reader may add this explicit workflow/protocol branch; old lineage/protocol validation must not become permissive. TargetEvidence remains the target checkpoint's exact shape; root integration resolves that implementation before this task.

- [ ] Write failing bridge tests for same-source-IDs/different hash/artifact, marker/source-time mutation, captured-as-cache substitution, protocol-v1/v2 downgrade, G2 request, expired pendingR6, known-imported report becoming pending, stale complete evidence and extra/missing target document. Assert zero source requests on every replay failure.
- [ ] Add end-to-end offline workflow simulation with fake native fetch and actual test ZIPs: G1 complete/audit pass/G9 refusal =>477 never exceeded, G1 retained and G9 rejected; G1 hidden stats defect => no G9 call; success => each target independently feeds exact240 proof and still requires separate all-four cleanup/fresh DB inventory before release compilation.
- [ ] Run new failures, implement the explicit bridge, and register/document all new tests/stage. Document that the old61/41 path remains blocked by absent caches and that this stage proves no activation, previous-season archive, prices or legal15.
- [ ] Run `node --test scripts/test-fcf-missing-inventory-*.mjs scripts/test-fcf-inventory-source-coordination.mjs scripts/test-cakaj-na-uvoze.mjs scripts/test-fcf-history-artifact.mjs scripts/test-fcf-final-audit-plan.mjs scripts/test-fcf-history-cache-proof.mjs scripts/test-fcf-current-source-proof.mjs scripts/test-fcf-historical-release.mjs` plus integrated target-evidence/target-packet suites using their actual names. Then run `npm run test:sources` if its current script remains offline and `git diff --check`. Never run default DB-mutating npm test or source/writer workflows.
- [ ] Commit and hand root the exact commit/diff/test results for independent code review; stop before dispatch. Root must stage/authenticate the real seed, compile/review exact parent SHA on actual main, verify older coordinator jobs have drained, and make the explicit bounded execution decision. Evidence whose actual metadata/bytes are unavailable is reported missing, never synthesized.

## Plan self-review

Spec-to-task coverage: fixed quota/seed/headers Task1; native accounting/retention/limits/stop Task2; authentication/partial rejection/offline strictness/child isolation Task3; source coordination/Actions parent lifecycle Task4; current-only target bridge/age/regressions Task5. All five Review Focus conditions have owning adversarial tests. Input/output names and protocol kinds are shared above; no task extends the old61/41 compiler. No code, source GET, DB access, workflow dispatch or default npm test belongs to this documentation checkpoint.
