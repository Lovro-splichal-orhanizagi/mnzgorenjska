# FCF historical cleanup: narrow Scout preservation repair

Implemented in `codex/fcf-scout-preservation-20261028`, based on `d38d9882cfe0fd06d1230f89fea74afc6c794c13`. The existing known-result Scout loader fix is inherited and unchanged. This ledger records local implementation and synthetic verification; it supplies no production cleanup/import/activation authority.

The authenticated read-only metadata run `40641365900`, artifact `12795228595` (SHA256 `fcd976982a37d9105b1ea1b2a561609dfbdee9c63213a8efcf455c91a46c9508`), reports exactly nine `scout.lige_moc.competition_id` matches: three each for 783/790/797; all `vir='brez'`, `prestopov=0`, finite zero strength, no orphan parents and three published parents. Every other original Scout reference predicate had no positive result. Observed output/parent hashes were `f2b0463f0c82981d87347de758330dca51c5049e91e94fd4f03613b2dae2951c` / `7ae04df60f554e3ad7213b42e414bc4537f1d51c9d2d772102bc19dad35abb28`. These observations do not prove full model input independence or reconstruct historical training data.

The root-reviewed policy retains versioned Scout outputs as timestamped snapshots. Global/current model invalidation is not a fantasy activation prerequisite in this repair. Ordinary future recomputation uses the corrected known-result loader. No Scout rows are deleted, updated, restored or recomputed by the new migration.

`20261028070000_fcf_scout_snapshot_preservation.sql` adds one private digest helper in the existing future-history schema. It keeps all original Scout relation locks, exact reference types and scalar/reverse-array predicates. Its sole exception is `scout.lige_moc.competition_id`: either zero matches or exactly a complete 3-model × 3-target matrix, with the observed constant predicates, three published parents, reviewed nonpartitioned column shapes, primary keys and validated nondeferrable model FK. All other positive target Scout references continue to hold, including subscriptions, watchlists, privacy/consent, audits, calendar and attendance. Unrelated rows retain original semantics.

The helper serializes full allowed output rows and their full model parents as sorted JSONB in UTC and returns private digests. Fresh apply and restore capture these current snapshots before their native mutation phase, then compare again after the final receipt write. Any within-phase change rolls back the entire phase. Model versions may turn over between prepare/apply/restore if the narrow zero/nine predicate still passes; restore preserves current versions and never replays old Scout data. No-op/retry behavior remains unchanged and does not require obsolete model versions.

The migration introduces no tables, columns, persistent metadata, receipt/result fields, caller-controlled skip/hash or new grants. The schema3 beforeimage, source/policy/native/privacy/fantasy gates, exact157/18 removals, six markers, immutable receipt identity and native restore checks stay unchanged. Public apply/restore bodies differ only by local snapshot variables/calls/comparisons. G1's existing closed relation/shape registry remains unchanged.

## Verification performed

All DB mutations were confined to the explicitly owned disconnected Docker clone `slff-fcf-g1-native-admin-20261028`, exact ID `a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575`, owner label `fcf-g1-native-admin-20261028`, network `none`, mounts0, ports `{}`. The runner reauthenticates these properties immediately before every mutating test. Every test encloses migrations, DDL and synthetic fixtures in `BEGIN`/`ROLLBACK` and requires the explicit final rollback sentinel. A red test failure also closes its psql session, rolling back the uncommitted transaction.

Before implementation, the nine-row positive regression failed with the actual deployed message `FCF_HISTORY: Scout target dependency prevents historical cleanup/restore`. After implementation:

```sh
FCF_SCOUT_OWNED_SQL_TEST=1 node --test scripts/test-fcf-scout-preservation-sql.mjs
```

Result: four tests passed, zero failures/skips:

- Nine constant fallback rows permit actual future cleanup preparation.
- Zero-reference compatibility runs the existing schema3 cleanup/restore assertions and negative guards. The runner isolates those assertions' global-min appearance/goal mutants inside the same rollback fixture.
- Full nine-row apply/restore preserves every Scout row and native identity; rejects bad count/matrix/source/sample/strength/NaN/infinity, unpublished/orphan parents, missing FK/PK, shape drift, new target reference/type and reverse-only similarity. Target user-owned references hold. Synthetic unrelated subscriptions/payment fields, seats, watchlists, objections, consent, audits, private calendar and attendance survive byte-for-byte. Four temporary triggers mutate strength timestamps or full model-parent JSON during apply/restore, including the final receipt writes; each causes the expected preservation exception and complete rollback. Between-phase version turnover and old-version-free retry/readback pass. UTC digest stability and helper ACLs pass.
- The unchanged additive G1 SQL projection executes its full relation/column/FK catalog checks successfully after the new migration; no registry expansion is needed.

`node --check`, copied-body equivalence checks and `git diff --check` also passed. No broad SQL/npm suite, external network, SSH, environment-file read, production mutation, source capture, dispatch or push was performed. One combined independent review remains with root before rollout.

## Combined-review P2: portable CI execution

The combined review found that the new runner was local-only and absent from CI. This follow-up changes only the runner, `.github/workflows/ci.yml` and this ledger. Production SQL and Python remain unchanged.

The existing `varnost` job now invokes all four focused tests after the existing future cleanup/projection/import/activation checks, with `FCF_SCOUT_CI_SQL_TEST=1`. The job runs for PRs and main. The runner requires `GITHUB_ACTIONS=true`, `RUNNER_ENVIRONMENT=github-hosted`, exact repository/workflow/job identity, the exact `ci.yml` workflow path and a PR merge or main CI ref. A requested CI mode outside this boundary fails before a client is launched; the intended CI job without explicit opt-in also fails instead of silently skipping. Ordinary local runs without opt-in may skip. The separately opted-in local mode still verifies the exact owned container ID/label/network/mounts/ports immediately before each transaction.

CI uses fixed `/usr/bin/psql`, host `127.0.0.1`, port54322, database/user `postgres`, and the standard disposable password `postgres`; no URL or caller-supplied connection target is accepted. Its child process receives a new literal environment allowlist, not inherited `PGSERVICE`, `PGSERVICEFILE`, `PGHOSTADDR`, `PGOPTIONS`, pass-file, service-directory, HOME or psqlrc values. Explicit `-X`, noninteractive authentication, fixed empty pass-file/service-directory locations and connection timeout remain in force. Both modes require the final explicit rollback sentinel.

Runner setup now checks whether preservation/G1 function signatures are installed before loading their migration definitions, so the same four assertions cover CI's already-migrated fresh database and the older owned clone. No production migration was made idempotent or altered for tests.

Validation of this delta:

- `node scripts/test-fcf-scout-preservation-sql.mjs --guard-self-test`: passed valid PR/main modes, rejected missing opt-in and each wrong CI identity/ref/event, rejected mixed/local-in-Actions modes, verified disabled ordinary local mode and the fixed fresh PostgreSQL environment. This mode launches no client or database connection.
- `FCF_SCOUT_OWNED_SQL_TEST=1 node --test scripts/test-fcf-scout-preservation-sql.mjs`: four passed, zero skipped/failed, using the reverified exact disconnected owned clone with explicit rollback for each test.
- `node --check`, Ruby YAML parsing/step placement assertions and `git diff --check`: passed.

The hosted CI connection path has not been executed locally, and no local port54322 was contacted. PR and main CI are the remaining end-to-end verification of that route. No broad suites, push, network, SSH or environment-file reads were performed in this follow-up.
