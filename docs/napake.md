# Sledenje napakam z Bugsinkom (SLF-245)

Napake iz brskalnika (slff.eu, aplikacija) in iz edge funkcij gredo v Bugsink na našem VM-ju. Pivko in SRE
vidita le združke prek `slff-ops napake`, nikoli dogodkov, sporočil ali žetonov.

## Zakaj Bugsink in ne GlitchTip (1. 11. 2026)

| | Bugsink 2.6 | GlitchTip |
|---|---|---|
| Sestava | en vsebnik (gunicorn + snappea), SQLite v `./data` | splet + delavec (ali all-in-one), **obvezen Postgres 14+** |
| RAM | ~150-250 MB, omejen na 320 MB | 256-512 MB po navodilih |
| Baza | lastna datoteka, nič v `supabase-db` | nova baza v `supabase-db` (že ~98 % CPU, 1,6 GB) |
| Hramba | `MAX_EVENT_AGE_DAYS` + največ dogodkov na projekt | `GLITCHTIP_*_RETENTION_DAYS` |
| Obvestila | e-pošta (Mailcow), po želji Discord/Slack webhook na projekt | e-pošta, webhooki |
| SDK | Sentry (`@sentry/browser`), isto | isto |

VM ima 3,8 GB RAM, prostih ~600 MB, 1 GB swapa v rabi, 21 GB diska. GlitchTip bi dodal pisanje v že obremenjen
Postgres; Bugsink ostane ločen in ga ustavimo brez vpliva na aplikacijo. Uptime, transakcije in sledi (GlitchTip)
ne rabimo.

## Kaj se pošilja in kaj ne

- **Brskalnik** (`src/lib/sledenjeNapak.ts`): SDK se naloži v ločenem kosu (~31 kB gzip) šele po izrisu, samo če je
  ob gradnji nastavljen `VITE_NAPAKE_DSN`. Javljajo se neujete izjeme, zavrnjene obljube in `NapakaOprijem`.
  Brez sej (obisk šteje Umami), brez vnosov konzole, brez sledenja zmogljivosti. Izdaja = `meta slff-commit`.
- **Funkcije** (`supabase/functions/_shared/napake.ts`): vsaka `index.ts` pokliče `sledi('<ime>')`; vsak
  `console.error` in neujeta izjema gre v Bugsink (največ 10/min na izolat, brez čakanja). Predmeti iz
  `console.error` se ne pošljejo, le nizi in `Error`.
- **Čiščenje** (`_shared/napake-cistilo.ts`, skupno obema; preizkus `npm run test:napake`): odstrani `user`,
  `server_name`, piškotke, glave, telo in poizvedbo zahteve, poizvedbe in `#` iz vseh naslovov, ključe
  `pass|token|secret|auth|cookie|session|email|apikey|signature|ip`, v nizih pa zamenja e-naslove, JWT, `Bearer`,
  ključe Supabase/Stripe, `token=`/`code=`/…, uuid, IPv4 in telefonske/dolge številke.
- **Strežnik**: Caddy na `slff.eu/n/` spusti le `POST /api/<n>/envelope/` (do 256 KB) in odreže
  `X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP` in piškotke; Bugsink zato kot `remote_addr` vidi le prehod
  Dockerja. Vmesnik Bugsinka ni na internetu.
- **Hramba**: 30 dni (`MAX_EVENT_AGE_DAYS`) in največ 5000 dogodkov na projekt; omejitve 300/5 min, 1500/h na
  projekt, 200 000 na mesec.

## Agentski dostop: `slff-ops napake [dni] [projekt]`

`scripts/hetzner/napake-stat.sh`: agent poda le dni (1-90) in ime projekta. SQLite se odpre `mode=ro` +
`query_only`, brez gesla ali žetona Bugsinka. Izhod (JSON, UTC, največ 100 težav, zadnja najprej):

`projekt, vrsta` (npr. `TypeError`), `resnost` (raven zadnjega dogodka), `stevilo` (vse), `v_obdobju`,
`prvic, zadnjic, izdaja` (12 znakov), `stanje` (odprta/resena/utisana), `odtis` (12 znakov sha256 ključa
združevanja; isti odtis = ista težava med klici).

Brez sporočila napake, sklada, URL-jev, dogodkov ali IP-jev. Vsak klic gre v journal (`journalctl -t napake-stat`).
Podrobnosti težave pogleda človek v vmesniku (tunel spodaj).

## Namestitev (potrebuje odobritev lastnika; ne deploy brez nje)

```bash
# 1. Bugsink
ssh slff "sudo mkdir -p /opt/napake/data && sudo chown 14237:14237 /opt/napake/data"   # uid uporabnika bugsink v sliki
scp scripts/hetzner/napake/docker-compose.yml slff:/opt/napake/
# /opt/napake/.env (root 600): BUGSINK_SECRET_KEY=$(openssl rand -base64 50), SMTP_HOST/SMTP_USER/SMTP_PASS kot pri funkcijah
ssh slff "cd /opt/napake && docker compose up -d && docker exec -it bugsink bugsink-manage createsuperuser"
# 2. Vmesnik: ssh -L 3110:localhost:3110 slff -> http://localhost:3110
#    ekipa slff; projekta slff-web (1) in slff-funkcije (2); obvestila: nova težava, regresija, odmik utišanja;
#    člani projekta s "Send email alerts" (ali Discord webhook projekta, če ga lastnik želi).
# 3. Caddy: blok @napake iz scripts/hetzner/Caddyfile -> caddy validate && systemctl reload caddy
# 4. .github/workflows/ci.yml, korak Build spletne strani (agentov žeton ne sme v workflowe):
#      VITE_NAPAKE_DSN: ${{ vars.VITE_NAPAKE_DSN }}
#    Repo spremenljivka VITE_NAPAKE_DSN = https://<ključ slff-web>@slff.eu/n/1 (ključ je javen, le sprejem)
#    /opt/supabase/.env: NAPAKE_DSN=https://<ključ slff-funkcije>@slff.eu/n/2, nato up funkcij
# 5. Agentska pot: scripts/hetzner/napake-stat.sh -> /usr/local/bin/ ; v ovoju slff-ops:
#    napake) exec /usr/local/bin/napake-stat.sh "$@" ;;
# 6. varnostna.sh: dodaj /opt/napake/data v varnostno kopijo (ali zavestno brez: napake po 30 dneh izginejo).
```

Preverjanje po namestitvi: v konzoli slff.eu `setTimeout(() => { throw new Error('SLF-245 test') })`, nato
`ssh slff-ops napake 1 slff-web` mora pokazati težavo `Error` s `stevilo: 1` in izdajo trenutnega commita.

Lokalni preizkus (1. 11. 2026, `pip install bugsink==2.6.2`, SQLite): dogodki iz Playwright (vite dev) in iz
`_shared/napake.ts` so prišli (200), v surovih dogodkih ni bilo e-naslova, JWT, `sk_live`, `token_hash` ali
poizvedbe; `remote_addr` = proxy; `napake-stat` je vrnil 3 težave s pravimi izdajami in odtisi.
