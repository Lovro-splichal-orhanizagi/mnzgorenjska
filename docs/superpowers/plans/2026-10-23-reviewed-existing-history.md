# Reviewed existing history implementation plan

> **For agentic workers:** Use subagent-driven-development for the independent units below; the parent integrates and verifies them.

**Goal:** Release the six exact owner-approved prelaunch exclusions and activate each league only after fresh checks.

**Architecture:** Extend immutable existing historical policy and marker infrastructure for exact HLF/Ishtmian/NFSBiH tuples. Reuse existing position/pricing commands and independent native audits. Keep each league independently reviewable and releasable.

**Tech Stack:** Node 22, PostgreSQL/Supabase, GitHub Actions.

**Spec:** ../specs/2026-10-23-reviewed-existing-history-design.md

## Global constraints

No production writes outside GitHub Actions, local .env or service-key reads, guessed facts, expanded exception sets, or retries after ambiguous writes. Beforeimages and source proofs are immutable and hash-bound.

## Review focus

Unknown runtime bindings must fail before provider requests. Extra exceptions must fail. Cleanup must preserve all unaffected football rows and scores. New user activity must abort. Price/source/deadline changes after preview must prevent activation.

## Tasks

- [x] Policy/runtime: add four immutable policies and eleven club bindings from retained source proofs; exact native tuple checks; installed report-ID mapping and preskips. RED/GREEN classifier, wrapper and authentic fixture tests.
- [x] Native SQL: service-only prepare/apply/receipt/price/check RPCs; exact rows and dependencies; full canonical beforeimage; atomic cleanup, derived-cache refresh and installed markers; current report/GK/minute/score, legal squad and future opening checks. Real disposable SQL tests must demonstrate rollback, ACLs and state drift holds.
- [x] Actions operator: fixed slug/mode allowlists, exact main/policy pins, authenticated prepare artifact, ordered price commands and no ambiguous write retries. Dependency and real CLI boundary tests before implementation.
- [ ] Integration: full source and smoke suites, disposable SQL tests, independent review, required CI, merge/deploy, then prepare/apply/reprice/preview/pinned activation and native/public readbacks for each league. Save receipts outside the repository as rollout evidence.
