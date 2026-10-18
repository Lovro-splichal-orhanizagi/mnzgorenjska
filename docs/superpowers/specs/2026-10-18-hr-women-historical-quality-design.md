# Croatian women: bounded historical availability and launch design

Status: **design for ROOT review; no implementation or activation authorized by this document alone**.
Base inspected: `f7efba26c31f76372b5aab1e976061631fbaebda`. Source collection is stopped. The dirty user checkout is untouched.

## Approved scope and evidence

The user explicitly approved historical individual-statistics exclusions for exactly HNS match IDs `114471617`, `114471627`, and `114471629`; ROOT relayed the final approval at 12:52 UTC on 2026-10-18. These are prelaunch quality exceptions, not permission to weaken future reporting. German exceptions are separately owned and reviewed; the shared mechanism must support their exact reviewed descriptors without a second registry.

The proposed HNS import is **102 observed played matches: 75 archive plus 27 current; 99 complete individual reports plus 3 explicit unavailable reports**. Archive container `108043476` includes 42 league, 24 playoff and 9 playout fixtures. Current container `114471579` has 56 fixtures in the first 14-round phase with 8 clubs. The snapshot preceded completion of current round 8; later completed reports still require normal validation before release. Supplemental Donat/promotion/qualification 21 reports are evidence only and are outside this import. The archive base-only container `100511683` must not be imported alongside its full container.

| Exact unavailable report | Published header retained | Missing or conflicting facts | Captured raw SHA-256 |
| --- | --- | --- | --- |
| [114471617](https://semafor.hns.family/utakmice/114471617/x/) / 2026-08-23 / Gorica 1274–Donat 107347 / round 1 | 2:2 | Alić 426409 enters at 46 but red clock is empty; 45 listed minutes does not establish an after-match red. Donat GK Vidović 332440 dismissed at 85; final GK identity is absent. | `2dc781b523945db96f2a1ab2d216aaf19760c1c98e1aca3bade2c98fae09c53b` |
| [114471627](https://semafor.hns.family/utakmice/114471627/x/) / 2026-09-13 / Dinamo 108341–Donat 107347 / round 4 | 4:1 | Dinamo GK Filipović 331822 dismissed at 77; final GK identity is absent. No conceded goal after the red does not supply that identity. | `c6a292c409c20a6b71c7b0d2089245325b7361356fb0637ef77feb52772db04c` |
| [114471629](https://semafor.hns.family/utakmice/114471629/x/) / 2026-09-13 / Međimurje 175835–Agram 649 / round 4 | Awarded 3:0 (explicit BB/FF) | Field goal events at 37, 55, 70 describe 0:3. No dual-result scoring feature is proposed: individual statistics are unavailable for the whole match. | `382a9be268301534f8e085587e994ac3ecb093288f08e38126a1bbcfe012db14` |

These are 2.94% of the 102 played matches and 11.11% of the 27 current played matches at capture. Raw evidence is private at `/private/tmp/slff-growth-execution-2026-10-18/rollout/hr-women`; retain its capture times and receipts. Before the final delta there were136HNSreads including reused pilot captures. The one authorized final schedule refresh adds1:137HNSreads (138 relevant requests including one external primary news read), no refusals or challenges. Do not recapture the archive.

**Retain archive 100511758.** The published Gorica 0:4 Dinamo report on 2025-11-02 records keeper red at 51 and replacement GK at 52. The resulting 89 GK minutes are an explicitly published one-minute transition, not an unknown keeper segment requiring fabricated 90 minutes. Goals at 5, 18, 49, 77 avoid that transition. Neither GK reaches 60 minutes. Do not expand the approved exception set to this report or to supplemental reports.

Verified main-only appearance pool after the three exceptions: 156 current appearing players; 122 have at least 270 combined archive/current minutes; 95 have at least 270 current minutes. All 8 clubs have explicit GK identities. Donat has 18 current players, 10 at least 270 minutes, and explicit keepers Vidović 266 and Adamović 184 current minutes. **270 minutes is a pricing threshold, not a GK launch gate.** Existing policy may assign either keeper the normal default 4.5. These counts do not establish actual prices or roster feasibility.

## Minimal architecture

Use one league opt-in, one exact registry and one shared classifier. Keep the HNS provider identity `hns`, source person IDs and competition-scoped player identity; reuse country-global club identity (Gorica 1274 is the same organization as the men's club). Never merge women players into men's competition records. Do not change existing active leagues, ordinary HNS parsing or default pricing.

Persist nullable `competitions.source_policy` (`hr-hnlz-v1` for this new league) and nullable `competitions.date_only_deadline_policy` (`midnight-local-v1` for this new league). The provider factory selects an HNS women wrapper only for the reviewed slug/policy/provider tuple; inconsistent tuples fail closed. Proposed slug is `hr-prva-hnlz`, pending repository uniqueness verification during implementation. Registration is inactive. Policy changes after activation require an explicit migration/review, never an environment-variable bypass.

### One historical availability contract

Canonical file: `scripts/policies/historical-statistics-exclusions.json`. Shape:

```text
{schemaVersion:1, policies:[{id, provider, competitionSlug, season,
 approvedAt, approvalReference, entries:[{sourceMatchId, sourceCompetitionId,
 sourcePhase, sourceRound, playedOn, homeSourceClubId, awaySourceClubId,
 sourceUrl, rawSha256, observedHomeScore, observedAwayScore, reasonCode}]}]}
```

HNS policy ID `hr-hnlz-history-2026-10-18-v1` contains exactly the three table rows. Dates, scores and club IDs are identity assertions, not inferred corrections. All rows belong to source competition `114471579`, season `2026/27`, initial league phase. Approval reference records this user conversation/root relay and its timestamp; do not invent an external approval identifier. Canonical JSON serialization and policy SHA-256 are shared by JS, packet manifest and the service-only database registry; arbitrary JSON supplied by a workflow must not become an approved registry.

`scripts/lib/historical-statistics-policy.mjs` exports:

```text
classifyHistoricalStatistics({competition, fixture, rawSha256, policy})
  -> {kind:'normal'}
   | {kind:'unavailable_historical', exception, policySha256}
```

It throws on a registered source ID with any mismatched identity or raw hash, on duplicate entries, on unknown policy, or on an exception dated at/after the first fantasy round. It never guesses missing facts or suppresses ordinary parser failures. For normal reports, the existing parser and strict complete-report audit run unchanged. Exception recognition happens from the verified raw envelope/header before deriving individual statistics, so a known broken report need not pass a deliberately strict parser. The source parser remains strict.

Database proposal: `matches.statistics_status` defaults to `available`, with the only other value `unavailable_historical`; `statistics_reason` carries a public reason code. `available` means eligible for the ordinary ingestion path; the public effective status remains **pending** until `imported_at` is populated. An unavailable match retains fixture identity and official result, has `imported_at=NULL`, and has no appearances, individual goals, points or synthesized zero rows. Its unavailable marker is explicit, not a successful full import.

Service-only primitives:

```text
apply_historical_statistics_policy(p_competition_id uuid, p_policy_id text,
                                  p_policy_sha256 text, p_entries jsonb)
upsert_unavailable_historical_match(p_competition_id uuid, p_source_match_id text,
                                   p_policy_id text, p_policy_sha256 text,
                                   p_raw_sha256 text, p_header jsonb)
```

The first primitive accepts only the migration-pinned canonical registry entries/hash. Both verify target competition/provider/season, exact source identity, prelaunch dates, inactive competition and absence of fantasy selections/teams/scores or other user-owned activity before the initial import. Existing populated individual rows cause refusal rather than deletion. The unavailable upsert is atomic and idempotent only for identical facts; any unexpected rows or changed published header/hash fail. After activation, the installed exception registry is immutable; scheduled ingestion may recognize these exact existing historical markers but may not install/extend exceptions or rewrite them. No future wildcard and no CLI skip flag.

The shared canonical eligible-match relation excludes `unavailable_historical` from individual statistics, cached season aggregates, pricing samples, individual scoring and market/absence calculations. Do not treat an unavailable match as a player absent with zero points or an unplayed team. Match/club competition standings may retain the explicitly published official result. Existing normal rows retain their present behavior. Audit the actual SQL view/cache dependency graph before writing the migration; cache refresh and direct appearance queries must agree.

Public match detail shows the official result and a localized notice: individual statistics unavailable for this historical match. Appearance, scorer, card, minute, point and assist sections display an unavailable state/dash, not zero, an empty lineup, or 'did not play'. Player/club aggregate views identify partial statistical coverage and exclude these games from per-match denominators. Future/pending reports keep their existing pending presentation. Update generated DB types and public views deliberately; keep approval text, raw hashes and service-only registry private.

### Published archive phases

The container's HTML publishes phase membership. Preserve `sourcePhase`, `sourceRound` and source match ID in normalized fixture/report envelopes and packet provenance. Mapping is exact:

| Published phase | Source rounds | Internal archive rounds |
| --- | --- | --- |
| Magenta liga - Liga | 1–14 | 1–14 |
| Magenta liga 25/26 Play off | 1–12 | 15–26 |
| Magenta liga 25/26 Play out | 1–9 | 15–23 |

The latter two intentionally share internal rounds because their club populations are disjoint. Require a test over **all 75 fixtures** proving no `(season, internalRound, home, away)` collision, no lost source ID and membership in exactly one published phase. Without offsets, 6 rows form 3 overwriting pairs (source IDs 100511752/108056175, 100511754/108056176, 100511772/108056184). Report source round and phase separately in provenance, never silently rewrite source facts. Current first-phase fixtures have no offset. Unknown future phase membership is a blocking handover, not a guessed full-season schedule; document an explicit pre-phase transition gate.

### Conservative fantasy deadline opt-in

For this new league only, a fixture with a published date and no kickoff keeps source `kickoff=null` and yields a **fantasy cutoff** at 00:00 `Europe/Zagreb` on that date. Known kickoffs retain the normal configured offset. Choose the earliest candidate across the round. Never call this fallback a match kickoff. R9 date 2026-10-25 would yield `2026-10-24T22:00:00Z`; verify current round completeness and future status before choosing it. Do not use elapsed R8 or the generic 10:00 fallback.

Persist the selected cutoff with provenance. For this opt-in, a later published kickoff may make the conservative cutoff earlier but must never move it later. Database compare-and-set checks both `lineups_locked_at IS NULL` **and existing deadline still in the future**, with an atomic monotonic `LEAST` rule once established. Locked or expired rounds never reopen, even when `lineups_locked_at` is null. Existing leagues keep current behavior. ROOT authorized the possible earlier cutoff cost on 2026-10-18.

## Data packet, execution and release gates

Prepare a deterministic packet from existing captured bytes: 102 main played reports, observed fixture/phase HTML/JSON and manifest including URL, HTTP status, original capture timestamp, byte SHA, source IDs, classification, phase map and policy SHA. Do not include supplemental 21 or duplicate base-only archive. The packet must distinguish source capture time from staging time; an archive replay is not a new live freshness observation. Local temp data cannot be read by Actions directly.

Proposed reviewed handoff: authenticated **draft GitHub release asset** in this repository, never published, containing only public-source evidence and manifests. ROOT stages it after design approval and supplies exact draft release ID, asset ID and archive SHA to the dedicated workflow. Workflow verifies repository, draft state, asset identity, overall SHA, file hashes, size/path limits and no symlinks before offline parsing. Use an Actions artifact for subsequent job handoff. No generic mutable download URL. Delete staging draft after retained Actions evidence is verified. If ROOT chooses a different authenticated staging mechanism, retain the same immutable identity/hash contract; do not refetch 102 reports merely to avoid staging design.

New dedicated `.github/workflows/uvoz-hr-zenske.yml` follows existing guarded DFB workflow patterns, pins reviewed main SHA and target slug, and uses the same league concurrency lock as generic import. Modes: prepare/check, inactive register+import, guarded activate. Only writer jobs receive production credentials. All production writes occur in Actions. The generic import workflow must refuse this policy without a verified policy/packet gate so it cannot bypass the dedicated route. Root coordinates writers and deploys.

Before writer approval, use a small fresh current-source delta capture only if ROOT resumes collection: ROOT-authorized maximum **6 additional normal HNS GETs**, consisting of one current schedule refresh plus at most5newly played unseen reports, under the original160 total budget, no duplicate archive reads, at least 500 ms (1 s preferred), stop immediately on 401/403/429/challenge. Capture schedule plus every newly completed match; if the needed delta exceeds the remaining approved budget, stop and report it. This bounded amendment was exercised once during design: the refresh returned27played/0unseen, so only1GETwas used and no report was fetched. Source collection is stopped again; any later refresh needs ROOT to resume collection.

Activation requires: deployed reviewed schema/code; exact source and policy hashes; archive75 unique and complete; all current played reports normal-complete except exactly3 historical markers; all upcoming scheduled fixtures complete enough for a valid future fantasy cutoff; source player identity+explicit GK coverage; no cross-gender player collision; ≥6 eligible clubs; actual pricing default share≤70%, max price≥8 and a valid 2/5/5/3 roster under100 with max3perclub; correct absent/unknown/card diagnostics; verified no user-owned activity; inactive target; locked-history safety; visible unavailable UI; strict no-bypass audit. Record counts separately: expected, complete, unavailable and pending, never report 102/102 fully imported. Price these 99 reports plus any newly clean current reports with existing pricing policy, allowing legitimate GK defaults. The activation RPC must recompute database gates in one guarded transaction, not trust workflow console output.

## Ownership and review decision

HNS owner: shared registry/classifier, common availability SQL/cache/UI/types, HNS wrapper/phase mapping/deadline opt-in and HNS workflow. Germany owner: DFB-specific exact descriptors, adapter, manifest-v3/replay and DFB guarded RPC binding; no duplicate common registry or SQL. Spain owner currently edits `scripts/uvoz-zapisnikov.mjs` single-report hook and `scripts/viri/fcf.mjs`; integrate the historical classifier in a separate later patch on the reviewed shared importer head, preserving both entry paths. Do not cherry-pick overlapping importer replacements.

ROOT reviews this design and the accompanying plan before product code. All three HNS historical decisions are now user-approved; no further user permission question is needed. Remaining execution gates are ROOT's implementation review, actual price/roster results, source delta/future deadline verification and guarded deployment/activation. A failed gate leaves the league inactive.

## Final source delta during design

ROOT allowed one114471579refresh plus at most5newly played unseen reports. The single refresh at 2026-10-18T12:59:19.368774+00:00 returned HTTP200,56fixtures,27published results,0new played reports. No report GET followed;99/102and all verified pool counts remain unchanged. R9still has four date-only fixtures on25October. The release gate must resolve any elapsed/pending R8 reports through normal complete reporting before activation; the refresh does not establish that unpublished results are complete. Source collection is stopped again. Evidence:`final-source-delta.json`, raw SHA`86bba7696772942d336a0e6b5a4d993bc0e00fe7386dc9eb3b40918018e506fb`.
