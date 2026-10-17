# Keep usable statistics when yellow-card attribution is missing

The owner clarified that a small number of missing yellow-card deductions should not make an otherwise useful match unusable. This supersedes whole-report omission and percentage proposals: do not omit matches, permit incomplete lineups/goals/red cards, or implement a 2% threshold. No external email/form inquiry is authorized.

## Behavior

Preserve every trustworthy appearance, goal, minute, substitution, result and known card. An ordinary yellow event without a proven player role, or with ambiguous player-versus-coach capacity, may be retained as an unattributed yellow: no guessed player and no deduction. Preserve its source side, full clock, event identity, reason and public profile ID when present. This is incomplete yellow attribution, not an incomplete match. Never suppress any red or second-yellow dismissal; invalid timing, team identity, malformed structure, event multiplicity, contradictory goals, unknown lineups/keepers and fixture completeness remain blocking. Two named ordinary yellows without a dismissal remain a contradiction, not an attribution exemption.

First production scope is the four inactive registered DFB Regionalliga candidates. Nordost parser default, activation policy and already-live data remain unchanged. The FUSSBALL.DE saved-page validator remains unregistered: this release must not claim complete season traversal or 600 live leagues. Its existing anonymous-yellow evidence informs the policy but no new source importer is fabricated.

DFB player-coach dual roles are legitimate only when both roster and coach entries carry the same explicit public profile ID on the same side. A same-name collision, missing ID or differing profile remains an error. A pure yellow for such a dual role is retained without choosing capacity; red capacity ambiguity remains blocking. For other unknown pure-yellow recipients, preserve the event without creating a bench member or appearance. Known player/official yellows retain existing deductions and sanctions unchanged.

## Persistence and display

Use a versioned shared warning codec in `src/lib/nepripisaniRumeni.mjs` (and TypeScript declaration if required), used by source scripts and frontend. Encode one bounded, validated JSON warning per event with prefix `SLFF_UNATTRIBUTED_YELLOW_V1:`. Include source/match identity, side, full source clock, minute, reason enum, event SHA/ordinal and public profile ID if present; avoid private notes and raw HTML. A structured `z.nepripisaniRumeni` array may retain equivalent event evidence. Do not put unresolved events into `z.rumeni`.

Existing `matches.import_warnings` persists the warning; canonical release verification already compares all warning bytes and all accepted statistics. Add the codec to the reviewed source fingerprint so it cannot change between proof and import. No migration, RPC, database type edits or complete-report activation bypass is needed.

The match detail page reads warnings from the existing public matches table and displays a short translated notice with unresolved count. Do not expose raw JSON or parser diagnostics in product copy. Add matching keys to all existing locales. The notice disappears after a source correction and known deductions replace warnings through existing idempotent appearance replacement. Do not describe provisional absent deductions as verified zero yellow cards.

## Corrections and limits

Fresh source retries for flagged current reports must obey existing source request budgets and cache/`--sveze` windows: force freshness only for warned reports within the normal configured recent window (7 days if unspecified), never refetch all historical partial reports on every night. Existing targeted `--zapisnik` repair must force fresh HTML for that exact report even when old; archives are repaired by an explicit targeted run, not an unbounded nightly archive scan. Unchanged source fingerprints skip duplicate writes; changed source replaces appearances/warnings once. This release does not promise retrospective repricing.

## Proof

Use unchanged authentic saved reports and SHA/URL/original UTC provenance: West2402201 (Florian Mayer profile352879 pure yellow90+4), Bayern dual-role profile112345 Matthias Ostrzolek and ten ambiguous yellows, plus existing complete Nordost baseline. Replaying the saved seasons should retain all prior accepted reports byte-for-byte, accept West297/306 and Bayern304/306 if no new independent failures, and leave every non-yellow blocker rejected. These expected counts are diagnostics, not authority to relax checks. Source packet: `/private/tmp/slff-regional-evidence/tolerated-yellow-assessment.json`.

Boundary tests must reject malformed warning payloads, opposite-side identity, profile collisions, unknown/dismissed red and second-yellow, event section disagreement, duplicate ordinary yellows, missing keeper and changed goals. Verify warning-bearing canonical release/loader path and UI notice render and correction removal. Standard source suite, smoke, typecheck and build must pass. Run `npm test` and disclose missing isolated API keys if blocked; do not obtain production keys. Independent code review precedes merge. Production writes remain Actions-only; owner SSH read-only is allowed. No new league activation until all remaining non-yellow gates pass.

Routine implementation choices above are controller decisions within the owner's authorized readiness work. In particular, a warning-only persistence path keeps the current schema and scoring mechanics; cost if wrong is incomplete public visibility/retry until corrected, not invented player statistics.
