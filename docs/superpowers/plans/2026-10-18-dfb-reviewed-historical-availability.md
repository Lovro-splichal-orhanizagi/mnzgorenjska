# DFB reviewed historical availability implementation plan

> **For agentic workers:** Use superpowers:executing-plans after root approves the design and shared contract. No exemption code before that gate.

**Goal:** Make Südwest eligible for a truthful304-verified-plus2-unavailable archive release while preserving complete current/postlaunch statistics and all other release gates.

**Architecture:** One shared HNS-owned registry/classifier/schema/UI contract, with a DFB-owned exact provider adapter and explicit manifest/RPC version3. Existing strict parser and v1/v2 remain unchanged. All production writes stay in Actions.

**Tech Stack:** Node22 ESM, JSON policy/manifests, PostgreSQL service-only RPC, existing GitHub Actions.

**Spec:** docs/superpowers/specs/2026-10-18-dfb-reviewed-historical-availability-design.md

## Ownership and global constraints

- HNS owner: shared registry/helper/schema/service primitives/views/scoring/cache/UI/i18n/types. Germany supplies two descriptors and must not edit these shared files concurrently.
- DFB owner: only provider adapter, source/replay proof closure, regional release/offline import, DFB-specific RPC migration and tests/docs/workflow deltas. HNS/Spain retain common importer/provider-factory ownership; DFB supplies its prepared/read envelope and exact opt-in tuple.
- Initial policy only Südwest2025/26 source2402929/2403004, original captured raw hashes. No current/future/other-league automatic extension.
- Unknown statistics are null/unavailable, no synthesized report/appearance/goal/zero points. Known official results stay observed facts.
- Keep source freshness, keeper proof, verified-history pricing, future deadline, authorization/locking and v1/v2 strict behavior.

## Review focus

- A false policy success must not masquerade as strict complete coverage or refreshed capture time.
- Importers/caches must not skip other invalid reports when skipping exact classified exceptions.
- UI/statistical aggregates must distinguish unavailable from proved zero/empty.
- Registry/source hash mutations and existing real data must fail before a write.
- Current/postlaunch data and all previously accepted canonical facts must remain strict and unchanged.

### Task1 — Shared prerequisites and DFB classification

Files: shared files/migrations owned by HNS; create `scripts/dfb-historical-policy.mjs`, `scripts/test-dfb-historical-policy.mjs`; update only DFB source fingerprint closure and Germany docs.

- [ ] Root approve design and finalize shared primitive signature/approval timestamp/reference; integrate shared prerequisites on fresh main.
- [ ] Provide exact German registry descriptors to HNS owner; verify the one registry has only those two DFB entries and original raw hashes.
- [ ] Write failing authentic classifier tests for original invalid raw reports, wrong scope/identity/hash/defect and valid current/foreign reports.
- [ ] Implement pure DFB adapter over shared classifier and closed raw map; keep strict parser rejection; run RED/GREEN.

### Task2 — Manifest, capture/replay and verifier version3

Modify `scripts/vklopi-dfb-regijo.mjs`, `scripts/ponovi-dfb-regijo.mjs`, `scripts/dfb-replay-proof.mjs`, `scripts/preveri-zagona-dfb-regije.mjs`, `scripts/dfb-offline.mjs`; add a DFB-only coverage adapter/audit wrapper if needed. Update relevant three regional Actions workflows only where actual policy-aware step/artifact verification requires it; never generic audit leniency.

- [ ] Write failing tests for all306 fixtures/304 available/2 null-statistic unavailable records, honest strict/policy counters and zero current exceptions; existing v1/v2 fail unchanged.
- [ ] Implement v3 policy/hash/raw/identity/count validation and provenanceVersion2/evidenceModepolicy-replay only for both seasons; reject initial direct/mixed proof; include all dependencies in reviewed fingerprints.
- [ ] Test genuine failed strict archive original plus actual successful policy replay, and fresh strict current capture plus its real closed policy replay, original age preservation, exact workflow/job/step/artifact/document proof, no network/DB access, and reject fake success/changed proof/missing raw/extra exceptions.
- [ ] Full preserved raw replay with before/after report and appearance equality for every available report in all regions/Nordost/Bayern.

### Task3 — Actions import and DFB-specific service gate

Modify `scripts/uvozi-dfb-regijo.mjs` and DFB import adapter; consume the HNS/Spain-owned shared importer hook and exact source_policy opt-in rather than changing common importer code concurrently; create a new timestamped `*_dfb_historical_statistics_v3.sql` migration and targeted JS/SQL release tests. HNS owns shared primitive implementation and aggregate masking.

- [ ] Write failing service/RLS/SQL tests for exact policy registry and unavailable metadata with no rows, normal canonical equality, foreign/current/userdata/active/drift refusals and all existing price/keeper/deadline/lock limits.
- [ ] Implement prewrite manifest equality, inactive policy application,304 ordinary archive reports plus2 service primitive upserts, current/positions/prices, and v3 RPC dispatch/private gate. Do not edit merged migrations or reinterpret unavailable as unplayed.
- [ ] Verify fresh migrations/types/common UI availability, ordinary v1/v2/Bayern/Nordost isolation, no fabricated statistics or zero-coalescing; run required smoke, DFB tests, SQL/RLS and fresh-DB CI with independent task/whole-branch review before merge.

### Task4 — Reviewed Actions release

- [ ] Root coordinate real archive39043125440 policy-aware replay within7days plus fresh strict current audit followed by its closed policy replay; no independent concurrent DFB reader.
- [ ] Inspect actual successful job/step/artifact proof,304+2/complete current counters and both-season club keeper coverage; prepare and review exact manifest SHA.
- [ ] Actions-only inactive import, canonical production equality, verified-history price/squad gates and deployed unavailable UI; inspect both exact pages and future six-hour deadline.
- [ ] Activate only the passing Südwest league through guarded Actions; read back future unlocked first round and public priced player list; report real live count and unresolved Nord/West source/schedule gaps.

Current deliverable is this design/plan only. Root approval and shared prerequisites precede implementation; source packets do not activate anything.
