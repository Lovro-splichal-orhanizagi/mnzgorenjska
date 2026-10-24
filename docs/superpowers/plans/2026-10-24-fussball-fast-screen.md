# FUSSBALL fast screen implementation plan

> **For agentic workers:** Execute inline with test-driven development; parent owns final frozen-code review and live-source authorization. Steps use checkbox syntax.

**Goal:** Screen at most three actually linked played reports without collecting a whole season, preserving honest original-byte evidence.

**Architecture:** Reuse the existing serialized capture client, strict scoped discovery, lazy font loader and report parser. Add a bounded one/two-round screen, separate screen-only evidence/replay, and CLI; keep season/import envelopes unchanged.

**Tech Stack:** Node 22 built-ins; no dependencies or database/environment access.

**Spec:** `docs/superpowers/specs/2026-10-23-german-season-capture-design.md`, extended by the owner's bounded screening instruction.

## Global constraints

- Explicit request budget 1–80, including HTML, CSS and fonts; 6000 ms spacing; no redirects or retries; first source failure stops everything.
- At most seed plus one advertised earlier round; at most three played reports. No complete-season/activation/import claim.
- Actual canonical/selector/report/lineup/font links only; strict season, staffel and fixture/report header agreement. Previous-season links are observations, not verified pairing.
- Retain original bytes, hashes and append-only attempt journal. Replay uses only verified local bytes and identical code.
- No production, package/CI/country-documentation changes or live GETs before parent review.

## Review focus

- Real-date validation rejects impossible dated routes before fetch; query/foreign/hidden references never expand scope.
- Sample limit does not silently traverse the advertised season; extra round must be an actual selector link and contain completed fixtures.
- Anonymous players/dismissals/unknown goalkeepers remain typed rejects; stop sampling after a rejected report.
- Failure persists partial evidence, while offline verification rejects failed, corrupted, substituted or unused evidence.
- Existing season/import result shapes remain unchanged after minimal helper extraction.

### Task 1: Shared route and strict report helpers

Files: `scripts/lib/fussball-capture.mjs`, `scripts/viri/fussball-discovery.mjs`, `scripts/fussball-season.mjs`, `scripts/test-fussball-screen.mjs`.

- [x] Write date admission and extraction/strict result regressions; observe RED.
- [x] Admit only valid observed dated round routes; expose minimal existing lazy-parser/report helpers without relaxing old behavior.
- [x] Run new tests plus existing transport/discovery/season regressions GREEN.

### Task 2: Bounded screen and evidence CLI

Files: `scripts/fussball-screen.mjs`, `scripts/zajemi-fussball-vzorec.mjs`, `scripts/test-fussball-screen.mjs`.

Interfaces: `collectFussballScreen({seedUrl,staffel,season,maxRequests,reportLimit,asOfDate,client})`; `captureFussballScreenDirectory({directory,options,fetchFn})`; `verifyFussballScreenDirectory(directory)`; CLI `capture --seed-url URL --staffel ID --season YYYY/YY --max-requests N --reports 1..3 --output DIR` / `verify DIR`.

- [x] Write authentic parser/sample, no-season-enumeration, hidden/wrong-scope/foreign-link, refusal/budget, typed-rejection and evidence-corruption tests; observe RED.
- [x] Implement deterministic bounded screen and separate `screen-manifest.json`/`screen-result.json`, preserving originals/journal.
- [x] Run focused and broader source regressions plus smoke; record exact results and frozen commit for parent review.

## Execution ledger

- Parent integration adds `preveri-fussball-vzorec.yml`: exact-main SHA guard,
  environment-quoted scope, maximum 80 requests/3 reports, shared global
  FUSSBALL source concurrency, no credentials, offline verification and
  always-uploaded separate screen artifact. Independent workflow review and
  integrated smoke are required before merge; no screen artifact grants import.

- Native managed-worktree creation failed because host task cwd is not a Git repository. Reused no occupied checkout; created isolated fallback `/tmp/slff-fussball-fast-screen-20261024` from `1d05c29a`.
- Owner explicitly authorizes inline extension and execution choices; no repeated plan approval is needed.

- Baseline: 54 existing transport/discovery/season/evidence tests passed.
- RED: initial dated route and absent screen API failures observed; separate foreign-SVG, invalid timestamp, mismatched client budget and in-report budget exhaustion regressions observed failing before fixes.
- GREEN: Node 22.23.1 German suite 238 tests / 237 pass / 1 guarded SQL skip / 0 fail, including 18 screen tests.
- Broader source suite: 2176 tests / 1944 pass / 232 explicit private-fixture/SQL skips / 0 fail. Initial SSR smoke required public configuration; isolated rerun with dummy localhost URL and placeholder anon string returned VSE OK. No secrets were read.
- Independent closed-map replay of all retained Mannheim sample bytes preserved the complete previous result exactly: 5 accepted / 6 rejected, 204 reads, zero network requests.
- Ruling: select the first actually advertised earlier round if the seed has no completed fixture; confirm completion from its published score/date, and stop after this one extra page even if empty. This avoids assuming weekly cadence or inventing URLs; a later first-round edge case can yield no sample.
- Test evidence limitation: the three-report orchestration case uses explicitly labeled synthetic identity variants of the authentic Ilvesheim fixture; it proves bounded strict-parser orchestration, not three distinct newly observed official reports.
- Parent owns final independent frozen-code review, CI wiring and the later explicitly bounded live source pass. No live GETs or production changes performed here.
- Frozen review found two P2s in b08d8bed. Both were reproduced RED before fixes: cross-cwd capture/replay fingerprint disagreement, and SVG selector authorization with uppercase/space closing boundaries.
- Review fixes: root-resolved closure discovery with stable relative hash names; opt-in structural foreign-context tracking in the existing live-tag scanner (default report/season scanning unchanged). Cases include `</SVG>`, `</svg >`, and nested mixed-case SVG/MathML boundaries.
- Final focused verification after fixes: Node 22.23.1, 240 German tests / 239 pass / 1 guarded SQL skip / 0 failures; 20 screen tests including actual absolute CLI verification from unrelated cwd. Fresh Mannheim closed-map replay verifies all 321 retained hashes and preserves the old result exactly (5 accepted / 6 rejected / 204 reads / 0 network).
