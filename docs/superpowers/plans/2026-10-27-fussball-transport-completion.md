# FUSSBALL reviewed transport completion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Work only in the assigned isolated worktree and owned files.

**Goal:** Complete the Baden current/archive audit using genuine successful originals from three reviewed transport failures, without weakening full source/native activation gates or restarting every report download.

**Architecture:** Add a separate cache-only authenticated checkpoint reader for the exact reviewed parent set, a current-capture manifestv4, and a dedicated first-attempt main Actions entry point. Existing complete-cache reuse and versions1–3 retain their contracts. Fresh rounds and missing documents use the ordinary paced client; original cached receipts/timestamps remain unchanged. Final full replay and native admission remain mandatory.

**Tech Stack:** Node22, immutable GitHub artifacts, existing strict FUSSBALL collector, GitHub Actions; no database changes.

**Spec:** The bounded scope, interfaces and acceptance requirements below plus `docs/viri/nemcija.md` and the active rollout goal.

## Bounded reviewed scope

- Preset `baden-reviewed-transports-v1`, current `03188V27L800000JVS5489BTVU7GTVLE-G:2026/27`, existing Baden seed and adjacent2025/26 archive.
- Exact terminal failed parents40416972177,40509926697,40531709101. Their successful originals do not establish source completeness. Fixed parent pins come from authenticated GitHub metadata, raw ZIP digests and original manifest/code hashes.
- Carried-forward453 + parent508 +48 +105 = **1114** actual requests. The existing cumulative cap is **5000**, leaving3886. Reserve at most886 new current +3000 archive; count all failures. No refund, retry/reset or extra allowance.
- No continuation of refusals, challenges, HTTP errors, cancellations/timeouts, uncertain journals or unexplained failures. Exact reviewed no-response transport failure and complete original journals are required.
- Failed parents remain failed. Reader issues cache-only capability, never readiness, archive permission, source admission or activation authority. No automatic retry/resume after a new failure.
- Reuse only requested non-round successful originals. Fetch every round afresh. Never substitute fonts, infer private identities, accept conflicting URL/kind/body hashes, refresh timestamps or use a caller-written verified flag.
- Existing genuine semantic/privacy holds remain holds. No new historical exceptions, photographs, source bypass, outreach or local production writes.

## Interfaces and ownership

### Reader worker

New `scripts/fussball-checkpoint.mjs`, `scripts/policies/fussball-transport-checkpoints.json`, focused `scripts/test-fussball-checkpoint.mjs`; narrowly extend `dfb-artifacts.mjs` with a bounded regular-file-only checkpoint ZIP kind if needed.

- `readFussballTransportCheckpoint({parents,now})`: exact ordered parents, each `{run,artifact,jobs,zipBytes}`. Root-reviewed registry pins all three; no caller pin override. Verify main workflow/attempt/job/upload/closure identity, exact raw ZIP digest/size, manifest and every successful original/journal entry.
- WeakMap-brand the returned frozen cache proof, exposing `preset`, exact `scope`, `priorRequests:1114`, `totalRequestCap:5000`, original parent bindings and stable selected-document digest/count. No source-complete or continuation-eligible flags.
- `getFussballCheckpointDocuments(proof)`: copied bytes/descriptors with standard flat `originalReceipt`, non-round only; choose the latest genuine receipt for identical overlapping bodies, reject conflicting bodies.
- `exportFussballTransportCheckpoint(proof)`: copied `{proof,parents}` sufficient for persistence and independent offline reauthentication. Serialized proof alone is never accepted as a capability.
- Public tests skip only explicit missing genuine originals. Root's retained-original run must have zero skips. Include refusal/status/attempt/count/hash/path/symlink/clock/conflict/forgery controls.

### Capture worker

Own `fussball-capture-evidence.mjs` and focused checkpoint completion tests.

- Add optional `completionProof` to `captureFussballDirectory`, mutually exclusive with existing reuse/archive-parent modes, exact current checkpoint scope and community card policy.
- Persist authenticated checkpoint inputs under `checkpoint/` in the fresh output; manifestv4 references their stable proof. Cached documents preserve flat original receipts and `origin:cache`; network documents preserve new receipts and `origin:network`.
- `verifyFussballDirectory` reauthenticates checkpoint inputs without network and independently replays the complete current season with exact selected document usage. Preserve versions1–3 and code/freshness/result/native checks.
- Returned verification identifies the checkpoint preset and prior1114 separately from child network requests. No partial or failed capture becomes verified.
- Seal the registry in the capture fingerprint; harden relative-path ancestry checks for the new nested evidence paths.

### Root integration

- Add `fussball-completion-actions.mjs` for GET-only parent download/load/validation; dedicated `preveri-fussball-dopolni.yml` with exact reviewed main SHA and bounded current/archive budgets, no DB credentials in source jobs.
- Explicitly route the new preset through season-pilot validation/current capture/archive authorization/handoff. Verify prior1114 and successful complete manifestv4 before archive permission; existing ordinary path remains unchanged.
- Native source-artifact admission and paired-pack loading accept the new workflow/currentv4 only after the existing complete offline/native checks. Archive staysv3 and retains the actual fresh current seed receipt.
- Register the new source reader in host coordination. Preserve six-second pacing, first-attempt/manual/main requirements and all semantic/native activation holds.
- After host coordination, enumerate actual same-workflow history before source. Any older execution whose capture step started or is unknown holds this fixed1114 preset until its requests are accounted in new reviewed history. Pre-source skipped captures do not spend or block the allowance; no repeated manual dispatch may reset it.

## Verification and release

- [x] Reader RED/GREEN with genuine pinned parents, no federation calls.
- [x] Capture/replay RED/GREEN, including tampered persisted parent evidence and unchanged legacy behavior.
- [x] Scope/budget/workflow/paired admission tests; reject prior refund, wrong mode/version, stale/corrupt source and incomplete native batches.
- [ ] One independent review of the complete change after integration, then relevant source tests and normal CI. No duplicate broad review/test loops.
- [ ] Merge/deploy through normal Actions; only then consider one explicitly reviewed capture dispatch within3886 remaining requests.
- [ ] Read back actual source result and native gates. Do not claim any new league live merely because capture or code tests passed.

Local verification: full Node22 FUSSBALL suite472 passed,4 existing private-fixture skips,0 failures; new genuine checkpoint cases had no skips. Focused integration48/48 and reader41/41 passed. One independent production-code review approved the frozen change. Real source completion and native activation remain operational checks.
