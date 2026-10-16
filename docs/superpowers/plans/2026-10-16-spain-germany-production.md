# Spain and Germany production rollout

The user has requested completion of the remaining production work. This supersedes the earlier development-only rollout boundary, while retaining the project rule that live database writes run in GitHub Actions.

## Release scope and gates

- Spain: Novanet Galicia, Tercera Futgal Lugo group 1. Current code `galicia:22:26990830:27759837`; archive `galicia:21:24123231:24820329`, selected through the official season/competition/group controls on 2026-10-16. Aragón remains supported experimentally until a consistent archive is verified.
- Germany: official DFB Datencenter Regionalliga Nordost, current 2026/27 and archive 2025/26. Existing fussball.de decoder remains a strict offline validator; anonymous card recipients prevent its registration.
- Validate every advertised round and every played report for both seasons before activation. Missing/ambiguous reports are visible failures in the release audit, never empty replacement statistics.
- Goalkeepers require official evidence. Generic position guessing does not establish that evidence.
- Only seed inactive leagues with verified source identifiers. Import archives, schedule and current reports, then positions/prices and readiness checks through the existing production workflow.
- Run unchanged project smoke/build/type checks and fresh database checks in feature-branch CI. This sandbox cannot bind loopback sockets or access Docker; those failures must not be suppressed.
- Preserve newer remote main changes when preparing the feature branch. The local checkout is older and dirty; use the current remote tree as the base and overlay only reviewed task files.

## Work

- [x] Inspect current consumers and rollout workflow, verify live current/archive selectors and German official alternative.
- [x] Fix canonical Novanet public season, validated cache expiry, card-only bench appearances and non-destructive missing report handling with regressions.
- [x] Implement and review DFB source, current/archive and malformed-page regression corpus.
- [x] Add a read-only whole-season audit, explicit coverage and goalkeeper evidence gates, and live audit artifact capture.
- [ ] Run full live audits in a normal CI runner; address actual source variation with captured regressions.
- [x] Add verified inactive seeds, source documentation and nightly import registration.
- [ ] Verify the feature branch against current main in CI, including fresh database tests.
- [ ] Import inactive leagues using production workflow, inspect roster identity/position/price readiness, then activate only leagues passing all gates.

Any remaining blocker must be reported as a concrete failed gate with its evidence, not described as production readiness.

## Validation checkpoint

- Feature branch: `codex/spain-germany-production`, draft PR #334. Newer main was merged on 2026-10-16; all three conflicts were resolved while retaining new upstream sources, the HTTP401 refusal guard, and source-validated schedule fallback.
- 169 focused source, country and audit tests pass. Full build/types/rendering and fresh database security/concurrency/freeze/publication checks passed in feature CI before the latest audit-only changes; final PR CI must confirm the latest commit.
- Public anonymous Novanet HTTP sessions now work without browser cookies. The live numeric decoy class variant is covered by an unchanged fixture.
- Galicia archive reports1306457 (no explicit substitutions section) and1306462 (card minute999) remain withheld. Goalkeeper roles are absent from official report/PDF/player pages; they are not guessed.
- DFB actual90-space-added notation is corroborated by the participating club and preserved with raw-label warnings. Archive2401897 still has an unclassified named card recipient outside its published lineup/substitutions and no bench.
- The read-only audit now collects strict parser failures throughout the season, while transport/refusal/challenge/programming failures still stop the run. Any collected failure keeps coverage/readiness false. Normal imports retain fatal unknown-format behavior.
- Complete live audit rerun started at commit86640bf8b4f29e78f60f1a88d191d5ba189c012b. No production migration/import/activation has run.

- Final source hardening additionally covers omitted-bench cautions before a same-report later substitution, explicit unplayed round previews, ambiguous charset refusal with raw-byte evidence, and context-bound absolute added-time clocks. Independent review found no remaining material code issues. The complete169-test suite passes; live data gates still remain separate.
