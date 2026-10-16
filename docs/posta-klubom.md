# Vrsta pošte (luka@slff.eu)

Maile iz luka@slff.eu ne pošilja več človek, ampak vrsta (migracija
`20261012183100`): `klub_stik.v_vrsti` (naslov je v vrsti), `poslji_od` (prvi
mail ne prej) in `posiljatelj`. Pošilja jo **delavec na strežniku**, ne GitHub
Actions (dnevniki javnega repozitorija bi pokazali naslove): kontejner
`slff-posta` (`/opt/slff-posta`, `scripts/hetzner/posta/docker-compose.yml`,
node:22-alpine, omrežje gostitelja kot `slff-html`) poganja
`scripts/posta-klubom.mjs --zanka`. Vsakih 10 minut pošlje največ dva maila
(60–150 s narazen), le v oknu države prejemnika (08–18, pon–sob; krajevni
čas: AT, EE, HR, HU, RS — `OKNA`) in največ 100 na dunajski dan. Najprej opomniki (en sam, ≥ 3
dni po našem prvem, brez pošte drugih — tudi klic ali drugo za vedno zapre
opomnik), nato prvi maili (`nov`, brez pošte, liga **aktivna** — neaktivna
liga čaka, tako Estonija do vklopa; izmenično po državah, `izmenicno`). Klub (isti `team_id` ali isto ime v
državi) čaka, če je v 3 dneh dobil pošto od kogarkoli ali v 7 dneh od drugega,
pravilo pa tik pred pošiljanjem preveri še enkrat na sveži pošti. **En stik na
klub:** drug naslov kluba, ki je prvi mail ali opomnik že dobil, prvega ne dobi.
Pred opomnikom pogleda v nabiralnik (IMAP, INBOX in Junk): mail z naslova ali
citirana povezava na stran kluba → `odgovor`, odboj ali SMTP zavrnitev →
`napacen_mail`. Pred SMTP vrstico prevzame (`v_vrsti = false`) in jo vrne šele
po vpisu v `klub_stik_posta` (poslal `Luka (luka@slff.eu)`); napaka po začetku
DATA ali neuspel vpis jo pusti zunaj vrste z opombo "poslano? preveri ročno" —
**nikoli samodejno znova** (in šteje v dnevno mejo). Polnjenje vrne v vrsto le
stare avstrijske vrstice pred vrsto (brez `posiljatelj`, `poslano`, brez opombe
"poslano…") in jim ob tem vpiše pošiljatelja. Kopija gre v Sent. Številke v mailu so sveže;
besedila (nemška, estonska, hrvaška, madžarska, srbska v latinici) so v
skripti in ne trdijo, da imamo dovoljenje zveze. Prehodne napake delavec le zabeleži; zavrnjena prijava: ura premora,
nato izhod (Docker ga znova zažene).

**Dnevnik:** `ssh slff docker logs slff-posta` — brez naslovov (stik #id,
klub; naslovi zakriti v `k***@domena`). **Objava:**
`scripts/hetzner/objavi-posto.sh` iz main (skripte, ki jih pošta rabi, in le
`@supabase/supabase-js`); **CI je ne objavi** — po vsaki spremembi pošte jo
poženi ročno. **Enkratna nastavitev** (lastnik, skrivnosti niso v gitu): na
strežniku `/opt/slff-posta/.env` s `SUPABASE_SERVICE_ROLE_KEY=` (servisni
ključ iz `/opt/supabase/.env`) in `LUKA_SMTP_GESLO=` (geslo nabiralnika),
`chmod 600`; `SUPABASE_URL` (`http://127.0.0.1:8000`) je v compose.

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
