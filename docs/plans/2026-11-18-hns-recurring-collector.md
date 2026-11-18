# HNS recurring collector contract

This is the recurring collection component of the approved import reliability plan. Historical `hns-collector.py`, incident manifests, validation and replay guards remain unchanged. This component does not write to the database or publish artifacts.

## Commands

```sh
node scripts/hns-recurring-manifest.mjs /private/run-unique/manifest.json
python3 scripts/hns-recurring.py --dir /private/run-unique --manifest /private/run-unique/manifest.json --ledger /private/shared/hns-ledger.sqlite
```

The manifest builder reads the existing `.env.production` VITE URL and anonymous key for public database reads. It emits no credentials and refuses to overwrite an output file. The collector needs Python with `curl_cffi` and Node for the offline parser bridge. The collector itself has no database client or credentials.

Use a unique run directory for each new manifest. Resume a partial run with the exact same manifest bytes while it is unexpired; `run.json` binds the directory before any request. A new manifest always uses a fresh directory and fresh schedules. `--max-new` (1–950) and `--max-leagues` (1–139) support bounded operation; an unfinished selection is `paused` and CLI exit 2, never a successful complete batch. `complete` or `pending` exits 0; failures emit `stopped` and a nonzero exit.

The schema-2 manifest is `source:hns`, `mode:recurring`, `season:2026/27`. It covers fourteen UTC calendar days inclusive, from UTC today minus thirteen days through today, and expires after 24 hours. Eligible inventory must contain exactly 139 distinct active Croatian HNS tuples after excluding the women league and source-policy holds; inventory changes require review. Completed current-season report IDs come from imported database rows within that window. The collector validates the same tuple constraints, date range and age before source access and checks expiry throughout collection.

## Persistent state

- `blobs/<sha256>.html`: original immutable HTML, with hash verification on resume.
- `captures.json`: URL, SHA-256 and capture time; no cross-run seed/cache reuse.
- `latest.json`: schema 2, source/mode/season, fromDate/throughDate, createdAt/updatedAt/expiresAt, manifestSha256 and collection status. Per-league schedule and parentName bind reports to the captured parent. Complete/pending records retain the historical `{fixture,capture,validation}` shape. Each league includes `sourceUnplayed` fixtures and `sourceUnplayedCount`; the snapshot includes the total count.
- `status.json`: progress/failure heartbeat with report/pending/unplayed counts and shared rolling attempts. Even manifest validation and corrupt persisted-state failures produce a stopped heartbeat.
- The explicit shared ledger retains the existing exclusive lock, rolling request accounting, ten-second post-response spacing, crash spacing, one-hour transient deferral and permanent refusal latch. Recurring callers cannot raise the 950-attempt ceiling. Never rotate/reset this ledger to continue after refusal.
- `<ledger stem>.holds.json`: shared durable open/resolved holds, written under the ledger lock. An observed incomplete report or unplayed fixture stays visible when it leaves the fourteen-day window. A complete validated capture or a manifest's imported ID resolves only the matching league/report hold. The snapshot includes `holds:{openCount,olderCount,entries}`; the heartbeat includes `openHolds` and `olderHolds`.

Missing reports are fetched only for scored, in-window schedule fixtures absent from the manifest's imported IDs and this run's completed/pending records. Pending reports are not repeatedly fetched within one manifest; the next daily run can observe publication/correction. A phase competition report must satisfy the existing strict season-bearing parent-name validation. Refusals stop immediately and persist in the shared ledger; there is no retry, alternate host or credential discovery.

The rolling window deliberately does not refetch older unresolved holds. They remain visible for explicit investigation and reviewed recovery. No artifact cleanup may delete the shared ledger/holds or immutable prior runs as a way to reset this state. Collection `complete` means the 139 schedules were processed; operational recovery still requires scheduled publishing, replay, scoring and database readback owned by the integration task.

## Offline verification

```sh
python3 -m unittest discover -s scripts -p 'test_hns_*.py'
node --test scripts/test-hns-recurring-manifest.mjs scripts/test-hns-collection-manifest.mjs scripts/test-recovery-captured.mjs scripts/test-hns-transport.mjs scripts/test-razpored-hns-postponed.mjs
```

These checks use fake transport with real files/SQLite, and real parser fixtures for parent/phase binding. They do not contact HNS or write to a database. The repository's blanket `npm test` can write to a database and is intentionally excluded.
