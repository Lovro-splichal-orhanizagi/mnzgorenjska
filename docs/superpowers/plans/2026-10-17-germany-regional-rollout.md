# German Regional League Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Prepare the four other German Regionalligas and activate every candidate whose complete source and production checks pass.

**Architecture:** Add an explicit DFB competition/season registry and parameterize existing strict parsing. Run preserved full-season audits before inactive seeds, imports and a separate atomic release guard; keep Nordost's live state and existing activation RPC unchanged.

**Tech Stack:** Node ESM, GitHub Actions, PostgreSQL/Supabase, existing React app.

**Spec:** `docs/superpowers/specs/2026-10-17-germany-regional-rollout-design.md`

## Global Constraints

- Senior men's leagues; Nordost remains live and unchanged in production.
- Nord/West/Südwest both seasons and Bayern archive:18 clubs/34 rounds/306 fixtures. Bayern current:19 clubs/38 rounds/342 fixtures/36 games per club.
- Official evidence only, existing dependencies, 3-second minimum shared DFB request pause, stop on access refusals/challenges.
- Production writes only through Actions. New seeds inactive; no activation until reviewed source and database checks pass.
- Complete archive and published current history required; no generic historical missing-report exemption.

## Review Focus

- Wrong league/season URLs and mixed-team schedules must reject instead of cross-importing statistics.
- Odd league byes must preserve exactly two missing rounds per club and all directed home/away pairs.
- Encoded/case-sensitive source IDs remain exact; encoded slash/traversal/external origins reject.
- A nominal ready price spread does not hide a missing current club or misclassified official keeper.
- Concurrent import/activation and changed/stale source evidence cannot mutate a live league accidentally.

---

### Task 1: Explicit DFB coverage and strict regional parsing

**Files:** `scripts/viri/dfb.mjs`, new `scripts/viri/dfb-lige.json`, `scripts/test-dfb-regije.mjs`, recorded `scripts/vzorci/de-dfb-regije-*`, `package.json`.

**Interfaces:** Registry keyed by official league slug, containing `name`, per-season `seed`, `teams`, `rounds`. `razberiKodo(koda)` retains existing `pot,sezona,leto` contract. `vZapisnik(html,{id,tekma,liga='regionalliga-nordost'})` explicitly selects the registered league. Source `razporedVseStrani(koda,prenesi)` and `zapisniki(koda,prenesi,options)` use the matching registry entry. Export `konfiguracijaDfb(koda)` for audit/release tooling, returning immutable league/season identity plus counts and seed.

- [ ] Write regressions against all eight real seed/report pairs, expected results, 22 starters and two official keepers; case/space IDs; unknown league, wrong header, wrong canonical, mixed teams and invalid slug refusals.
- [ ] Run the tests red before implementing the registry and bounded parameterization. Keep Nordost report defaults/corrections strict.
- [ ] Add synthetic full-season validation for19 clubs,38 rounds,342 directed pairs, one bye each half per club; reject missing/duplicate pair and duplicate participant.
- [ ] Run regional and existing DFB/source tests, smoke and build; independently review and commit.

### Task 2: Full-season read-only regional audit

**Files:** new `.github/workflows/preveri-dfb-ligo.yml`; `scripts/preveri-vir-sezono.mjs` only if needed; `scripts/viri/dfb.mjs`, `scripts/cakaj-na-uvoze.mjs`, `.github/workflows/preveri-nova-vira.yml`; `docs/viri/nemcija.md`.

**Interfaces:** Workflow inputs fixed league choice and current/archive/all, output raw-document artifacts and reports at a reviewed commit. CLI remains `node scripts/preveri-vir-sezono.mjs dfb <registered-code> <season> <directory>`.

- [ ] Restrict workflow inputs to registered candidates; use one job with sequential season steps rather than a matrix sharing one concurrency group (GitHub replaces surplus pending jobs).
- [ ] Serialize read-only DFB audits with a fixed shared concurrency group; add DE/dfb to the existing shared-source import coordination. Use a six-second pause per DFB reader, so at most one coordinated importer plus one read-only audit preserve a combined average budget of one request per three seconds. Raise existing DFB audit timeout to90minutes for the longer pause. No source or DB keys in read-only audits.
- [ ] Page the import coordinator's competition lookup in stable ID order: production already has1079 rows, beyond PostgREST's1000-row cap, and new German leagues must map to their actual country.
- [ ] Validate dispatch, artifact preservation and refusal/failure behaviour; document exact per-league codes and source limitations. Commit/review the workflow before full operational audit runs in Task4.

### Task 3: Inactive catalog and independent guarded release

**Files:** new inactive seed migration and separate release migration; new `scripts/vklopi-dfb-regijo.mjs`, provenance helper/tests, verified offline source loader/tests, SQL tests, `.github/workflows/vklop-dfb-regije.yml`, `.github/workflows/uvoz-dfb-regije.yml`; docs.

**Interfaces:** Manifest version1 fixed candidate slug, source commit/parser fingerprint, two seasons with captured documents SHA/times/run IDs and every fixture's id/round/date/time/teams/result/url/22starter+keeper identities, complete canonical appearance statistics and attributed goal-event multiset. New service-only `varen_vklop_dfb_regije(p_manifest text,p_sha256 text,p_aktiviraj boolean default false)` returns checked slug, future round/deadline, activation status and squad cost. Existing Nordost RPC unchanged. Bound the expanded manifest to8MiB.

- [ ] Test wrong scope, stale/changed provenance, incomplete archive/current reports, incorrect starters/goals/roles/current clubs, wrong scorers/card recipients/minutes/substitutes, prices and fantasy cutoff before implementation. Compare all parsed appearance values and goal identities/flags/minutes/intermediate scores against persisted rows by match, historical side and exact name, preserving multiplicity.
- [ ] Seed only the four verified inactive candidates with correct federations and season codes.
- [ ] Adapt proven record-by-record comparison and locks to fixed registry season sizes, keeping all existing readiness checks. Refuse already-active leagues and unknown scopes.
- [ ] Preserve nullable source kickoff times. Refuse activation when any earliest-day fixture in the first fantasy round has unknown time, and compare its deadline to the earliest official kickoff minus the configured six hours in Europe/Berlin.
- [ ] Add an Actions wrapper around existing archive→schedule/current→position→price scripts that imports the approved captured source. Its offline loader verifies every raw hash/URL, refuses missing or changed DFB documents and makes no new DFB network requests; database calls use normal authenticated Actions credentials. Compare the resulting production records with the reviewed manifest before activation.
- [ ] Test migration chain and positive/negative atomic checks on a disposable fresh database, rollback fixtures, run smoke and build; independent review and merge green CI.

### Task 4: Import and activate passing candidates

**Files:** retained Actions evidence, updated German source status docs.

- [ ] Run both seasons for all four candidates, retain source SHA/time/code provenance, inspect every parser/coverage error, and fix only independently evidenced defects with regressions. Record exact ready/blocked results.
- [ ] For each passing source audit, import archive → schedule/current → positions → prices using existing inactive-league Actions, serialized on the shared source.
- [ ] Prepare manifest, verify provenance/raw replay, review exact bytes/SHA, then production preflight without activation. Investigate every mismatch.
- [ ] Activate passing candidates through the guarded workflow; verify active status, future unlocked fantasy round, price spread and a valid squad within100.
- [ ] Verify public country/league selection and player list; refresh HTML cache if required. Report exact activated/blocked counts and the lower-league feed dependency.
