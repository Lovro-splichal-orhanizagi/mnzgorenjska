# Recurring Croatian imports

The139reviewed active HNS leagues use Avengers HQ for source collection and GitHub Actions for native imports/scoring. Ordinary nightly HNS fetches remain excluded. Catalonia continues ordinary GitHub fetching with validated redirect handling.

## Operations

HQ installation: `~/avengers-slff/import-collector`, launch agent `com.slff.hns-collector`. Launchd checks hourly, resumes partial runs, and starts a fresh14calendar-day scan once the last complete scan is12hoursold. Host sleep is0; caffeinate also holds the host awake during collection. Logs and immutable run directories are under `state/`.

The shared `state/hns-ledger.sqlite` enforces950attempts per rolling24hours and10seconds spacing. It was migrated from Jernej's Mac; the old Mac ledger is fenced. Never reset or replace the ledger to obtain more requests. 5xxdefer onehour; refusals/challenges latch until an operator reviews the cause. Source outages can still occur.

Complete reports require captured schedule identity, selected2026/27 season, report/league/date/round/teams/score agreement, sufficient lineups and goalkeeper identity. Invalid or unpublished reports remain holds. `state/hns-ledger.holds.json` preserves older holds for manual review; they do not disappear when the14day window advances. Already imported source corrections and history outside this window require separate reviewed repair.

## Handoff and replay

The HQ upload key is restricted to write-only rsync within `/srv/slff-recovery/hns-recurring` on SLFF. It has no database write credential or GitHub token. It cannot write the sibling `/srv/slff-recovery/hns-recurring-receipts`, which belongs to the GitHub replay path.

`hns-recurring.yml` checks every2hours. It selects the oldest immutable snapshot without a successful receipt, verifies hashes and league/native identities, then runs three disjoint native-import shards. Reports already imported remain eligible for score recomputation. A receipt is written only after all three shards and their score RPCs succeed. Thus a failed scoring pass survives subsequent collection batches. Manual previews never acknowledge a batch.

Captured work can replay for7days without new source requests; older failures stop visibly for manual review. A stale or incomplete collector makes the health job fail without preventing valid retained work from replaying. Zero-progress batches update health only. Heartbeat-only changes do not enqueue duplicate work.

## Verification and response

Inspect `launchctl print gui/$(id -u)/com.slff.hns-collector` on HQ, `state/collector.log`, `state/collector-error.log`, and the current run's `status.json`. GitHub summaries show capture freshness, incomplete inventory and durable holds. Workflow success means the scanned inventory was processed; it does not mean the source published every held lineup.

For a stopped/refused collector, retain evidence and request provider access/review; do not clear its latch automatically. For worker failures, fix the native/quality issue and rerun the workflow; do not manufacture a receipt. Expired queued captures require reviewed recovery, not timestamp editing. Disable only this launch agent when transferring collection ownership, and transfer its ledger and holds together.
