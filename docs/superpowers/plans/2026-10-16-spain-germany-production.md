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
- [x] Run full live audits in a normal CI runner; address supported source variation with captured regressions and document unresolved source data.
- [x] Add verified inactive seeds, source documentation and nightly import registration.
- [ ] Verify the feature branch against current main in CI, including fresh database tests.
- [ ] Import inactive leagues using production workflow, inspect roster identity/position/price readiness, then activate only leagues passing all gates.

Any remaining blocker must be reported as a concrete failed gate with its evidence, not described as production readiness.

## Validation checkpoint

- Feature branch: `codex/spain-germany-production`, draft PR #334. Newer main sources and country integrations are preserved. The later upstream duplicate-PFL cleanup required retaining one import/registration in the combined tree; the final PR CI validates that integration.
- 182 focused source, country and audit tests pass. Independent review found no remaining material findings in the final Novanet transport and DFB format patches. Full build/types/rendering and fresh database security/concurrency/freeze/publication checks passed on9ae83f6 in manual feature CI38962574407; its separate source job correctly fails the goalkeeper evidence gate. Final PR CI must also pass against newer main.
- Spain current live audit38962574407 fetched all18 rounds and10/10 played reports with schedule/report agreement and complete coverage. Goalkeeper evidence is absent for all10 clubs.
- Spain archive audit38941059903 attempted90 reports:10 valid,2 explicitly incomplete,78 empty zero-byte responses. The reason for empty source bodies is unknown. The importer/audit now stops at the first empty successful response and preserves its HTTP status and raw evidence. No additional archive crawl is needed to establish this failed gate.
- Galicia reports1306457 (missing substitutions) and1306462 (card minute999) remain withheld. Official report/PDF/player pages do not establish goalkeeper roles; they are not guessed. Absolute95/96-minute clocks are supported only under the two verified regular90-minute league contexts.
- German complete live capture38939351677 includes all306 archive and108 current reports. Final replay through actual18-team schedules accepts302/306 archive and108/108 current. Archive2401897 has an unresolved card recipient's match role;2401959,2402023 and2402046 contain conflicting score/time sequences. They remain rejected with unchanged fixture regressions and cache refusal.
- Whole-season audits collect recognized parser failures for diagnosis; transport/refusal/challenge/programming errors stop immediately. Any incomplete match or unverified goalkeeper gate keeps readiness false. Normal imports retain fatal unknown-format behavior.
- Inactive seeds, country entry/localization, nightly registration and reusable source/season audit selectors are implemented. No production migration, import, valuation, activation or server/function deployment has run.
- Release is blocked by concrete source data/position gates. Price validation and future-round activation must follow resolved coverage and position evidence; no league is claimed production ready.
