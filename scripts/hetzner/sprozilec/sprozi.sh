#!/usr/bin/env bash
# VM zažene ponavljajoče delovne tokove (SLF-615): GitHubov `schedule:` izpusti večino terminov
# (18.-19. 11.: Živost 3 od 144, Croatia 0), zato jih sproži ta skripta prek `workflow_dispatch`.
# hns-recurring.yml namenoma NI tu: HNS zajemov okoli njihove blokade ne poganjamo (SLF-590, Nejc 19. 11.).
# GitHubov `schedule:` ostane kot rezerva; dvojni zagon je varen (concurrency skupine v delovnih tokovih).
#   sprozi.sh zivost.yml
#   sprozi.sh obvestila-prevzema.yml   # mail "profil je potrjen" vsako uro (SLF-627)
# Žeton: /etc/slff/gh-dispatch.env (root 600), vrstica GH_TOKEN=... (fine-grained, samo ta repo, Actions: write).
set -euo pipefail

REPO=Lovro-splichal-orhanizagi/mnzgorenjska
tok=${1:-}
case $tok in
  zivost.yml|obvestila-prevzema.yml) inputs='{}' ;;
  *) echo "sprozi: dovoljeno samo: zivost.yml obvestila-prevzema.yml" >&2; exit 2 ;;
esac

# shellcheck disable=SC1091
. /etc/slff/gh-dispatch.env
code=$(curl -sS -m 30 -o /dev/null -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/actions/workflows/$tok/dispatches" \
  -d "{\"ref\":\"main\",\"inputs\":$inputs}")
logger -t slff-sprozi -- "$tok http=$code"
[[ $code == 204 ]] || { echo "sprozi: $tok je vrnil HTTP $code" >&2; exit 1; }
