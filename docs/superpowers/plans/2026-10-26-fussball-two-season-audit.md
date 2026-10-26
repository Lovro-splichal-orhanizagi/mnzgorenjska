# GitHub two-season FUSSBALL audit implementation plan

> **For agentic workers:** Use the existing isolated worktree and a bounded implementation/review. The owner approved the two-season pilot and 5,000 cumulative source requests and asked that execution run on GitHub servers.

**Goal:** Execute the approved Baden current-season audit and conditional archive audit entirely on GitHub Actions, without a local controller or production data writes.

**Architecture:** Extend the existing `preveri-fussball-sezono.yml` with an optional JSON archive tuple and cumulative budget inputs. Preserve its ordinary single-season behavior and existing current artifact name. A second job downloads and verifies the first job's originals, validates the exact observed adjacent-season selector and remaining budget, then runs the ordinary collector/verifier. Both jobs use the immutable parent run SHA and existing host coordinator.

**Tech Stack:** Node22 ESM, GitHub Actions, existing source capture and replay APIs.

**Spec:** Owner-approved `league-rollout-evidence/2026-10-26-german-unlock-screen/baden-full-season-pilot-plan.json` outside this checkout. Current scope: staffel03188V27L800000JVS5489BTVU7GTVLE-G,2026/27,max1500; archive02TGLSVQ1800000IVS5489BTVTLPPK10-G,2025/26,max3000; prior363,total cap5000.

## Constraints

- Six-second starts; source refusal/transport failure stops the continuation. No retries, alternative access, photos, database credentials or activation.
- Require exact main/repository/reviewed SHA and run_attempt1 for the optional two-season mode.
- Prior363 stays counted; reserve both maxima before reading source, then account actual current requests before archive.
- Empty optional archive keeps the existing single-season interface/artifact unchanged.
- Current artifact `fussball-season-${run_id}`; archive artifact gets a distinct name and never masquerades as the current artifact.
- Existing production admission guards stay unchanged; these source-only audits are not activation proof.

## Review focus

- A failed/partial current capture or failed offline replay never enables archive requests.
- Archive must be the exact live observed adjacent-season link from verified current originals; no invented identifiers.
- Malformed/cross-host scope, missing/duplicate archive pairing, understated prior requests and cap overflow must be rejected.
- Current and archive run sequentially on hosted runners under the same immutable SHA; a laptop shutdown cannot prevent the archive handoff.
- Rerunning a source-reading workflow is refused; cumulative accounting and original timestamps remain honest.

## Task: optional hosted archive continuation

Files: existing workflow; new focused `scripts/fussball-season-pilot.mjs` CLI/helper and `scripts/test-fussball-season-pilot.mjs`; German source documentation.

- [x] Write failing helper/CLI tests for ordinary mode, exact approved budget boundaries, archive link binding and failed-current stop.
- [x] Implement strict plan validation and archive authorization from independently verified retained current capture.
- [x] Extend workflow with optional archive input, outputs and dependent hosted job; preserve single-season behavior and source pacing.
- [ ] Run targeted FUSSBALL/source coordination tests and an independent focused review; required CI before merge.
- [ ] Record approval unchanged, dispatch one paired run on reviewed main with prior363,total5000,current1500,archive3000; verify it starts and report the run link. No duplicate dispatch or immediate per-report model monitoring.

## Confirmed archive identity support

Two single-request GitHub probes are included in prior363. The short archive
menu URL returned an observed301 to the same staffel's long source URL; the
long page returned200 with selected2025/26 and its own form while canonical/OG
pointed at current2026/27. The existing strict archive inspector accepts the
unchanged page. Persist the exact current seed+flat original receipt and the
reviewed alias in archive capture v3; default capture and default offline
verification use the same parent-aware inspector. Parent paths, symlinks,
missing/mutated bytes and receipts fail closed. Ordinary v1/mixedv2 captures
remain supported. No automatic redirects or production admission relaxation.

Independent focused review approved frozen implementation9dde6c5a;16 targeted
tests passed, no network. Final CI/merge and one paired dispatch remain.
