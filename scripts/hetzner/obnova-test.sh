#!/usr/bin/env bash
# Monthly restore drill (SLF-531). NEVER runs on the prod VM (4.2 GB DB, 92% disk): it runs
# from GitHub Actions (.github/workflows/obnova-test.yml, 04:30 UTC on the 2nd). The runner
# creates a short-lived Hetzner Cloud server, which pulls the NEWEST daily dump from the
# Storage Box, restores it into a throw-away postgres container on its own disk, compares
# row counts of 5 tables with prod (read-only, counts only, via the agent-sql SSH wrapper),
# checks 5 photos from the box against storage.objects size and logs their sha256, then the
# server and its SSH key are deleted (always, also on failure). Prod is only ever read.
# Env: HCLOUD_TOKEN, BOX_KEY (read-only key for the box), AGENT_KEY (agent@prod key),
#      PROD_HOST, DISCORD_WEBHOOK; optional HCLOUD_TYPE (default cpx32, >= 12 GB disk), HCLOUD_LOC.
set -euo pipefail
BOX=u685650@u685650.your-storagebox.de
PROD_HOST=${PROD_HOST:-2.31.6.53}
TIP=${HCLOUD_TYPE:-cpx32}; LOK=${HCLOUD_LOC:-nbg1}
TABELE="auth.users public.players public.player_scores public.fantasy_teams storage.objects"
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
for t in $TABELE; do
  PROD[$t]=$($ASSH "select count(*) as n from $t" | grep -oE '"n": *[0-9]+' | grep -oE '[0-9]+')
done
$ASSH "select name, (metadata->>'size')::bigint as velikost from storage.objects where bucket_id='fotografije-igralcev' and name ~ '\\.' order by created_at desc limit 5" >"$D/foto.json"

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
for p in \$(\$BS $BOX "ls shramba/zdaj/stub/stub/fotografije-igralcev" | head -5); do
  f=\$(\$BS $BOX "ls shramba/zdaj/stub/stub/fotografije-igralcev/\$p/" | head -1)
  rsync -a -e "\$BS" "$BOX:shramba/zdaj/stub/stub/fotografije-igralcev/\$p/\$f" /root/x
  echo "FOTO \$p \$(stat -c %s /root/x) \$(sha256sum /root/x | cut -c1-16)"
done
REMOTE

RAZ=0; IZPIS=""
for t in $TABELE; do
  a=$(awk -v t="$t" '$1=="COUNT"&&$2==t{print $3}' "$D/out"); b=${PROD[$t]}
  IZPIS+="$t restored=$a prod=$b"$'\n'
  # the dump is up to 24 h old, so prod may be higher; lower than the dump (or empty) is the alarm
  [[ $a =~ ^[0-9]+$ && $b =~ ^[0-9]+$ ]] && [ "$b" -ge "$a" ] && [ "$a" -gt 0 ] || RAZ=1
done
FOTO=$(grep -c '^FOTO' "$D/out" || true)
[ "$FOTO" -ge 1 ] || RAZ=1
DUMP=$(awk '$1=="DUMP"{print $2}' "$D/out")
echo "$IZPIS"; grep '^FOTO\|^DUMP' "$D/out"; cat "$D/foto.json" | head -c 1500
if [ "$RAZ" = 0 ]; then javi "🟢 SLFF test obnove ok: $DUMP, tabele se ujemajo, $FOTO fotografij prebranih iz škatle"
else javi "🔴 SLFF test obnove: razlike ali prazno, glej Actions log obnova-test"; exit 1; fi
