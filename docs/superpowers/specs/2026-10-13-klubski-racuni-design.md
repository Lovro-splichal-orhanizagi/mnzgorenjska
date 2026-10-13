# Klubski računi

Klub se registrira z **uradnim naslovom**, ki ga že imamo v `klub_stik`, in
dobi več nadzora nad svojim klubom: pozicije, igralci, ki jih v zapisnikih še
ni, predstavitev kluba, potrjevanje profilov svojih igralcev in prijava napak
v zapisnikih.

Uradni podatki (kdo je igral, minute, goli, cene) ostajajo last uvoza. Klub
jih ne piše; za napako v zapisniku odda **prijavo**, ki jo pogleda admin.

## Zakaj

Danes ima klub v igri le poznavalca, ki ga odobri admin na roke
(`poznavalec_prosnje`, stanje `klub`): trikratna utež glasu za pozicije in
potrjevanje profilov. Klubi odgovarjajo na maile in sprašujejo, kaj lahko
naredijo sami. Poznajo pozicije svojih igralcev bolje od glasovanja in vedo
za igralce, ki še niso igrali (novi, mladi), a jih uporabniki ne morejo kupiti.

Merilo uspeha: klub, ki se prijavi z uradnim mailom, brez admina v nekaj
minutah nastavi pozicije in doda manjkajoče igralce, admin pa izve za vse, kar
je nenavadno.

## 1. Registracija in preverba

Klub ustvari račun z **natanko uradnim naslovom** (mail + geslo s potrditvijo
ali Google). Produkcija zahteva potrditev maila (`GOTRUE_MAILER_AUTOCONFIRM=false`),
Google vrne preverjen naslov, zato potrjen naslov dokazuje, da ima klub
nabiralnik.

En račun na klub (deljena prijava). Ker je `teams` ena vrstica na klub čez
vse lige, račun pokriva člane in mladince hkrati.

**Tabela** `klubski_racuni`:

| stolpec | pomen |
|---|---|
| `user_id` uuid PK → profiles | račun |
| `team_id` bigint → teams | klub |
| `klub_stik_id` bigint → klub_stik | naslov, ki se je ujel |
| `created_at` | |
| `preklican_at`, `preklical` | admin preklic (zgodovina ostane) |

Delni unikatni kazali: en aktiven račun na uporabnika in en na klub.

**RPC** `uveljavi_klubski_racun()` (SECURITY DEFINER) kliče vmesnik ob vsaki
prijavi. Če velja vse od tega, vpiše vrstico in javi na Discord
(`preverjeni_na_discord`):

- `auth.users.email_confirmed_at is not null`;
- `lower(email)` je enak `lower(klub_stik.email)`;
- `klub_stik.team_id is not null`;
- `klub_stik.stanje not in ('ne_zeli', 'napacen_mail')`;
- klub še nima aktivnega računa.

**Brez klika admina**, kadar se vse ujame. Kadar se naslov ujame, `team_id`
pa manjka, gre vrstica v `klubski_zahtevki` (admin izbere klub in potrdi).
Kadar ima klub že račun, gre v isto vrsto kot spor.

**Hrvaški in srbski stiki** (578 + 3) danes nimajo `team_id`. Skripta
`scripts/povezi-stike.mjs` jih poveže s klubi po normaliziranem imenu in
`liga_slug` (suho, nato `--pisi` prek delovnega toka). Dvoumne izpiše za
ročno odločitev.

Pomožna funkcija `je_klubski_racun(p_user uuid, p_team_id bigint)` je osnova
vseh pravic spodaj.

## 2. Pozicije

**RPC** `klub_nastavi_pozicijo(p_player_id, p_position)`: igralec mora biti v
klubu računa (katerakoli liga).

- Nov `position_source = 'klub'` (razširi CHECK).
- Sprememba ne velja takoj: vpiše se v `pozicije_klub_cakajo` in jo uveljavi
  obstoječi tedenski posel `uveljavi_pozicije()` (ponedeljek 02:00 UTC),
  tako kot glasovanje. Sredi kroga se ekipam nič ne spremeni.
- Klub prepiše `glasovanje`, `ugibanje`, `neznano` in `zapisnik`; **ne** prepiše
  `admin`.
- `klub` je zaklenjen kot `admin`: preskočijo ga `potrdi_pozicijo`,
  `smeVVrata` v `uvoz-zapisnikov.mjs`, `ugani-pozicije.mjs` in
  `uskladi-pozicije.mjs`.
- Dnevnik `pozicije_klub_dnevnik` (igralec, staro, novo, kdo, kdaj). Admin
  ima izhod `admin` za vsak primer.

## 3. Dodajanje igralcev

**RPC** `klub_dodaj_igralca(p_competition_id, p_ime, p_priimek, p_position, p_st default null)`:

- liga mora biti aktivna in klub mora v njej igrati v tekoči sezoni;
- vpiše vrstico v `players`: `full_name` v obliki vira (`Priimek Ime`),
  `value = value_start = 4.5`, `position_source = 'klub'`, `active = true`,
  nov stolpec `dodal_klub_at timestamptz`;
- igralca je mogoče takoj kupiti; točke dobi šele z nastopom v zapisniku.

**Omejitev: 25 dodanih na klub na sezono** (čez vse lige kluba).

**Alarmi** (Discord, ne zavrnitev):

- 10 ali več dodanih v 24 urah;
- klub doseže 20 od 25;
- dodan igralec ima ime, ki je zelo podobno obstoječemu igralcu kluba
  (verjetno dvojnik).

**Odstranitev**: klub sme odstraniti svojega dodanega igralca, ki še nima
nastopa. Če ga ima kdo v ekipi, se igralec le deaktivira (pravila
deaktivacije veljajo kot pri prestopu).

**Uvoz ga posvoji.** V `igralecId` (`scripts/uvoz-zapisnikov.mjs:291`), tik
pred vpisom novega igralca, poišči vrstico iste lige in kluba z
`dodal_klub_at is not null`, brez nastopov in z enakim normaliziranim
imenom (brez šumnikov, ne glede na vrstni red imena in priimka). Če je
natanko ena, jo uporabi in ji vpiši `reg_st` (če ga vir da). Isto velja na
poti `regSt`, kadar igralca s to šifro ni. Dve ali več zadetkov: nov
igralec + opozorilo v dnevnik uvoza.

**Brez nastopa po 6 tednih**: pogled `klubski_igralci_brez_nastopa` v
Administraciji, da jih admin pobriše ali pusti.

`preveri-podatke.mjs` dobi preverbo: noben klub ni čez 25 dodanih na sezono.

## 4. Stran kluba in potrjevanje

- **Grb**: nalaganje v vedro `grbi-klubov` (`<team_id>/<ime>.<png|webp|jpg>`,
  do 500 kB), RPC nastavi `teams.logo_url`. Nov stolpec `teams.logo_vir`;
  skripte za grbe (`prenesi-grbe*.mjs`, `grbi-*.mjs`) ne prepišejo grba z
  `logo_vir = 'klub'`.
- **Predstavitev**: `klub_predstavitev(team_id PK, opis ≤300, spletna_stran,
  instagram, facebook)`, uporabniška imena po istih pravilih kot
  `profil_igralca`. Stran `/club/:id` jo pokaže z oznako »Uradni račun kluba«.
- **Profili igralcev**: `prevzem_je_poznavalec_kluba` vrne true tudi za
  `je_klubski_racun(p_user, p.team_id)`. Klub potrjuje zahtevke svojih
  igralcev po obstoječi poti `odloci_zahtevek_klub`.
- **Pregled**: RPC `klub_pregled(p_team_id)`: koliko ekip ima vsakega
  igralca, najboljši strelci točk, število navijačev kluba.

## 5. Prijava napake v zapisniku

Gumb »Prijavi napako« na strani tekme, viden le klubskemu računu kluba, ki
je igral.

- `popravki_zapisnika(id, match_id, team_id, user_id, player_id null,
  minuta null, opis ≤1000, status 'odprt' | 'resen' | 'zavrnjen', odgovor,
  created_at, resen_at, resil)`.
- RPC `klub_prijavi_napako(...)`; največ 10 odprtih na klub.
- Discord ob vsaki prijavi, zavihek v Administraciji. Admin popravi po
  obstoječi poti (ponovni uvoz ali ročno) in označi rešeno; klub vidi
  stanje in odgovor.

## 6. Administracija

Nov zavihek **Klubi**: aktivni računi (preklic), vrsta `klubski_zahtevki`,
alarmi dodanih igralcev, igralci brez nastopa po 6 tednih, prijave napak.

## Varnost

- Vse spremembe prek SECURITY DEFINER RPC s preverbo `je_klubski_racun`.
  Tabele imajo RLS; vmesnik jih ne piše neposredno.
- Klub nikoli ne piše minut, golov, cen ali `reg_st`.
- Preklic računa ne razveljavi narejenega, a ga admin lahko pregleda v
  dnevnikih in povrne.

## Prevodi

Vsi novi napisi v vseh 13 jezikih (`src/i18n/*`).

## Preizkusi

- SQL: uporabnik brez računa ne more klicati nobenega RPC; klub ne more
  urejati igralca drugega kluba; omejitev 25 drži; `admin` pozicije klub ne
  prepiše.
- Smoke: posvojitev dodanega igralca v `igralecId` (en zadetek, dva
  zadetka, obrnjen vrstni red imena, šumniki).
- Smoke: `povezi-stike` na vzorcu hrvaških stikov.

## Vrstni red

1. Računi, preverba, Administracija → Klubi, povezava HR/RS stikov.
2. Pozicije, potrjevanje profilov, stran kluba.
3. Dodajanje igralcev, posvojitev v uvozu, alarmi.
4. Prijave napak v zapisniku.

Vsak korak je svoj PR in je uporaben sam zase.
