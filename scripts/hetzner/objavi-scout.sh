#!/usr/bin/env bash
# Objavi stroj Scout (scout/stroj/, scripts/hetzner/scout/) na VM in (znova)
# zažene delavca slff-scout.
#
#   scripts/hetzner/objavi-scout.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-scout/<čas>/.
# /opt/slff-scout/.env (SCOUT_DB_URL) ustvari lastnik enkrat (glej docs/scout.md);
# skripta ga ne piše in ne bere.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ -n $(git status --porcelain -- scout/stroj scripts/hetzner/scout) ]]; then
  echo "Uncommitted changes in the Scout engine; publish only what is on main."; exit 1
fi
CILJ=/opt/slff-scout
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "test -f $CILJ/.env || { echo 'Manjka $CILJ/.env (ustvari ga lastnik, glej docs/scout.md)'; exit 1; }; \
  mkdir -p /opt/slff/backup-scout && { [ -d $CILJ/app ] && cp -a $CILJ/app /opt/slff/backup-scout/$CAS || true; } \
  && rm -rf $CILJ/app.novo && mkdir -p $CILJ/app.novo"
rsync -a --exclude .venv --exclude tests --exclude __pycache__ --exclude .pytest_cache --exclude '*.egg-info' \
  scout/stroj/ "SLFF:$CILJ/app.novo/"
rsync -a scripts/hetzner/scout/docker-compose.yml scripts/hetzner/scout/Dockerfile "SLFF:$CILJ/"
ssh SLFF "cd $CILJ && rm -rf app.staro && { [ -d app ] && mv app app.staro || true; } && mv app.novo app \
  && docker compose build -q && docker compose run --rm --no-deps scout python -m stroj --help >/dev/null \
  && docker compose up -d --force-recreate >/dev/null && sleep 3 && docker logs --tail 5 slff-scout"
