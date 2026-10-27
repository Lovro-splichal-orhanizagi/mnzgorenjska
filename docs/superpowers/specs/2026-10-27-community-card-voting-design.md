# Per-league community card recipients

Approved scope: the user approved league-specific card voting like assists,
retaining official card side/time and keeping affected statistics provisional
until recipient confirmation passes replay. This does not solve withheld player
identities and does not authorize new source requests, photos or outreach.

## Behavior

- Default leagues retain existing authoritative-source behavior. Only an explicitly
  reviewed FUSSBALL candidate with `communityCards: true` and the native per-league
  setting `fussball_card_voting_enabled = 1` uses this route. Baden is the first
  opted-in candidate; existing DFB Regionalligas are unchanged.
- Every event retains its official type, side, half, base/additional minute,
  ordinal and original event SHA. Votes supply only a missing recipient from the
  public historical lineup, including reserves. There is no 'no card' option and
  no inferred identity for anonymous/private players. Published recipients win.
- Ordinary voters count one; an existing insider of this exact league counts the
  threshold, as for assists. `prag_glasov_karton` defaults to three. Existing user
  restrictions apply. Own votes may change until successful application. An
  unambiguous threshold winner queues replay; it does not directly change points.
- Voting remains open while attribution is unresolved. It locks only after a
  successful verified application or an authoritative source recipient. There is
  no timeout-to-zero or automatic expiry-to-no-card.
- Unknown yellows retain today's proven appearances with unknown deductions and
  a visible recipient-pending label. Unknown reds produce a typed pending report:
  official result/lineup evidence is retained, but no individual appearances,
  goals, minute totals or fantasy scores are fabricated. Existing rows on a changed
  report are removed from published/scoring projections while pending.
- A confirmed choice is replayed through the actual parser and native validator.
  Red/second-yellow eligibility, preceding yellow, substitutions, keeper roles,
  goal ordering and minute totals must all reconcile. Contradictory choices stay
  pending and editable. Valid statistics, applied recipients, pending clearance
  and all score recomputation commit atomically. Accepted assists survive replay.
- A whole league may launch with exactly registered red-card-pending reports under
  this explicit policy, at an untouched future fantasy round, after all normal
  roster, source goalkeeper, pricing, affordable squad, schedule, archive and
  durable nightly-cache checks. Other parser failures remain holds. Unresolved
  red reports block final round results/emails and affected repricing indefinitely.

## Shared interfaces

`cardPolicy: 'community-v1'` is an optional capture/parser/batch option; omission
keeps the old strict contract byte-for-byte. Collector coverage counts complete,
typed pending-card and rejected reports separately. Complete plus pending must
equal every played fixture, with no genuine rejection, before native admission.

`cardEnvelope` is version 1. It contains `reportId`, raw `matchId`, `sourceUrl`,
`season`, `round`, `date`, `time`, `homeName`, `awayName`, `score`, `revisionSha256`,
`cards`, `roster`, and `bundle`. Roster rows contain `sourceId`, `regSt`, `side`,
`name`, `shirt`, `starter`, `goalkeeper`. Cards contain `eventKey`, `ordinal`,
`eventSha256`, `type` (`yellow`, `red`, `second_yellow`), `side`, `minute`, `base`,
`added`, `half`, and `officialSourceId` (nullable). `bundle` contains original
report/lineup bytes as base64 and their hashes, plus bound font ID/base64/hash rows.
The source parser owns the canonical builder, validation and replay functions.
Do not generate appearances on a pending envelope.

Revision digest is SHA256 of report SHA, newline, lineup SHA, newline, then sorted
`fontId:fontSHA` entries joined by newline. Event key is SHA256 of
`reportId:revisionSha256:ordinal:eventSha256`. Main+lineup+font bytes are private,
bounded to 8 MiB decoded total; at most 80 roster candidates and 256 card events.

Native RPCs (names fixed across workers):

- `register_fussball_card_report(p_competition_id bigint, p_code text,
  p_match_id bigint, p_envelope jsonb, p_candidates jsonb)`: service only. Candidate
  mappings contain `source_id`, `player_id`, `team_id`. Validate exact source scope,
  fixture, hashes, source identities and roster. Preserve unchanged revisions and
  votes; supersede changed evidence without deleting old vote history.
- `match_fussball_card_votes(p_match_id bigint)`: public safe JSON with `enabled`,
  `statistics_pending`, `threshold`, `events`. Each event returns `id`, `type`,
  `minute`, `added`, `team_id`, `team_name`, `status`, `confirmed_player_id`,
  `my_vote` (only caller), `candidates:[{player_id,full_name,shirt_number,votes}]`.
  Status is `pending`, `queued` or `confirmed`; never publish voter IDs or raw IDs.
- `vote_fussball_card(p_event_id bigint, p_player_id bigint)`: derive auth.uid,
  validate enabled policy, exact historical candidate, restrictions, event lock;
  upsert a vote and return the refreshed safe match JSON.
- `get_fussball_card_replay_jobs(p_competition_id bigint, p_code text,
  p_limit integer default 10)`: service only; returns current eligible envelopes,
  native candidate mappings, `resolutions` keyed by eventKey to sourceId, and a
  database-computed `resolution_sha256`. Unknown red decisions must all be present;
  a worker can attempt partial yellow attribution on an otherwise complete report.
- `apply_fussball_card_report(p_competition_id bigint, p_code text,
  p_match_id bigint, p_revision_sha text, p_resolution_sha text,
  p_nastopi jsonb, p_goli jsonb, p_warnings text[])`: service only. Recheck the exact
  current consensus/revision under locks, validate complete fields, replace rows
  through the existing writer, confirm recipients, clear red pending, recompute
  scores atomically. No defaults for missing minute/card fields.

Use a private report/evidence table, public safe RPC projections and private votes
with own-only read permissions. A distinct `pending_cards` statistics status must
not bypass immutable `unavailable_historical` policies. The SQL worker owns this
status, completion/price/launch predicate and migrations; root owns JS integration.
Parser resolution overlay uses the envelope's revision and event keys. It cannot
override official recipients, move events, invent profiles or bypass other errors.

## Verification and rollout

Work only in the existing isolated worktree. Retained source data is under
`league-rollout-evidence/2026-10-26-german-unlock-screen/baden-pilot-40416972177`.
The first55 replay now has39 valid,8 typed pending and8 genuine holds (6 profile
errors and2 image grammar errors). One former anonymous-red first failure also
contains an unsupported image shape revealed by complete pre-pending validation.
It remains a failed partial capture and cannot grant launch admission.

Test parser using genuine retained cards/fonts, synthetic changes labelled as
such; use a disposable isolated database for migration/RLS/concurrency/rollback
checks. Test UI behavior, full type/build/render and clean-runner dependencies.
Deploy code/migrations via reviewed GitHub Actions. No league is called live until
full source capture, this exact opt-in native proof, prices, keepers, deadline,
seed persistence and active readback pass. Record request count961/5000 unchanged.
