#!/usr/bin/env bash
# Poraba diska za agente (Pivko, SRE, CTO): ukaz `slff-ops disk` (SLF-644).
# Samo branje, brez argumentov: velikosti map, docker, journal in dnevniki vsebnikov.
# Ne izpiše vsebine nobene datoteke, le poti in velikosti.
#   slff-ops disk
# Namestitev (lastnik VM): install -m 755 scripts/hetzner/disk-stat.sh /usr/local/bin/ ;
# v ovoju slff-ops:  disk) exec /usr/local/bin/disk-stat.sh ;;
set -uo pipefail

logger -t disk-stat -- "od=${SSH_CLIENT%% *}"
t() { timeout 60 "$@" 2>/dev/null; }

echo "== df"; df -h -x tmpfs -x devtmpfs -x overlay
echo; echo "== du / (2 ravni, >= 200M)"
t du -xh --max-depth=2 --threshold=200M / | sort -rh | head -40
echo; echo "== du /opt /var/lib /root /home (3 ravni, >= 500M)"
t du -xh --max-depth=3 --threshold=500M /opt /var/lib /root /home | sort -rh | head -40
echo; echo "== docker system df"; t docker system df
echo; echo "== docker volumni"
t docker system df -v | awk '/^Local Volumes space usage/{v=1;next} /^Build cache usage/{v=0} v && NF' | head -30
echo; echo "== dnevniki vsebnikov (json-file)"
for f in /var/lib/docker/containers/*/*-json.log; do
  [ -f "$f" ] || continue
  id=$(basename "$(dirname "$f")"); ime=$(t docker inspect -f '{{.Name}}' "$id"); ime=${ime#/}
  printf '%s\t%s\n' "$(du -h "$f" | cut -f1)" "${ime:-${id:0:12} (ustavljen/izbrisan)}"
done | sort -rh | head -20
echo; echo "== journal"; t journalctl --disk-usage
echo; echo "== /var/log (>= 50M)"; t du -xh --threshold=50M /var/log | sort -rh | head -15
echo; echo "== največje datoteke (>= 1G)"
t find / -xdev -type f -size +1G -printf '%s\t%p\n' | sort -rn | head -20 | awk -F'\t' '{printf "%.1fG\t%s\n", $1/1073741824, $2}'
