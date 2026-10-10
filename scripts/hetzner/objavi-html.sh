#!/usr/bin/env bash
# Objavi strežnik HTML (scripts/hetzner/html/) na VM in ga (znova) zažene.
#
#   scripts/hetzner/objavi-html.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-html/<čas>/.
# Anon ključ prepiše iz /opt/supabase/.env v /opt/slff-html/.env (ne gre skozi ta računalnik).
# Caddy blok (@html_strani v scripts/hetzner/Caddyfile) uveljavi posebej, ko ta teče.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/hetzner/html/preizkus.mjs
if [[ -n $(git status --porcelain -- scripts/hetzner/html) ]]; then
  echo "scripts/hetzner/html has uncommitted changes; publish only what is on main."; exit 1
fi
CILJ=/opt/slff-html
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "mkdir -p $CILJ /opt/slff/backup-html && { [ -f $CILJ/streznik.mjs ] && cp -a $CILJ /opt/slff/backup-html/$CAS || true; } \
  && grep '^ANON_KEY=' /opt/supabase/.env > $CILJ/.env && chmod 600 $CILJ/.env"
rsync -a scripts/hetzner/html/streznik.mjs scripts/hetzner/html/docker-compose.yml "SLFF:$CILJ/"
ssh SLFF "cd $CILJ && docker compose up -d --force-recreate >/dev/null && sleep 2 \
  && curl -s -o /dev/null -w 'HTML /table → %{http_code} ' http://127.0.0.1:3200/table \
  && curl -sI http://127.0.0.1:3200/table | grep -i '^x-slff-html'"
