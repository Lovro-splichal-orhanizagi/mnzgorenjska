# FCF target packet and authenticated evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline after root's fresh builder-review approval. No delegation by implementer. Independent reviewer is root-owned. Stop after each coherent reviewed checkpoint when root requests a review seat.

**Goal:** Build independently verifiable one-group current-only packets while preserving atomic exact-four cleanup evidence and the existing all-three protocol.

**Architecture:** Add new v2 target compiler and separate authenticated offline evidence readers. Reuse strict native document/calendar proof without loosening it. Separate immutable shared cleanup history from fresh target inventory so sequential target launches remain possible.

**Tech Stack:** Node ESM, built-in crypto/fs tests, existing ZIP verifier/unzip and FCF/common policy helpers; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-18-fcf-target-release-packet-design.md`.

## Global constraints

- Target hard allowlist: G1/id783/block4109388–4109627, G2/id790/block4116188–4116427, G9/id797/block4118349–4118588, using full exact repository slugs.
- Existing v1 all-three packet semantics remain unchanged. New manifest uses schemaVersion2/kind`fcf-current-target-release`; target scope is exactly240 documents/30 rounds/16 clubs.
- Four historical originals4109388/4116215/4118352/4118358 and opaque exact SQL before-image text/SHA always remain bound to the shared cleanup. No fifth exception or subset cleanup.
- Every complete normal source needs continuous exactly-one explicit keeper over0–90, native player IDs and strict canonical appearances/goals. Actual Calonge89 overlap holds G2; ordinary75/75 correction remains intact.
- All-three fresh read-only inventory remains recorded, but after verified cleanup only the target must be inactive/complete/ready; prior non-target activation or user activity cannot require rerunning cleanup.
- No source/network calls, no cache/DB/prod writes, no workflow mode changes or migration180400. No dirty user checkout/DE/HNS180300 changes.

## Review Focus

1. A valid G1/G9 target with actual defective Calonge bytes supplied as non-target bait must pass without parsing or claiming G2 normal readiness; a G2 target with those exact bytes must hold.
2. Deleting either G2/G9 historical original from shared cleanup evidence must fail even for a G1 target; target isolation must not relax exact-four cleanup.
3. A valid second-target proof after first-target activation must accept non-target active/user/readiness changes without accepting the selected target active or stale source/inventory.
4. Authentic ZIP bytes with wrong attempt/step/commit, symlinks, duplicate paths or contradictory manifest membership must fail before source proof; caller `verified:true` must confer no authority.
5. Changed SQL numeric formatting or rehashed canonical packets must fail exact-text/hash replay; all-three/v2 cross-protocol attempts must fail.

## Files and responsibilities

- Create `scripts/fcf-target-release.mjs`: target-only pure compiler/replay, scoped fresh-inventory rules and shared cleanup binding validation.
- Create `scripts/fcf-target-evidence.mjs`: authenticated offline cache/audit/cleanup readers and exact document composition.
- Create `scripts/fcf-target-test-fixture.mjs`: focused synthetic target/metadata/ZIP controls; optional real four originals/Calonge integration.
- Create `scripts/test-fcf-target-release.mjs` and `scripts/test-fcf-target-evidence.mjs`: behavior/adversarial tests.
- Modify `scripts/dfb-artifacts.mjs` only for distinct bounded FCF target-audit and cleanup ZIP kinds; preserve current DFB/FCF-history protocols.
- Modify `package.json` only to register the new focused source tests. No workflow/migration/provider changes are planned. Reuse existing exported strict helpers.

### Task1: Shared exact-four cleanup evidence reader

**Consumes:** actual ZIP Buffer, GitHub artifact/run/jobs metadata, explicit expected run/attempt/commit/artifact ID/digest and exact four original documents. **Produces:** `readFcfCleanupEvidence({prepareZipBytes,prepareMetadata,appliedZipBytes,appliedMetadata,expected,originals,now}) -> CleanupEvidence`, with immutable phase derived from validated artifacts, exact opaque backup text/SHA and all-four classified descriptors/receipts.

- [x] Write tests `cleanup evidence binds all four originals for any target`, `cleanup preserves SQL8.10 exact text`, `prepared/applied artifact binds same before SHA and policies`, and `fake applied phase cannot relax prepared inactivity`. Assert deleting4116215 fails, altered raw SHA/timestamp fails, exact prepared bytes pass, and applied receipt requires result126/14/four markers plus exact prepare artifact binding.
- [x] Run `node --test scripts/test-fcf-target-evidence.mjs`; observe RED for absent reader/protocols.
- [x] Add the two distinct bounded cleanup ZIP kinds using the spec's exact members/names/bounds; validate all required successful workflow/job/step/attempt identities within each artifact's own explicitly expected run (prepare/apply may be distinct linked dispatch runs) and migration180200 backup field/target/policy identities. Use existing classifier and installed-marker verifier. Never reserialize `before-image.json`.
- [x] Verify tests include digest/size drift, duplicate/symlink/path traversal/unknown member, missing backup array, foreign main/policy/target row and altered genuine receipt. Run new evidence tests plus existing FCF artifact tests; require zero failures and report private skips explicitly.
- [x] Commit the independently testable cleanup-evidence boundary. This commit adds no writer and proves no actual cleanup has occurred.

### Task2: Versioned single-target packet compiler and replay

**Consumes:** Task1 `CleanupEvidence`; one authenticated/composed `targetEvidence` with exactly240 descriptors; fresh all-three inventory under the existing read-only contract; strict helpers `proveFcfCurrentReleaseDocument` and `validateFcfCurrentReleaseCalendar`. **Produces:** `compileFcfTargetReleasePacket({targetSlug,sourceCommit,targetEvidence,cleanupEvidence,databaseInventory,now})` and `verifyFcfTargetReleasePacket({...sameInputs,manifestText,manifestSha256,now})`, returning exact `{manifestText,manifestSha256}`.

- [ ] Write `valid G1 ignores defective non-target Calonge`, `valid G9 remains independent of G2 hold`, `G2 actual Calonge target rejects`, `second target accepts already active non-target after applied cleanup`, and `target itself active still rejects`. Use supplied non-target body/proof traps that throw on access; assert no successful G2 current coverage appears in a G1/G9 manifest. Public controls use synthetic defects; private originals pin real Calonge/raw markers when enabled.
- [ ] Run `node --test scripts/test-fcf-target-release.mjs`; observe RED. Existing v1 packet tests remain unmodified and passing.
- [ ] Implement the distinct v2 compiler/replay and exact manifest key set. Validate full native target calendar/keepers/canonicals, target marker count1/1/2, target imported-ID preservation, source age/original receipt types,8MiB manifest bound and fresh all-three source identity inventory. Prepared phase checks all-three inactive/null policy; applied phase checks target inactivity and reviewed policies without non-target readiness predicates.
- [ ] Add adversarial tests for absent/foreign/multiple target, missing/duplicate/foreign raw body, wrong actual4116314 round, no-fifth-exception, GK gap/overlap, missing marker, fresh-capture/mtime relabel, stale/future audit/inventory, foreign all-three source identity, known target import becoming pending, and exact-text tampering even after outer rehash. Replay must reject v1 as v2 and v2 as v1.
- [ ] Run new packet and existing v1/parser/policy tests, with private genuine originals when available; require zero failures. Commit and obtain root-owned independent review before proceeding to importer/SQL work.

### Task3: Authenticated target cache/audit readers and composition

**Consumes:** actual authenticated ZIP bytes and GitHub metadata from existing transport; Task1 cleanup evidence; explicit expected fixed cache key or immutable one-target audit plan with the spec's exact v2 wire shape and expected plan SHA. **Produces:**
- `readFcfTargetCacheArtifact({targetSlug,zipBytes,artifact,run,jobs,expected,now}) -> TargetCacheProof`.
- `readFcfTargetAuditArtifact({targetSlug,zipBytes,artifact,run,jobs,expected,plan,now}) -> TargetAuditProof`.
- `composeFcfTargetEvidence({targetSlug,cacheProof,auditProof,cleanupEvidence,plan,now}) -> TargetEvidence` with exactly240 immutable raw descriptors for Task2.

- [ ] Write tests `target cache requires all240 target bodies but permits honest non-target missing entries`, `G2 normal parse trap is never read for G1 cache proof`, `all actual found ZIP members still bind hashes`, `failed/refused audit remains diagnostic`, and `composition replaces only planned target IDs`. Assert forged `verified:true` without ZIP/run/step proof fails; source timestamp/cache mtime types are preserved.
- [ ] Run evidence tests and observe RED for missing readers/composer. Existing cache/export/three-group plan/retention tests stay unchanged.
- [ ] Implement existing exact cache-export authentication with target-only header parsing, full fixed720 descriptor/member structural checks, original mtimes and exact240 target bodies. Add distinct bounded target-audit ZIP kind and validator for the spec's closed plan wire shape (no builder); validate reserved v2 one-target protocol, exact ordered attempts/captures, raw hashes/times and stored canonical equality by independent strict parsing. Keep existing v1 collector/retention unchanged.
- [ ] Implement exact composition from approved child plan: captures only for fetch IDs, cache only for reuse IDs, explicit pinned target markers from shared cleanup originals, no extra ID/fallback/age reset. Reject incomplete/stale/unplanned/source-defective normal data. Use no network client in these modules.
- [ ] Exercise wrong ZIP digest/size/member/duplicate/symlink, wrong run/attempt/job/step/ref/commit, fallback cache key, unknown audit plan/protocol, missing attempted ID/body, raw/canonical drift, stale original age, and R6 becoming played/closed/unknown kickoff. Run all new and affected artifact/cache/plan/retention/packet tests; commit after zero failures.

### Task4: Close and hand off the offline boundary

**Consumes:** Tasks1–3 and root's builder/code review requirements. **Produces:** a reviewable, test-registered offline checkpoint with no new execution capability.

- [ ] Register the two new tests in `test:sources` and ensure ordinary CI has meaningful always-on synthetic normal/defect/metadata/ZIP/lifecycle coverage; private fixture skips must be named, not silently treated as actual-source readiness.
- [ ] Run the combined changed/affected suite once with genuine four originals/Calonge enabled; run ordinary CI configuration separately to expose all private skips. Run syntax/diff checks and preserve exact-head logs. Do not repeat unchanged full suites without a new concern; root owns full CI.
- [ ] Confirm v1 all-three schema/semantics and original raw fixtures/capture timestamps unchanged; workflow remains cache-export only; no provider/SQL/DE/HNS/user-checkout changes. Record exact limitations: actual source inventory availability, authenticated real prepare/apply/audit artifacts, import, prices, legal15, deadline and activation are not proved by fixtures.
- [ ] Commit final registration/evidence; send root/reviewer exact SHAs, spec/plan paths, logs and remaining source holds; FINAL to free the review seat. Do not start180400/importer/source CLI until root-owned review approves this boundary.

## Deferred executable work

A new target audit plan builder/collector must be separately specified/reviewed after real authenticated target cached-body inventory exists. Future G1+G9 batch can bind exactly two independent child plans with cumulative at most41 GETs and per-target19/22. The first refusal stops all new batch requests, including the other target, while preserving any child already sealed before the refusal; no automatic continuation/redispatch is allowed. Missing/stale evidence holds without broad61-GET fallback. All three reviewed cache candidates currently lack G1/G9 target240 proof (720/719/720 missing, only Calonge present in the middle candidate), so this refresh stage cannot currently be built or executed; a separate bounded new-source-inventory capture design is needed if root finds no genuine retained bodies. No such source stage is implemented here. Later offline importer must deny all unpacketized FCF (including dotted DNS/unknown methods), then separate private SQL180400 must check each selected target under locks and require the already-completed exact-four cleanup before authorizing release in the same transaction.

## Self-review record

Spec coverage maps to Tasks1 shared cleanup/lifecycle,2 target proof/isolation/replay,3 authenticated raw closure,4 regression/limits. All five Review Focus cases have named tests above. Interfaces and manifest kind/version are consistent. Builder clarification: run/attempt equality is per artifact, not across prepare/apply/audit dispatches; source refusal stops the whole future batch while preserving already sealed child evidence. No product code, dependency install, source request or production mutation belongs to this design-only checkpoint. Fresh builder review and root approval remain the next action.


## Task1 execution ledger

- Builder green at72feba9d (`rollout/spain/target-packet-design-review.md`), then author merged reviewed origin/main e9192fc9 as c4dfe7c7. Only package test-order conflict; kept main's order. No user checkout changes.
- Implemented only shared cleanup reader/ZIP contracts/test factory. No target packet/cache/audit composition, source collector/CLI, workflow or SQL stage added.
- Reader requires actual ZIP bytes, exact expected IDs/digests and successful main run/job/step/attempt metadata per artifact. All4 historical original bodies/descriptors/receipts and complete migration180200 backup field set bind to opaque SQL TEXT/SHA. Separate apply run links prepare identity/commit and exact126/14/four-marker result. Output is frozen and reader-issued (copying verified/phase flags is not a proof).
- Reserved artifact protocols are synthetic test fixtures; no real successful cleanup artifact or current DB readiness is claimed. Zero-user locks and complete actual DB preimage equality remain the existing SQL authority at later execution.
- New cleanup ZIP kinds do not widen existing capture/replay/FCF-history names or bounds. Existing DFB artifact identity/extraction checks2/2 passed; FCF legacy artifact and exact-policy regressions included in focused verification.
- Source-test registration moved into this checkpoint so CI covers the new reader immediately; Task4 will add the later target packet test when it exists.
- Missing target240 raw-cache proof remains an explicit source hold. No federation source request, DB/prod/cache write, email, workflow/180400/HNS/ordinary-provider edit.
- Final Task1 verification: new reader plus affected legacy FCF archive/policy tests **100/100 passed,zero skipped** with the genuine four originals enabled; ordinary CI reader configuration **22 passed,7 explicit private-original skips**,zero failures. Shared existing DFB artifact identity/extraction controls **2/2 passed**. Syntax/diff checks passed. Logs retained under rollout/spain/target-cleanup-reader-final-{focused,ci}.log and target-cleanup-reader-shared-artifact.log.
