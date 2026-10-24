# German public-report import

The owner approved proceeding with the German public-report importer after the
24 October public-readability research, continuing the existing instruction to
build and deploy ready leagues without repeated permission prompts. Reuse Node
ESM, the original HTML/WOFF decoder, complete season capture and GitHub Actions.
No paid feed or private login is assumed. The user's earlier preference permits
economical, bounded delegation; the root implements and reviews integration.

## Result and limits

Turn a fully verified public season capture into the existing schedule/report/
appearance import interfaces. Source name `fussball-public`; season code is
`<32-character staffel>-G:<YYYY/YY>`. An explicit capture directory supplies the
bytes; never use unchecked result JSON or silently fetch missing documents.
Every advertised round and every played report must be covered, with zero
rejections and no sampling, before any native import or identity reservation.
Fresh source captures remain serialized, budgeted and stop on refusal or fault.
Existing prices, goalkeeper checks, historical policy and future-deadline gates
remain required for activation. Registering an importer is not activation.

The retained Mannheim sample has hard source gaps, including an unidentified
entrant and anonymous red cards. Do not invent recipients, waive current-report
checks, treat a failed capture as complete, or apply unrelated exact historical
exclusions. No league is automatically seeded or activated by this change.

## Data contract

The report parser remains report-only and preserves original profile IDs,
`regSt:null`, flags and raw event evidence. Support an explicit second-half 46′
substitution with linked participants at its published minute 46, without
coercing it to 45. Retain rejection of ambiguous 45′ substitutions and withheld
participants. Genuine captured examples and negative chronology tests are
required; unknown cards remain rejected.

Only the verified import adapter may produce a complete native `z`: season,
round, kickoff, clubs, score, goal side/score arrays, published IDs and canonical
appearances. Complete batches retain source provenance. Persistent numeric IDs
are internal adapter keys, not DFB registration numbers: namespace-separated
SHA-256 truncated to 52 bits and shifted into [2^52, 2^53−1]. A service-only
registry stores the full source ID and unique numeric key; any collision aborts
the entire reservation. Exact IDs, never names or shirt numbers, bind scorers
and appearances. Opposite public profile namespaces are not guessed aliases.

Anonymous ordinary yellows retain validated public evidence in import warnings
through a source-specific extension of the existing codec. Do not assign a
penalty to a guessed player. Existing DFB event validation remains unchanged.

## Operational path

The standard source registry creates a per-competition adapter. Writers supply
their existing database client; report import reserves the exact batch identities
only after offline verification. `SLFF_FUSSBALL_CAPTURE` identifies a capture
directory. Missing, stale current-season, wrong-scope, tampered or incomplete
evidence fails before native data writes. Current captures must be at most
24 hours old; archived season captures are explicitly scoped and replayed.

A manual GitHub workflow accepts an existing successful same-repository audit
run, verifies artifact identity and checked-out code, then performs current-only
schedule/report import and price calculation for an existing inactive matching
competition. It does not activate a league. Subsequent activation requires the
existing readback checks and an independently reviewed release. Source refresh
and nightly operation must be proven before activating the first amateur league.

## Verification

Meaningful tests cover real font decoding and 46′ rows, exact scorer identity,
both goalkeepers, partial/sampled/failed/tampered capture rejection, wrong-season
and cross-competition rejection, registry collision and service-only rights,
anonymous-yellow round-trip and invalid source URLs, standard importer hooks,
and workflow admission. Run focused tests, smoke and build; independently review
the final diff and verify CI before merge. No local production writes.
