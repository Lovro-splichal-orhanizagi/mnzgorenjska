# FUSSBALL.DE Fantasy Report Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce trustworthy canonical appearances from the supported real public FUSSBALL.DE report, preserving anonymous ordinary yellow evidence and withholding unsupported reports.

**Architecture:** A new strict raw-evidence wrapper calls the existing saved-page validator without changing it or DFB dependencies. Independent event/period/identity validation produces canonical intervals/statistics and an explicit report-only success envelope; a separate offline CLI exposes results without source registration or DB writes.

**Tech Stack:** Existing Node ESM, node:test, crypto and current font decoder. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-fussball-fantasy-reports-design.md`

## Global Constraints

- No source HTTP, DB operations, source registration, inactive seeds or league activation in this first task.
- Existing `scripts/viri/fussball.mjs`, existing validator CLI/tests, shared DFB dependency files and release fingerprint remain unchanged.
- Exact published player IDs remain distinct namespaces; no number/hash IDs. `regSt:null` until a separately reviewed importer identity design.
- Anonymous ordinary yellows have exact raw evidence but no guessed deductions. Any unsupported/named/anonymous dismissal or unknown mixed icon shape withholds all appearances.
- Existing FSS/DFB full-time conceded/CS policy unchanged. No interval-scoring change.
- Report success always includes `sezonskiUvozPodprt:false,activationEligible:false` and retains original `z.nepopoln:true`.

## Review Focus

- Core's substring card classification cannot turn mixed yellow/red or second-yellow into accepted caution.
- Equal clocks, re-entry or ambiguous halftime cannot silently generate fabricated playing minutes.
- Penalty/miss/extra-time semantic signals cannot disappear into ordinary goals/90minute stats.
- Font/canonical/lineup provenance failures must reach zero-appearance nonzero CLI outcomes.
- New report-level success must never masquerade as whole-season/import/activation readiness or alter live DFB statistics.

---

### Task 1: Strict raw-evidence fantasy wrapper and offline entrypoint

**Files:** Create `scripts/viri/fussball-statistika.mjs`, `scripts/test-fussball-statistika.mjs`, `scripts/preveri-fussball-statistiko.mjs`. Modify only `package.json` test commands and `docs/viri/nemcija.md` to document scope and exact remaining gaps. Do not modify shared core/tests or DFB files.

**Interfaces:** `razberiFantasyZapisnik(mainHtml,lineupHtml,{fonts,id,lineupId})` returns `{reportStatistikaPripravljena:true,sezonskiUvozPodprt:false,activationEligible:false,z,nastopi,nepripisaniRumeni}` only after raw checks. Unsupported/invalid throws explicit typed/reason error; CLI catches and prints false-ready/no-appearances with nonzero exit. CLI arguments match existing validator's four paths; loads bound byte fonts from manifest and never performs network/DB.

- [ ] Add authentic positive and mutation-negative tests before implementation. Assert expected individual source-ID intervals,30appearances,22starters,8entrantsincludingone0minute,990minutesperside,1980total,two90minuteGKs,5goals,3rawyellowproofs,fulltimeconceded3/2,noCS,no unusedreserves. Validate genuine fixture/font hashes and independent expected substitutions.
- [ ] Run tests RED against missing wrapper/CLI. Preserve complete command/output in own task report.
- [ ] Implement balanced strict event/period grammar checks over exact original raw bytes, exact card tokens/text, one-to-one core event association, raw clock/ordinal/SHA proofs and positive90minute duration evidence. Reject unknown qualifier/penalty/miss/period/icon forms and any unsupported discipline. Do not merely regex denylist a keyword.
- [ ] Construct historical roster/entry/exit state by persistent IDs; reject re-entry, same-player conflicts, wrong side, ambiguous scorer/sub clock, ambiguous45/46 substitution, unmarked keeper replacement or invalid interval. Allow real disjoint67minute pairs and90minuteentry0. Derive standard appearance statistics with exact goal-ID matching and existing full-time team conceded semantics.
- [ ] Add CLI output flags and explicit unsupported/no-appearance outcome; keep existing validator behavior identical. Tests cover wrong fonts/IDs/lineup, red/second/mixed/unknown cards, extra scoring semantics, equal-clock scorer, halftime/GK replacements, re-entry, CLI success/failure, no network and unchanged core bytes.
- [ ] Run new focused tests plus existing29fussballtests, all source tests, smoke, build/typecheck, YAML/diff checks as applicable. Independently verify DFB fingerprint unchanged and saved accepted regional outputs unchanged. Document exact real supported subset and remaining season/source gates.
- [ ] Commit scoped deliverable and append implementation/test/selfreview report. Root generates independent task review package; original implementer fixes review findings via tracked fix loop. Final independent whole-branch review and green CI precede merge/deploy. No actual league activation from this report-only change.
