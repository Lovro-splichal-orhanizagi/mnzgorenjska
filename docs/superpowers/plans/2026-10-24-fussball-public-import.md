# German public-report import implementation plan

> **For agentic workers:** Use superpowers:executing-plans for root integration; bounded offline audit/implementation may be delegated under the owner's standing preference.

**Goal:** Make verified public FUSSBALL seasons consumable by the native import pipeline without guessing missing facts.

**Architecture:** Extend observed report support, validate complete original-byte captures, normalize into the existing source interface, and reserve exact published identities through a service-only registry before native writes. Existing launch gates remain separate.

**Tech Stack:** Node 22 ESM, node:test, existing HTML/WOFF decoder, PostgreSQL, GitHub Actions; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-24-fussball-public-import-design.md`

## Global Constraints

- No paid feed, private login, access-refusal bypass or local production writes.
- Every advertised round and every played report must be covered, with zero rejections and no sampling, before any native import or identity reservation.
- Original report parser retains `regSt:null` and report-only readiness flags.
- Current captures must be at most 24 hours old; archive evidence is explicitly scoped.
- Numeric source keys occupy [2^52, 2^53−1], persist the original namespace and fail on collision.
- No automatic activation, guessed cards, waived current reports or unrelated historical exclusions.

## Review Focus

- A forged result or accepted subset must not become complete native statistics.
- Same-name people and profile namespace changes must not merge by display text.
- Replaying old or cross-competition evidence must not create current facts.
- Anonymous red cards and used withheld substitutes must remain rejected.
- Public warnings must retain missing-yellow provenance without loosening DFB validation.

### Task 1: Source-bound 46′ support

- [x] Add authentic event/lineup/font proof and a regression that currently fails for a second-half 46′ substitution.
- [x] Preserve 46′, exact identities and period; retain 45′/re-entry/same-clock scorer/source-gap rejection.
- [x] Run focused parser tests and replay retained sample; record changed acceptance reasons.

### Task 2: Verified native batch adapter

**Files:** `scripts/fussball-import.mjs`, `scripts/test-fussball-import.mjs`.

- [x] Test `buildFussballImportBatch(result, scope)` with complete schedule/report fixtures and authentic decoded report oracle; reject samples, omitted/duplicate reports, forged coverage, header mismatches and ambiguous identities.
- [x] Implement normalization, opaque report-to-appearance binding and deterministic full-ID keys; verify every mapped scorer exists in the corresponding appearance set.
- [x] Implement `loadFussballImportCapture(directory, scope)` using full existing offline replay and original-byte fingerprint checks; reject stale current evidence before returning a batch.

### Task 3: Persistent exact identities

**Files:** new migration and `scripts/test-fussball-identities-sql.mjs`.

- [x] Test JS/SQL key agreement, namespace separation, repeat reservation, invalid inputs, collision rollback and anonymous/authenticated denial in a disposable database.
- [x] Implement private mapping and service-only reservation RPC; no guessed aliases or public write grants.

### Task 4: Runtime and missing-card evidence

**Files:** `scripts/viri/fussball-public.mjs`, source registry, two native writer call sites, existing yellow codec and focused tests.

- [x] Test standard schedule/report/appearance hooks, missing capture, scope mismatch, reservation before report release, and forged appearance objects.
- [x] Register per-competition adapter with explicitly supplied writer DB client and capture path.
- [x] Extend yellow evidence for exact FUSSBALL source URLs/IDs and `not-published` reason; preserve all existing DFB negative tests.

### Task 5: Guarded manual import and verification

- [x] Add read-only capture preview CLI and a manual same-repository, successful-main-audit-run admission/import workflow for an existing inactive matching league.
- [x] Document operations and actual remaining data/refresh/activation gates in `docs/viri/nemcija.md`; update schema docs for the private registry.
- [ ] Finish PR/CI/merge within standing authorization. Focused tests, native SQL, smoke, build and independent whole-diff review have passed; final CI remains required.
- [ ] Report deployed importer capability separately from any actually activated league.

## Execution record

- Baseline: 198 FUSSBALL tests passed.
- Authentic 46′ parser regression: RED observed, 117 parser tests GREEN.
- Final focused FUSSBALL suite: 216 pass, one explicit native-DB skip; native identity suite separately 9/9 pass.
- Full source smoke: 1889 pass, 227 explicit guarded skips, zero failures; SSR smoke ends VSE OK. Build passes.
- Independent review approved after fixing missing native club hooks; actual club-map regression observed RED then GREEN. Coordinator tests 47/47.
- Offline replay: 5/11 reports accepted, previously 1/11; no source requests. Original capture remains failed and cannot be imported.
- Ruling: preserve the published second-half 46′ clock, without translating it to45 — both identities and period are explicit in the captured source.
- Ruling: default runtime consumes only complete verified captures; source collection and operational refresh remain separately bounded before the first league activation.
