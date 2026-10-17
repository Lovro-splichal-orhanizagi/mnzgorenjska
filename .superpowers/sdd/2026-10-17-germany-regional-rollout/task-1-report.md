# Task 1 report

Status: DONE_WITH_CONCERNS (test environment credentials and later release dependencies below).

Implementation commit: `6c2f156` — Support explicitly registered German DFB regional seasons. This report is committed separately.

## Delivered

- `scripts/viri/dfb-lige.json`: explicit Nordost, Nord, West, Südwest and Bayern registry for 2025/26 and 2026/27. Verified seed IDs, 18 clubs/34 rounds except Bayern 2026/27 with 19 clubs/38 rounds.
- `scripts/viri/dfb.mjs`: immutable `konfiguracijaDfb(koda)` exposes `liga`, `name`, `sezona`, `leto`, `pot`, `seed`, `teams`, `rounds`; `razberiKodo` preserves its three-field contract. Standalone report default remains Nordost. Other reports require an explicit registered `liga`; source operations select it from the code.
- Strict registered canonical/header/season/team identity, bounded rounds, preserved case and `%20` team IDs. Slash, double encoding, dot traversal and unsafe origin paths reject. Source cache validation uses the canonical's registered league.
- Full discovery checks all directed home/away pairs, complete rounds, unique round participants and one bye per half per club for the 19-club season.
- `scripts/test-dfb-regije.mjs`: 22 tests covering all eight real seed/report pairs, three extra reports (SV-Todesfelde, DJK%20Vilzing and West round12), exact final/half results, 22 starters and two official keepers, unknown/default league refusals, header/canonical/mixed-team/path refusals, and synthetic 342-match season plus missing/duplicate pair and duplicate participant rejection.
- 19 unchanged raw HTML documents under `scripts/vzorci/de-dfb-regije-*`; `de-dfb-regije-provenance.json` retains each official canonical URL, SHA-256 and UTC capture time from `/private/tmp/slff-dfb-census/metadata.json`. Tests verify all original byte hashes.
- `package.json`: regional tests included in both DFB and source commands.

No corrections, reserve evidence, pending policy, production data, release code or network access were changed. Existing Nordost correction/reserve registries and pending match policy remain untouched.

## RED / GREEN evidence

1. Before registry/parser edits:
   `node --test scripts/test-dfb-regije.mjs > /tmp/dfb-red.log 2>&1`
   Output: `tests 20`, `pass 0`, `fail 20`. Real new reports failed `dfb: neujemanje šifre ali identitete zapisnika`, seed cases lacked `konfiguracijaDfb`, and safe new league IDs failed the Nordost-only code contract.
2. After bounded regional implementation:
   `node --test scripts/test-dfb-regije.mjs > /tmp/dfb-green.log 2>&1`
   Output: `tests 20`, `pass 20`, `fail 0`.
3. Additional path regression red:
   `node --test scripts/test-dfb-regije.mjs > /tmp/dfb-red2.log 2>&1`
   Output: `tests 22`, `pass 21`, `fail 1`, missing expected exception at the raw `/teams/other/../bayern-muenchen-ii` path. URL normalization had hidden the traversal. Added rejection before URL construction.
4. `node --test scripts/test-dfb-regije.mjs > /tmp/dfb-green2.log 2>&1`
   Output: `tests 22`, `pass 22`, `fail 0`.
5. `npm run test:dfb > /tmp/dfb-existing.log 2>&1` (before package inclusion of the new suite)
   Output: `tests 42`, `pass 42`, `fail 0`.
6. Final `npm run test:sources > /tmp/dfb-sources.log 2>&1`
   Output: `tests 221`, `pass 221`, `fail 0`.
7. Bare `npm run smoke` passed its 221 source tests then failed because no Supabase URL was configured. Repeated with inert local frontend settings only:
   `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=local-test-placeholder npm run smoke > /tmp/dfb-smoke2.log 2>&1`
   Output: 221 source tests pass; 3219 smoke `PASS` lines; final `VSE OK`.
8. `npm run build > /tmp/dfb-build.log 2>&1`
   Output: `472 modules transformed`, `built in 3.25s`. Existing npm python-config and plugin timing warnings only.
9. `npm test > /tmp/dfb-npmtest.log 2>&1`
   Blocked before executing E2E: `Manjka javni ali SUPABASE_SERVICE_ROLE_KEY ključ (okolje ali .env).` No production key was read or supplied.
10. `git diff --check`: clean.

## Nordost preservation replay

`node /tmp/slff-replay-dfb.mjs > /tmp/dfb-replay.log 2>&1` replayed source `zapisniki` from original captures under `/private/tmp/slff-de-proof`, using the URL-to-file map in each `prenosi.json` and verifying every consumed original SHA before parsing.

Final output:

```json
[{"folder":"archive","complete":306,"pending":0,"documents":324},{"folder":"current","complete":110,"pending":1,"documents":129}]
```

All 453 original document hashes checked. All 110 serialized current report objects deep-equal `current/zapisniki.json` (JSON serialization intentionally removes undefined properties absent from recorded JSON). All 306 archive reports match `archive-replayed.json` on ID, round, date, team identity/name, final result and the exact 22 starter names/sides/official keeper flags, compared as sets because manifest starters are sorted. Only the already reviewed exact `2426099` pending policy fires. Initial replay-harness comparisons needed sorting/JSON normalization; they exposed representation differences, not source changes.

## Self-review / concerns and later dependencies

- Actual Nord current seed has date-only future fixtures and a date-only postponed fixture labelled `- : - verl.`. Schedule parsing preserves `ura: null` and `izid: null`; no kickoff, score, lineup or report exemption is fabricated. Existing report comparison checks time only when the schedule actually publishes it. This factual form was uncovered by the first real-fixture RED run.
- Release must require a trusted future kickoff/deadline. A played report's time cannot justify fabricating an unknown future kickoff. Check existing importer deadline fallbacks separately before launch.
- Task 3 parser fingerprint/provenance must bind `dfb-lige.json` alongside parser bytes and existing correction/reserve registries.
- The pre-existing source-level `polnoIme` Nordost label is preserved; regional competition attribution should use its actual competition metadata. This task does not change live Nordost naming contracts.
- Representative samples establish parser support, not full-season readiness. Full audits, unresolved historical reports and all later release gates remain required; no general current/archive missing-report exemption was added.
- E2E remains unverified locally because test credentials are unavailable. Source, smoke, build and the complete captured Nordost replay pass.
