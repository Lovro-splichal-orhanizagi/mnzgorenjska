# Three Catalan groups: reviewed historical gaps and current-season launch

Status: user policy approved; implementation awaits independent builder review. Base `f3a09962fd2ea6a72f2b027efdb7eb16a034a052`. Preserve the dirty user checkout.

The user explicitly approved both replies to `call_84764278412542b2ab37d9bb6e61eb67`: four marked historical exclusions with inactive cleanup, and a current-season-only launch basis for these three groups, conditional on full source, keeper, pricing, roster and future-deadline validation. Recording time is not the unknown user send time. No other Spanish exclusion or missing future report is approved.

## Exact scope

| Competition | Native report / stored match ID | Date, round, published score | Conflict |
|---|---|---|---|
| `es-ct-segona-g1` | 4109388 / 321646 | 2026-09-20, R1, 0:3 | Goal progression 2:2 |
| `es-ct-tercera-g2` | 4116215 / 297199 | 2026-10-10, R4, 5:0 | Goal progression 4:0 |
| `es-ct-tercera-g9` | 4118352 / 306164 | 2026-09-19, R1, 3:0 | Goal progression 1:4 |
| `es-ct-tercera-g9` | 4118358 / 306171 | 2026-09-26, R2, 0:3 | Goal progression 1:0 |

Use native numeric source IDs in the common registry; stored `matches.zapisnik_id` is `es<id>`. Season `2026/27`, phase null. The exact raw SHA, URL, group ID, club/category IDs, capture timestamps and receipt bytes are frozen in `/private/tmp/slff-growth-execution-2026-10-18/rollout/spain/four-historical-source-descriptors.json` and `four-historical-exclusions-proposal.json`. Verify those bytes rather than copying approximate names. Keep the published result, never infer an administrative award or invent a missing goal/time. The reason is score/event contradiction.

Snapshots contain 29/28/26 current imported reports; exclude 1/1/2 respectively (3.45%, 3.57%, 7.69%), leaving 79/83 complete across the three groups. All three have zero archive fixtures, rounds or appearances. The approved route deliberately uses verified current evidence alone; it does not claim archive coverage. Fresh new reports can increase these counts and must be fully checked. Segona G2 and its closed/unknown-result report 4109649 are outside scope. The applied Calonge correction 4116202 remains intact.

## Shared availability, no parallel mechanism

Depend on the reviewed common registry/classifier, availability schema, installed-marker contract, public UI and private activation boundary owned by the HNS/shared worker. Append three exact FCF policies through that single registry owner; seed matching immutable DB descriptors in a new migration. Provider stays `fcf`; opt-in policy tuple is source `fcf`, one of the three slugs, and `source_policy='es-fcf-reviewed-history-v1'`. Unknown tuples fail. Do not modify existing applied migrations or change the 23 ordinary active Catalan groups.

Initial classification consumes verified raw/header identity before individual derivation. All other reports retain the ordinary strict parser/audit. Once installed, an exact historical marker is verified against its immutable policy, source ID and fixture identity and skipped **before fetching or parsing**, in both full-stream and single-report paths. Changed source facts require separately reviewed recovery; no nightly extension or automatic guessed restoration.

Unavailable rows preserve match IDs, official results and source links, have `statistics_status='unavailable_historical'`, public reason, `imported_at=NULL`, and zero actual individual rows. They remain accessible in results/detail with unavailable individual sections and honest aggregate coverage. Shared primitives continue refusing existing individual data. No generic delete/skip flag is introduced.

## Separate bounded cleanup

Exactly 126 appearances and 14 goals currently exist on the four matches. A read-only snapshot found all three leagues inactive, zero human/house fantasy teams, roster references, lineup snapshots, position/deleted-position votes, and zero assist/deleted-assist votes or confirmed assist/confirmed-none fields on the targets. Recheck all of this at execution; snapshots are not authorization to ignore drift.

Implement a service-only, exact-four, inactive-only cleanup transaction. A prepare step first retains a complete restricted before-image and canonical SHA in an authenticated Actions artifact. Writer input binds reviewed main commit, policy hashes, snapshot SHA and exact target IDs. The database independently locks and rechecks source/competition/round/match identities, full canonical preimage and all user-activity/dependency gates. New activity, a changed preimage or an unexpected dependency aborts before deletion.

Delete only approved individual rows, preserve matches/players/official-absence/profile references, and recompute affected derived points/caches without changing unaffected match facts. Then install approved policies and upsert exact unavailable markers in the same transaction. The common upsert is not weakened to permit deletion. Do not leave stale `player_scores` from the removed performances. A rollback test and before-image restoration rehearsal must prove atomic failure recovery in an owned disposable database. No public registry/hash/approval leakage.

## Import, prices and activation

Use existing polite FCF transport/cache/source coordination, canonical header/group/season checks and stop on 401/403/429/challenge. No blocked `/api/` or `/_next/` calls. No unbounded source discovery. Prepare a dedicated policy-aware current-source release packet with original capture timestamps, normal report canonicals, exact exception descriptors and real artifact/hash lineage. Existing retained evidence can be staged authentically; do not relabel it fresh. Root authorizes bounded fresh current-source capture when implementation is reviewed; ordinary source cache/freshness rules apply.

Register no replacement competitions and do not duplicate/move source report IDs. After cleanup, import all normal current reports and preserve the exact four installed markers; recompute inactive prices/positions with existing scripts. Actual validation must show explicit keeper coverage, at least six eligible clubs, default-price share at most70%, maximum price at least8 and a feasible 2/5/5/3 squad under100 with at most3 perclub. Previous prices included disputed rows and are not proof of the cleaned pool.

The retained candidate first fantasy round is R6, 24–25October, eight fixtures each; stored deadlines are 24Oct08:00UTC for G1/G2 and09:30UTC for G9. Freshly verify complete schedules, published kickoffs and a strictly future unlocked deadline. No stale/locked round reopens. The source-policy activation trigger must reject generic RPC/direct service-role activation unless the dedicated private gate has independently verified exact coverage, policy/packet binding, actual DB prices/roster and deadline atomically. Caller-spoofable GUCs cannot authorize activation. Old ordinary FCF activation remains unchanged.

Palafolls R4 is in the first R6 market window R4–R6. Preserve the existing incomplete-data price wait for those two clubs; do not convert missingness into zero form or an absence penalty. R7's R5–R7 window can resume if otherwise complete. R1/R2 exceptions are outside R6's window. Prove this bounded behavior without inventing a new market model.

All production writes, repricing and activation run in GitHub Actions with existing country/league writer coordination. Local SQL is explicitly read-only. Root owns staging, pushes/PR/merge/deploy, source runs and activation after independent reviews and exact-head CI. Separate prepare, cleanup/import and activate stages; failure leaves the target inactive. Verify deployed unavailable UI before activation, then public league/player data and exact DB after-images. No federation emails.

## Ownership

Shared owner: registry writes, common schema/types/UI interfaces and generic importer seam. UI worker: common UI/locales. Spain owner: FCF policy wrapper, exact cleanup/release RPC migration, dedicated release workflow/packet and price/deadline proof. Germany owner remains separate. Coordinate shared-file patches instead of overwriting newer importer/factory code.
