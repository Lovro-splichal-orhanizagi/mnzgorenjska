# Nord and West score labels implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this narrow registry task.

**Goal:** Admit exactly three corroborated archive reports without changing source clocks or existing accepted statistics.

**Architecture:** Add complete known-source entries to the existing score-label registry and content-addressed participant proof fixtures. Existing parser and release fingerprint mechanisms consume them unchanged.

**Tech Stack:** Node built-in test runner, JSON registry and immutable HTML samples.

**Spec:** docs/superpowers/specs/2026-10-18-nord-west-score-labels-design.md

## Global constraints

- No invented XI, goals, minutes, keeper or discipline; no reduced-history policy.
- Full original or full corrected goal state only; pinned primary proof on every use.
- No DB writes/source audit/import/activation in this patch.

## Review focus

- Partial upstream correction and divergent dedicated goals must reject.
- Exact same IDs from another league must not inherit correction.
- Proof byte changes/missing files must reject even after a prior parser call.
- Clock disagreement must remain visible in original and already-corrected states.
- Every previously accepted raw report and canonical appearance must remain equal.

### Task 1: Evidence-bound score labels

- [x] Preserve raw original reports and primary bytes with safe SHA/URL/UTC provenance.
- [x] Add authentic failing tests for the exact six corrected labels and clocks; run RED.
- [x] Add three registry entries, proof files and explicit limitations.
- [x] Run GREEN and boundary tests (metadata, names/sides/clocks, partial state, both sections, foreign league, proof mutations and fingerprint).
- [x] Replay all saved regional/Nordost/Bayern source documents without HTTP; compare previously accepted canonical statistics.
- [x] Run required smoke and relevant DFB tests, then send parent the patch for independent review before merge.

Independent whole-branch review and any integration/CI deployment are owned by root after this patch handoff.
