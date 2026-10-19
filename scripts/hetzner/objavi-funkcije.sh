#!/usr/bin/env bash
# Publish edge functions from this checkout to the VM (CI does not do it: the
# function directory is root-owned and the deploy user has no docker).
#
#   scripts/hetzner/objavi-funkcije.sh                 # posli-opomnik
#   scripts/hetzner/objavi-funkcije.sh bmc-pivo
#
# Run from an up-to-date main. Keeps the previous version in
# /opt/slff/backup-funkcije/<name>-<time>/ and restarts the functions container.
set -euo pipefail
cd "$(dirname "$0")/../.."
IME=${1:-posli-opomnik}
[[ -d supabase/functions/$IME ]] || { echo "No supabase/functions/$IME"; exit 1; }
if [[ -n $(git status --porcelain -- "supabase/functions/$IME" supabase/functions/_shared) ]]; then
  echo "supabase/functions/$IME or _shared has uncommitted changes; publish only what is on main."; exit 1
fi
CILJ=/opt/supabase/volumes/functions/$IME
CAS=$(date +%Y%m%d-%H%M%S)
# Nova funkcija še nima mape: varnostne kopije ni, mapo ustvarimo.
ssh SLFF "mkdir -p /opt/slff/backup-funkcije && if [ -d $CILJ ]; then cp -a $CILJ /opt/slff/backup-funkcije/$IME-$CAS; else mkdir -p $CILJ; fi; if [ -d /opt/supabase/volumes/functions/_shared ]; then cp -a /opt/supabase/volumes/functions/_shared /opt/slff/backup-funkcije/_shared-$CAS; fi"
rsync -a --delete "supabase/functions/$IME/" "SLFF:$CILJ/"
# Skupna koda (../_shared/*.ts) gre zraven vsake funkcije, da uvoz ne pade.
rsync -a --delete supabase/functions/_shared/ SLFF:/opt/supabase/volumes/functions/_shared/
ssh SLFF "cd /opt/supabase && docker compose restart functions >/dev/null && sleep 3 && docker ps --filter name=supabase-edge-functions --format '{{.Status}}'"
# The function answers OPTIONS without auth; anything but 200 means it did not boot.
KODA=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "https://api.slff.eu/functions/v1/$IME")
echo "$IME published (backup $IME-$CAS), OPTIONS → $KODA"
[[ $KODA == 200 ]]
