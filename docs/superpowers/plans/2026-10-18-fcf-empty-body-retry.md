# Bounded FCF Empty-Body Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover one transient empty FCF HTTP200 report response with a paced source-local retry, while preserving hard refusals and strict audit budgets.

**Architecture:** Extend only the existing source fetch wrapper with an explicit two-native-attempt state machine. Keep shared transport/DFB bytes unchanged, preserve source validation and the fixed-seven reader's independent no-retry transport.

**Tech Stack:** Existing Node22 ESM, native Response/AbortSignal and node:test; no dependencies.

**Spec:** docs/superpowers/specs/2026-10-18-fcf-empty-body-retry-design.md

## Global Constraints

- Offline implementation/reviews only: no provider/network/DB/key/Actions/remote/outreach/activation/subagents by implementer or reviewers. No npmtest (writesDB).
- Only exact first empty text-length0 HTTP200, unredirected, original raw-string request exactly matching the existing fixed https://www.fcf.cat/ca/competicio/acta/<positive-decimal-ID> URL with no credentials/port/query/fragment qualifies for ONE extra native fetch. Never retry whitespace, nonempty invalid pages, challenges, redirected empty or foreignURL on this path.
- Per fcfFetch invocation max2 native calls; delay Math.ceil(15000*factor) using lazy finite factor>=1, absent1, computed delay<=2147483647, invalid/zero/negative/overflow reject before native fetch. Retain existing per-attempt90000ms header/body timeout and incoming-signal override.
- Status403/429 immediately best-effort cancel without awaiting/hanging or leaking cancellation failures, then throw existing FcfZavrnitev before shared retries. Persistent empty second response throws clear nontransient Error; no empty response from qualifying recovery reaches cache/parser. Ineligible first responses retain existing pass-through behavior and receive no local retry.
- Shared normal network/5xx max4 remains unchanged: mixed empty/network paths max8 native calls overall, empty-only max2. No fake HTTP/network codes, new proxy/URL/header/UA/credentials or shared transport/cache/parser/scoring/price changes.
- scripts/prenos.mjs, all18 DFB dependencies and fixed-seven helper/workflow must stay byte-identical. Actual audit39082161817 is already dispatched ONCE and cannot be rerun by this task. Its capture remains one native attempt/no retries.
- Product files only scripts/viri/fcf.mjs, new scripts/test-fcf-transport.mjs, package.json test:sources registration, docs/viri/spanija.md. Spec/plan commits are root-owned.

## Review Focus

- A source refusing on the second response must stop without any third shared-transport attempt.
- A persistent empty body must never escape to cache, and must stop at2 even under normal outer retry configuration.
- A large/invalid pacing factor must fail before any request, and lazy import must leave the independent audit intact.
- The normal90-second body timeout must not become the outer30-second header-only timeout.
- Nonempty valid source bodies/status/headers and parser/appearance output must remain unchanged.

---

### Task 1: Add source-local empty200 recovery and integrated transport tests

**Files:** Modify scripts/viri/fcf.mjs, package.json, docs/viri/spanija.md. Create scripts/test-fcf-transport.mjs.

**Interfaces:** Existing fcfFetch(url,moznosti={}) -> Promise<Response>, existing FcfZavrnitev(message,status), existing actual prenesiSPonovitvami(url,{fetchFn,premorMs,zamiki,log}) and pozabiPadle. Keep all public signatures and shared files unchanged. Existing fixed-seven native guard lives scripts/zajemi-fcf-javne-dokaze.mjs; its tests scripts/test-zajemi-fcf-javne-dokaze.mjs enforce no retry. Node22 path /Users/jernejjankocica/.nvm/versions/node/v22.23.1/bin; smoke dummyURL=http://127.0.0.1:54321, anon=offline-smoke. Actual empty failure logs: /private/tmp/slff-go-live-evidence/overnight/es-nightly-39067772682.log and g4-refresh-39073954204.log.

- [ ] Step1: Read spec/relevant transport boundaries. Write meaningful tests against actual fcfFetch + actual shared prenesiSPonovitvami at external native fetch/time boundaries. Reproduce empty200->valid failure before implementation with actual command/output RED. Do not mock the wrapper or shared pacing logic.
- [ ] Step2: Implement smallest source-local two-attempt state machine, fixed URL/no-redirect qualification and lazy factor validation. Preserve native request options, headers, URL and current incoming-signal stripping. New AbortSignal90000 each attempt covers text reading. Second empty is nontransient. First/second403429 cancel best-effort/nonblocking and throw FcfZavrnitev; cancellation failures never replace the refusal.
- [ ] Step3: Test valid nonempty pass-through, empty->valid at exact paced boundary, persistentempty exactly2, whitespace/missing-acta/challenge no extra retry, redirect/foreign/noqualifying URL cases, first/second403429 with pending/sync-throw/rejected body cancellation, factor absent/1/fractional/invalid/zero/negative/nonfinite/overflow, headers/options and fresh90000ms signals. Test existing500/network path and actual compounded mixed bound<=8, default outer persistentempty2, and zamiki[] strict/native guard still1. Keep test doubles only external network/time, reset host failure state and restore all global hooks safely.
- [ ] Step4: Register focused test in test:sources and document recovery/request bounds/refusal policy. Run focused file, existing strict audit+coordinator tests, npm run smoke with dummyofflineenv, git diff --check. Verify existing FCF source fixture parsing+appearances identical to base000f2ec; retain byte/hash proof of shared transport/all DFB dependencies/strict reader unchanged. Do not run DB E2E or source collectors.
- [ ] Step5: Self-review exact scope, no imported-time configuration side effects or fabricated outcomes; commit product changes. Write .superpowers/sdd/2026-10-18-fcf-empty-body-retry/task-1-report.md with actual RED/GREEN commands/output, scope, preservation evidence, finite compound bound and concerns. Return status/commits/one-line tests/concerns only. No root ledger edits or subagents.
