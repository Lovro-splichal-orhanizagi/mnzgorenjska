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
- [ ] Implement and review DFB source, current/archive and malformed-page regression corpus.
- [ ] Add a read-only whole-season audit, explicit coverage and goalkeeper evidence gates, and live audit artifact capture.
- [ ] Run full live audits in a normal CI runner; address actual source variation with captured regressions.
- [ ] Add verified inactive seeds, source documentation and nightly import registration.
- [ ] Verify the feature branch against current main in CI, including fresh database tests.
- [ ] Import inactive leagues using production workflow, inspect roster identity/position/price readiness, then activate only leagues passing all gates.

Any remaining blocker must be reported as a concrete failed gate with its evidence, not described as production readiness.
