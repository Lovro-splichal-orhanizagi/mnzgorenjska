#!/usr/bin/env bash
# Monthly restore drill (SLF-531). NEVER runs on the prod VM (4.2 GB DB): it runs on the free
# GitHub-hosted runner (.github/workflows/obnova-test.yml, 04:30 UTC on the 2nd, or manual dispatch).
# Pulls the NEWEST daily dump from the Storage Box, restores it into a throw-away postgres container
# on the runner, compares row counts of 5 tables with prod (read-only, counts only, via the agent-sql
# SSH wrapper), checks 5 photos (names+size from the RESTORED storage.objects) against the box files
# and logs their sha256. Prod is only ever read. Keys are never echoed.
# Env: BOX_KEY (READ-ONLY key for the box), AGENT_KEY (agent@prod key without from=, runners have changing IPs),
#      DISCORD_WEBHOOK; optional PROD_HOST.
set -euo pipefail
BOX=u685650@u685650.your-storagebox.de
PROD_HOST=${PROD_HOST:-2.31.6.53}
TABELE="auth.users public.players public.player_scores public.fantasy_teams storage.objects"
# prod side: auth/storage schemas are not readable by the agent key; auth.users = sum of agent.registracije,
# storage.objects has no prod read (restored > 0 only)
PQ_auth_users="select sum(registracij) as n from agent.registracije"
D=$(mktemp -d);  javi() {
  curl -fsS -H 'Content-Type: application/json' -A 'SLFF obnova-test' \
    -d "{\"content\":\"$1\",\"allowed_mentions\":{\"parse\":[]}}" "$DISCORD_WEBHOOK" || true
}
pocisti() {
  docker rm -f o >/dev/null 2>&1 || true
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

# restore on this runner (GitHub-hosted, throw-away VM): box key and work dir stay in $D / /mnt
install -m 600 /dev/null "$D/box"; printf '%s\n' "$BOX_KEY" >"$D/box"
W=/mnt/obnova; sudo mkdir -p $W; sudo chown "$USER" $W
cd $W
{
set -euo pipefail
BS="ssh -p 23 -i $D/box -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$D/kh2"
BN="$BS -n"  # -n: ssh must not eat the loop stdin (rsync needs plain BS)
DUMP=$($BN $BOX "ls dumps/dnevne" | grep -E '^slff-[0-9]{8}T[0-9]{4}Z' | sort | tail -1)
rsync -a -e "$BS" "$BOX:dumps/dnevne/$DUMP" $W/
echo "DUMP $DUMP $(sha256sum $W/$DUMP | cut -c1-16)"
docker run -d --name o -e POSTGRES_PASSWORD=obnova supabase/postgres:17.6.1.166 >/dev/null
for i in $(seq 60); do docker exec o pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
docker exec o createdb -U supabase_admin obnova_test 2>/dev/null || docker exec o createdb -U postgres obnova_test
docker cp $W/$DUMP o:/tmp/d.dump
docker exec o pg_restore -U supabase_admin -d obnova_test --no-owner /tmp/d.dump >$W/restore.log 2>&1 || true  # role/extension noise
for t in $TABELE; do echo "COUNT $t $(docker exec o psql -U supabase_admin -d obnova_test -Atc "select count(*) from $t")"; done
docker exec o psql -U supabase_admin -d obnova_test -Atc "select name || '|' || coalesce(metadata->>'size','') from storage.objects where bucket_id='fotografije-igralcev' and metadata->>'size' is not null order by created_at desc limit 5" |
while IFS='|' read -r p sz; do
  f=$($BN $BOX "ls shramba/zdaj/stub/stub/fotografije-igralcev/$p/" | head -1)
  rsync -a -e "$BS" "$BOX:shramba/zdaj/stub/stub/fotografije-igralcev/$p/$f" $W/x || { echo "FOTOERR $p"; continue; }
  echo "FOTO $p dump=$sz box=$(stat -c %s $W/x) $(sha256sum $W/x | cut -c1-16)"
done
} | tee "$D/out"

RAZ=0; IZPIS=""
DUMP=$(awk '$1=="DUMP"{print $2}' "$D/out")
# the dump must be fresh: slff-YYYYMMDDTHHMMZ (varnostna.sh)
DD=$(grep -oE '[0-9]{8}T[0-9]{4}Z' <<<"$DUMP" | head -1)
if [ -z "$DD" ] || [ $(( $(date -u +%s) - $(date -u -d "${DD:0:4}-${DD:4:2}-${DD:6:2} ${DD:9:2}:${DD:11:2}:00" +%s) )) -gt 172800 ]; then
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
[ "$FOTO" -eq 5 ] || RAZ=1
# every photo: size in the dump must equal the file on the box
while read -r _ _ d bx _; do [ "${d#dump=}" = "${bx#box=}" ] || RAZ=1; done < <(grep '^FOTO ' "$D/out")
grep -q '^FOTOERR' "$D/out" && RAZ=1
echo "$IZPIS"; grep '^FOTO\|^DUMP' "$D/out"
if [ "$RAZ" = 0 ]; then javi "🟢 SLFF test obnove ok: $DUMP, tabele se ujemajo, $FOTO fotografij prebranih iz škatle"
else javi "🔴 SLFF test obnove: razlike ali prazno, glej Actions log obnova-test"; exit 1; fi
