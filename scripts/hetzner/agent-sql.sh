#!/usr/bin/env bash
# Bralni SQL za agente (Pivko, SRE v Paperclipu): edini ukaz, ki ga sme ključ
# uporabnika `agent` na VM pognati (authorized_keys: restrict,command=...).
# Poizvedba pride kot ukaz SSH ali na stdin; teče kot agent_bralec (le branje,
# 15 s, brez skrivnosti in e-pošte uporabnikov, glej migracijo
# 20261019090000_agent_bralec.sql). Vsaka poizvedba se zapiše v journal
# (journalctl -t agent-sql). Namestitev in uporaba: docs/agenti-baza.md.
#
#   ssh agent@<vm> "select count(*) from klub_stik_posta where poslano_at::date = current_date"
set -euo pipefail

sql=${SSH_ORIGINAL_COMMAND:-}
[[ -z $sql ]] && sql=$(head -c 20000)

# psql ukazi z \ (npr. \! za lupino) niso dovoljeni; le en stavek SQL.
if [[ $sql == *\\* ]]; then echo "agent-sql: znak \\ ni dovoljen" >&2; exit 2; fi
if [[ -z ${sql//[[:space:]]/} ]]; then echo "agent-sql: prazna poizvedba" >&2; exit 2; fi

logger -t agent-sql -- "${SSH_CLIENT%% *}: ${sql:0:2000}"

# Geslo vloge agent_bralec (root:agent 640), nikoli v git.
# shellcheck disable=SC1091
source /etc/agent-sql.env

export PGPASSWORD=$AGENT_GESLO
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=15000'
exec psql -X -q -v ON_ERROR_STOP=1 --pset=footer=off \
  "host=127.0.0.1 port=5432 dbname=postgres user=agent_bralec application_name=agent-sql" \
  -c "$sql"
