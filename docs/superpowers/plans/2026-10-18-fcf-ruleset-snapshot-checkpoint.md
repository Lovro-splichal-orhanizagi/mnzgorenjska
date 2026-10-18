# Plan-bound FCF claim protection snapshot

The read-only Actions token legitimately omits `bypass_actors`. An omitted field
cannot prove an empty list. The root-owned `prepare-approval` command now reads
the actual owner-visible full ruleset, validates its active tag namespace,
update/deletion rules and explicitly empty bypass array, and records a closed
snapshot with its original check time. No default or elevated capture credential
is introduced.

The snapshot is included in the independently raw-SHA-pinned approval. Its
canonical SHA is also a required field of the source plan, and therefore of the
independently approved plan SHA. Claim schema2 carries the same snapshot.
`claim-template` rechecks actual owner metadata against the approved snapshot
without refreshing its check time. A claim's self-derived Git/blob SHA alone is
never the authority for its hidden protection fields.

The central claim reader retains all existing actual ref/commit/tree/blob/JSON,
run/attempt/source/plan and clock checks. It additionally requires the embedded
snapshot SHA to equal the approved plan field, then compares fresh read-only
ruleset metadata against every visible projected field, including the ruleset
update instant. Explicit nonempty or malformed bypass arrays always refuse;
omission is allowed only with the plan-bound full snapshot. RFC3339 offsets in
actual GitHub `updated_at` values normalize to UTC on both sides; checkedUTC is
preserved and must be no later than claimedUTC/now, with updated_at no later than
the original check. Task5 and writer replay use this same reader and independently
expected plan, so no new approval-artifact reader is needed there.

Focused tests cover owner preparation with genuine retained seed bytes, the
actual claim-template GET boundary followed by a redacted central-reader replay,
equivalent timestamp offsets, altered update/rules/enforcement/conditions/source/
ID/target, explicit bypass actors, missing/truncated root snapshot, clocks, and a
self-attestation replacement inside a correctly rehashed claim blob. Fixtures
are synthetic except the retained original seed buffers; no source GET, claim
creation, Actions dispatch, GitHub write, database action or new secret occurred.

The failed plan88ef execution remains permanently spent with zero provider GETs.
This change does not retry, reset or replace that claim, change the477 source
budget, authorize an operational run, or prove target release readiness. Root
owns a separately approved fresh plan/claim and every subsequent operation.
