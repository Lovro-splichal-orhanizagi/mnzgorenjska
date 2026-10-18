# DFB Südwest: two reviewed historical reports unavailable

Status: root-approved design with builder amendments; read-only provider/manifest/replay checkpoint implemented, database/import checkpoint still disabled pending separate review. Base is merged main `7a7c2ec1b617cdcc9eeccfc71059e76a10d223a1`. The owner has now approved reviewed historical exclusions for Germany: exact prelaunch matches may retain official fixture/result facts while individual statistics are explicitly unavailable. This supersedes complete archive statistics only for the reviewed exceptions; it does not allow guessed data or future missing reports.

## Exact scope and evidence

Initial scope is only `de-regionalliga-suedwest`, archive `2025/26`, source `dfb`, with these two immutable fixture identities:

| Source ID | Round/date | Home → away | Official observed score | Unavailable reason | Original raw SHA-256 |
|---|---|---|---|---|---|
|2402929|11 /2025-10-04|tsg-balingen → kickers-offenbach|1:1|contradictory_starting_xi:12 distinct home starters|cda4f2b1cdd971e85cc34feab5c570e5388c733d69c474b02ca16a50f3d52296|
|2403004|19 /2025-11-29|tsv-steinbach-haiger → tsg-balingen|0:0|contradictory_discipline:Pfahl ordinary yellows26/36, sub61, no dismissal|3fd9c5a0cf2d21a0ee76c06cef5e07f5fa836f725651ebc3cdc8e5daa0a3dfff|

Canonical DFB URLs are retained exactly in `scripts/vzorci/de-dfb-suedwest-provenance.json`; raw fixtures are `de-dfb-suedwest-2402929.html` and `de-dfb-suedwest-2403004.html`. These are from original complete Actions archive capture39043125440, not new captures. Their original SHA/UTC stay unchanged. Targeted ordinary18October requests returned the same strict failures but different page-shell SHA; they corroborate persistence of the defect and do not replace the approved original bytes or refresh the complete capture.

The one shared policy registry must receive these two entries under policy ID `de-dfb-suedwest-2025-historical-unavailable-v1`, source competition `regionalliga-suedwest/2025-2026`, phase null, and exact source URL/round/date/clubs/observed score/raw SHA. The authoritative approval reference is `user reply to call_e8c944e47b7c42a38afa4f08fda48c23`; `recordedAt=2026-10-18T13:03:55.270673+00:00` is the execution-state recording time, not an invented user-send/approvedAt timestamp. Draft descriptors are in the private operations packet, not an active registry.

## Shared contract and ownership

HNS historical-availability owner owns all generic work:

- `scripts/policies/historical-statistics-exclusions.json`, schemaVersion1 and one canonical policy registry. Germany provides descriptors rather than editing this file concurrently.
- `scripts/lib/historical-statistics-policy.mjs`: `classifyHistoricalStatistics({competition,fixture,rawSha256,policy})` returns `{kind:'normal'}` or `{kind:'unavailable_historical',exception,policySha256}` and rejects identity/hash/time/policy drift.
- Shared migration and service-only registry, `apply_historical_statistics_policy(p_competition_id bigint,p_policy_id text,p_policy_sha256 text,p_entries jsonb)` and `upsert_unavailable_historical_match(...)`. `upsert_unavailable_historical_match(p_competition_id bigint,p_source_match_id text,p_policy_id text,p_policy_sha256 text,p_raw_sha256 text,p_header jsonb)` is the agreed atomic signature.
- `matches.statistics_status` with available default / unavailable_historical, public reason and source URL, shared statistics/scoring/cache masks, source-neutral unavailable UI/i18n, tests and regenerated database types.

The shared database guard must reject generic activation RPCs and direct `competitions.active` writes for policy-enabled competitions, allowing only a private verified transactional release boundary; no caller-spoofable GUC. Installed markers are verified against exact DB policy/fixture binding and skipped before report fetch/parsing in both stream and single-report entrypoints. The registry never needs nightly refetch of the original raw SHA.

DFB owner owns only its provider adapter, release/audit/replay/offline-import code and a new DFB-specific RPC migration. The shared owner/Spain retain `scripts/uvoz-zapisnikov.mjs` and provider-factory integration ownership: DFB supplies its typed prepared/read unavailable envelope for their one shared pre-derivation hook rather than editing that common importer concurrently. An inactive exact provider/slug tuple opts into `competitions.source_policy=de-dfb-suedwest-2025-historical-unavailable-v1`; ordinary DFB competitions keep the existing provider. The provider factory must refuse any inconsistent tuple. Do not create a second generic registry, second shared availability schema, or parallel UI implementation. Dependencies must land or be integrated before the DFB branch can claim readiness.

## Representation: known result, unknown statistics

Both fixtures remain real played archive fixtures, counted in all306 fixtures and the34-round schedule. Their observed1:1/0:0 scores come from the pinned official headers; the zeroes in0:0 are observed result facts, never inferred player statistics. Do not mark them unplayed, a walkover, postponed, empty-valid report, or successful import. Preserve source identity and URL.

Unavailable fixture manifest records carry `statisticsStatus:'unavailable_historical'`, reasonCode, policyId/hash, original raw URL/SHA/capture time and the observed result. `starters`, `appearances` and `goals` are `null` to distinguish unavailable evidence from a proved empty set. No report object is synthesized; strict `vZapisnik` must continue to reject both inputs. Normal played fixtures continue to carry22 named starters, real appearances/goals and explicit keeper evidence. Future unplayed fixtures retain their existing empty known-to-be-unplayed shape.

Persist unavailable rows only through the shared service primitive, with `imported_at=NULL`, exact policy reference and zero actual appearance, goal and individual-point/cache rows. That absence is an integrity constraint, not a score of zero or proof nobody appeared. Do not add dummy players, guessed XI, copied lineups, discipline, minutes, keeper roles or invented report events. A1:1 fixture with no individual goal rows must be represented as unavailable in diagnostics rather than reported as a complete valid statistical match.

Shared UI must render an explicit historical-statistics-unavailable explanation/link, and dashes/unavailable for individual points/minutes/cards/goals. Available official result may still display with that explanation. Do not show an empty lineup/0-minute performance as completed data. Player totals/prices use verified history only and disclose the two omitted reports; shared views/scoring/caches must not turn absence into an individual zero performance.

## DFB adapter and manifest v3

Add `scripts/dfb-historical-policy.mjs`, consuming the shared classifier and the approved raw-document map. It verifies the exact two registry entries against schedule identity, sourceURL, rawSHA, scope and original strict parser rejection. It must require the known defect, not accept arbitrary transport/errors, different unknown players, a truncated document, challenge or a different fixture. All source reads remain closed-map offline during replay/import. The raw parser/cache validator is not relaxed.

Versions1 and2 remain strict and unchanged. Add explicit manifest version3 for this reviewed policy. Initial v3 scope is only Südwest with this exact policy; Nord, West, Bayern and Nordost cannot inherit it. Top-level fields add `statisticsPolicy:{id,sha256}` and `provenanceVersion:2`. Initial v3 supports only real policy-aware replay lineage for both seasons; it rejects direct/mixed proof rather than adding a second execution path. Each season declares `evidenceMode:policy-replay`; the registry, classifier, adapter and all pinned proof dependencies belong to reviewed source/code fingerprints.

Every season retains all fixture/round/pair/byes checks. v3 records honest coverage counters: `fixtureCount`, `playedCount`, `availableStatisticsCount`, `unavailableHistoricalCount`, `strictStatisticsCoverage` and `policyCoverage`. Archive must be exactly306 played /304 available /2 unavailable, and unavailable IDs exactly the reviewed pair. It reports `strictStatisticsCoverage:false`, `policyCoverage:true`; never rename304/306 to306 complete reports. Current2026/27 must have zero unavailable entries and complete valid statistics for every played fixture, including all prelaunch current history. Keeper coverage for every club must still come from available authentic reports in each season; unavailable rows never contribute keepers or appearances.

`sestaviSezono`, `preveriOdobritev` and `pripravi` validate the same policy descriptor bytes/hash, exact counts, available/unavailable sets and original raw bindings. Normal canonical appearance/goal multisets remain unchanged. Unknown extra missing reports, altered scope/row/date/clubs/score/URL/SHA/reason, duplicate entries, policy omissions, extra current exceptions or fabricated empty arrays fail closed.

## Capture/replay proof and freshness

Do not weaken global `preveriPokritost` or label a failed strict capture successful. Existing full raw archive39043125440 may be replayed, while still within7days, through a real new Actions policy-aware replay at the reviewed implementation commit. Verify original completed parent/job/step/artifact digest/index/document SHA/UTC and all its transport-completeness conditions exactly as today. Preserve its actual failed strict outcome and304/306 strict result.

v3 replay evidence explicitly records policyId/hash, the real successful policy-aware replay job/step, available/unavailable counters, strictStatisticsCoverage:false and policyCoverage:true. For the initial release, first capture the current season through the unchanged strict capture workflow, then perform a real closed policy-aware replay of that complete current capture as well as the retained archive. Both replays bind the same reviewed policy/code; current has strictStatisticsCoverage:true and zero unavailable. No v3 direct capture or mixed direct/replay proof is admitted in this first change. Existing v1/v2 summaries with `strictCoverage:true` must not be fabricated for v3. Closed execution verifiers must require the actual declared mode/step/output and reject an old strict artifact relabelled as policy-aware. Registry/raw/code/proof drift requires review.

Original freshness remains archive7days/current12hours; replay generation time never refreshes capture time. Current source must be freshly captured in Actions through the ordinary polite shared DFB reader, and have complete current reports. No source fallback, bypass or concurrent independent source readers. Prefer retained archive replay plus fresh current audit rather than hundreds of redundant archive GETs. If original archive becomes stale, make a new capture and review/rebind its exact two raw hashes; do not accept arbitrary changing page-shell bytes automatically.

## Actions import and RPC

Extend the existing Actions-only regional import, preserving manifest equality after full offline replay before the first database mutation. Import304 authentic archive reports through the usual flow. The DFB wrapper classifies the two approved raw documents from the closed map, may pass only their exact IDs through the existing base-provider `preskoci` set, and emits two typed unavailable envelopes for the shared importer hook. It never synthesizes `z` or returns partial appearances; any unrelated parse failure remains fatal. Upsert their exact official fixture/result/availability via the shared primitive under the approved policy. Then ordinary current schedule and all current reports, positions and prices. No local production key or SQL writes.

The DB policy is applied only while competition is inactive/prelaunch, with no user-created fantasy data to rewrite. Import/preflight must refuse existing appearances/goals/individual points on the unavailable fixtures rather than silently deleting them. No overwrite/cleanup of a populated or live exception is implied. Subsequent source correction needs a separately reviewed complete-statistics recovery and an atomic normal-data/availability transition, not silent removal of the warning or nightly guessed replacement.

Add a new migration: v1/v2 public dispatch still uses unchanged strict `private_dfb_release.varen_vklop_dfb_regije`; v3 dispatches to a separate private policy-aware gate. Do not convert unavailable rows to unplayed or inject phantom rows merely to reuse v1. The v3 gate independently retains all existing source/season/freshness/size/SHA, table locks, complete612 fixture/68 round set, pair uniqueness, available report metadata/canonical multiset equality, official keepers, current substitutes/club membership, prices and future-round atomic activation/readback checks.

Only complete-report predicates are split by explicit statisticsStatus. Unavailable rows must match the service-only registry and manifest exact policyId/hash/fixture/raw binding, retain observed header score/URL with imported_atNULL, and have no individual rows. Normal fixtures remain subject to every existing22-starter/appearance/goal/orphan constraint. Do not claim validation of unavailable players. DB policy/availability rows must be locked/read consistently with matches and the release transaction.

Price gates remain at most70% default4.5, maximum price at least8, valid2/5/5/3 squad with at most3 per club within100, zero orphan goals among verified data. Minimum270 verified minutes and official keeper-position evidence are unchanged; no phantom minutes from missing reports. Existing future six-hour deadline calculation, unlocked first fantasy round and atomic activation/readback remain intact. Server/UI availability deployment must be verified before activate=true.

## Release sequence and tests

1. Root reviews this design/plan and the shared HNS contract. Land shared prerequisites and independent review/green fresh-DB checks; then build/test the DFB adapter/manifest/RPC changes on the resulting main.
2. TDD authentic304+2 archive and105 saved current, mutation/rejection cases and SQL/RLS/locking tests; full preserved regional/Nordost/Bayern replay must keep every previously accepted report and canonical appearance equal. Default v1/v2 without policy still refuse the two reports.
3. Real policy-aware archive Actions replay plus fresh complete current Actions audit, at reviewed code. Prepare exact v3 manifest and inspect SHA/counters/keeper evidence; explicit approval of its bytes binds import/activation.
4. Inactive Actions import304+2/current/positions/prices, production canonical preflight, deployed unavailable UI checks, future deadline/readiness; activate only if every gate passes. Verify public league/player prices and both unavailable match pages. No other league activates by implication.

Required negative tests cover wrong/extra/missing policy rows; archive/current/future/foreign-league collisions; raw/URL/date/club/result/reason changes; old strict proof relabelled successful; source challenge/transport/truncation; stale originals; policy/code/manifest hash drift; null versusempty arrays; existing individual data/user fantasy teams; cross-league policy writes; source-cache bypass; keeper counts using exceptions; price/default/squad limits; guessed stats; postlaunch missing reports; concurrent writes/deadline locking; UI/cache/scoring zero-coalescing; and regression of ordinary v1/v2, Bayern and Nordost.

## Read-only checkpoint boundary

The first implementation intentionally rejects manifest-v3 production import and database release before any database request. Those guards are removed only with the separately reviewed shared schema/import marker seam and DFB RPC checkpoint. It does not seed source_policy, install policies, persist unavailable rows, activate, or call providers. The existing strict source parser remains unchanged.

## Writer checkpoint: atomic metadata bootstrap

The canonical source_policy is `de-dfb-suedwest-2025-historical-unavailable-v1`, identical to the approved registry policy ID. No abbreviated policy spelling is accepted. The writer branch starts at reviewed merged mainf57d2359; its shared prerequisite is the reviewed historical availability schema, with unchanged DFB policy SHA.

`prepare_dfb_historical_statistics(p_manifest text,p_sha256 text)` independently validates the complete approved v3 packet, original freshness, exact policy/lineage and306+306 fixture topology. It provisions only the three exact source club names, the two actual archive round metadata rows and the first actual future round metadata/config. It installs policy and BOTH unavailable headers atomically through the shared primitives. A failure on either entry rolls back the entire operation. This resolves an empty-DB dependency without inventing reports or consulting an incomplete installed getter. Ordinary304 archive reports, fullcurrent schedule/current reports, roles and verified-history prices follow afterwards.

The future candidate is computed from the packet. Retained source currently identifies round13 firstday2026-10-23 at19:00 local, six-hour cutoff2026-10-23T11:00Z; this is a retained lead, not a replacement for fresh source confirmation. DiagnosticOct25 must not become an operational configuration.

The separate v3 private gate checks the complete persisted612-fixture/68-round sets, exact normal canonical rows, installed immutable empty unavailable headers, keepers, active clubs, substitutes, prices, squad and six-hour future deadline. It then calls the owner-only shared transactional authorizer and changes only active=true in that same transaction. Its whole state snapshot and future-round readback remain binding. The original v1/v2 dispatcher bodies stay private and unchanged. Installed runtime markers are checked before DFB traversal; explicit installed single reports return before any fetch. V3 JS writer guards remain until the shared importer and Actions wrapper receive their separate review.

## Final writer runtime checkpoint

The combined writer now removes the temporary v3 JS disable guards. It first validates the exact approved manifest bytes and complete closed replay, then calls the atomic prepare RPC before ordinary archive import, current schedule/report import and role/price calculation. The complete installed binding is obtained through the shared runtime before provider traversal, including selected-report requests. An installed selected report also clears stale diagnostics on a reused provider. Full database preflight remains a separate final request; import does not activate the league.

The database receives the original manifest as text, preserving its SHA across whitespace and numeric spellings such as8.10. The reviewed source fingerprint includes ordinary import/schedule/role/price dependencies. A synthetic, explicitly test-only closed packet proves ordering/refusals through the real replay/provider/shared-loader code; it is never release execution evidence. Actual service-role SQL tests cover transactional bootstrap, persisted canonical data, activation, rollback, access boundaries and independent locks.

Root's fresh strict current capture39135160991 at pinned f3 succeeded with105/105 source-published reports. Fresh R13 schedule confirms Friday2026-10-23 first kickoff19:00 local and the six-hour cutoff11:00UTC. Today's two unpublished fixtures2426395/2426400 remain ordinary pending fixtures, with no historical exemption or verified-statistics claim. Real archive/current policy Actions replays at final reviewed code, reviewed manifest approval, fresh-chain CI, deployed availability UI and guarded production import/preflight/activation remain operational prerequisites.
