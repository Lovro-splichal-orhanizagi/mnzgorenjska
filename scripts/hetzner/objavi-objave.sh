#!/usr/bin/env bash
# Objavi samodejne objave (scripts/objave.mjs, scripts/hetzner/objave/) na VM
# in (znova) zažene delavca slff-objave.
#
#   scripts/hetzner/objavi-objave.sh
#
# Iz posodobljenega main. Prejšnjo različico shrani v /opt/slff/backup-objave/<čas>/.
# /opt/slff-objave/.env ustvari lastnik enkrat (glej CLAUDE.md *Samodejne objave*);
# skripta ga ne piše in ne bere.
set -euo pipefail
cd "$(dirname "$0")/../.."
DATOTEKE=(scripts/objave.mjs)
if [[ -n $(git status --porcelain -- "${DATOTEKE[@]}" scripts/hetzner/objave) ]]; then
  echo "Uncommitted changes in the posts script; publish only what is on main."; exit 1
fi
for f in "${DATOTEKE[@]}"; do node --check "$f"; done
SUPABASE_JS=$(node -p "require('./package-lock.json').packages['node_modules/@supabase/supabase-js'].version")
PLAYWRIGHT=$(node -p "require('./package-lock.json').packages['node_modules/playwright'].version")
SLIKA=mcr.microsoft.com/playwright:v$PLAYWRIGHT-noble
grep -q "image: $SLIKA" scripts/hetzner/objave/docker-compose.yml \
  || { echo "docker-compose.yml naj ima image: $SLIKA (playwright iz package-lock.json)"; exit 1; }
CILJ=/opt/slff-objave
CAS=$(date +%Y%m%d-%H%M%S)
ssh SLFF "test -f $CILJ/.env || { echo 'Manjka $CILJ/.env (ustvari ga lastnik, glej CLAUDE.md)'; exit 1; }; \
  mkdir -p /opt/slff/backup-objave && { [ -d $CILJ/app/scripts ] && cp -a $CILJ/app/scripts /opt/slff/backup-objave/$CAS || true; } \
  && rm -rf $CILJ/app.novo && mkdir -p $CILJ/app.novo"
rsync -aR "${DATOTEKE[@]}" "SLFF:$CILJ/app.novo/"
rsync -a scripts/hetzner/objave/docker-compose.yml "SLFF:$CILJ/"
ssh SLFF "cd $CILJ && docker pull -q $SLIKA >/dev/null \
  && mkdir -p mediji && chmod 755 . mediji && chown \$(docker run --rm $SLIKA id -u pwuser):\$(docker run --rm $SLIKA id -g pwuser) mediji \
  && chmod -R a+rX app.novo \
  && docker run --rm -v $CILJ/app.novo:/app -w /app $SLIKA \
       sh -c 'npm install --no-save --no-package-lock --omit=dev --ignore-scripts --loglevel=error @supabase/supabase-js@$SUPABASE_JS playwright@$PLAYWRIGHT && chmod -R a+rX node_modules' \
  && rm -rf app.staro && { [ -d app ] && mv app app.staro || true; } && mv app.novo app \
  && docker compose up -d --force-recreate >/dev/null && sleep 3 && docker logs --tail 5 slff-objave"
