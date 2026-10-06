#!/usr/bin/env bash
# Hourly database backup on the VM (/etc/cron.d/slff-varnostna, :07 every hour).
# pg_dump -Fc -> /opt/slff/backup (48 hours kept), copied off-box to the HelpStack mail
# server (user slffbackup, 7 days kept). ponytail: temporary off-box target until the
# Hetzner Storage Box exists; then point CILJ at it. A failure goes to Discord.
set -euo pipefail
LOKALNO=/opt/slff/backup
CILJ=slffbackup@167.233.99.232
KLJUC=/root/.ssh/backup_ed25519
IME=slff-$(date -u +%Y%m%dT%H%MZ).dump

javi() {
  W=$(grep '^DISCORD_WEBHOOK=' /opt/slff/secrets.env | cut -d= -f2-)
  curl -fsS -H 'Content-Type: application/json' -A 'SLFF varnostna' \
    -d "{\"content\":\"🔴 SLFF varnostna kopija baze ni uspela: $1\",\"allowed_mentions\":{\"parse\":[]}}" "$W" || true
}
trap 'javi "vrstica $LINENO"' ERR

install -d -m 700 "$LOKALNO"
docker exec supabase-db pg_dump -U supabase_admin -d postgres -Fc > "$LOKALNO/$IME.tmp"
# A dump that small is broken, not a database (the real one is ~100 MB).
[ "$(stat -c %s "$LOKALNO/$IME.tmp")" -gt 5000000 ] || { javi "dump premajhen"; exit 1; }
mv "$LOKALNO/$IME.tmp" "$LOKALNO/$IME"
find "$LOKALNO" -name 'slff-*.dump' -mmin +2880 -delete

rsync -a -e "ssh -i $KLJUC -o BatchMode=yes" "$LOKALNO/$IME" "$CILJ:dumps/"
ssh -i "$KLJUC" -o BatchMode=yes "$CILJ" "find dumps -name 'slff-*.dump' -mtime +7 -delete"
echo "$(date -u +%FT%TZ) ok $IME $(stat -c %s "$LOKALNO/$IME")"
