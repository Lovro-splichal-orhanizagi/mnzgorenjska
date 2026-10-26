# German operational repairs implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task with bounded independent provider work.

**Goal:** Keep verified German match updates running when another report is incomplete, and remove supported-format/catalog blockers without guessing missing data.

**Architecture:** Reuse DFB's existing error-collection mode with explicit nightly scope and durable pending records. Extend the existing strict FUSSBALL event and native conversion modules. Extract observed archive tuples from retained official selectors. Preserve the native activation gate.

**Tech Stack:** Node 22 ESM, existing Bash nightly runner, PostgreSQL/Supabase through Actions only.

**Spec:** `docs/superpowers/specs/2026-10-26-german-operational-repairs-design.md`.

## Global constraints

- Implementation remains offline except the recorded three-request archive identity investigation within the existing 80-request allowance; no production writes outside Actions, no new policy waiver, no email, no secret reads.
- Preserve unrelated work and existing reviewed historical exceptions.
- Source refusals remain terminal; pending individual reports do not become fabricated zero-stat matches.

## Review focus

- A parser failure before the importer loop must not discard valid siblings.
- A rejected report must not mark the wrong native fixture pending or erase verified statistics.
- Settlement and successful-clear behavior must recognize pending current reports.
- Named red cards require exact participant, team and time binding; anonymous recipients stay unavailable.
- Two-digit season labels and inert/cross-league selectors must not create invented archive pairings.

## Tasks and ownership

- [x] DFB current ingestion: `scripts/viri/dfb.mjs`, `scripts/uvoz-zapisnikov.mjs`, `scripts/nocni-uvoz.sh`, focused pending/report tests and any narrowly required pending-state helper/migration. Reproduce abort-before-loop, add durable evidence/current-only handling and partial outcome, validate market incomplete guard and successful clearing.
- [x] FUSSBALL events: `scripts/viri/fussball.mjs`, `scripts/viri/fussball-statistika.mjs`, `scripts/fussball-import.mjs`, relevant focused event/import tests. Add RED examples first, support published participants and card intervals, keep anonymous reds held.
- [x] Archive discovery: new scoped season-selector module/tests, reviewed `de-bulk-candidates.json` pairing and source documentation. Reproduce the abbreviated-label miss against original retained bytes.
- [ ] Integration: install helper tests in CI/package scripts, meaningful composed offline regressions, one frozen review, required CI, merge and verify deployment through Actions. Record source budget before any optional live validation.

## Ledger

- Parent branch `codex/german-operational-repairs-20261026`, based on main `0c9d32c7`; user checkout untouched.
- Root causes were verified read-only in the prior turn. Implementation starting with disjoint file ownership.

- DFB and FUSSBALL units integrated with ordinary-importer red-clock regression. Rejected originals remain private and pending; synthetic named-card examples are not claimed as live source evidence.
- Weekly unattended pricing bypass fixed with actual CLI red/green tests: pending or failed inventory cannot reach player/statistic reads or writes.
- Original Schleswig archive HTML/form plus two current menu witnesses bind the adjacent archive despite the current-parent SEO canonical; real collector composition regression covers the parser argument boundary. Diagnostic requests total23/80.
- Final integration tests/review and hosted native SQL/CI/deployment are in progress; no activation or complete live refresh is claimed yet.
