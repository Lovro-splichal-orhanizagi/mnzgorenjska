# Corroborated Südwest Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept four independently corroborated Südwest reports while keeping every other source and release gate unchanged.

**Architecture:** Extend the existing exact intermediate-score registry, and add one complete-semantic-state-pinned processing-order exception for a proved halftime entrant's same-clock on-pitch dismissal. Preserve raw source/evidence and all previously accepted output.

**Tech Stack:** Existing Node ESM/crypto/node:test, JSON registries, raw public evidence. No new dependencies or schema.

**Spec:** `docs/superpowers/specs/2026-10-17-suedwest-corroborated-repairs-design.md`

## Global Constraints

- Only three proven pairs of score labels and match2402984 chronology; never change raw clocks, names, final/half scores or infer other roles.
- Retain and disclose Walldorf90+7 versusDFB90+8; recorded Brändle1minute is a rounded existing convention, not60seconds physical proof.
- Full semantic state and primary byte hashes must be checked on every application; reject unreviewed changes.
- No source HTTP, production keys/DB/actions/outreach, schema, active-league repricing or activation by implementer.
- Keep2402929/2403004 and other current/archive blockers rejected. Original source timestamps/freshness unchanged.

## Review Focus

- A mixed original/corrected goal state or disagreement between copies must not be hidden.
- A generic red-card reorder must never create an appearance for an unused or previously dismissed reserve.
- Wrong-side/profile/clock/round/lineup/staff changes must invalidate the entire pinned chronology rule.
- Mutated/missing evidence files cannot pass through a cached parse.
- Live Nordost/Bayern and all previously accepted regional canonical outputs must remain identical.

---

### Task 1: Evidence-bound source repairs and regression proof

**Files:** Modify `scripts/viri/dfb.mjs`, `scripts/viri/dfb-korekcije.json`, `scripts/vklopi-dfb-regijo.mjs` sourceFiles dependency closure and related fingerprint/provenance tests; create bounded chronology registry `scripts/viri/dfb-kronologija.json`, `scripts/test-dfb-suedwest-repairs.mjs`, source/proof fixtures+provenance in `scripts/vzorci/de-dfb-suedwest-*`. Add tests by importing the new suite from existing regional test entrypoint `scripts/test-dfb-regije.mjs` (avoid package.json, concurrently owned by separate FUSSBALL task). Add standalone `docs/viri/nemcija-suedwest-korekcije.md`; do not edit existing `docs/viri/nemcija.md` in this feature while another task owns it.

**Interfaces:** Existing `vZapisnik(html,{liga:'regionalliga-suedwest'})` output contract unchanged except explicit bounded correction/proof warnings/metadata for newly accepted four. Existing `nastopi(z)` remains authoritative. New chronology rule uses existing `prstniOdtisVloge(html,liga)` and pinned documents; no general red-card order policy.

- [ ] Add original authentic four reports and full primary bytes/provenance. Write expected correct score steps, unchanged raw clocks and sourceproof; assert2402984real directed entry45/red46/1recordedminute and exactly one dismissal/no fabricatedextraappearance. Run RED with current parser and preserve output.
- [ ] Add exact goal-label entries with all original metadata/goals and pinned evidence; use existing full-original/full-corrected semantics. Add explicit clock-disagreement disclosure for2402963, including the fully upstream-corrected label state where ordinary score popravki are empty.
- [ ] Add source-local chronology registry, gate before use on exact Südwest match and whole semantic fingerprint, verify both primary byte hashes, then process only the real same-clock incoming pair before red. The original46minute substitution event has three pairs: Brändle/Deininger is third. Preapply only that pair and process every pair exactly once while reconciling the original grouped event once. Outgoing Deininger has no profile link, so retain checked source name/roster identity without inventing a profile. Preserve raw source/order in correction evidence; do not change published raw bytes or clocks. Refuse changed source and unsupported cases.
- [ ] Test semantic mutation dimensions, wrong league/side/profile/clocks/directions, missing dedicated entry, bench dismissal without proven incoming, prior dismissal/reentry, partialgoalcorrection/sectiondisagreement, changed/missing primarybytes. Keep all exact remaining blockers rejected.
- [ ] Bind new chronology registry and BOTH raw primary proof files into regional sourceFiles/parserSha256 closure; regression tests must prove changing any one changes the release fingerprint and omitted/missing bytes fail. Keep original provenance/freshness gates and offline source network closure intact.
- [ ] Run covering/new tests and existing full source/smoke/type/build; replay all preserved regional and live Nordost/Bayern raw data with fetch disabled and compare prior reports/appearances field-by-field. Record actual coverage, source fingerprint changes and readiness limitations.
- [ ] Commit scoped verified deliverable and write complete report with RED/GREEN commands/results. Root dispatches independent task review, original implementer owns fixes, then fresh whole-branch final review and exactHEADCI before merge. No production activation from partial source repairs.
