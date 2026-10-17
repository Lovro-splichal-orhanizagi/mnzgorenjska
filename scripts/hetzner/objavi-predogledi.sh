#!/usr/bin/env bash
# Objavi strežnik slik za predogled (scripts/hetzner/predogledi/) na VM in ga (znova) zažene.
#
#   scripts/hetzner/objavi-predogledi.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-predogledi/<čas>/.
# Anon ključ prepiše iz /opt/supabase/.env v /opt/slff-predogledi/.env (ne gre skozi ta računalnik).
# Caddy blok (/predogled/* v scripts/hetzner/Caddyfile) uveljavi posebej, ko ta teče;
# og:image v straneh vpiše strežnik HTML (scripts/hetzner/objavi-html.sh) šele po tem.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/hetzner/predogledi/preizkus.mjs
if [[ -n $(git status --porcelain -- scripts/hetzner/predogledi scripts/hetzner/html) ]]; then
  echo "scripts/hetzner/predogledi or html has uncommitted changes; publish only what is on main."; exit 1
fi
PLATNO=$(node -p "require('./package-lock.json').packages['node_modules/@napi-rs/canvas'].version")
SLIKA=node:22-alpine
CILJ=/opt/slff-predogledi
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "mkdir -p $CILJ/predpomnilnik /opt/slff/backup-predogledi \
  && { [ -d $CILJ/app/predogledi ] && cp -a $CILJ/app /opt/slff/backup-predogledi/$CAS || true; } \
  && grep '^ANON_KEY=' /opt/supabase/.env > $CILJ/.env && chmod 600 $CILJ/.env \
  && rm -rf $CILJ/app.novo && mkdir -p $CILJ/app.novo/predogledi $CILJ/app.novo/html"
rsync -a scripts/hetzner/predogledi/streznik.mjs scripts/hetzner/predogledi/podatki.mjs scripts/hetzner/predogledi/risbe.mjs \
  scripts/hetzner/predogledi/pisave "SLFF:$CILJ/app.novo/predogledi/"
rsync -a scripts/hetzner/html/streznik.mjs "SLFF:$CILJ/app.novo/html/"
rsync -a scripts/hetzner/predogledi/docker-compose.yml "SLFF:$CILJ/"
# node_modules v kontejnerju (VM nima Node): binarni del platna za linux-x64-musl.
ssh SLFF "cd $CILJ && echo '{\"type\":\"module\"}' > app.novo/package.json && chmod -R a+rX app.novo \
  && docker run --rm -v $CILJ/app.novo:/app -w /app $SLIKA \
       sh -c 'npm install --no-save --no-package-lock --omit=dev --ignore-scripts --loglevel=error @napi-rs/canvas@$PLATNO && chmod -R a+rX node_modules' \
  && chown -R \$(docker run --rm $SLIKA id -u node):\$(docker run --rm $SLIKA id -g node) predpomnilnik \
  && rm -rf app.staro && { [ -d app ] && mv app app.staro || true; } && mv app.novo app \
  && docker compose up -d --force-recreate >/dev/null && sleep 3 \
  && curl -s -o /dev/null -w 'zdravje → %{http_code} ' http://127.0.0.1:3202/zdravje \
  && curl -s -o /dev/null -D - http://127.0.0.1:3202/predogled/league/1.jpg | grep -i '^\(http\|content-type\|x-slff-predogled\)' \
  && docker logs --tail 3 slff-predogledi"
