# Polish CKM Offline Report Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract auditable match fields from three retained Concordia CKM reports without registering a source or enabling any import.

**Architecture:** A dependency-free scoped HTML reader feeds a pure `parseCkmReport(html, { url })` function. It preserves header/roster/event evidence and exposes individual statistics only after strict report-level reconciliation. A local-file CLI prints JSON and never transfers data.

**Tech Stack:** Existing ESM JavaScript, Node 22 built-ins, `node:test`; no new dependencies.

**Spec:** Parent task of 24 October 2026; binding constraints and interface are recorded below.

## Global Constraints

- No network, database, source registration, activation, schema, package.json, CI, country-documentation, email or purchase changes.
- `activationEligible=false` and `sezonskiUvozPodprt=false` on every result.
- Identity comes only from observed WP post IDs/profile URLs/canonical URLs; no fabricated PZPN UUIDs or global name joins.
- Explicit position headings identify GK; require exactly eleven published starters and one starting GK per team.
- Ambiguous/unidentified actors, unknown events, bad intervals, score mismatch or incomplete rosters hold all derived individual statistics.
- Preserve actual main-header league, round, date and derived football season; never use navigation/sidebar season labels.
- Preserve assists/missed penalties as raw source extras; do not confirm or import assists.
- Archive nine-player published XI remains held until separate authoritative short-XI evidence exists.
- User has authorized continuous inline implementation; parent reviews frozen commit before any future capture or registration.

## Review Focus

- Hidden widgets, scripts and templates must not contribute fake rosters/events.
- A canonical/header URL mismatch or foreign page must hold all individual statistics.
- Duplicate names/profile entries must never silently merge distinct actors.
- Second yellow plus explicit red must close the real player's interval once while preserving the source's two yellows.
- Missing/contradictory clocks and unrecorded substitutions must not produce invented playing intervals.

---

### Task 1: Scoped offline parser and authentic fixtures

**Files:** Create `scripts/viri/ckm-report.mjs`, `scripts/test-ckm-report.mjs`, and three `scripts/vzorci/pl-ckm-*.html` fixtures with provenance manifest.

**Interfaces:** `parseCkmReport(html, { url })` returns `{ source, sourceUrl, sourceId, rawSha256, header, teams, events, sourceExtras, issues, warnings, appearances, goals, accounting, reportStatistikaPripravljena, activationEligible, sezonskiUvozPodprt }`. Issues/warnings have stable `code`, `message`, optional `side` and `actor`; failed validation returns `appearances:null`, `goals:null`, `accounting:null`. Header contains exact league, round, score, local date/time and home/away names; season:null plus dateDerivedSeason and seasonEvidence:date-derived. SEASON_CONTEXT_REQUIRED is a context issue that does not block independently reconciled individual facts, but never enables import. Teams retain scoped source profile URLs and explicit position evidence. Events preserve source text/minute and resolve unique roster identities in the exact side. Duration is the observed normal senior 90-minute format; unobserved extra-time/unknown clock formats hold rather than clamp/guess.

- [x] Create minimized authentic fixtures from retained main report DOM, preserving canonical URL/body post ID/main sidebar contrast and fixture/source SHA provenance; remove non-football scripts/styles/images/staff only.
- [x] Write meaningful failing tests: complete current report 11+11/15+17, five substitutions/two goals/six yellows/one red and 990/983 team minutes; partial report missing away/timeline; archive nine starters and actual old league/season; duplicate actor; score contradiction; missing GK; invalid interval; unknown actor/event; missing red evidence; hidden widget/script/template decoys; scope/canonical mismatch; fallback canonical identity; no input mutation.
- [x] Run `node --test scripts/test-ckm-report.mjs`; retain expected RED evidence before implementation.
- [x] Implement bounded HTML tokenization and exact main-section extraction; produce typed missing/contradictory evidence issues.
- [x] Implement resolved event/interval accounting; require goals against score and per-team minute/red reconciliation. Retain second-yellow evidence warning without inventing red timing.
- [x] Re-run the focused suite to GREEN and review all typed held outputs.

### Task 2: Local report-screen CLI and verification

**Files:** Create `scripts/preveri-ckm-zapisnik.mjs`; extend `scripts/test-ckm-report.mjs`.

**Interfaces:** `node scripts/preveri-ckm-zapisnik.mjs --datoteka <local.html> --url <observed-event-url>` emits parser JSON; exits 0 for report-ready, 2 for held report, 1 for argument/read errors. It never fetches URLs and never writes a database/file.

- [x] Write CLI tests for complete/held/error output, explicit local path plus URL requirement, invalid arguments and unchanged fixture bytes; run to RED before CLI code.
- [x] Implement CLI using built-in fs and parser only, then run focused tests to GREEN.
- [x] Run required `npm run smoke` and repository test command in the isolated worktree without production credentials; report environment-only failures by name. No service secrets are read or fabricated.
- [x] Verify diff/fixtures/CLI behavior and commit frozen implementation with test evidence; parent performs independent review before integration.

## Execution Ledger

- Planning: native worktree tool failed before creating anything (`not a git repository` for task cwd); authorized git fallback created `/Users/jernejjankocica/Projects/SLFF/.worktrees/polish-ckm-screen` at base `1d05c29a`.
- Ruling: event's own date determines football season because captured main headers have date but no explicit season. Expose season:null/dateDerivedSeason and preserve this derivation in `seasonEvidence`; refuse absent/invalid date rather than consuming sidebar season.
- Ruling: main hero exposes exact team names but no team profile IDs. Retain `sourceId:null` for teams; identify actors by side + observed player profile, without inventing club IDs.

- Baseline: npm test exits 1 before network because local anon/service keys are absent; no .env copied and no database touched. Continue with offline implementation per scope.
- RED: 20 behavioral tests fail on missing parser export; retained parser-red.log in external evidence directory.

- Task 1: complete — 20 parser tests RED (missing export) → GREEN, original raw captures also yield complete=true / partial=false / archive=false. Derived season is explicitly unconfirmed and never enables import.
- Task 2: CLI tests RED (missing executable) → GREEN. Node 22.23.1: 28/28 passing. Node26: 28/28 passing. Fixture original/transformed SHA checks pass.
- Repository source suite: 2176 tests, 1944 pass, 232 skip, 0 failures. npm run smoke reached UI renderer and failed only for missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY; renderer retried separately with explicit local test placeholders (no real credentials).

- Verification complete: UI render smoke passes with VSE OK using explicit local placeholders. Combined with the green 2176-test source suite, both npm run smoke stages passed. npm test remains blocked before network by absent local anon/service keys. No production credentials or .env were used.
- Review handoff: parent owns independent review; no sub-agents spawned (explicit task constraint). All new source/package/country/CI registration remains absent.

- Independent parent review found P2 literal/inert scope false acceptance: textarea/xmp/iframe body wrappers were interpreted as report elements. Reproduced before fixing; new scope regression suite initially had 34 failures.
- Fix: consume raw-text elements atomically; give template/SVG/MathML fragments isolated boundaries; refuse unclosed/malformed/unsupported boundaries and ambiguous script escape states. Duplicate attributes and duplicate primary header fields hold statistics. This remains a bounded report reader, not a browser HTML implementation.
- Scope fix verification: 74/74 focused tests pass on Node 22.23.1. Full original captures produce exactly equal JSON outputs to the prior frozen version (complete/held/held); football reconciliation code unchanged. No source network or unchanged repository-wide suite rerun, per parent review instruction.
