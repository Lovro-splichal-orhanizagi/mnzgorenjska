# Catalonia and Dodecanese recovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore imports from the federations' redesigned public match pages and recover available current results.

**Architecture:** Keep existing EPS and FCF identity namespaces and native DB writers. Add narrowly scoped HTML parsing and same-origin public page routing for each migrated source. Root coordinates network budget, importer integration, workflow testing and production verification.

**Tech Stack:** Existing Node ESM parsers/test runner, Python bounded capture, Supabase native import, GitHub Actions.

**Spec:** docs/superpowers/specs/2026-11-18-es-gr-source-migration.md

## Global constraints
- No package.json changes, private API calls, cookie extraction, or DB credentials on the Mac.
- Keep original fixtures, hashes, report/player IDs and explicit complete/incomplete states.
- Source requests stop on403/429/challenge; minimum3seconds between same-host requests.
- Only root performs live source requests and production operations.

## Review focus
- Redirect target must be same host and exact public report route, never credentials/query/private routes.
- New page cannot silently change numeric report identity or league/round/team binding.
- Missing minutes/lineups, goal mismatches, incomplete match states fail closed.
- Legacy retained fixtures and other EPS associations must retain their existing behavior.
- Recovery must skip already completed reports, preserve user data and recompute affected round points.

### Task1: FCF public report redesign
Files: scripts/viri/fcf.mjs; optionally scripts/viri/fcf-current.mjs; scripts/test-fcf-current.mjs and bounded retained fixtures.
- [ ] Add failing tests for observed legacy redirect + canonical report and wrong-target/incomplete cases.
- [ ] Implement same-origin redirect extraction and new HTML/RSC report mapping into existing record shape; preserve legacy parser behavior.
- [ ] Validate all selected retained originals and existing FCF offline tests. Return interfaces and quality holds to coordinator.

### Task2: Dodecanese WordPress migration
Files: scripts/viri/eps.mjs; scripts/viri/epsdod.mjs; scripts/test-epsdod-current.mjs and bounded retained fixtures.
- [ ] Add failing tests for new public report, player IDs, lineup/event minutes, wrong report/league and incomplete cases.
- [ ] Implement new public schedule/report parsing scoped only to epsdod.gr; preserve EPS ID namespace and old associations.
- [ ] Validate retained originals and existing EPS offline tests. Return interfaces and quality holds to coordinator.

### Task3: Controlled capture and production integration
Files: bounded recovery scripts/workflow wiring only as required by proven source output; root owns shared integration files.
- [ ] Capture a small pilot and compare same-report identities with public DB inventory.
- [ ] Run hosted read-only transport/parse validation before enabling hosted reads.
- [ ] Review all changes and pass relevant CI. Import available reports using native guards.
- [ ] Verify live scores, lineups, affected round points, and explicitly record remaining source gaps.
