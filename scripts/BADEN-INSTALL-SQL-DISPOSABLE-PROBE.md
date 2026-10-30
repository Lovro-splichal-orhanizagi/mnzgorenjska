# DANGER: DISPOSABLE DIAGNOSTIC ONLY — NEVER MERGE

This branch replaces normal CI with one root-only manual first-attempt probe. It
must never be merged or used as a production installer. Root reviews the exact
commit, pushes this diagnostic branch and dispatches CI once with that exact SHA.
No PR, production credentials, SSH tunnel, source download or native action.

The runner authenticates the actual own-repository root dispatch and downloads
only reviewed draft asset690215937 from release427342437 (literal SHA
c69468853bf1d8ba011749fbc56142b4d25aecb5ea777f3991e7b77b3b10876b).
It extracts the unchanged pure `installationSQL` function from actual main
2d5dbc3fb4a38d8bcd342c9016f80abec57af947, with full installer/function SHA pins,
and constructs its exact bytes without importing or invoking the installer CLI.
The original manifest clocks and all SQL guards stay unchanged.

Actual SQL runs ONLY in fresh Docker PostgreSQL17 containers on GitHub-hosted
Linux. Names are fixed `slff-baden-install-sql-probe-rw` / `-ro`. Network mode is
`none`, internal PostgreSQL port5432 has NO host binding, Docker uses only the
local Unix socket, no host bind mounts are allowed and no PG/production token
environment reaches Docker. Existing containers HOLD; only the created inspected
container ID and its anonymous volume are removed.

The minimal fixture extracts hash-pinned exact canonical JSON/catalog/SHA DDL
from the merged migrations. PostgreSQL owns the catalog; `supabase_admin` is a
superuser; RLS is off, matching retained owner metadata. It does not apply the
full migration chain or create football/user data. First run uses default RW.
Only if exact RW succeeds, a separately fresh container repeats the identical
SQL with role-default read-only enabled, without changing SQL or clocks.

Artifacts contain source/generator/DDL/SQL hashes and lengths, selected safe
server/readback fields, exit status, SQLSTATE and bounded error lines. Raw SQL,
hex manifest, full SQL stdout and full stderr are never written to artifacts or
printed. The exact generator's manifest stdout is captured only in memory.
A failure is a diagnostic finding; this branch grants no production write retry.
Sourcefree tests mock Docker; they must never execute local SQL or Docker.
