# Recurring Croatian imports

The 139 reviewed active HNS leagues use Avengers HQ for source collection and GitHub Actions for native imports/scoring. Ordinary nightly HNS fetches remain excluded. Catalonia continues ordinary GitHub fetching with validated redirect handling.

## Operations

HQ installation: `~/avengers-slff/import-collector`, launch agent `com.slff.hns-collector`. Launchd checks hourly, resumes partial runs, and starts a fresh 14-day scan once the last complete scan is 12 hours old. Host sleep is 0; caffeinate also holds the host awake during collection. Logs and immutable run directories are under `state/`.

The shared `state/hns-ledger.sqlite` enforces 950 attempts per rolling 24 hours and 10 seconds spacing. It was migrated from Jernej's Mac; the old Mac ledger is fenced. Never reset or replace the ledger to obtain more requests. 5xx defer one hour; refusals/challenges latch until an operator reviews the cause. Source outages can still occur.

Complete reports require captured schedule identity, selected 2026/27 season, report/league/date/round/teams/score agreement, sufficient lineups and goalkeeper identity. Invalid or unpublished reports remain holds. `state/hns-ledger.holds.json` preserves older holds for manual review; they do not disappear when the 14-day window advances. Already imported source corrections and history outside this window require separate reviewed repair.

## Handoff and replay

The HQ upload key is restricted to write-only rsync within `/srv/slff-recovery/hns-recurring` on SLFF. It has no database write credential or GitHub token. It cannot write the sibling `/srv/slff-recovery/hns-recurring-receipts`, which belongs to the GitHub replay path.

`hns-recurring.yml` checks every 2 hours. It selects the oldest immutable snapshot without a successful receipt, verifies hashes and league/native identities, then runs three disjoint native-import shards. Reports already imported remain eligible for score recomputation. A receipt is written only after all three shards and their score RPCs succeed. Thus a failed scoring pass survives subsequent collection batches. Manual previews never acknowledge a batch.

Captured work can replay for 7 days without new source requests; older failures stop visibly for manual review. A stale or incomplete collector makes the health job fail without preventing valid retained work from replaying. Zero-progress batches update health only. Heartbeat-only changes do not enqueue duplicate work.

## Verification and response

Inspect `launchctl print gui/$(id -u)/com.slff.hns-collector` on HQ, `state/collector.log`, `state/collector-error.log`, and the current run's `status.json`. GitHub summaries show capture freshness, incomplete inventory and durable holds. Workflow success means the scanned inventory was processed; it does not mean the source published every held lineup.

For a stopped/refused collector, retain evidence and request provider access/review; do not clear its latch automatically. For worker failures, fix the native/quality issue and rerun the workflow; do not manufacture a receipt. Expired queued captures require reviewed recovery, not timestamp editing. Disable only this launch agent when transferring collection ownership, and transfer its ledger and holds together.

## Existing imported corrections

The completed-ID manifest covers the whole current season, so a source date change does not make an already imported historical report look new. If a queued capture conflicts with an imported result's date or score, the worker preserves the native match and writes an atomic per-shard manual-review hold. Successful receipts retain those holds, and subsequent workflow summaries continue to display them. Other valid reports can finish without overwriting the disputed result. Foreign competition, season, round or club identity still stops replay.

First verified example: source report 114652522 / native 58085 (hr-ri-4nl). Stored 24 October, 0:0 with 23 appearances; captured 18 November, 1:1 with 26 appearances. It remains a review hold, not an automatic historical-score rewrite. The 21 other captured reports matched unique native fixtures; their 26 existing predictions were preserved during observed imports.
