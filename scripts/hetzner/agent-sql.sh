#!/usr/bin/env bash
# Bralni SQL za agente (Pivko, SRE v Paperclipu): edini ukaz, ki ga sme ključ
# uporabnika `agent` na VM pognati (authorized_keys: restrict,command=...).
# Poizvedba (en SELECT ali WITH … SELECT) pride kot ukaz SSH ali na stdin.
#
# Meja varnosti je TA ovoj, ne nastavitve vloge (te seja lahko preklopi):
# transakcijo odpre ovoj kot READ ONLY, besedilo agenta gre v agent.poizvedba
# kot dolar-citat z naključno oznako in se izvede kot en sam podizraz, zato ne
# more končati transakcije, pisati ali pognati drugega ukaza. Vrstice so JSON
# (največ 1000). Psql ubije `timeout` po 30 s; vloga ima connection limit 3.
# Vsaka poizvedba gre v journal (journalctl -t agent-sql). Docs: docs/agenti-baza.md.
#
#   ssh agent@<vm> "select poslal, count(*) from klub_stik_posta group by 1"
set -euo pipefail

sql=${SSH_ORIGINAL_COMMAND:-}
[[ -z $sql ]] && sql=$(head -c 20000)

if [[ -z ${sql//[[:space:]]/} ]]; then echo "agent-sql: prazna poizvedba" >&2; exit 2; fi
if (( ${#sql} > 20000 )); then echo "agent-sql: poizvedba je predolga" >&2; exit 2; fi
# psql ukazi z \ niso dovoljeni (npr. \! za lupino).
if [[ $sql == *\\* ]]; then echo "agent-sql: znak \\ ni dovoljen" >&2; exit 2; fi
# Podpičje na koncu je navada; drugje ga EXECUTE tako ali tako zavrne.
sql=$(printf '%s' "$sql" | sed -e 's/[[:space:];]*$//')

oznaka="a$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
if [[ $sql == *"$oznaka"* ]]; then echo "agent-sql: poskusi znova" >&2; exit 2; fi

# Celotna poizvedba (brez novih vrstic, z dolžino in zgoščeno vrednostjo).
logger -t agent-sql -- "od=${SSH_CLIENT%% *} dolzina=${#sql} sha256=$(printf '%s' "$sql" | sha256sum | cut -c1-16) sql=$(printf '%q' "$sql")"

# Geslo vloge agent_bralec (root:agent 640), nikoli v git.
# shellcheck disable=SC1091
source /etc/agent-sql.env

export PGPASSWORD=$AGENT_GESLO
exec timeout 30 psql -X -q -A -t -v ON_ERROR_STOP=1 \
  "host=127.0.0.1 port=5432 dbname=postgres user=agent_bralec application_name=agent-sql" \
  -c "begin transaction read only;
set local statement_timeout = 15000;
set local lock_timeout = 2000;
select * from agent.poizvedba(\$$oznaka\$$sql\$$oznaka\$);
rollback;"
