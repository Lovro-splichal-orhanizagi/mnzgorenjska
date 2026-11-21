# Recurring Croatian imports

The 139 reviewed active HNS leagues use Avengers HQ for source collection and GitHub Actions for native imports/scoring. Ordinary nightly HNS fetches remain excluded. Catalonia continues ordinary GitHub fetching with validated redirect handling.

## Operations

HQ installation: `~/avengers-slff/import-collector`, launch agent `com.slff.hns-collector`. Launchd checks hourly, resumes partial runs, and starts a fresh 14-day scan once the last complete scan is 12 hours old. Host sleep is 0; caffeinate also holds the host awake during collection. Logs and immutable run directories are under `state/`.

The shared `state/hns-ledger.sqlite` enforces 950 attempts per rolling 24 hours and a 10-second minimum plus positive random jitter of up to 5 seconds after every response (including redirect hops). It was migrated from Jernej's Mac; the old Mac ledger is fenced. Never reset or replace the ledger to obtain more requests. Timeouts and 5xx defer with persisted bounded backoff; refusals/challenges latch until an operator reviews the cause. Source outages can still occur.

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

## Redirects (SLF-673)
A 301/302/307/308 from a `/natjecanja/<id>/x/` or `/utakmice/<id>/x/` URL is followed exactly one hop, and only to `https://semafor.hns.family/<same type>/<same id>/<slug>/` (lowercase slug, trailing slash; no credentials, port, query or fragment). Wrong IDs or types, `/login/`, other hosts or a second redirect are rejected before any second request and latch the ledger (`unexpected response requires review`). The hop is its own ledger attempt: reserved, paced, counted against the 950/day and per-run budgets, expiry-checked, and refusal-checked. The capture is cached under the original URL. A 302 alone is not a refusal; 401/403/429 and challenge bodies still are.

## Recurring pacing and transient retries (SLF-680)

This policy applies only to `hns-recurring.py`; the historical collector/replay remains frozen. It uses the original SQLite ledger, exclusive lock, `attempts` table and rolling 950 ceiling. No parallel collector, new lane or separate request allowance is introduced. Existing ledger state is preserved; additional recurring fields use its existing `meta` table.

Each request draws its spacing once (10.001–15 seconds). Before HTTP, the attempt and chosen next-eligible time are committed together, with a conservative additional 30-second in-flight allowance for the 25-second transport timeout. On response, the same chosen spacing is saved relative to response completion. A restart reads this deadline rather than redrawing it. The one-hop canonical redirect has its own reservation, spacing and budget charge.

A logical resource gets an initial fetch and at most two retries. A timeout or 5xx persists a delay of one, two, then four hours plus positive jitter up to five seconds, without making an immediate retry. A later scheduled invocation may retry only after the saved deadline and within both request budgets. Original and canonical URLs share the same logical retry counter; a successful 302 cannot reset it. Only validated final HTML clears the counter. Counters survive a fresh run directory or manifest. Interrupted logical fetches also consume a try and retain a conservative backoff deadline; repeated crashes cannot provide unbounded retries. Budget/expiry interruption between redirect hops may therefore delay the next invocation.

After three unsuccessful/interrupted logical fetches, the resource remains stopped with `transient retry limit reached; resource requires review` in `status.json`. The ledger's `recurring:<original URL>` metadata retains the count and deadline. This is a visible operator-review stop, not a source refusal and not permission to reset state. Completed reports and finished leagues still use the existing skips; immutable URL captures still deduplicate a resumed run. New scans fetch schedules and only new/unfinished reports inside the existing window; older pending holds remain explicit.

401/403/429 and challenge detection always win over transient handling. On 429, `recurring-retry-after` stores at most 512 characters of the header alongside the ledger attempt/time for diagnosis, even when it says `0`. It never clears the refusal latch, alters the retry policy, or permits another request. Deployment, source probes, restarts and latch resets are separate from this offline implementation.
