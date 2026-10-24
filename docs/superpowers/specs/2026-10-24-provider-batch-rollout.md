# Provider batch rollout

The owner approved importing supported leagues in batches, activating those
that pass a shared ruleset, and leaving failures inactive while continuing
with independent leagues. The target is less per-league implementation and
polling, without inventing missing football facts.

Each batch has exact reviewed league/source identities, an exact main commit,
a bounded request budget and durable per-stage results. Inactive import,
pricing, independent data validation, native activation and readback are
separate stages. Existing people’s teams and active prices are not rewritten.
An uncertain write is UNKNOWN and must be reconciled; a football data HOLD
continues the next league. A source refusal, challenge, transport fault or
exhausted source budget stops requests sharing that source.

Provider rules remain explicit. Existing reviewed historical exclusions and
keeper conventions are neither silently expanded nor mislabelled as stronger
evidence. A small omitted yellow may be tolerated only by the applicable
scoring contract. Missing player identities, unsupported minutes and unknown
keepers hold the affected report/league. A sample is never a complete season.

Australia starts with the actually observed public NSW Dribl tenant
`1RwNlWemjr`. Catalogs, results, match events and team rosters are public JSON.
Source user/profile IDs and event-member IDs are separate namespaces. Playing
flags include unused substitutes, so appearances require starters and timed
substitutions. Explicit role evidence can identify a keeper even when a
separate boolean is false; jersey number and clean-sheet counts cannot.
Administrative confirmation flags are diagnostic when the published final
report and its football facts reconcile. Source access terms, complete
fixture inventory, archive pairing and future deadlines remain independent
launch requirements; public readability alone is not a release receipt.

Germany keeps its existing strict decoder and complete-season importer. A
new shared-budget multi-league screen isolates semantic failures while
stopping the common host on technical failure. It cannot authorize imports
or claim support for 600 leagues.

No new emails, purchases, challenge bypasses or secret-file reads. Production
writes run only in Actions. All work is isolated; focused implementation and
independent review precede integrated smoke, main CI and any live write run.
