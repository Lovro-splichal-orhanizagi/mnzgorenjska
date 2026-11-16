#!/usr/bin/env bash
# Monthly restore drill on the VM (/etc/cron.d/slff-obnova-test, 04:30 UTC on the 2nd).
# Takes the NEWEST daily dump from the Storage Box (the off-server copy, not /opt/slff/backup),
# restores it into a throw-away postgres container on a random port with no volume to prod,
# compares row counts with prod (read-only), checksums a sample of Storage photos from the box
# against the live files, then deletes the container. Never writes to the prod DB.
# Result goes to Discord (ok line or red line) and to /opt/slff/obnova-test.log.
set -euo pipefail
BOX=u685650@u685650.your-storagebox.de
SSH="ssh -p 23 -i /root/.ssh/backup_ed25519 -o BatchMode=yes"
DELO=$(mktemp -d /opt/slff/obnova.XXXXXX)
IME=slff-obnova-$$
TABELE="auth.users public.players public.player_scores public.fantasy_teams storage.objects"

javi() {
  W=$(grep '^DISCORD_WEBHOOK=' /opt/slff/secrets.env | cut -d= -f2-)
  curl -fsS -H 'Content-Type: application/json' -A 'SLFF obnova-test' \
    -d "{\"content\":\"$1\",\"allowed_mentions\":{\"parse\":[]}}" "$W" || true
}
pocisti() { docker rm -f "$IME" >/dev/null 2>&1 || true; rm -rf "$DELO"; }
trap 'javi "🔴 SLFF test obnove baze ni uspel: vrstica $LINENO"; pocisti' ERR
trap pocisti EXIT

DUMP=$($SSH $BOX "ls dumps/dnevne" | grep -E '^slff-[0-9]{8}T' | sort | tail -1)
rsync -a -e "$SSH" "$BOX:dumps/dnevne/$DUMP" "$DELO/"
SHA=$(sha256sum "$DELO/$DUMP" | cut -c1-16)

docker run -d --name "$IME" -e POSTGRES_PASSWORD=obnova --tmpfs /var/lib/postgresql/data \
  supabase/postgres:17.6.1.166 >/dev/null
for i in $(seq 60); do docker exec "$IME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
docker exec "$IME" createdb -U supabase_admin obnova_test 2>/dev/null || docker exec "$IME" createdb -U postgres obnova_test
docker cp "$DELO/$DUMP" "$IME:/tmp/d.dump"
docker exec "$IME" pg_restore -U supabase_admin -d obnova_test --no-owner /tmp/d.dump >"$DELO/restore.log" 2>&1 || true  # role/extension errors are noise

RAZ=0; IZPIS=""
for t in $TABELE; do
  a=$(docker exec "$IME" psql -U supabase_admin -d obnova_test -Atc "select count(*) from $t")
  b=$(docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*) from $t")
  IZPIS+="$t restored=$a prod=$b"$'\n'
  # the dump is up to 24 h old, so prod may be higher; lower than the dump is the alarm
  [ "$b" -ge "$a" ] || RAZ=1
  [ "$a" -gt 0 ] || RAZ=1
done

# sample of 5 photos: sha256 on the box copy vs the live file
VZ=$($SSH $BOX "ls shramba/zdaj/stub/stub/fotografije-igralcev" | head -5)
FOTO=""
for p in $VZ; do
  v=$(ls /opt/supabase/volumes/storage/stub/stub/fotografije-igralcev/"$p"/*/* 2>/dev/null | head -1 || true)
  [ -n "$v" ] || continue
  rel=${v#/opt/supabase/volumes/storage/}
  mkdir -p "$DELO/f"; rsync -a -e "$SSH" "$BOX:shramba/zdaj/$rel" "$DELO/f/x"
  [ "$(sha256sum <"$v")" = "$(sha256sum <"$DELO/f/x")" ] && FOTO+="ok " || { FOTO+="DIFF "; RAZ=1; }
done

LOG="$(date -u +%FT%TZ) dump=$DUMP sha256=$SHA photos=[$FOTO]"$'\n'"$IZPIS"
echo "$LOG" >>/opt/slff/obnova-test.log
if [ "$RAZ" = 0 ]; then javi "🟢 SLFF test obnove ok: $DUMP, tabele in fotografije se ujemajo"
else javi "🔴 SLFF test obnove: razlike, glej /opt/slff/obnova-test.log"; fi
echo "$LOG"
