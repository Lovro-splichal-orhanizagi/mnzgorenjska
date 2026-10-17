# Bayern Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the four evidence-resolved Bayern reports and activate through existing verified production gates.
**Architecture:** Extend existing exact-match score corrections, accept explicit one-to-one grouped goal icons, and apply a pinned match-only player alias. Retain raw source evidence and unchanged canonical verification; use actual offline Actions replay lineage before production import/activation.
**Tech Stack:** Node ES modules, existing source fixtures/JSON registry, GitHub Actions, existing Supabase RPC.
**Spec:** `docs/superpowers/specs/2026-10-17-bayern-live-design.md`

## Global Constraints

- Preserve source clocks, scorers, side, final/half-time scores, and all unaffected output; Nordost remains unchanged.
- No guessed identities, generic middle-name stripping, report omission, schema/RPC/types changes, production keys, provider outreach, or source-refusal bypass.
- Alias only match 2425105, Wacker home side 0, Noah Shawn Agbaje to Noah Agbaje/profile 374531. Pin the exact complete semantic state and proof bytes; reject partial changes.
- Include all new parsing/evidence dependencies in the source fingerprint. Keep original capture hashes and UTC immutable; retain archive freshness of 7 days and current freshness of 12 hours.
- Only actual successful lineage and a reviewed manifest can authorize Actions import, pricing/readiness, and activation. No direct production writes.

## Review Focus

- Opposite-side, different-profile, partial name correction, or altered evidence must reject the alias.
- Duplicate/missing/extra grouped icons and differing summary/timeline copies must reject.
- Partial upstream score fixes or different metadata must reject instead of mixing corrections.
- Canonical appearances/goals must use roster identity while original scorer and verified alias provenance survive replay.
- Existing accepted reports and historical parser hashes must remain unchanged despite new registry dependencies.

### Task 1: Four bounded report repairs

**Files:** Modify `scripts/viri/dfb.mjs`, `scripts/viri/dfb-korekcije.json`, `scripts/vklopi-dfb-regijo.mjs` sourceFiles, `package.json` test entrypoints, and `docs/viri/nemcija.md`. Create `scripts/viri/dfb-aliasi.json`, `scripts/test-dfb-bayern-repairs.mjs`, authentic source/proof fixtures, and safe provenance under `scripts/vzorci/`. Adjust historical replay tests only as required; do not weaken them.

**Interfaces:** Existing vZapisnik/nastopi/release outputs remain compatible; new alias provenance (original name/evidence) is preserved in parsed goal/explicit warnings. `prstniOdtisVloge` may gain an optional league argument with unchanged Nordost default. Existing score-registry interface remains.

- [ ] Add authentic tests for the four reports plus Review Focus mutations; run meaningful failing RED tests.
- [ ] Register six exact score-label fixes, one-to-one goal icons, and the bounded verified alias; retain all strict identity/lineup/keeper/event checks.
- [ ] Run focused GREEN tests, covering source/release tests, and the full saved offline replay. Expect Bayern 306/306 archive + 132/132 current, unchanged prior valid stats including Nordost; record the new source fingerprint and immutable historical hashes.
- [ ] Commit bounded code/evidence/docs and report; complete independent task review plus fresh final review before merge.

### Task 2: Reviewed operations and activation

**Files:** No product changes expected; local release ledger and verified Actions artifacts.

**Interfaces:** Existing `ponovi-dfb-regijo.yml`, `vklop-dfb-regije.yml`, `uvoz-dfb-regije.yml`, and guarded service RPC.

- [ ] Run checked HEAD CI and merge/deploy only after code/fresh DB gates pass.
- [ ] Run actual Actions read-only archive/current replays from 39048972242 and 39054476978 at their exact original capture commits; inspect successful strict coverage and lineage artifacts.
- [ ] Prepare the exact release manifest without keys/database; review SHA and counts.
- [ ] Perform guarded import using the approved SHA; verify source-to-database equality, legal affordable roster, explicit keeper coverage, price spread, and future first fantasy round.
- [ ] Perform guarded activation with `server_ready=true` after existing DE endpoint/reminder deployment verification. Confirm public league, counts, first fantasy deadline, and nightly inclusion. No Nordost repricing.

Self-review: Spec requirements map to Task 1 or operational Task 2; one parser writer; sourceFiles/registry/proof bytes shared interfaces reviewed together. Current source evidence is sufficient without user decisions; researcher and independent builder-check confirmed exact corrections and alias. Execution is already authorized by the user’s repeated go-live request.
