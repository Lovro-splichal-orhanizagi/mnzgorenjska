#!/usr/bin/env bash
# P4: Supabase Cloud -> Hetzner VM (docs/migracija-hetzner.md).
#
#   scripts/hetzner/preklop.sh vaja     # rehearsal: Cloud is only read, production untouched
#   scripts/hetzner/preklop.sh ZARES    # cutover: Cloud read-only, VM takes over api.slff.eu
#
# Runs on a Mac with the Supabase CLI linked (`supabase db dump --linked` needs no DB
# password), `gh` logged in, and `ssh slff`. Every step prints its duration; it stops on
# the first error. A rehearsal wipes the VM database (it isn't production until ZARES).
set -euo pipefail

NACIN=${1:-}
[[ $NACIN == vaja || $NACIN == ZARES ]] || { echo "usage: $0 vaja|ZARES" >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"
SB="npx --yes supabase@2.120.0"
TS=$(date -u +%Y%m%dT%H%M%SZ)
DIR=$(mktemp -d)/dump-$TS
mkdir -p "$DIR"
VM_DIR=/opt/slff/dump/$TS
ZACETEK=$(date +%s)
korak() { echo; echo "== [$(( $(date +%s) - ZACETEK ))s] $*"; }
cloud() { $SB db query --linked "$1" -o csv; }
vm() { ssh slff "$@"; }
# psql inside the db container as the superuser; files come from /tmp/dump (docker cp).
vmsql() { vm "docker exec supabase-db psql -q -U supabase_admin -d postgres -v ON_ERROR_STOP=1 $*"; }

# Exact row counts of every table we move, as "schema.table,count".
STEVCI="select table_schema||'.'||table_name as t,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text as n
  from information_schema.tables
  where table_schema in ('public','auth','supabase_migrations') and table_type = 'BASE TABLE'
  order by 1"

if [[ $NACIN == ZARES ]]; then
  korak "Freeze: CI migrations paused, scheduled workflows off"
  gh variable set MIGRACIJE_PREMOR --body 1
  # The list survives a failed run: a rerun would otherwise see them as already off.
  WF=~/.slff-preklop-workflows.txt
  gh workflow list --json name,path,state -q '.[] | select(.state=="active") | .path' \
    | grep -v '/ci.yml$' >> "$WF" || true
  sort -u -o "$WF" "$WF"; xargs -r -n1 gh workflow disable < "$WF" || true
  korak "Freeze: Cloud read-only (reads keep working), pg_cron off"
  # Only PostgREST's role goes read-only: a read-only DATABASE also blocks the CLI's own
  # login role (no dump possible), and Supabase reserves GoTrue's role. Logins may still
  # write for the few minutes of the copy; at worst a user logs in again.
  cloud "select cron.alter_job(jobid, active := false) from cron.job;
         alter role authenticator set default_transaction_read_only = on;
         select count(pg_terminate_backend(pid)) from pg_stat_activity
          where datname = 'postgres' and usename = 'authenticator';"
else
  korak "Rehearsal: can we freeze Cloud? (checked inside a rolled-back transaction)"
  cloud "begin; select cron.alter_job(jobid, active := false) from cron.job;
         alter role authenticator set default_transaction_read_only = on; rollback;" >/dev/null
  echo "ok — the role may alter the database and pg_cron"
fi

korak "Dump from Cloud"
$SB db dump --linked -f "$DIR/roles.sql" --role-only
$SB db dump --linked -f "$DIR/schema.sql"
$SB db dump --linked -f "$DIR/data.sql" --use-copy --data-only \
  -x "storage.*" -x "vault.*" -x "cron.*" -x "supabase_functions.*" -x "realtime.*"
# The CLI leaves supabase_migrations out; without it CI would re-run all migrations.
$SB db dump --linked -f "$DIR/mig_schema.sql" -s supabase_migrations
$SB db dump --linked -f "$DIR/mig_data.sql" -s supabase_migrations --use-copy --data-only
printf '%s;\n' "$STEVCI" > "$DIR/stevci.sql"
cloud "$STEVCI" | tail -n +2 | tr -d '"\r' > "$DIR/stevci.cloud"

korak "Filter (quirks found in the 2026-10-04 rehearsal)"
grep -v 'supabase_realtime_admin' "$DIR/roles.sql" > "$DIR/roles.f.sql"
# -x doesn't drop storage.* COPY blocks; Cloud has 0 objects there.
awk '/^COPY "?storage"?\./{skip=1} !skip{print} skip && /^\\\.$/{skip=0}' "$DIR/data.sql" > "$DIR/data.f.sql"
ls -la "$DIR"

korak "Upload to the VM"
vm "install -d -m 700 $VM_DIR"
rsync -az "$DIR/" "slff:$VM_DIR/"

korak "VM: fresh database (old data dir kept as data.old-$TS)"
vm "set -e; cd /opt/supabase; docker compose stop >/dev/null 2>&1
    mv volumes/db/data volumes/db/data.old-$TS
    # GoTrue brings auth.* up to its version (the image's auth schema is older than the dump).
    docker compose up -d db auth >/dev/null 2>&1
    for i in \$(seq 1 90); do [ \"\$(docker inspect -f '{{.State.Health.Status}}' supabase-auth)\" = healthy ] && break; sleep 2; done
    docker inspect -f 'db {{.State.Health.Status}}' supabase-db; docker inspect -f 'auth {{.State.Health.Status}}' supabase-auth
    docker compose stop auth >/dev/null 2>&1"

korak "VM: restore"
vm "docker cp $VM_DIR/. supabase-db:/tmp/dump/"
vmsql "-c 'set session_replication_role = replica' -f /tmp/dump/roles.f.sql -f /tmp/dump/schema.sql -f /tmp/dump/mig_schema.sql -f /tmp/dump/data.f.sql -f /tmp/dump/mig_data.sql" >/dev/null

korak "VM: what a dump can't carry (cron jobs, Vault secret)"
vm "docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < /opt/slff/po-obnovi.sql >/dev/null
    W=\$(grep '^DISCORD_WEBHOOK=' /opt/slff/secrets.env | cut -d= -f2-)
    docker exec supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -tAc \"select vault.create_secret('\$W', 'discord_webhook')\" >/dev/null
    docker exec supabase-db psql -U supabase_admin -d postgres -tAc 'select count(*) from cron.job; select count(*) from vault.secrets'"

korak "VM: rest of the stack"
vm "cd /opt/supabase && docker compose up -d >/dev/null 2>&1; sleep 10; docker compose ps --format '{{.Name}} {{.Status}}'"

korak "Check: row counts Cloud vs VM"
vm "docker exec supabase-db psql -U supabase_admin -d postgres -tA -F, -f /tmp/dump/stevci.sql" > "$DIR/stevci.vm"
if diff "$DIR/stevci.cloud" "$DIR/stevci.vm"; then
  echo "all $(wc -l < "$DIR/stevci.vm" | tr -d ' ') tables match"
else
  echo "MISMATCH (lines above: < Cloud, > VM)"
  [[ $NACIN == ZARES ]] && { echo "Cloud is still read-only; fix or roll back (docs, P4 rollback)."; exit 1; }
fi

if [[ $NACIN == ZARES ]]; then
  korak "Switch api.slff.eu to the VM"
  vm "set -eo pipefail; sed -i 's#reverse_proxy https://cobtigdsmlftvpfqtnas.supabase.co {#reverse_proxy localhost:8000 {#' /etc/caddy/Caddyfile
      caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -1; systemctl reload caddy"
  korak "CI back on, against the VM database (over the SSH tunnel)"
  PW=$(vm "grep '^POSTGRES_PASSWORD=' /opt/supabase/.env | cut -d= -f2-")
  printf 'postgresql://supabase_admin:%s@127.0.0.1:5432/postgres?sslmode=disable' "$PW" | gh secret set SUPABASE_DB_URL
  gh variable set MIGRACIJE_PREMOR --body 0
  xargs -r -n1 gh workflow enable < ~/.slff-preklop-workflows.txt && rm ~/.slff-preklop-workflows.txt
  echo; echo "DONE in $(( $(date +%s) - ZACETEK ))s. Cloud stays read-only (rollback: docs P4)."
else
  echo; echo "Rehearsal done in $(( $(date +%s) - ZACETEK ))s. Dump: $DIR, on the VM: $VM_DIR"
fi
