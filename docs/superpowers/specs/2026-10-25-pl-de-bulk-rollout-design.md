# Poland and Germany bulk rollout

Approved in the rollout conversation: import candidates in batches, keep them inactive until they pass, hold a failing league independently, and activate every passing league automatically. The user explicitly requested implementation and cheaper bounded delegation. No additional per-league approval is introduced.

## Scope

A checked-in catalog binds each candidate to an exact public provider, country, current season and observed archive. Poland starts with the remaining PZPN candidate and twelve WMZPN groups. Germany accepts observed FUSSBALL tuples; a missing observed archive is an explicit hold, never an invented season identifier. Catalog entries are candidates, not declarations of readiness or permission. Active leagues are skipped before any import or pricing.

## Flow

1. Collect original public source bytes with one paced, bounded request ledger per host. No database credentials are needed for collection. Refusals and transport faults stop that host; deterministic report failures hold only the affected league. There are no automatic retries, CAPTCHA bypasses or paid sources.
2. Replay all current and archive bytes through the actual provider parsers. A normalized JSON file alone is never import or activation authority. Partial inventories, missing keepers, inconsistent substitutions and missing scores cannot pass.
3. For eligible packs, use the existing importers with an offline capture adapter, import archive/current reports and schedule, calculate positions and prices, and compare the complete native snapshot against replayed source facts.
4. Call the existing native activation gate and verify the active flag and opening round. A future postponed fixture inside a partially played round cannot invent a new fantasy opening round.

Every mutation rechecks the exact current-main execution guard, inactive candidate identity and absence of fantasy data. Interrupted or ambiguous writes remain UNKNOWN and are never automatically replayed. Historical exceptions remain restricted to existing exact reviewed policies. New candidates have no exclusion allowance.

## Operation

A main-only Actions workflow selects a checked-in country catalog once and processes its entries without one dispatch per league. The source stage and native stage retain original bytes, budgets and atomic checkpoints as artifacts. A new valid catalog entry requires configuration and observed evidence, not another importer. Unsupported providers remain explicit holds.

Production writes use Actions secrets only. The dirty user checkout stays untouched. Existing import coordination includes this workflow in both directions. Testing uses captured source bytes and fake network/database boundaries, including valid/failing/valid candidates, stopped-host isolation, no-active-overwrite, stale proof and unknown-write handling.


The deployed workflow separates inactive preparation from activation. German preparation seeds a verified original-byte envelope; Actions saves that cache successfully and records the exact run/SHA receipt before the activation phase can run. Activation replays source proof and rechecks native state without repeating imports. Nightly refresh reuses complete reports/lineups/fonts with their unchanged original timestamps, fetches fresh schedules and new reports, and atomically replaces a bounded latest cache. Missing/corrupt cache fails closed rather than redownloading complete reports. Source reader enumeration rejects partial/duplicate inventories and reruns; use a new first-attempt dispatch.
