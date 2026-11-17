# Overnight incident recovery operation

User authorized this Mac overnight, collecting all recoverable results and handing off to GitHub workers. No AI polling is required. Scope: active current-season HNS139 and Kielce8, Nov6–17,2026. Other sources were tested separately: Dodecanese403 (stopped); FCF public HTML contains a loading shell, no parsed match (browser host unavailable).

## Capture

`hns-collection-manifest.mjs` reads public Supabase inventory and completed IDs, paginated. Private state lives in `~/Library/Application Support/SLFF-Recovery/hns-20261117`. Collector runs under `caffeinate -i` and saves after each report. One request at a time, at least10seconds after response. Persistent host SQLite budget defaults950 requests/24h (50 reserved for previous diagnostics, maximum1000 cannot be exceeded). Refusal stops persistently. Transient failures defer at least an hour and stop; no automatic retry. Resuming retains ledger, hashes and manifest identity. A completed collection may still contain pending reports; only validated complete reports are admitted to imports. No blanket retry of pending/unpublished pages tonight.

The first pilot used6 requests across4 leagues (first2 had no missing reports), producing2 complete reports. The intended two-league pilot was not enforced by the original invocation; `--max-leagues` now makes that bound explicit. Validation and restart issues found in review were fixed before the unattended continuation. HNS report HTML does not contain its report ID; requested URL and captured schedule bind that ID, while independent report header competition, round, date, original club spelling and score checks prevent relabeling.

Kielce collector completed16 schedule requests across8 leagues. The affected November fixtures remain unplayed in the source payload, so no completed missing reports were available in the requested period. A separate older completed report probe had parsed successfully. These are different findings; reachable transport does not mean the November results exist.

## Private handoff and imports

`recovery-publish.py` copies content-addressed original bodies and immutable snapshot JSON to `/srv/slff-recovery/hns-20261117` on the existing SLFF server, root:deploy, directories2750/files640. Not web-served. GitHub uses the existing deployment identity only for the transfer and removes the local private-key file before replay. This reuses an existing credential rather than creating a general self-hosted runner or exposing a new endpoint. This is a deliberate operational amendment to the earlier proposed dedicated transfer identity; credential rotation/scoping is outside this one-shot recovery.

`recovery-captured.yml` validates an exact SHA256 snapshot and replays complete reports via the existing native writer, in3 disjoint HNS shards. It checks live country/source/league bindings, body hashes, and report ownership. Authoritative completed IDs are skipped, preventing cumulative batches from replacing newer imported results. Captured rounds are recomputed even if reports were already imported, permitting recovery after scoring failure. No activation or player pricing step. Source transports and full schedule traversal are disabled in the recovery adapter.

Deploy reciprocal country/global writer coordination before enabling production replay. Preview requires explicit true; writes require explicit false. The overnight watcher submits at most every15minutes and waits while an older recovery run is active. It ends after the final snapshot is submitted or after10hours; failures are retained in private logs for inspection.

## Status and operation

Inspect `collector.log`, `latest.json`, `hns-ledger.sqlite`, `submitted.json`, and `handoff.log` under the private state directory. Do not reset the ledger to retry a refusal. Existing direct HNS/PZPN nightly-source exclusion stays in force. This is one-shot backfill infrastructure, not proof that GitHub-hosted source requests now work. Keep this Mac powered with its lid open while capture is active.
