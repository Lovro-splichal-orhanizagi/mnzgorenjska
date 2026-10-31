# Vrsta pošte (luka@, lovro@, nejc@, klubi@slff.eu)

Maile klubom ne pošilja več človek, ampak vrsta (migracija
`20261012183100`): `klub_stik.v_vrsti` (naslov je v vrsti), `poslji_od` (prvi
mail ne prej) in `posiljatelj` (polnjenje vpiše `luka@slff.eu` kot oznako
vrste; ob prvem mailu ga delavec prepiše z nabiralnikom, ki je poslal). Pošilja jo **delavec na strežniku**, ne GitHub
Actions (dnevniki javnega repozitorija bi pokazali naslove): kontejner
`slff-posta` (`/opt/slff-posta`, `scripts/hetzner/posta/docker-compose.yml`,
node:22-alpine, omrežje gostitelja kot `slff-html`) poganja
`scripts/posta-klubom.mjs --zanka`. Vsakih 10 minut pošlje vsak dejaven
pošiljatelj največ dva maila (med vsemi maili 60–150 s), le v oknu države
prejemnika (08–18, pon–sob; krajevni čas: AT, BA, EE, GI, GR, HK, HR, HU,
JP, LV, MD, ME, MK, MT, RO, RS, TH — `OKNA`; SK, GB in države s pravilom
privolitve DE, PL, DK, ES samodejne pošte nimajo) in
vsak do svoje dnevne meje. **Dejanski pretok:** razmik 60–150 s je skupen
vsem pošiljateljem, zato gre največ okoli 34 mailov na uro oziroma okoli 340 na
dan (10-urno okno) skupaj, tudi ko so vsi štirje ogreti na 100.

**Pošiljatelji** (`POSILJATELJI` v skripti, nabiralniki na Mailcowu):

| nabiralnik | podpis | `poslal` | geslo v `.env` | ogrevanje od |
|---|---|---|---|---|
| luka@slff.eu | Luka | `Luka (luka@slff.eu)` | `LUKA_SMTP_GESLO` | — (100/dan) |
| lovro@slff.eu | Lovro | `Lovro (lovro@slff.eu)` | `LOVRO_SMTP_GESLO` | 19. 10. 2026 |
| nejc@slff.eu | Nejc | `Nejc (nejc@slff.eu)` | `NEJC_SMTP_GESLO` | 19. 10. 2026 |
| klubi@slff.eu | ekipa ("Das SLFF-Team", "SLFF tim" …) | `Ekipa SLFF (klubi@slff.eu)` | `KLUBI_SMTP_GESLO` | 19. 10. 2026 |

Pošiljatelj brez gesla v okolju ne pošilja (z le `LUKA_SMTP_GESLO` je vse kot
prej). Dnevna meja z ogrevanjem je `min(100, 20 + 10 × dunajskih dni od
začetka)` (prvi dan 20, po osmih dneh 100), šteje se `klub_stik_posta.poslal`
tega pošiljatelja na dunajski dan (in parkirani "poslano…" z njegovim
naslovom v opombi). Prvi mail dobi pošiljatelj z največ prostora danes (enako →
vrstni red v tabeli); opomnik in pregled nabiralnika vedno tisti, ki je poslal
prvi mail (`poslal`) — če ni dejaven ali je poln, opomnik čaka. Besedila so
enaka, le ime v predstavitvi in podpisu; klubi@ piše v množini ("wir sind das
Team von SLFF") in v glavi `From: "SLFF"`. Zavrnjena prijava izklopi le tega
pošiljatelja do ponovnega zagona. Najprej opomniki (en sam, ≥ 3
dni po našem prvem, brez pošte drugih — tudi klic ali drugo za vedno zapre
opomnik), nato prvi maili (`nov`, brez pošte, liga **aktivna** — neaktivna
liga čaka, tako Estonija do vklopa; izmenično po državah, `izmenicno`). Klub (isti `team_id` ali isto ime v
državi) čaka, če je v 3 dneh dobil pošto od kogarkoli ali v 7 dneh od drugega,
pravilo pa tik pred pošiljanjem preveri še enkrat na sveži pošti. **En stik na
klub:** drug naslov kluba, ki je prvi mail ali opomnik že dobil, prvega ne dobi.
Pred opomnikom pogleda v nabiralnik pošiljatelja prvega maila (IMAP, prijava
kot on, INBOX in Junk): mail z naslova ali
citirana povezava na stran kluba → `odgovor`, odboj ali SMTP zavrnitev →
`napacen_mail`. Pred SMTP vrstico prevzame (`v_vrsti = false`) in jo vrne šele
po vpisu v `klub_stik_posta` (`poslal` pošiljatelja); napaka po začetku
DATA ali neuspel vpis jo pusti zunaj vrste z opombo "poslano? preveri ročno" —
**nikoli samodejno znova** (in šteje v dnevno mejo, tudi v istem krogu). Taka
vrstica z opombo "poslano…" blokira **ves klub** (vsak naslov z istim
`team_id` ali imenom v državi), dokler človek ne preveri Sent, mail vpiše
(`stiki-klubov.mjs zabelezi`) in opombe ne pobriše — sicer bi drug naslov
istega kluba dobil še en prvi mail. Polnjenje vrne v vrsto le
stare avstrijske vrstice pred vrsto (brez `posiljatelj`, `poslano`, brez opombe
"poslano…") in jim ob tem vpiše pošiljatelja. Kopija gre v Sent nabiralnika, ki je poslal.
**Odgovori klubov pristanejo v nabiralniku pošiljatelja**: info@ in luka@ sta
povezana s HelpStackom, lovro@, nejc@ in klubi@ **niso** — te berejo lastniki
(ali Mailcow SOGo) sami. **Lastnik lovro@, nejc@ in klubi@ vsak odgovor
kluba v 3 dneh zabeleži** z `node scripts/stiki-klubov.mjs zabelezi --za
<naslov> --vrsta odgovor --poslal <ime> --opomba "…"`: pregled pred opomnikom
gleda le INBOX in Junk, zato odgovor, premaknjen v drugo mapo ali arhiviran,
ne ustavi opomnika. Številke v mailu so sveže;
besedila (nemška, estonska, hrvaška, madžarska, srbska v latinici,
bosanska/črnogorska ijekavica, romunska za RO in MD, latvijska, makedonska v
cirilici, grška, angleška za MT, HK, GI, JP, TH) so v skripti in ne trdijo,
da imamo dovoljenje zveze. Novejša besedila vir točk vzamejo iz zveze lige
(`federations.site_url`, npr. epspeir.gr, frf-ajf.ro), brez nje iz privzete
domene države v `BESEDILA`. Mail je
`multipart/alternative`: najprej text/plain (ta gre tudi v `klub_stik_posta`),
nato lahek HTML iz istega besedila (`vHtml`, videti kot osebni mail, brez
glave in gumba). Opomnik ni odgovor v isti niti, ker se Message-ID prvega
maila ne hrani. Prehodne napake delavec le zabeleži; zavrnjena prijava: ura premora,
nato izhod (Docker ga znova zažene).

**Dnevno poročilo** (koliko je včeraj odšlo, po pošiljatelju, državi in
vrsti, klubom in uporabnikom) gre vsak dan ob 7:00 (pozimi 6:00) na Discord
#reports: `scripts/dnevno-porocilo-poste.mjs`, cron
`scripts/hetzner/posta/slff-porocilo-poste` v sliki slff-posta,
`DISCORD_WEBHOOK_REPORTS` v `/opt/slff-posta/.env`.

**Dnevnik:** `ssh slff docker logs slff-posta` — brez naslovov (stik #id,
klub; naslovi zakriti v `k***@domena`). **Objava:**
`scripts/hetzner/objavi-posto.sh` iz main (skripte, ki jih pošta rabi, in le
`@supabase/supabase-js`); **CI je ne objavi** — po vsaki spremembi pošte jo
poženi ročno, **izven okna pošiljanja** (08–18 pon–sob po državah): objava
sredi pošiljanja lahko ubije delavca med SMTP in vpisom in pusti vrstico zunaj
vrste brez opombe. **Med tekom kontejnerja `posta-klubom.mjs` nikoli ne
zaganjaj brez `--suho`** (dva zagona hkrati obideta skupni razmik in meje,
ker vsak šteje le svoje). **Enkratna nastavitev** (lastnik, skrivnosti niso v gitu): na
strežniku `/opt/slff-posta/.env` s `SUPABASE_SERVICE_ROLE_KEY=` (servisni
ključ iz `/opt/supabase/.env`) in gesla nabiralnikov `LUKA_SMTP_GESLO=`,
`LOVRO_SMTP_GESLO=`, `NEJC_SMTP_GESLO=`, `KLUBI_SMTP_GESLO=` (le tista, ki naj
pošiljajo), `chmod 600`, nato `docker compose up -d` (nova gesla se preberejo ob zagonu); `SUPABASE_URL` (`http://127.0.0.1:8000`) je v compose.

**Polnjenje** teče na strežniku: `cd /opt/slff-posta && docker compose run --rm
posta node scripts/vrsta-poste-klubom.mjs --drzava AT` (načrt), nato z
`--pisi` (po želji `--poslji-od <ISO>`). Le uradni naslov kluba (AT: blok
"Kontakt" na vereine.oefb.at, brez Bundeslige in 2. Lige; EE: "E-post" na
strani ekipe jalgpall.ee, ne "Esindaja"; HU: "Klub adatok" → E-mail na strani
kluba adatbank.mlsz.hu, le aktivne lige, brez NB I in NB II, ostanek "Too many
connections" klub preskoči do naslednjega zagona; preizkus brez baze
`--drzava HU --suho --koda 67/20/33915 --najvec 5` izpiše zakrite naslove),
en naslov na klub, prva ekipa pred
rezervno, klub brez igralcev z nastopi izpusti; 403, 429 ali izziv ustavi
takoj. Vrstic drugih pošiljateljev in obstoječih naslovov ne spreminja.
jalgpall.ee ima skupen proračun branja (`SKUPEN_VIR`), strežnik pa nima
žetona za `cakaj-na-uvoze.mjs`: polnjenje EE zato prek javnega API GitHub
pogleda, ali teče ali čaka uvoz, ki bere jalgpall.ee (*Uvoz lige ee-…*, posel
*uvoz EE* nočnega uvoza, *Grbi klubov jalgpall*), in tedaj ne bere (izhod 3).
Ne zaganjaj ga tik pred uvozom Estonije. `--suho` na posta-klubom izpiše
naslednje maile brez pošiljanja.

**HR in RS polnjenje nima** (pregled 15. 10. 2026): Semafor pri klubu
(`/klubovi/<id>/`) kaže le naslov in stadion, fsb.org.rs in fss.rs naslovov
klubov ne objavljata. ŽNS jih objavijo v PDF "Adresar klubova" (zns.hr: 1. in
2. ŽNL, Treća NL Centar), vsaka zveza drugače — ni podprto. Besedila in okni
HR, RS sta pripravljena: vrstica, ki jo v vrsto postavi človek (`v_vrsti`,
`posiljatelj`), gre po istih pravilih.
