#!/usr/bin/env bash
# Umami združki za poročila (Pivko, SRE): ukaz `slff-ops umami <od> <do> [spletno-mesto]`.
# Samo vnaprej določene poizvedbe, agent ne podaja SQL. Vsebuje le zbrane številke
# (obiski, obiskovalci, ogledi, top strani/viri/države, dogodki kampanj), brez
# session_id, IP-ja, URL-jev s poizvedbo ali posameznih dogodkov. Vloga umami_bralec
# ima samo SELECT na website_event/session/website (docs/umami-agregati.md) in je
# v transakciji READ ONLY. Registrirani uporabniki NISO promet: tiste številke so v `slff-ops numbers`.
#   slff-ops umami 2026-10-01 2026-10-31
set -euo pipefail

od=${1:-}; do_=${2:-}; mesto=${3:-slff.eu}
re='^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
if [[ ! $od =~ $re || ! $do_ =~ $re ]]; then echo "umami: uporaba: umami YYYY-MM-DD YYYY-MM-DD [domena]" >&2; exit 2; fi
if [[ ! $mesto =~ ^[a-z0-9.-]{1,60}$ ]]; then echo "umami: neveljavna domena" >&2; exit 2; fi
# Obdobje [od, do] vključno, največ 366 dni. Napačno obdobje je napaka, ne tihe ničle v poročilu.
s_od=$(date -u -d "$od" +%s 2>/dev/null) && s_do=$(date -u -d "$do_" +%s 2>/dev/null) \
  || { echo "umami: neveljaven datum" >&2; exit 2; }
if (( s_do < s_od )); then echo "umami: <do> je pred <od>" >&2; exit 2; fi
if (( (s_do - s_od) / 86400 > 366 )); then echo "umami: obdobje je daljše od 366 dni" >&2; exit 2; fi
logger -t umami-stat -- "od=${SUDO_USER:-${SSH_CLIENT:-lokalno}} $od $do_ $mesto"

# Teče kot uporabnik umami-stat (sudo iz ovoja slff-ops). Geslo vloge umami_bralec je v
# /etc/umami-bralec.env (root:umami-stat 640), agent ga ne more brati; nikoli v git.
# shellcheck disable=SC1091
source /etc/umami-bralec.env

export PGPASSWORD=$UMAMI_BRALEC_GESLO
exec timeout 30 psql -X -q -A -t -v ON_ERROR_STOP=1 \
  "host=127.0.0.1 port=5432 dbname=umami user=umami_bralec application_name=umami-stat" \
  -v od="$od" -v do="$do_" -v mesto="$mesto" <<'SQL'
begin transaction read only;
set local statement_timeout = 5000;
with e as (
  select we.* from website_event we join website w on w.website_id = we.website_id
  where w.domain = :'mesto' and w.deleted_at is null
    and we.created_at >= :'od'::date and we.created_at < (:'do'::date + 1)
)
select json_build_object(
  'obdobje', json_build_array(:'od', :'do'), 'domena', :'mesto',
  'casovni_pas', 'UTC (kot nadzorna plošča brez nastavitve)',
  'obiski', (select count(distinct visit_id) from e),
  'obiskovalci', (select count(distinct session_id) from e),
  'ogledi_strani', (select count(*) from e where event_type = 1),
  'top_strani', (select coalesce(json_agg(t), '[]') from (select url_path as pot, count(*) as ogledi
     from e where event_type = 1 group by 1 order by 2 desc limit 20) t),
  'top_viri', (select coalesce(json_agg(t), '[]') from (select referrer_domain as vir, count(distinct visit_id) as obiski
     from e where event_type = 1 and coalesce(referrer_domain,'') <> '' group by 1 order by 2 desc limit 20) t),
  'top_drzave', (select coalesce(json_agg(t), '[]') from (select s.country as drzava, count(distinct e.session_id) as obiskovalci
     from e join session s on s.session_id = e.session_id and s.website_id = e.website_id
     where coalesce(s.country,'') <> '' group by 1 order by 2 desc limit 20) t),
  'utm', (select coalesce(json_agg(t), '[]') from (select utm_source as vir, utm_medium as medij, utm_campaign as kampanja,
     count(distinct visit_id) as obiski from e where event_type = 1 and coalesce(utm_campaign,'') <> ''
     group by 1,2,3 order by 4 desc limit 30) t),
  'dogodki', (select coalesce(json_agg(t), '[]') from (select event_name as dogodek, count(*) as stevilo,
     count(distinct session_id) as obiskovalci from e where event_type = 2 group by 1 order by 2 desc limit 50) t)
);
rollback;
SQL
