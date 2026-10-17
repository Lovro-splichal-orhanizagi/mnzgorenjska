# Unattributed Yellow Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep complete usable DFB match statistics when only ordinary yellow-card attribution is uncertain, with a public notice and bounded correction retries.

**Architecture:** Encode unresolved yellow events in existing import warnings, keep them out of player deductions, and preserve strict validation for every other field. Read the shared warning format in the match detail UI. Existing audited offline replay and canonical database guard remain the release boundary.

**Tech Stack:** Node ES modules, React/TypeScript, existing Supabase schema and i18n.

**Spec:** `docs/superpowers/specs/2026-10-17-unattributed-yellow-cards-design.md`

## Global Constraints

- Four inactive DFB Regionalligas only; Nordost behavior/data unchanged.
- No whole-report omission or numerical tolerance policy. No new FUSSBALL importer or 600-league readiness claim.
- No guessed identities, red/second-yellow exemptions, incomplete lineups/goals/substitutions, schema/RPC/type edits or production keys.
- Exact source SHA/URL/original UTC and warnings/statistics retained through release proof. No provider outreach.
- Current correction freshness bounded by existing recent window; archive correction explicitly targeted.

## Review Focus

- A same-name player/coach with differing or absent profile IDs must remain rejected.
- A malformed/red/second-yellow event must never enter the ordinary-yellow fallback.
- A valid yellow warning must survive approved offline replay and exact canonical verification, then disappear on attributed replacement.
- A marked old report must not trigger an unbounded nightly archive refetch, while targeted repair refreshes its source.
- Match UI must translate the notice and hide raw source diagnostics for all supported locales.

### Task 1: Source policy, evidence and correction semantics

**Files:** Create shared codec `src/lib/nepripisaniRumeni.mjs` and declaration as needed; modify `scripts/viri/dfb.mjs`, `scripts/vklopi-dfb-regijo.mjs` sourceFiles, `scripts/uvoz-zapisnikov.mjs`, `scripts/preveri-vir-sezono.mjs` only if reporting counts requires it; add `scripts/test-dfb-unattributed-yellow.mjs`, authentic fixtures/provenance and package test entrypoints. No edits to old migrations or baseline fixture bytes.

**Interfaces:** Shared encoder/parser for bounded `SLFF_UNATTRIBUTED_YELLOW_V1:` event warnings; DFB output `nepripisaniRumeni` only when events exist; existing `rumeni`, `nastopi`, `opozorila`, release interfaces otherwise retain behavior.

- [ ] Write real-fixture tests proving West2402201 and explicit same-profile Bayern player-coach reports retain all non-yellow values and do not invent a player deduction/bench appearance. Include the five relevant boundary classes above.
- [ ] Run focused tests and record expected RED from missing feature, not import/setup errors.
- [ ] Implement the narrow non-Nordost policy and shared warning codec; preserve section cardinality/signature and all other validation.
- [ ] Add bounded fresh-source correction handling before source traversal and during old-match filtering. Test warned recent report refresh, unchanged no-write, attributed warning replacement, old nightly skip, explicit old targeted refresh and a second pass without duplicate penalty.
- [ ] Run focused and existing source tests; replay every saved regional season offline, compare all previous accepted report values and full Nordost baseline. Record exact original hashes/counts and remaining independent blockers.
- [ ] Commit implementation, real fixtures, provenance and test entrypoint changes.

### Task 2: Public notice and final validation

**Files:** Modify `src/pages/Tekma.tsx` (verify actual path), all existing locale `src/i18n/*/aplikacija.ts` files, existing render/smoke test as appropriate; update `docs/viri/nemcija.md` and source policy comments. No general redesign.

**Interfaces:** Read `matches.import_warnings` for the selected match via the existing typed public client; shared parser returns count/events. Display translated user-facing yellow-attribution notice only when valid unresolved warnings exist.

- [ ] Write a failing match render/codec boundary test for incomplete yellow notice, no raw JSON, and removal after attributed correction.
- [ ] Implement the public notice and all locale keys, retaining existing page/loading/error behavior.
- [ ] Run focused tests, `npm run test:sources`, `npm run smoke`, `npm run typecheck`, `npm run build` sequentially where dependencies require it; run `npm test` and report actual prerequisite failures without accessing production credentials.
- [ ] Verify no schema/type or Nordost behavior changes and update source documentation with actual supported policy and remaining coverage limits.
- [ ] Commit final changes and prepare a self-contained report for fresh independent whole-branch review before authorized PR/merge/deploy.
