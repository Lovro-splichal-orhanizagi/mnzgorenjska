# FCF current release packet checkpoint

> **For agentic workers:** Execute inline under the existing reviewed-history plan. No delegation, source calls, production writes or workflow mode expansion.

**Goal:** Compile and independently replay a closed, exact-text release packet for the three approved current-season groups.

**Architecture:** Consume previously authenticated raw document descriptors, re-run existing pure source validation and strict statistics parsing, and derive every canonical field. Bind the exact SQL-produced cleanup before-image text and its actual UTF8 hash. Bind the fresh read-only database imported-ID inventory and refuse any complete-to-pending downgrade. This checkpoint provides no mutation or activation capability.

**Tech stack:** Node ESM, built-in test/assert/crypto, existing FCF parser and common policy registry.

**Spec:** `docs/superpowers/specs/2026-10-18-fcf-reviewed-history-design.md`.

## Constraints and assumptions

- Fixed groups and blocks: G1 4109388–4109627, G2 4116188–4116427, G9 4118349–4118588; 240 fixtures, 30 rounds, 16 native club/category identities per group.
- Four exact marker raw documents must pass the existing immutable classifier. All other documents use strict current source proof. Round identity comes from source headers, never numeric ID order.
- Source metadata is accepted only after an authenticated artifact consumer has verified its transport. This pure compiler checks descriptor consistency and retains original lineage; it does not authenticate a GitHub API response itself.
- Original cache mtimes remain cache mtimes and cannot become capture timestamps. Approved original marker receipts are pinned to their genuine captures. An offline audit timestamp never refreshes source age.
- Exact packet text/SHA is independently replayed against the same closed raw set before any later importer uses it. SQL-produced backup text remains opaque UTF8; parsing never regenerates it.
- Owner ruling: replace the predecessor's unfinished untracked label-only helper; it was workdata, not an approved implementation. Retain the dedicated workflow in cache-export mode.

## Review focus

- Missing/extra/duplicate raw documents, foreign native identities, calendar collisions and wrong policy fail closed.
- Parser-derived player IDs, appearances, goals and official keeper flags cannot be caller supplied.
- Unknown source lineage, future/stale source timestamps and changed original marker receipts fail.
- Changed packet bytes, changed cleanup numeric formatting and changed raw bytes fail independent replay.
- This module proves no actual production readiness, pricing, legal squad, DB equality or activation; migration180400 and Actions writer remain subsequent work.

## Steps

- [x] Write full-calendar fixture and failing packet compilation/replay tests; run RED.
- [x] Implement pure closed compiler and exact-text replay; run affected tests with retained genuine exceptions enabled.
- [x] Add adversarial calendar/receipt/canonical mutation tests and verify RED/GREEN.
- [x] Register packet tests in source suite, run necessary affected suite once, commit checkpoint and hand to root for review.

## Checkpoint interfaces

- `proveFcfCurrentReleaseDocument({competition, document, now})` derives one canonical fixture from `html`, exact `receipt`, authenticated `lineage`, native `id` and source `expectedSourceRound`. Historical originals use the pinned genuine October18 receipt; normal/future documents use verified Actions artifact lineage. This helper performs no IO.
- `validateFcfCurrentReleaseCalendar(fixtures)` verifies the 240 directed native club/category pairings, eight fixtures and every club per each of30 rounds, consistent names and full explicit starter-keeper coverage.
- `compileFcfCurrentReleasePacket({sourceCommit, groups, databaseInventory, beforeImageText, beforeSha256, now})` returns `{manifestText, manifestSha256}`. Groups contain exact approved inactive competition objects and240 raw document descriptors each. It independently parses every source body and preserves original source timestamps. Inventory uses the same `explicitBEGIN_READ_ONLY_ROLLBACK` contract as the existing audit compiler; all imported IDs must remain complete or an exact historical marker.
- `verifyFcfCurrentReleasePacket({...sameInputs, manifestText, manifestSha256, now})` rebuilds every canonical and compares exact packet text and SHA, retaining its original audit time and checking freshness at replay time.

Full packet integration uses the private retained four originals with `FCF_HISTORICAL_RETAINED_DIR`; ordinary CI separately exercises normal/pending strict document proof and native calendar validation with synthetic controls. The full synthetic calendar is test data and makes no claim about actual720 retained bodies, actual current import counts, prices, DB equality or launch readiness. The workflow and production privileges are unchanged.

## Verification

- RED: missing compiler/document proof exports failed before implementation; missing DB inventory and complete-to-pending downgrade tests failed with “Missing expected exception” before the inventory binding was added.
- Focused final: packet + strict current-source proof + historical-policy tests **94/94 passed, zero skipped** with genuine private retained originals enabled. Packet cases: **22/22**.
- CI configuration without private originals: **5 passed,17 explicitly skipped**, zero failures. Always-on controls cover strict normal player/keeper/goal derivation, pending null statistics, fresh R6 requirement, calendar pairings/participation and keeper coverage.
- Syntax checks and `git diff --check` passed. No source requests, source cache changes, DB writes, deployment, workflow edits or other-country edits. Existing unchanged full source suite was not repeated per root's focused-check instruction.
- Next checkpoint: authenticated audit-artifact adapter, deny-all-unpacketized-FCF offline preloader/importer, source CLI/workflow mode only after review, migration180400 readiness/activation gate. None is provided by this pure packet checkpoint.
