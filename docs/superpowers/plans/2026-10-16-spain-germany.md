# Spain and Germany Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task.

**Goal:** Turn validated decoder prototypes into reliable source adapters where captured source data supports end-to-end correctness.
**Architecture:** Follow scripts/viri/fcf.mjs source contract. Keep per-document obfuscation resolution separate from match parsing and network/cache policy. Fail before writes on ambiguous or unsupported data.
**Tech Stack:** Node ESM, existing dependencies, node:test.
**Spec:** docs/superpowers/specs/2026-10-16-spain-germany-design.md

## Global Constraints

No production database writes or league activation during development.
Use existing dependencies.
Reject unsupported obfuscation; stop on challenges and 401/403/429.
No fabricated results, identities or league/archive codes.

## Review Focus

- A decoy score or wrong font mapping must never become an accepted result.
- Missing/ambiguous players or events must not silently produce complete fantasy statistics.
- Repeated substitutions and stoppage time must yield valid minutes or explicit rejection.
- Country/source IDs must not collide with existing matches or numeric player registration IDs.
- A partial/truncated/challenge page must not be cached as valid forever.

### Task 1: Novanet source

**Files:** Create scripts/viri/novanet.mjs, scripts/test-novanet.mjs and report/round fixtures under scripts/vzorci/. Decoder remains scripts/viri/novanet-izidi.mjs. Registry/docs/package changes belong to Task 3.
**Interfaces:** Default source object compatible with fcf.mjs: ime, glave, premorMs, kljucKluba, kratkoIme, seznamZapisnikov, razberiZapisnik, nastopi, razpored. Export pure parsers for fixture validation.
- [x] Read existing source contract and captured Aragón/Galicia reports and rounds; record supported formats and code syntax.
- [x] Add failing integration tests asserting independently read teams, dates, round, decoded scores, lineup identities, goalkeeper, substitutions, goals/cards and resulting minutes. Add missing-player, mismatch, challenge and incomplete-report cases.
- [x] Implement strict source parsing and bounded network/cache behavior using existing decoder.
- [x] Run node --test scripts/test-novanet.mjs scripts/test-novanet-izidi.mjs; record evidence and unresolved formats.

### Task 2: Germany field binding and feasibility

**Files:** scripts/viri/fussball-pisava.mjs; new scripts/viri/fussball.mjs and scripts/test-fussball.mjs if evidence supports a complete adapter; captured fixtures scripts/vzorci/de-*.
**Interfaces:** Each obfuscated field requires the exact font referenced by its data-obfuscation. Complete adapter uses same default contract as Task 1.
- [x] Inspect saved full match, lineup/course and league pages; obtain additional ordinary live captures if browser access works.
- [x] Identify independent score/date and player-ID evidence. Write failing tests for wrong-font binding, unresolved glyphs, damaged pages and match-output consistency.
- [x] Implement only evidence-backed decoding/parsing. Preserve explicit unsupported-format errors where full support is not established.
- [x] Run all Germany decoder/parser tests and record real versus synthetic validation coverage.

### Task 3: Integration and review

**Files:** scripts/viri/index.mjs, package.json, CLAUDE.md, README.md; inactive migration only with verified source codes.
- [x] Register only complete source adapters; add CLI validation of saved reports without database writes.
- [x] Add inactive league seeds only where current/archive configuration is verified. Otherwise document the precise missing configuration.
- [x] Run decoder/source tests, npm run smoke, npm run build, git diff --check. Run npm test for any migration.
- [x] Request independent code review and fix correctness findings with regression tests.
- [x] Report supported behavior and remaining deployment/validation gaps without claiming universal coverage.

## Execution rulings

The user's request authorizes implementation using the existing application architecture. Work continues in the current workspace to preserve the already modified decoder files; .git is read-only in this sandbox, so no worktree, commits or pushes. No additional approval is needed for reversible local implementation. Scope remains evidence-led: incomplete adapters are not advertised as playable leagues.

## Verification and remaining deployment work

2026-10-16: Novanet decoder/source, Germany name/score/date and saved-report/round validators implemented and independently reviewed. Germany deliberately remains unregistered: the real public card events omit identities, so all appearances remain withheld. No inactive seed was fabricated because no current/archive pair has been verified. No production writes or league activation.

Final fresh checks: 84 focused tests passed, including the club-namespace and changed-glyph regressions; production build passed. Independent review confirmed all reported fixes. Full smoke reaches existing checks but cannot finish because this sandbox denies listening on 127.0.0.1 (EPERM). No schema/RLS changes were made. The source adapter still needs live whole-season/archive validation and the normal position/price pipeline before any league activation. These are outstanding rollout requirements, not completed production support.

Ruling: Source-facing stored club names carry the federation qualifier to avoid sharing a Spanish club merely because a different federation uses the same name. Short names omit the qualifier. This follows the existing global country/name team constraint without changing the schema.
