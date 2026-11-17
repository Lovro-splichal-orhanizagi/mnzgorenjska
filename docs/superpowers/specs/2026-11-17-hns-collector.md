# HNS collector: controlled collection, offline GitHub import

Status: proposed design only. No collector, scheduler, staging service or credentials
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
- Pilot caps: 30 attempts/rolling 24 h for 2 leagues; then 100 for 10 leagues;
  eventual initial ceiling 500 for all 139. Each stage needs at least 24 h of
  observations before expansion and an explicit configuration change. No auto-ramp.
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
- Seed from validated existing HR caches before recovery. Backlog priority is the
  missing two rounds, ordered oldest first, then other explicitly approved gaps.
  Once fully enabled, target at most 300 backlog reports/day within the total cap,
  reserving room for up to 139 schedules and the correction audit. Unused budget is
  not an instruction to discover or download more data.

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

1. Choose the always-on machine; confirm it can reach HNS with the pinned client.
2. Validate private staging access and narrowly scoped transfer credentials.
3. Pass offline tests for global pacing, restart/clock handling, refusal stops,
   cache correctness, batch integrity, source/season scope and idempotent replay.
4. Complete the 2-league and 10-league pilot stages, recording outcomes and lag.
5. Compare one staged league against HNS and existing DB identities, then run an
   explicitly scoped import and verify results, lineups and fantasy scores.
6. Enable remaining leagues gradually within the same global ceiling. Keep direct
   GitHub HNS reads disabled. Stop/rollback means pausing collection/consumption;
   retain queue/cache and do not undo already verified match imports.

At the eventual 300-report/day target, 660 missing reports need at least three
collection days AFTER pilot expansion, assuming no new errors or competing work.
This is a capacity estimate, not a completion guarantee. The computer must be awake
and connected during collection; normal work can continue. Full load gets measured
in the pilot before committing to a background-service resource budget.

References:
- https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/
- https://developers.cloudflare.com/bots/concepts/bot-detection-engines/
