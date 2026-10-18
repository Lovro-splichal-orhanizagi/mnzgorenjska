# FCF G13 Cache Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkboxes.

**Goal:** Recover bounded cached primary G13 identity/calendar evidence without provider reads or DB writes.
**Architecture:** Separate fixed-cache workflow and safe bounded head inventory/raw selection; existing audits unchanged.
**Tech Stack:** Node22 built-ins and existing FCF pure head/RSC functions, GitHub cache restore/artifact actions.
**Spec:** docs/superpowers/specs/2026-10-18-fcf-g13-cache-evidence-design.md

## Global Constraints
- Exactly two immutable cache keys and two fixed240-ID blocks in spec; <=13 raw bodies/key, <=2MiB/body.
- Never provider GET/DB keys/write or importer/cache modification. Keep seven-audit helpers/workflows byte-identical.
- Unknown historical freshness/provenance remains unknown; exact restore hit required.
- Main-only15minute read-only jobs; controller owns actual one dispatch after code review/CI/merge.

## Review Focus
- Unsafe/cache-mismatch inputs refuse export; safety tree tests.
- Missing/invalid/foreign source heads are recorded truthfully; fixture tests.
- Club/category links derive from correct header side, no player link mistaken as club; authentic-style head test.
- Only exact R8/R23 target pair adds raw bodies, duplicates fail; count/direction/ambiguity tests.
- Stale or failed output cannot upload; artifact-ready and workflow checks.

### Task 1: Bounded G13 cache diagnostic

**Files:** Create scripts/izvozi-fcf-g13-predpomnjene-dokaze.mjs, scripts/test-fcf-g13-predpomnjene-dokaze.mjs, .github/workflows/fcf-g13-predpomnjeni-dokazi.yml; modify docs/viri/spanija.md and test:sources package.json wiring only. Any proposed shared safety extraction requires controller ruling first.
**Interfaces:** Reuse pure FCF glavaStrani/drevoRsc with fetch forbidden. Produce separate fixed g13 diagnostic output directory containing manifest.json, derived heads.json and <=13selectedacta rawfiles. Export a testable safe extraction function and CLI with artifact-ready report. Do not change existing audit interfaces.

- [ ] Step1: Read spec, CLAUDE source rules, existing safe seven-cache exporter and fixed-cache workflow. Write focused tests for all spec failure/selection/provenance/workflow cases; source fixtures may be tiny constructed RSC, explicitly testdata. No pretend original raw proof.
- [ ] Step2: Run focused tests RED before helper implementation; record expected failure.
- [ ] Step3: Implement bounded fixed-key/fixed-block diagnostic and exact main-only workflow. Preserve original seven files byte-identical. Add brief source-doc operating note and test wiring.
- [ ] Step4: Run GREEN focused tests, existing seven-cache audit tests/coordination tests, then npm run smoke Node22. Syntax/diff check. No source GET or DB tests. Record actual results/warnings.
- [ ] Step5: Self-review, commit only task files and report exact evidence to supplied SDD report. No nested agents, push, action dispatch, merge or production writes.
