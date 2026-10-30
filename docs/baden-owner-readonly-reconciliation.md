# Diagnostic branch only: never merge

This branch replaces ci.yml with one manual root-only, first-attempt,
expected-probe-SHA job. It is based on actual main2d5dbc3f. It must never be
merged or used as normal CI. No PR, push or dispatch is part of this change.

Fixed scope: failed owner40971795981/install job123796221815, reviewed asset
690215937 in release427342437, canonical manifest SHA
c69468853bf1d8ba011749fbc56142b4d25aecb5ea777f3991e7b77b3b10876b.
The CLI authenticates the actual root/head/two-job failed graph and exact
private-draft asset metadata/raw bytes before owner credentials. It reauthenticates
before readback. All gh transport uses explicit GET only. No source/private-proof
rebuild, installation, mutation, retry, native import or activation is invoked.

The GHA-only psql primitive accepts only three fixed modes. It removes inherited
PG options, requires default_transaction_read_only=on through PGOPTIONS, and uses
separate BEGIN REPEATABLE READ READ ONLY/ROLLBACK transactions with bounded
connection/statement/lock/process/output limits. It supplies no connection URL
on argv or stdout. Source-free physical fake-psql tests exercise the primitive;
this low-level adapter issues no authenticated source/native capability.

The first metadata SELECT reads only pg_catalog, retaining schema/table presence,
owner/superuser/memberships, fixed function metadata and prior owner application
activity without query text. metadata.json is retained before relation readback,
so a subsequent missing relation/permission error cannot erase these facts. The
snapshot reads only the catalog full row, prepared/club_bindings counts and the
small Baden competition state, plus metadata. The last separate read-only SELECT
compares the approved manifest with the exact installer sha/canonical/owner/empty/
freshness preconditions. Approved manifest bytes travel as hex DATA, never SQL.
No DO, lock, mutation or COMMIT appears in any statement.

Artifacts contain authenticated approved DATA, metadata/readback/preconditions,
and an exact/absent/mismatch classification. Error artifacts contain only safe
stage/code/status/signal/SQLSTATE and byte counts/hashes, never raw stderr,
credentials, connection URLs, SQL context or manifest snippets. Missing or
ambiguous facts hold. An ABSENT observation describes the current read-only
snapshot; it does not authorize another install. All outcomes explicitly retain
nativeAdmission=false, activationEligible=false and automaticRetry=false.

The failed write remains UNKNOWN until independently reviewed read-only evidence
resolves it. No database, transport or installer fix is inferred by this probe.

Pre-registration competition absence is valid: zero rows return competition:null
and competitionState:ABSENT; one observed row is PRESENT_REQUIRES_REVIEW, never
native clearance. Duplicate/wrong-slug rows still hold. Before the first psql
call, connection.json retains ONLY hostKind(loopback/remote), configuredPort,
sslMode and workflowTunnelLocalPort5432. It retains no host/URI/user/password and
does not change the connection or tunnel mapping.

The metadata extension adds current role/database and recovery state. It exposes
pg_db_role_setting only for current/global role/database scopes and only the two
read-only GUC names, with Boolean values. pg_file_settings exposes only
default_transaction_read_only name/Boolean/applied fields. Catalog constraint
definitions and trigger name/type/enabled/function identity are scoped to
private_baden_history.catalog. Trigger definitions/arguments are omitted, as are
function bodies, other relation data, file
paths, setting arrays or raw errors. No connection/read-only control changes.
