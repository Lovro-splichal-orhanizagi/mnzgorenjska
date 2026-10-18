# FCF Goal Event Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Read explicit FCF goal-type labels so a surname cannot turn an ordinary goal into a penalty.
**Architecture:** Preserve the existing RSC parser and goal row traversal. Limit classification to the dedicated goal label/annotation; do not search whole-row prose.
**Tech Stack:** Existing JavaScript, Node22 node:test, Vite smoke; no dependencies.
**Spec:** docs/superpowers/specs/2026-10-18-fcf-goal-event-types-design.md

## Global Constraints
- Only FCF goal classification, focused tests/trimmed authentic fixture/test wiring/docs; no shared transport, DB, production or DFB edits.
- Preserve goals, identities, clocks, scores and warnings. Keep source contradictions blocked.
- No provider requests; use retained raw primary locally. No production keys or DB-writing tests.
- Root owns review, exact-head CI, merge, deploy and real operational validation.

## Review Focus
- Names containing PENAL and PROPIA must not determine type: focused ordinary-goal decoy tests.
- Explicit GOL PENAL and GOL EN PRÒPIA must remain recognizable: focused positive controls.
- Nested/player/global-legend text must not masquerade as labels: focused isolation tests.
- Authentic full-report parsing must change only the false penalty, keeping conflicting published score and warnings: exact field assertions.
- Existing FCF fixture outputs/apps must remain unchanged: compare against BASE, plus smoke.

### Task 1: Correct source-label classification with authentic regression

**Files:** Modify scripts/viri/fcf.mjs, package.json, docs/viri/spanija.md. Create scripts/test-fcf-goals.mjs and scripts/vzorci/es-fcf-goal-type-4109643.html (trimmed public fixture).
**Interfaces:** Consumes goliZapisnika(koreni), drevoRsc(html), vZapisnik(html). Produces identical interfaces; changes only false goal-type classification. Return exact existing vrsta values gol/enajstmetrovka/avtogol.

- [ ] Step1: Read spec and diagnosis /private/tmp/slff-go-live-evidence/overnight/fcf-seven-primary-diagnosis.md. Use raw /private/tmp/slff-go-live-evidence/overnight/fcf-seven-39082161817/acta-4109643.html. Create minimal authentic privacy-trimmed fixture and focused tests. Assert source regSt18314717, Vila Penalba Pol,54,normal goal; positive explicit penalty/own-goal controls and name/club/legend decoys; full raw report keeps four goals and original score-conflict warning. Pin original and trimmed provenance separately. No fabricated source proof.
- [ ] Step2: Run node --test scripts/test-fcf-goals.mjs with Node22 before product code. Record real failing assertion showing false penalty.
- [ ] Step3: Implement minimal dedicated-label classification in scripts/viri/fcf.mjs; no whole-row surname or club matching. Preserve normal fallback and all public interfaces.
- [ ] Step4: Run focused tests, compare BASE canonical reports/appearances for existing FCF fixtures, then npm run smoke with Node22. Record counts/limitations. Wire focused tests into test:sources; add brief source-doc note explaining the fix and unresolved score.
- [ ] Step5: Self-review, commit only task files. Write full report to the given SDD report path: commits, actual RED/GREEN, validation, provenance and any residual findings. Do not push, merge, dispatch actions or use subagents.
