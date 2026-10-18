# Held-parent G9 implementation plan

> **For agentic workers:** Use superpowers:executing-plans. Root approved design and implementation; this work grants no provider or production authority.

**Goal:** Preserve the failed parent's actual16 GETs and define a separate fixed G9-only240 plan within the original cumulative477 cap.

**Architecture:** A new accounting-only WeakMap capability reauthenticates the exact old claim and retained artifacts, including the inadmissible final receipt. A separate fixed `g9-only-after-held-parent-v1` plan binds that capability. Legacy G1-first readers remain unchanged. Execution integration must use an explicit union, never treat the old failure as continuation.

**Tech Stack:** Node22 ESM, existing strict artifact/claim/diagnostic readers, offline Node test runner.

**Spec:** Root task's approved minimal design and docs/viri/fcf-missing-inventory-admission.md.

## Global constraints

No provider requests, claim creation, upload, dispatch, database or production writes. G1 stays held. No fifth historical exclusion. Full240 G9 IDs4118349–4118588 ascending, including4118352/4118358. Pause3000ms; 45min window starts after actual source clearance; attempt1 only. Separate captureA and writerB closures. No broad SQL/npm test locally.

## Review focus

Expired source evidence must still count as spent; it must never become fresh target evidence. Missing/unknown/duplicate accounting holds. Mutated old identities/bytes hold. New plan time remains strict. New execution remains unavailable until every claim/capture/audit/writer boundary has a separate authenticated implementation.

### Task1: Accounting-only reader

Files: scripts/fcf-held-parent-accounting.mjs; scripts/test-fcf-held-parent-accounting.mjs.

- [x] Write RED tests requiring reader-issued accounting capability, immutable actual16/zero proof, future-clock and tamper rejection.
- [x] Run focused tests and retain RED log.
- [x] Implement exact old identity pins, original-completion archival replay of existing claim/consumption/diagnostic/skipped readers, and independently rebuild false final receipt.
- [x] Run focused GREEN suite plus genuine retained ZIP check if available.

### Task2: New fixed plan

Files: scripts/fcf-g9-held-parent-plan.mjs; scripts/test-fcf-g9-held-parent-plan.mjs.

- [x] Write RED tests for distinct protocol, prior16+240=256, exact ascending240 with no reuse, strict clock/policy/ruleset/closed fields, cap477.
- [x] Implement new fixed plan requiring branded accounting; reject copied capability and altered plan.
- [x] Run focused GREEN regression suites.

### Task3: Execution and writer integration (separate gate)

Files requiring changes: new G9 claim/capture/evidence/actions modules; .github/workflows/uvoz-fcf-zgodovina.yml; scripts/fcf-target-actions.mjs; fcf-target-evidence.mjs; fcf-target-stage-evidence.mjs; fcf-target-child-offline.mjs; fcf-target-release.mjs and runtime closure.

- [x] RED tests for protected new claim, fresh240 capture, failed/partial/unaudited HOLD, full native calendar16/GK, explicit source union and unchanged downstream gates.
- [x] Implement independent authenticated boundaries without widening the old protocol.
- [x] Focused GREEN verification (see retained local logs).
- [ ] Independent root review and full CI before any claim/upload/dispatch.

If this integration cannot be completed coherently, commit only the tested source-free checkpoint and enumerate concrete remaining boundaries; never expose a partial executable route.


## Final implementation refinements

The protected schema3 continuation ref is keyed by the spent old parent rather
than the new plan hash: `fcf-inventory-claim/g9-after-<oldParentPlanSha256>`.
This prevents fan-out through multiple new plans. The raw claim still binds one
new plan, run, attempt and reviewed capture commit. Continuation eligibility is
separate from budget accounting and requires the exact reviewed16 complete200
content-defect packet. Cross-process validated new plans are deeply frozen.

Shared claim/capture/evidence internals select an explicit source-plan union;
the original plan validator and original raw target wire remain unchanged.
Fresh G9 markers preserve their new actual receipts and require the original
approved bytes; all-four cleanup originals preserve their separate old receipts.
Native SQL uses its unchanged generic admission kind and all existing gates.

Root owns independent review and full CI. No provider traffic, claim creation,
upload, dispatch, DB mutation, push, PR or merge was performed by this work.

## Verification record

Local logs live under `/private/tmp/slff-growth-execution-2026-10-18/` and are
not committed. RED logs cover missing accounting/plan/schema3 capture/audit,
new wire/transport/compiler, source-clearance, parent-ref fan-out, separate
content-defect eligibility, clock replay and immutable cross-process plans.

Genuine retained accounting and marker tests require explicit private local
inputs. Successful new calendars and Actions controls are labeled synthetic.
The combined genuine19-suite run recorded360 passing tests and two fixture
subprocess failures: a Python-stdin old-ZIP extraction hang and an existing
Python ZIP15s timeout under parallel load. The first helper was replaced by the
existing bounded ZIP reader (accounting22/22 green); the exact legacy transport
case passed on isolated rerun. Those failures remain in the retained log and
are not relabeled as application failures or silently omitted. Public CI skips
only tests requiring explicit genuine retained-byte inputs.
