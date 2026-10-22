# German amateur season collection implementation plan

> **For agentic workers:** Use bounded delegated transport work and root integration; tests first and one final independent review. Steps use checkbox syntax.

**Goal:** Collect and replay a complete German amateur season with honest report coverage, then use proven pilot evidence to continue toward production imports.

**Architecture:** Add a serialized public-source capture client, scoped discovery helpers and a season collector/CLI around existing parsers. Keep production registration and identity mapping behind complete pilot evidence. Run the existing Romanian readiness workflow independently for nearer launches.

**Tech Stack:** Node 22, built-in fetch/crypto/filesystem, existing font/round/fantasy parsers and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-german-season-capture-design.md`

## Global constraints

- No source or production policy relaxation, guessed roles, new messages or purchases.
- Request budget required, 1–4000; at least 6000 ms between network starts; timeout 30000 ms.
- Only exact public FUSSBALL routes, manual redirects and no retries. A source failure stops the whole capture, including queued and cached reads.
- Limits: HTML/WOFF 8 MiB, CSS 64 KiB. Preserve original bytes and count failed attempts.
- No database/env access from collector; source namespaces remain strings.
- Complete schedule before reports; exact scope/header comparisons; sample output is never league-ready.

## Review focus

- Concurrent requests after a denial must not leak another network request.
- Markup hidden in scripts/templates/comments/attributes must not introduce source requests or evidence.
- A round selector or fixture assignment changing during collection must produce a hold.
- Source challenge is a capture failure, not a missing-statistics exception.
- Offline replay must not trust substituted bytes, paths, hashes, status or caller-provided ready flags.

## Task 1 Bounded transport

**Files:** `scripts/lib/fussball-capture.mjs`, `scripts/lib/fussball-capture.test.mjs`.

**Interface:** `createFussballCaptureClient({maxRequests,fetchFn=fetch,now=Date.now,sleep,onAttempt,onDocument})` returns `{read(url,kind),snapshot()}`. `read` resolves `{url,kind,bytes,sha256,status,contentType,capturedAt}`. Kinds `round`, `report`, `lineup`, `css`, `font`. Ledger includes actual attempts and stop state. Callbacks are awaited; callback failure is terminal.

- [x] Add and run failing behavior tests for serialization, 6000 ms pacing, deduplication, counting, denial/queued/cached stops, route/MIME/size and callback failures.
- [x] Implement minimal client and run tests green without live requests.

## Task 2 Scoped discovery and season assembly

**Files:** `scripts/viri/fussball-discovery.mjs`, `scripts/test-fussball-discovery.mjs`, `scripts/fussball-season.mjs`, `scripts/test-fussball-season.mjs`, authentic fresh round fixture/font manifest.

**Interfaces:** Discovery provides exact page identity, requested fonts, round/season links and lineup link; season assembly consumes `client.read` and existing raw parsers. Return schedule, complete/rejected reports, coverage and explicit false activation eligibility.

- [x] Write failing real-fixture discovery and inert-decoy/scope tests; implement scoped extraction.
- [x] Write failing complete-round inventory, duplicate/conflicting fixtures and report-header/coverage tests; implement assembly and strict report integration.
- [x] Verify all source behavior offline against old and fresh real fixtures.

## Task 3 CLI, offline evidence and pilot

**Files:** `scripts/zajemi-fussball-sezono.mjs`, `scripts/fussball-capture-evidence.mjs`, focused CLI/evidence tests, source documentation and CI test wiring.

- [x] Test and implement content-addressed originals, append-only request ledger, manifest, deterministic offline replay and failure-safe partial evidence.
- [ ] Run bounded real collection using the reviewed client; inspect actual supported formats and complete schedule/report coverage before proposing a production identity/import change.
- [ ] Keep building the proven route; if blocked by real source refusal or missing facts, retain precise evidence and continue independent ready-country work.

## Task 4 Review and delivery

- [x] Run focused suites, full source regressions and necessary CI checks; one independent whole-branch review and verified fixes.
- [ ] Merge/deploy passing changes under existing autonomous rollout authorization.
- [ ] Report actual new leagues separately from new source capability; preserve durable evidence.

## Execution ledger

- User instruction: “please try finding something and just keep building.” Existing authorization covers bounded cheaper delegation, implementation, review and deployment without repeated plan approval.
- Baseline: isolated linked worktree, new branch `rollout/large-countries-20261022` at `57fae5de`; 128 existing FUSSBALL tests pass.
- Source selection: France and Portugal returned 403 and are stopped. Brazil is a separate future lead, not verified nationwide coverage. Fresh German round 9 and both bound WOFFs pass the existing decoder. Romanian existing candidates are being inspected separately through the production read-only preview.

- Validation: 187 German capture/parser checks pass, source regressions 1720 pass / 223 explicit private-fixture skips / 0 failures, typecheck and build pass. Review found the hosted 4000-request/360-minute mismatch and midnight date race; hosted jobs are capped at 3000 and a RED→GREEN midnight regression pins the default date to createdAt.
- Real capture is running from immutable checkpoint b3cbcfc2. Its exact original code is retained in /tmp/slff-fussball-capture-b3cbcfc2 for faithful replay; subsequent date-fix code must not silently claim that earlier capture.
- Independent production track: Romanian refresh 39862550956 and pricing 39863827462 completed. Fresh two-league preview 39864655066 passed; activation 39864849337 and independent native readback confirm ro-ab-l5-s1 and ro-cj-l5-gherla active at first round 7. Three other candidates remain HOLD with exact report evidence.
