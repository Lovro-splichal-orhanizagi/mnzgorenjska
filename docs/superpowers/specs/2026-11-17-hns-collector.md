# HNS collector: controlled collection, offline GitHub import

Status: proposed design only; accelerated incident recovery revision requested by the user. No collector, scheduler, staging service or credentials
have been installed. Existing HNS exclusion remains. This supersedes the direct
GitHub fetch assumption in the earlier recovery spec; PR #788 is preparatory.

## Evidence and limits

curl_cffi 0.17.0 with Chrome impersonation retrieves public schedule/report HTML
from Jernej's Mac. GitHub-hosted Ubuntu and macOS probes receive 403/challenge.
This establishes an environment difference, not the exact Cloudflare rule. HNS
can investigate timestamps and Ray IDs in its Security Events. Small successful
reads do not establish sustained access or a source-approved request allowance.

Measured local downloader: schedule 903 KB / 0.94 s elapsed / 0.14 s CPU; report
53 KB / 0.25 s elapsed / 0.12 s CPU; approximately 44 MiB peak Python process RSS.
Sizes are decoded HTML, not on-wire traffic. Full collector/import cost is not
measured. Ten-second pacing below intentionally replaces the earlier five-second
proposal for local collection.

## Architecture

HNS public pages -> one local collector -> private staging -> GitHub import -> points.

GitHub produces a versioned collection manifest from active Croatian competitions:
league slug, source, source competition ID, season, known completed report IDs,
explicit repair requests, creation/expiry time and schema version. Keep production
DB credentials in GitHub. Do not automatically include new/inactive leagues,
archives, player profiles, logos, discovery endpoints or the closed HNLŽ packet.

A pinned collector on the chosen always-on machine reads that manifest, downloads
only admitted public competition/report URLs, validates HTML with existing parsers,
and writes a durable local cache plus request ledger. The proposed durable state
is SQLite, with one process lock for the entire HNS source. Manual commands and
scheduled runs must use the same queue, lock, clock and budget.

Proposed handoff: a private staging directory on the existing SLFF server, accessed
with dedicated transfer credentials restricted to manifests and collection batches.
Confirm server access before implementation; no server or computer gets exposed as
a public proxy. Upload immutable files plus checksums, then atomically publish a
ready manifest. The manifest binds batch ID, source/season/league/report IDs, exact
URLs, capture timestamps, hashes, collection status and pending counts. Transfer
identity provides authenticity; hashes verify integrity, not provenance alone.

GitHub consumes only validated ready batches, with a captured-snapshot adapter
that cannot fall back to live HTTP. Reuse the current parser, idempotent database
writer and round-score recomputation. Only explicitly collected complete reports
are offered for import; missing snapshots remain pending rather than causing
network fetches or invented 0:0 results. Existing HR cache shards remain intact.
Validate against current competition identity in the database before writing.
All HR writers must coordinate before adding a separate recovery workflow.

## Traffic policy: proposed initial limits, not guaranteed safe thresholds

- Exactly one HNS request in flight across all runs and commands.
- Wait at least 10 seconds after each response/failure before another request.
- Persist every attempted request before sending it. Count errors and probes.
- Separate one-time incident recovery from routine operation. Remove the multi-day
  pilot gates: first validate at most 20 requests across 2 leagues plus one staged
  import, then proceed with the explicitly approved incident queue if validation
  succeeds and no source challenge occurs. This tests correctness, not sustained
  access guarantees.
- Recovery ceiling: 1,000 TOTAL attempts in a rolling 24 h, including initial
  validation, schedules, reports and diagnostics. Bind recovery to one incident
  manifest; do not reset or renew it on restart. Recover only the approved missing
  rounds, never use spare budget to crawl history. Normal operation retains a
  500-attempt rolling ceiling; existing recovery requests still count when switching
  back, so routine work may wait for budget to become available.
- The rolling 24-hour cap survives process restarts, sleep, midnight and crashes.
  Clock rollback pauses collection until reconciled; waking does not replay missed
  scheduled runs in a burst. Budget exhaustion persists pending work for later.
- First full-country operation: one daily cycle at 06:30 Europe/Zagreb. An optional
  21:30 local collection may later check only leagues with matches or outstanding
  reports that day. It shares the same 500-attempt budget. Both use DST-aware time.
- Fetch each league schedule at most once in a cycle and reuse it for discovery,
  schedule import and reports. Avoid the present duplicate fresh schedule reads.
- Completed matching reports use the cache. Refresh only when the schedule score
  changes, a report is flagged incomplete, or an explicit correction is requested.
  Keep a bounded rolling correction audit (at most 10 reports/day from the previous
  7 days, inside the same budget) for changes that do not alter the final score.
- An unpublished/incomplete report is reconsidered no sooner than 24 h after its
  last attempt. Fetch played matches only, not future fixtures or every historical
  match. Do not immediately refetch a just-downloaded incomplete report.
- Seed from validated existing HR caches before recovery and import usable missing
  cached reports before requesting them again. Prioritize leagues by affected user
  count, processing the missing rounds oldest first within each league. Suspend
  the optional correction audit during recovery; prioritize current user impact.
- Publish the first validated league as soon as it is ready, then completed work
  at most every 15 minutes. Import batches while collection continues; never wait
  for all 139 leagues. A later challenge stops further source requests but does not
  invalidate previously captured and verified data.
- GitHub may use the existing three disjoint HR import shards to process staged
  files in parallel. Only the collector contacts HNS; parallel database work does
  not multiply source requests. Batch consumption must be idempotent and coordinated
  with existing HR writers. Unused request budget is not a collection target.

## Stop conditions and recovery

Any HTTP 403/429 or cf-mitigated: challenge / challenge HTML stops ALL HNS requests,
persists BLOCKED across restarts, and leaves the cached batch intact. There is no
automatic retry on another IP, network, browser profile or transport. A Retry-After
value is a minimum wait, not permission to resume. Resume requires operator review
and one explicitly requested diagnostic within the same budget.

Timeout, connection failure or 5xx stops the current collection run; do not retry
immediately. Defer at least one hour and resume only at a later scheduled/operator
run, subject to the budget. Invalid/partial HTML is never promoted into the good
cache. Existing source, identity, body-size and time-limit guards remain enforced.

Log timestamp, normalized URL, status, content type, Ray ID, challenge flag,
duration, decoded byte count, remaining budget and queue state. Avoid response
bodies, player data and secrets in routine logs. A blocked source must not be
reported as a successful current import. Track last successful capture and import
separately per league, plus pending matches, failed batches and budget deferrals.

Monitoring should show the blockage/lag in the operator dashboard or job summary.
A future alert integration must be explicitly configured; no message is sent as
part of preparing this plan. An agreed HNS feed/access allowance and stated rate
would be preferable to guessing limits; no contact is sent without instruction.

## Release gates

1. For urgent recovery, confirm the proven Mac can stay awake/on the same network
   for about four hours. Select an always-on host separately for routine service.
2. Validate private staging access and narrowly scoped transfer credentials.
3. Pass offline tests for global pacing, restart/clock handling, refusal stops,
   cache correctness, batch integrity, source/season scope and idempotent replay.
4. Validate at most 20 requests across two leagues; compare one staged league
   against HNS and existing DB identities, import it and verify results, lineups and
   fantasy scores. No mandatory 24-hour observation hold during this incident.
5. Continue the approved missing-round queue within the recovery ceiling, publishing
   and importing incrementally; inspect counts and errors during the run.
6. Return to the routine ceiling without resetting the ledger. Keep direct
   GitHub HNS reads disabled. Stop/rollback means pausing collection/consumption;
   retain queue/cache and do not undo already verified match imports.

Recovery estimate AFTER the pipeline is installed: 139 schedule reads + 660 missing
reports = 799 requests. At 10 seconds spacing this is approximately 133 minutes of
pacing, plus download and processing time. Plan for roughly 2–4 hours if access
continues and the inventory matches that estimate; initial restored leagues may
appear within 20–30 minutes of starting the recovery because imports stream in.
These are targets, not measured end-to-end timings. Setup/implementation time is
additional. Cached reports can shorten recovery; cold history, publication gaps,
source errors or database bottlenecks can lengthen it. If the approved queue exceeds
1,000 attempts, report that fact and revise scope rather than silently raising the
cap. The computer must remain awake and connected; measure full collector/import
load during the initial run.

References:
- https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/
- https://developers.cloudflare.com/bots/concepts/bot-detection-engines/
