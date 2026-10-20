#!/usr/bin/env bash
# Objavi pošto klubom (scripts/posta-klubom.mjs, scripts/hetzner/posta/) na VM
# in (znova) zažene delavca slff-posta.
#
#   scripts/hetzner/objavi-posto.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-posta/<čas>/.
# /opt/slff-posta/.env ustvari lastnik enkrat (glej docs/posta-klubom.md);
# skripta ga ne piše in ne bere.
set -euo pipefail
cd "$(dirname "$0")/../.."
# Skripte, ki jih uvozita posta-klubom.mjs in vrsta-poste-klubom.mjs.
DATOTEKE=(
  scripts/posta-klubom.mjs scripts/vrsta-poste-klubom.mjs scripts/dnevno-porocilo-poste.mjs scripts/javi-napako.mjs
  scripts/strani.mjs scripts/prenos.mjs scripts/klubi.mjs scripts/zapisnik.mjs
  scripts/viri/oefb.mjs scripts/viri/facr.mjs scripts/viri/jalgpall.mjs scripts/viri/sportnet.mjs
  scripts/viri/frf.mjs scripts/viri/zapisniki.mjs scripts/viri/mlsz.mjs
)
if [[ -n $(git status --porcelain -- "${DATOTEKE[@]}" scripts/hetzner/posta) ]]; then
  echo "Uncommitted changes in the mail scripts; publish only what is on main."; exit 1
fi
for f in "${DATOTEKE[@]}"; do node --check "$f"; done
SUPABASE_JS=$(node -p "require('./package-lock.json').packages['node_modules/@supabase/supabase-js'].version")
CILJ=/opt/slff-posta
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "test -f $CILJ/.env || { echo 'Manjka $CILJ/.env (ustvari ga lastnik, glej docs/posta-klubom.md)'; exit 1; }; \
  mkdir -p /opt/slff/backup-posta && { [ -d $CILJ/app/scripts ] && cp -a $CILJ/app/scripts /opt/slff/backup-posta/$CAS || true; } \
  && rm -rf $CILJ/app.novo && mkdir -p $CILJ/app.novo"
rsync -aR "${DATOTEKE[@]}" "SLFF:$CILJ/app.novo/"
rsync -a scripts/hetzner/posta/docker-compose.yml "SLFF:$CILJ/"
# cron.d zahteva lastnika root in 644, sicer datoteko tiho preskoči.
ssh SLFF "install -m 644 -o root -g root /dev/stdin /etc/cron.d/slff-porocilo-poste" < scripts/hetzner/posta/slff-porocilo-poste
ssh SLFF "cd $CILJ && { [ -d app/node_modules ] && cp -a app/node_modules app.novo/ || true; } \
  && chmod -R a+rX app.novo \
  && docker run --rm -v $CILJ/app.novo:/app -w /app node:22-alpine \
       sh -c 'npm install --no-save --no-package-lock --omit=dev --loglevel=error @supabase/supabase-js@$SUPABASE_JS && chmod -R a+rX node_modules' \
  && rm -rf app.staro && { [ -d app ] && mv app app.staro || true; } && mv app.novo app \
  && docker compose up -d --force-recreate >/dev/null && sleep 3 && docker logs --tail 5 slff-posta"
