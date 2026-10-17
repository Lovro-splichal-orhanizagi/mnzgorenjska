# FAS Team Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign explicitly titled FAS lineup tables to their actual home/away club even when a table is missing or reversed.

**Architecture:** Resolve each source table title against the existing match-header identities before preserving the current row parser. Refuse ambiguous assignments; preserve incomplete reports.

**Tech Stack:** Existing Node22 ESM and node:test, no dependencies.

**Spec:** docs/superpowers/specs/2026-10-18-fas-team-alignment-design.md

## Global Constraints

- Offline only: no provider requests, database, keys, Actions, remote Git mutations, outreach or activation by implementer/reviewers.
- Existing parser format, row/event extraction, player IDs, clocks, scoring, incomplete thresholds, source transport/pacing/cache remain unchanged except lineup side alignment and resulting source-event resolution.
- Match14507 remains incomplete with zero canonical appearances; no invented XI, partner, clock, goal, goalkeeper or source resolution.
- Bind titles by existing club normalization plus existing explicit EI San Martín correction; no new fuzzy aliases and no positional fallback for supplied tables.
- Scope product changes to scripts/viri/fas.mjs, new scripts/test-fas.mjs, new scripts/vzorci/es-fas-evento-nepopoln-14507.html, package.json test:sources registration and docs/viri/spanija.md provenance/caveat.
- Full saved source /private/tmp/slff-go-live-evidence/spain/fas-14507.html SHA256 e0824ca4a882760d11b8de5feacc4b229131cd6d333f7f530cdbf38638c80a86. Use reduced structural fixture, never label it original bytes.

## Review Focus

- One away-only source table must remain away; absent home lineup stays absent.
- Reversed or duplicate supplied tables must not be interpreted by document order.
- Existing explicit EI typo correction must preserve all already-correct reports.
- Normalization collisions, missing or foreign titles must fail without cross-team player assignment.
- A corrected partial source must stay incomplete, preserving actual result/clocks and no canonical appearances.

---

### Task 1: Bind roster tables to explicit club titles

**Files:** Modify scripts/viri/fas.mjs, package.json, docs/viri/spanija.md. Create scripts/test-fas.mjs and scripts/vzorci/es-fas-evento-nepopoln-14507.html.

**Interfaces:** Consumes existing glavaStrani(html), besedilo, popraviIme and kljucKlubaFas in fas.mjs; retains exported postaviStrani(html) -> [homePlayers, awayPlayers]. vZapisnik consumes that two-array ordering unchanged. Root baseline of all54 saved pages: /private/tmp/slff-go-live-evidence/overnight/fas-alignment-baseline.json; inputs /private/tmp/slff-go-live-evidence/spain/fas-*.html.

- [ ] Step1: Read the spec and relevant source/smoke assertions, make a reduced fixture from the original capture, document its original receipt from spain/manifest.jsonl and trimming. Add actual-source regression asserting zero home source rows, three away source rows and Caudal identities; confirm preimplementation RED from positional assignment.
- [ ] Step2: Add behavioral tests for reversed tables preserving semantic output, sole home, sole away, zero tables returning [[],[]], existing EI alias, missing/unknown/duplicate/extra table titles, duplicate/ambiguous match-header identities and missing header when tables exist. These must use the actual public parser, not a mock of the binding algorithm.
- [ ] Step3: Implement the smallest binding change using exact normalized corrected title/header keys. Reject invalid or reused assignments with clear fas: errors. Preserve row parser and all unrelated behavior. Do not alter incomplete minimum or source event extraction.
- [ ] Step4: Test vZapisnik/nastopi actual14507 remains incomplete, canonical XI/appearances empty, result0:3/clocks unchanged, known published goals belong to Caudal. Register focused file in test:sources. Run focused tests, npm run smoke and git diff --check. Do not run npm test (writes DB).
- [ ] Step5: Replay54 retained full raw reports using the actual parser. Compare with root baseline: all53 other rosters/canonical outputs unchanged field-for-field; list actual14507 deltas and why each follows corrected side binding. Save exact command/output and diff in ignored report artifacts. No new network.
- [ ] Step6: Self-review scope/evidence/no invented data, commit scoped product changes. Write task report with RED/GREEN commands/output, smoke totals, replay preservation and explicit remaining source blockers. Return status/commit/test summary/concerns only. No subagents.
