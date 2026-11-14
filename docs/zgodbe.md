# Dnevne zgodbe (IG + FB Story) z Lukovo odobritvijo na Discordu

SLF-38. Ločeno od samodejnih objav (`docs/objave.md`): objave v vir gredo po
vetu same, **zgodbe gredo le po Lukovem kliku v #kafana**.

- Vsak dan **natanko tri** sličice po vrsti (1 kavelj, 2 vsebina, 3 poziv),
  1080 × 1920 **JPEG**, do 8 MB, vse različne (`preveriOkvirje`). Nalepk
  (omemba, anketa) API ne zna, zato je vse besedilo v sliki (SLF-11).
- `node scripts/zgodbe/zgodbe.mjs predlozi 1.jpg 2.jpg 3.jpg [--platforme ig,fb]`
  sličice zaklene v `ZGODBE_MEDIJI/<verzija>/n.jpg` (samo za branje) in v
  #kafana pošlje **eno kartico** kot bot: tri slike v galeriji, platforme,
  različica `v_…` (sha256 vrstnega reda sličic in platform), "Pending
  approval", gumba **Approve** in **Reject**. Ista različica dobi le eno
  kartico. `--suho --izhod mapa` le zapiše `kartica.json`, nič ne pošlje.
- `zgodbe.mjs streznik` posluša `POST /discord/zgodbe` (Interactions Endpoint
  aplikacije). Vsak zahtevek: Ed25519 podpis Discorda, čas največ 5 minut
  (`PODPIS_STAROST_S`), kanal `DISCORD_KAFANA_ID`, odobri ali zavrne le `ZGODBE_LUKA_ID` (en id Discord, Luka; Nejc, 14. 11. 2026; seznam `ZGODBE_ODOBRITELJI` strežnik zavrne ob zagonu);
  sicer zasebno sporočilo in nič. Id interakcije se zapomni (ponovitev nič ne
  naredi), gumb nosi različico (stara kartica nič ne naredi), `caka →
  objavljanje` je en zaporeden zapis (dvojni klik objavi enkrat). Pred objavo
  se sha256 sličic preveri znova; sprememba → `zaklenjeno`, nič objavljeno.
- Objava (`ZGODBE_NACIN=live`; privzeto `dry_run`, ki Mete ne kliče): IG
  `/{ig}/media` `media_type=STORIES` → FINISHED → `media_publish`; FB
  `/{stran}/photos` `published=false` → `/{stran}/photo_stories`. Sličice po
  vrsti 1 → 3. Stanje po platformah na isti kartici: `ok`, `suho`, `napaka`
  (pred klicem objave, varno ponoviti), `neznano` (med ali po njem, preveri
  račun). **Nikoli samodejne ponovitve**; ponovitev je nova kartica (`predlozi`
  z istimi sličicami gre, ko prejšnja kartica ni odprta in ni nič objavila; nova
  kartica pokaže prejšnje stanje). Klic Mete ima rok (`META_CAS_MS`, 60 s).
- Objavi le, če sta v `live` **strežnik in kartica**; kartica iz live CLI na
  dry_run strežniku ne pošlje ničesar.
- Meta sličice prenese z `ZGODBE_MEDIJI_URL`, preverjene pa so v
  `ZGODBE_MEDIJI`: Caddy mora streči **isto mapo** (samo za branje).
- Stanje: JSON `ZGODBE_STANJE` (zapis prek preimenovanja, med procesi pod
  zaklepom `ZGODBE_STANJE.lock`, ker `predlozi` piše med tekom strežnika). Žetoni
  le v `.env`, napake brez `access_token` (`zakrij`).
- Preizkus: `node --test scripts/zgodbe/zgodbe.test.mjs` (v CI prek `scripts/test-dodatni.txt`) (brez omrežja; Discord podpisan lokalno,
  Meta lažna). Živa objava še ni preizkušena od konca do konca.

## Namestitev (dry_run)

Enkrat, lastnik strežnika (agenti tega ne morejo: skrivnosti in root):

1. Discord Developer Portal: aplikacija z botom, bot v strežniku SLFF s
   pravico pisati v #kafana. Zapiši **Public Key** in **Bot Token**.
2. V `/opt/slff-objave/.env` (chmod 600) dodaj:
   `COMPOSE_PROFILES=zgodbe`, `DISCORD_ZGODBE_PUBLIC_KEY`,
   `DISCORD_ZGODBE_BOT_TOKEN`, `DISCORD_KAFANA_ID`, `ZGODBE_LUKA_ID` (Lukov
   id Discord), `ZGODBE_NACIN=dry_run`.
3. Blok `@zgodbe` iz `scripts/hetzner/Caddyfile` prenesi v
   `/etc/caddy/Caddyfile`, `caddy validate` in `systemctl reload caddy`.
4. `scripts/hetzner/objavi-objave.sh` (ali `ssh slff-ops deploy objave`)
   zažene `slff-zgodbe` na `127.0.0.1:8787`; brez `COMPOSE_PROFILES=zgodbe`
   ostane ugasnjen.
5. Portal → General Information → **Interactions Endpoint URL**
   `https://slff.eu/discord/zgodbe`. Discord ob shranjevanju pošlje podpisan
   PING; shrani se le, če strežnik odgovori.

Izklop: odstrani `COMPOSE_PROFILES=zgodbe` iz `.env`, nato v `/opt/slff-objave`
`docker compose stop zgodbe && docker compose rm -f zgodbe`. Sam ponovni
deploy brez profila tekočega `slff-zgodbe` **ne** ustavi.

Preizkus: tri sličice v mapo na strežniku, nato
`docker compose run --rm -v /pot/do/slik:/vhod:ro zgodbe node scripts/zgodbe/zgodbe.mjs predlozi /vhod/1.jpg /vhod/2.jpg /vhod/3.jpg`
v `/opt/slff-objave`. Kartica pride v #kafana; Lukov klik mora
pokazati "dry run, nothing sent", klik kogarkoli drugega le zasebno sporočilo in nič.

Ena pot za zgodbe: dokler ta kartica teče, `ssh slff-ops post-custom story`
ne bi smel objavljati sam (ovoj `slff-ops` ni v gitu, spremeni ga lastnik VM).
