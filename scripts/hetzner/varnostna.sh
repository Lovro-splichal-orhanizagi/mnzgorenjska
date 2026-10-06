#!/usr/bin/env bash
# Hourly database backup on the VM (/etc/cron.d/slff-varnostna, :07 every hour).
# pg_dump -Fc -> /opt/slff/backup (48 hours kept) -> Hetzner Storage Box slff-backup
# (FSN1, other datacenter): dumps/urne mirrors the 48 hourly ones, dumps/dnevne keeps the
# 03:07 UTC one for 30 days. The box's shell has no `find`, so old daily copies are
# picked by the date in their name. A failure goes to Discord.
set -euo pipefail
LOKALNO=/opt/slff/backup
BOX=u685650@u685650.your-storagebox.de
SSH="ssh -p 23 -i /root/.ssh/backup_ed25519 -o BatchMode=yes"
IME=slff-$(date -u +%Y%m%dT%H%MZ).dump

javi() {
  W=$(grep '^DISCORD_WEBHOOK=' /opt/slff/secrets.env | cut -d= -f2-)
  curl -fsS -H 'Content-Type: application/json' -A 'SLFF varnostna' \
    -d "{\"content\":\"🔴 SLFF varnostna kopija baze ni uspela: $1\",\"allowed_mentions\":{\"parse\":[]}}" "$W" || true
}
trap 'javi "vrstica $LINENO"' ERR

install -d -m 700 "$LOKALNO"
docker exec supabase-db pg_dump -U supabase_admin -d postgres -Fc > "$LOKALNO/$IME.tmp"
# A dump that small is broken, not a database (the real one is ~14 MB compressed).
[ "$(stat -c %s "$LOKALNO/$IME.tmp")" -gt 5000000 ] || { javi "dump premajhen"; exit 1; }
mv "$LOKALNO/$IME.tmp" "$LOKALNO/$IME"
find "$LOKALNO" -name 'slff-*.dump' -mmin +2880 -delete

$SSH $BOX "mkdir -p dumps/urne dumps/dnevne"
rsync -a --delete --include='slff-*.dump' --exclude='*' -e "$SSH" "$LOKALNO/" "$BOX:dumps/urne/"
if [ "$(date -u +%H)" = 03 ]; then
  rsync -a -e "$SSH" "$LOKALNO/$IME" "$BOX:dumps/dnevne/"
  MEJA=$(date -u -d '30 days ago' +%Y%m%d)
  for f in $($SSH $BOX "ls dumps/dnevne"); do
    [[ $f =~ ^slff-([0-9]{8})T ]] && [ "${BASH_REMATCH[1]}" -lt "$MEJA" ] && $SSH $BOX "rm dumps/dnevne/$f"
  done
fi
echo "$(date -u +%FT%TZ) ok $IME $(stat -c %s "$LOKALNO/$IME")"
