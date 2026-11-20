# Sprožilec z VM (SLF-615)

GitHubov `schedule:` izpušča večino terminov (18.-19. 11. 2026: Živost 3 od 144, Ponovne cene 3 od 96,
Croatia captured imports 0). Zato VM sproži najpomembnejša ponavljajoča opravila prek `workflow_dispatch`.
`schedule:` v delovnih tokovih ostane kot rezerva, `concurrency` skupina `zivost`
poskrbi, da dvojni zagon ni nevaren.

| Delovni tok | Termin (UTC) | Opomba |
|---|---|---|
| `zivost.yml` | vsakih 10 min, sekunda 20 | |
| `obvestila-prevzema.yml` | `:17` vsako uro | mail "profil je potrjen" (SLF-627) |

`zivost.yml` ob prvem teku v uri (minuta < 10) zažene še posel `hns-zdravje` (SLF-664): bere samo shranjen
heartbeat in posnetke hrvaškega zajema z VM (brez HNS, brez baze) in naloži artefakt `hns-source-health-hourly`.
Zamujena preverba: prejšnji artefakt mora biti star največ 90 min (`scripts/hns-health-watchdog.mjs`); neodvisno
to preverita še `preveri-podatke.yml` in dnevni CTO triage.

`hns-recurring.yml` (Croatia captured imports) VM namenoma NE sproža: HNS zajemov ne poganjamo okoli
njihove blokade (SLF-590). Ostane samo GitHubov `schedule:`.

Doda se lahko samo kar je v `case` v `sprozi.sh`.

## Namestitev na VM (root; to je dostop, ki ga agent nima)

Nameščeno 19. 11. 2026 ob 11:02 UTC (Nejc): samo `slff-sprozi-zivost.timer` in `slff-sprozi-obvestila.timer`.

```bash
# 1. žeton: fine-grained PAT, samo repo Lovro-splichal-orhanizagi/mnzgorenjska, Actions: Read and write
install -d -m 700 /etc/slff && umask 077 && printf 'GH_TOKEN=%s\n' '<žeton>' > /etc/slff/gh-dispatch.env
# 2. skripta in enote
install -m 755 scripts/hetzner/sprozilec/sprozi.sh /usr/local/bin/slff-sprozi.sh
install -m 644 scripts/hetzner/sprozilec/*.service scripts/hetzner/sprozilec/*.timer /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now slff-sprozi-zivost.timer slff-sprozi-obvestila.timer
# 3. preizkus: mora vrniti brez napake, v GitHub Actions se pojavi tek z dogodkom workflow_dispatch
systemctl start slff-sprozi-zivost.service; journalctl -t slff-sprozi -n 3
```

## Dokaz (24 ur po namestitvi)

```bash
gh api "repos/Lovro-splichal-orhanizagi/mnzgorenjska/actions/workflows/zivost.yml/runs?event=workflow_dispatch&per_page=100&created=>=$(date -u -d '24 hours ago' +%FT%TZ)" --jq '.total_count'   # pričakovano 144 (največ 1 manjka)
gh api "repos/Lovro-splichal-orhanizagi/mnzgorenjska/actions/workflows/obvestila-prevzema.yml/runs?event=workflow_dispatch&per_page=100&created=>=$(date -u -d '24 hours ago' +%FT%TZ)" --jq '.total_count'   # pričakovano 24 (največ 1 manjka)
```

Naslednji koraki, ko to teče: enako za `ponovne-cene.yml` (`7,22,37,52`) in `opozorila.yml`, tako da se
doda ime v `case` in nova enota.
