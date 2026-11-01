#!/usr/bin/env bash
# Bugsink združki za agente (Pivko, SRE): ukaz `slff-ops napake [dni] [projekt]` (SLF-245).
# Samo vnaprej določena poizvedba, agent poda le število dni (1-90) in ime projekta.
# Baza se odpre samo za branje (sqlite mode=ro + query_only), brez gesla ali žetona Bugsinka.
# Izhod na težavo: projekt, vrsta izjeme, resnost, število (skupaj in v obdobju), prvič/zadnjič,
# izdaja, stanje in odtis = prvih 12 znakov sha256 ključa združevanja. NIKOLI sporočila,
# sklada, URL-ja, dogodka ali IP-ja (docs/napake.md).
#   slff-ops napake 7
#   slff-ops napake 30 slff-web
set -euo pipefail

dni=${1:-7}; projekt=${2:-}
if [[ ! $dni =~ ^[0-9]{1,2}$ ]] || (( dni < 1 || dni > 90 )); then echo "napake: uporaba: napake [dni 1-90] [projekt]" >&2; exit 2; fi
if [[ -n $projekt && ! $projekt =~ ^[a-z0-9-]{1,40}$ ]]; then echo "napake: neveljaven projekt" >&2; exit 2; fi
logger -t napake-stat -- "od=${SSH_CLIENT%% *} $dni ${projekt:-*}"

exec timeout 30 docker exec -i -e DNI="$dni" -e PROJEKT="$projekt" bugsink python -I - <<'PY'
import hashlib, json, os, sqlite3
dni, projekt = int(os.environ["DNI"]), os.environ["PROJEKT"]
db = sqlite3.connect("file:/data/db.sqlite3?mode=ro", uri=True, timeout=5)
db.execute("pragma query_only = on")
okno = f"-{dni} days"
vrstice = db.execute("""
  select p.name, i.calculated_type, i.digested_event_count, i.first_seen, i.last_seen,
         i.is_resolved, i.is_muted,
         (select g.grouping_key from issues_grouping g where g.issue_id = i.id order by g.id limit 1),
         (select e.level from events_event e where e.issue_id = i.id order by e.digest_order desc limit 1),
         (select e.release from events_event e where e.issue_id = i.id order by e.digest_order desc limit 1),
         (select coalesce(sum(c.count), 0) from events_issueeventcountsperhour c
            where c.issue_id = i.id and c.bucket >= datetime('now', ?))
  from issues_issue i join projects_project p on p.id = i.project_id
  where not i.is_deleted and i.last_seen >= datetime('now', ?) and (? = '' or p.name = ?)
  order by i.last_seen desc limit 100
""", (okno, okno, projekt, projekt)).fetchall()
tezave = [{
  "projekt": r[0], "vrsta": r[1][:80], "resnost": r[8] or "error",
  "stevilo": r[2], "v_obdobju": r[10], "prvic": r[3], "zadnjic": r[4],
  "izdaja": (r[9] or "")[:12], "stanje": "resena" if r[5] else ("utisana" if r[6] else "odprta"),
  "odtis": hashlib.sha256((r[7] or "").encode()).hexdigest()[:12],
} for r in vrstice]
print(json.dumps({"obdobje_dni": dni, "projekt": projekt or "vsi", "casovni_pas": "UTC",
                  "tezav": len(tezave), "dogodkov_v_obdobju": sum(t["v_obdobju"] for t in tezave),
                  "tezave": tezave}, ensure_ascii=False))
PY
