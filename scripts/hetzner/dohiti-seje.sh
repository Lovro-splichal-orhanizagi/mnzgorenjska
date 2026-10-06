#!/usr/bin/env bash
# After the cutover, browser tabs opened before it still talk to supabase.co, and Cloud's
# GoTrue (which Supabase won't let us make read-only) keeps renewing their sessions. Copy
# what changed on Cloud since the cutover to the VM, so a reload continues the session
# instead of logging the user out. Safe to rerun until Cloud is deleted.
#   - users, identities: only ADDED when missing (never overwrite a newer VM row,
#     e.g. a password changed on the VM)
#   - sessions, refresh_tokens: upserted only when Cloud's row is newer
# Needs: Supabase CLI login (keychain), `ssh slff`.
set -euo pipefail
OD=${1:-2026-10-06 20:30:00+00}
T=$(security find-generic-password -s "Supabase CLI" -w)
psql_vm() { ssh slff "docker exec -i supabase-db psql -q -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -tA"; }

oblak() {  # rows as a JSON array via the Management API
  curl -fsS -X POST "https://api.supabase.com/v1/projects/cobtigdsmlftvpfqtnas/database/query" \
    -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$1")"
}

# Cloud and the VM both continue refresh_tokens.id from the dump's value. Move the VM's
# sequence far ahead once, so ids issued on the VM never collide with copied Cloud ones.
psql_vm <<'SQL'
select setval('auth.refresh_tokens_id_seq', (select max(id) from auth.refresh_tokens) + 10000000)
 where (select last_value from auth.refresh_tokens_id_seq) < (select max(id) from auth.refresh_tokens) + 1000000;
SQL

for tabela in users identities sessions refresh_tokens; do
  pogoj="updated_at > '$OD' or created_at > '$OD'"
  [[ $tabela == users ]] && pogoj="$pogoj or last_sign_in_at > '$OD'"
  oblak "select * from auth.$tabela where $pogoj" > /tmp/seje.json
  echo "$tabela: $(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' /tmp/seje.json) changed on Cloud"
  scp -q /tmp/seje.json slff:/tmp/seje.json && ssh slff "docker cp /tmp/seje.json supabase-db:/tmp/seje.json && rm /tmp/seje.json"
  case $tabela in
    users|identities) ob_sporu="do nothing" ;;
    *) ob_sporu="do update set %2\$s where auth.$tabela.updated_at < excluded.updated_at" ;;
  esac
  psql_vm <<SQL
do \$\$
declare stolpci text; posodobi text; kljuc text;
begin
  select string_agg(quote_ident(column_name), ','),
         string_agg(format('%I = excluded.%I', column_name, column_name), ',')
    into stolpci, posodobi
    from information_schema.columns
   where table_schema = 'auth' and table_name = '$tabela' and is_generated = 'NEVER';
  select string_agg(quote_ident(a.attname), ',') into kljuc
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
   where i.indrelid = 'auth.$tabela'::regclass and i.indisprimary;
  execute format('insert into auth.$tabela (%1\$s) select %1\$s from json_populate_recordset(null::auth.$tabela, pg_read_file(''/tmp/seje.json'')::json) on conflict (%3\$s) $ob_sporu',
                 stolpci, posodobi, kljuc);
end \$\$;
SQL
  rm -f /tmp/seje.json
done
ssh slff "docker exec supabase-db rm -f /tmp/seje.json"
