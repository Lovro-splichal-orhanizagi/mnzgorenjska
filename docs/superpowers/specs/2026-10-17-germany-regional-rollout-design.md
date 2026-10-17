# German league expansion

The owner authorized making the other German leagues ready and activating those that pass validation. Continue the existing Germany design and release process. Senior men's leagues are the initial working scope. Regionalliga Nordost is already live and its users, prices and fantasy start must stay unchanged.

## Available sources and first batch

Production currently has one German competition, not hundreds of prepared inactive competitions. The four other Regionalligas have real official DFB team schedules and full representative current/archive reports. Prepare Nord, West, Südwest and Bayern first. Only complete season audits establish readiness; representative fixtures establish implementation support only.

The verified seed clubs are VfB Oldenburg (Nord), Rot-Weiß Oberhausen (West), FSV Frankfurt (Südwest) and Bayern München II (Bayern), in both 2025/26 and 2026/27. All have 18 clubs, 34 rounds and 306 fixtures except Bayern 2026/27: 19 clubs, 38 rounds, 36 games per club and 342 fixtures. Preserve case and encoded spaces in official team identifiers, including `SV-Todesfelde` and `DJK%20Vilzing`. Never infer a team's URL from its display name.

Public FUSSBALL.DE samples contain anonymous official cards. Their linked club/fan ticker JSON has player names but conflicting minutes and no shared event identity. Do not merge those sources by order, colour or approximate time. The official Sportmedia match-report service is a potential lower-league source, pending actual feed access, coverage and current/archive samples. No outreach is authorized. These leagues remain unavailable until their source gap is resolved.

## Implementation and release

Extend the existing DFB implementation using an explicit competition/season registry. Keep the standalone report parser's Nordost default; other league parsing requires an explicit registered competition. Match canonical URL, competition title, teams, season, round, result, goal beneficiaries, attributed discipline and actual substitutions. Maintain rejection of unknown structures and all existing narrowly bound Nordost corrections. A complete home/away pair set, per-round unique participants and two byes per club in the odd-sized season must be checked.

Capture full seasons through a read-only official Actions audit at a reviewed commit. Preserve raw documents, URL/time/SHA provenance and compact error reports. Keep a shared polite DFB request budget; no access-challenge bypass and no independent simultaneous crawlers. Stop on challenge/401/403/429.

Seed a competition inactive only after its current/archive identity is verified. Import archive, schedule, current reports, positions and prices through existing Actions. Production keys remain there. Build a separate guarded release path for these four candidates; do not weaken or repurpose Nordost's existing activation RPC. Bind activation to reviewed raw-source manifest bytes and parser code, fresh source captures, production record equality, complete published history, official starting goalkeeper evidence for every club, active current club membership, real substitutes, zero orphan goals, varied prices and a valid 15-player squad within 100. Select and verify a future unlocked first fantasy round atomically. Archive omissions block launch. Any proposed current historical exception requires a separately reviewed exact match policy; there is no general missing-report exemption in this batch.

Activate each passing league under the owner's existing authorization, then verify public league selection, priced player lists and the future deadline. Report exact live counts and concrete blocked leagues; never imply all Germany is covered.

## Read-only replay after evidenced parser repairs

The full Nord capture exposed six parser support defects and four independent official data blockers. Retain every original source byte and timestamp. A repaired parser may validate an existing capture through a real new successful read-only Actions replay, rather than re-fetching hundreds of unchanged source pages.

The replay proof must bind original capture run/job/step/commit/artifact ID and digest, unchanged original document index/raw URL/SHA/UTC and oldest capture time, plus the new actual replay run/job/step/reviewed parser commit and fingerprint. Verify both executions with GitHub APIs, including repository/workflow and season identity; original parser failure is allowed only as explicit completed parent, never relabelled success. Reject cancelled/timed-out/refused/transport-incomplete parents and missing or changed source. Verify the downloaded original artifact digest and every source document; artifact action warnings alone are insufficient integrity verification.

Replay is closed to DFB network and database access. It must reparse the entire season and pass the original complete coverage, shape, named starter/keeper and event checks. Nord's four source gaps still block. New output/generation time is separate from unchanged original capture times; freshness remains current12h/archive7days from oldest original document.

Use explicit regional manifest version2 for replay lineage; preserve version1 direct successful captures. Prepare/import/check/activate all verify the same lineage, original freshness, approved exact manifest SHA, reviewed current parser fingerprint and complete persisted record equality. Add a new migration for version2 proof validation without weakening existing canonical-statistics/readiness/lock checks or editing merged migrations. No original job result fabrication, no generic missing-report exceptions, no Nordost gate changes. Regression coverage must accept an authentic failed-parser parent with fully valid corrected replay and reject wrong/cancelled/incomplete parent, fake/wrong replay, code/artifact/digest/URL/SHA/time changes, stale original capture, missing reports, source network fallback and database mismatches.

### Additional observed stoppage-time format

West archive match2402377 explicitly publishes ordered90+34/37/39 clocks in both timeline and event sections. Support the verified added-time range through39 without inferred offsets or rewritten source timestamps. Retain phase, ordering, substitution and identity checks, and the existing capped statistical-minute calculation. The original raw report must pass through the normal parser after RED/GREEN; the ten independently classified West source-data gaps remain hard blockers. This is a bounded parser-format repair, not permission to omit reports or infer player roles.
