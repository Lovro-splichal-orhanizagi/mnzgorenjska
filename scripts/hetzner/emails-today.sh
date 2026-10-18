#!/usr/bin/env bash
# Read-only count of sent emails for one Europe/Ljubljana day, for the
# `slff-ops emails-today [YYYY-MM-DD]` subcommand (installed as
# /opt/slff/emails-today.sh). Prints counts only, never recipients:
# rows and distinct resend_id where napaka is null and kanal in (email, oba).
# The date defaults to today in Europe/Ljubljana.
set -euo pipefail

DAN=${1:-$(TZ=Europe/Ljubljana date +%F)}
if ! [[ $DAN =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "usage: emails-today [YYYY-MM-DD]" >&2
  exit 2
fi

docker exec -i supabase-db psql -q -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  -v dan="$DAN" <<'SQL'
begin transaction read only;
select :'dan'::date as dan_ljubljana,
       count(*) as poslanih,
       count(distinct resend_id) as razlicnih_resend_id
  from public.email_log
 where napaka is null
   and kanal in ('email', 'oba')
   and poslano_at >= (:'dan'::date)::timestamp at time zone 'Europe/Ljubljana'
   and poslano_at < (:'dan'::date + 1)::timestamp at time zone 'Europe/Ljubljana';
rollback;
SQL
