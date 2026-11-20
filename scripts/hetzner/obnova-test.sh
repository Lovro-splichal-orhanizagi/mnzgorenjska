#!/usr/bin/env bash
# Monthly restore drill (SLF-531). NEVER runs on the prod VM (4.2 GB DB, 92% disk): it runs
# from GitHub Actions (.github/workflows/obnova-test.yml, 04:30 UTC on the 2nd). The runner
# creates a short-lived Hetzner Cloud server, which pulls the NEWEST daily dump from the
# Storage Box, restores it into a throw-away postgres container on its own disk, compares
# row counts of 5 tables with prod (read-only, counts only, via the agent-sql SSH wrapper),
# checks 5 photos (names+size from the RESTORED storage.objects) against the box files and logs their sha256, then the
# server and its SSH key are deleted (always, also on failure). Prod is only ever read.
# Env: HCLOUD_TOKEN, BOX_KEY (read-only key for the box), AGENT_KEY (agent@prod key, a separate key
#      without from= restriction, since GitHub runners have changing IPs),
#      PROD_HOST, DISCORD_WEBHOOK; optional HCLOUD_TYPE (default cpx32, >= 12 GB disk), HCLOUD_LOC.
set -euo pipefail
BOX=u685650@u685650.your-storagebox.de
PROD_HOST=${PROD_HOST:-2.31.6.53}
TIP=${HCLOUD_TYPE:-cpx32}; LOK=${HCLOUD_LOC:-nbg1}
TABELE="auth.users public.players public.player_scores public.fantasy_teams storage.objects"
# prod side: auth/storage schemas are not readable by the agent key; auth.users = sum of agent.registracije,
# storage.objects has no prod read (restored > 0 only)
PQ_auth_users="select sum(registracij) as n from agent.registracije"
D=$(mktemp -d); ID=""; KID=""
api() { curl -fsS -H "Authorization: Bearer $HCLOUD_TOKEN" -H 'Content-Type: application/json' "$@"; }
javi() {
  curl -fsS -H 'Content-Type: application/json' -A 'SLFF obnova-test' \
    -d "{\"content\":\"$1\",\"allowed_mentions\":{\"parse\":[]}}" "$DISCORD_WEBHOOK" || true
}
pocisti() {
  [ -n "$ID" ] && api -X DELETE "https://api.hetzner.cloud/v1/servers/$ID" >/dev/null || true
  [ -n "$KID" ] && api -X DELETE "https://api.hetzner.cloud/v1/ssh_keys/$KID" >/dev/null || true
  rm -rf "$D"
}
trap 'javi "🔴 SLFF test obnove baze ni uspel: vrstica $LINENO"; pocisti' ERR
trap pocisti EXIT

# prod counts first (read-only), so a broken prod link fails before any money is spent
install -m 600 /dev/null "$D/agent"; printf '%s\n' "$AGENT_KEY" >"$D/agent"
ASSH="ssh -i $D/agent -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$D/kh agent@$PROD_HOST"
declare -A PROD
for t in public.players public.player_scores public.fantasy_teams; do
  PROD[$t]=$($ASSH "select count(*) as n from $t" | grep -oE '"n": *[0-9]+' | grep -oE '[0-9]+')
done
PROD[auth.users]=$($ASSH "$PQ_auth_users" | grep -oE '"n": *[0-9]+' | grep -oE '[0-9]+')
PROD[storage.objects]=0

# a cancelled/timed-out earlier run may have left a server billing: delete ours older than 2 h
for old in $(api "https://api.hetzner.cloud/v1/servers?label_selector=slff%3Dobnova-test" |
    jq -r --arg lim "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S)" '.servers[] | select(.created < $lim) | .id'); do
  api -X DELETE "https://api.hetzner.cloud/v1/servers/$old" >/dev/null || true
done

ssh-keygen -q -t ed25519 -N '' -f "$D/k"
KID=$(api -X POST https://api.hetzner.cloud/v1/ssh_keys -d "{\"name\":\"obnova-$$\",\"public_key\":\"$(cat "$D/k.pub")\"}" | jq -r .ssh_key.id)
R=$(api -X POST https://api.hetzner.cloud/v1/servers -d "{\"name\":\"slff-obnova-$$\",\"server_type\":\"$TIP\",\"image\":\"ubuntu-24.04\",\"location\":\"$LOK\",\"ssh_keys\":[$KID],\"labels\":{\"slff\":\"obnova-test\"}}")
ID=$(jq -r .server.id <<<"$R"); IP=$(jq -r .server.public_net.ipv4.ip <<<"$R")
RSSH="ssh -i $D/k -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$IP"
for i in $(seq 60); do $RSSH true 2>/dev/null && break; sleep 5; done

printf '%s\n' "$BOX_KEY" | $RSSH 'install -m 600 /dev/stdin /root/box'
$RSSH 'bash -s' <<REMOTE | tee "$D/out"
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get -qq update && apt-get -qq install -y docker.io rsync >/dev/null
BS="ssh -p 23 -i /root/box -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
DUMP=\$(\$BS $BOX "ls dumps/dnevne" | grep -E '^slff-[0-9]{8}T' | sort | tail -1)
rsync -a -e "\$BS" "$BOX:dumps/dnevne/\$DUMP" /root/
echo "DUMP \$DUMP \$(sha256sum /root/\$DUMP | cut -c1-16)"
docker run -d --name o -e POSTGRES_PASSWORD=obnova -v /root/pg:/var/lib/postgresql/data supabase/postgres:17.6.1.166 >/dev/null
for i in \$(seq 60); do docker exec o pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
docker exec o createdb -U supabase_admin obnova_test 2>/dev/null || docker exec o createdb -U postgres obnova_test
docker cp /root/\$DUMP o:/tmp/d.dump
docker exec o pg_restore -U supabase_admin -d obnova_test --no-owner /tmp/d.dump >/root/restore.log 2>&1 || true  # role/extension noise
for t in $TABELE; do echo "COUNT \$t \$(docker exec o psql -U supabase_admin -d obnova_test -Atc "select count(*) from \$t")"; done
docker exec o psql -U supabase_admin -d obnova_test -Atc "select name || '|' || coalesce(metadata->>'size','') from storage.objects where bucket_id='fotografije-igralcev' and metadata->>'size' is not null order by created_at desc limit 5" |
while IFS='|' read -r p sz; do
  f=\$(\$BS $BOX "ls shramba/zdaj/stub/stub/fotografije-igralcev/\$p/" | head -1)
  rsync -a -e "\$BS" "$BOX:shramba/zdaj/stub/stub/fotografije-igralcev/\$p/\$f" /root/x || { echo "FOTOERR \$p"; continue; }
  echo "FOTO \$p dump=\$sz box=\$(stat -c %s /root/x) \$(sha256sum /root/x | cut -c1-16)"
done
REMOTE

RAZ=0; IZPIS=""
DUMP=$(awk '$1=="DUMP"{print $2}' "$D/out")
# the dump must be fresh: slff-YYYYMMDDTHHMMSS...
DD=$(grep -oE '[0-9]{8}T[0-9]{6}' <<<"$DUMP" | head -1)
if [ -z "$DD" ] || [ $(( $(date -u +%s) - $(date -u -d "${DD:0:4}-${DD:4:2}-${DD:6:2} ${DD:9:2}:${DD:11:2}:${DD:13:2}" +%s) )) -gt 172800 ]; then
  IZPIS+="dump older than 48 h or unreadable: $DUMP"$'\n'; RAZ=1
fi
for t in $TABELE; do
  a=$(awk -v t="$t" '$1=="COUNT"&&$2==t{print $3}' "$D/out"); b=${PROD[$t]}
  IZPIS+="$t restored=$a prod=$b"$'\n'
  [[ $a =~ ^[0-9]+$ && $b =~ ^[0-9]+$ ]] && [ "$a" -gt 0 ] || { RAZ=1; continue; }
  # prod may be higher (dump up to 24 h old) or slightly lower (deletes); restored below 95% of prod = alarm
  [ "$t" = storage.objects ] || [ $(( a * 100 )) -ge $(( b * 95 )) ] || RAZ=1
done
FOTO=$(grep -c '^FOTO ' "$D/out" || true)
[ "$FOTO" -ge 1 ] || RAZ=1
# every photo: size in the dump must equal the file on the box
while read -r _ _ d bx _; do [ "${d#dump=}" = "${bx#box=}" ] || RAZ=1; done < <(grep '^FOTO ' "$D/out")
grep -q '^FOTOERR' "$D/out" && RAZ=1
echo "$IZPIS"; grep '^FOTO\|^DUMP' "$D/out"
if [ "$RAZ" = 0 ]; then javi "🟢 SLFF test obnove ok: $DUMP, tabele se ujemajo, $FOTO fotografij prebranih iz škatle"
else javi "🔴 SLFF test obnove: razlike ali prazno, glej Actions log obnova-test"; exit 1; fi
