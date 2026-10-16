# Malta — vir `mfa`

Vir `mfa` (`scripts/viri/mfa.mjs`) bere **javni JSON API Match Centra MFA**
(`api.mfa.com.mt/api`, podatki iz COMET), ki ga bere tudi
matchcentre.mfa.com.mt — brez ključa in prijave, z glavo `x-version: 2` (jo
pošlje stran sama). Država `MT` ("Malta", vpiše jo migracija lig); vmesnika,
kartice, pošte **ni**, `MT` **ni** v matriki nočnega uvoza in ne v
`JEZIK_DRZAVE` — vse to pred vklopom (lige so neaktivne, uvoz ni bil pognan).
Šifra lige se začne z `mt-`. Gozo FA (gozofa.com, ločena piramida, postave le
v prostem besedilu) ni vpisana.

- **Šifra lige je `<tip>/<sezona>[/<tekmovanje>[+…]]`**: `<tip>` je stalni id
  vrste tekmovanja (58539 Premier, 2601248 Challenge League, 2601267 National
  League I, 6234492 National League II), `<sezona>` id sezone z
  `/competitions/<tip>/seasons` = **leto konca** (2027 = 2026/27; sezona je
  avgust–maj, ne koledarska). Ob novi sezoni se popravi le leto.
- **Faze**: brez `<tekmovanje>` so liga vsa tekmovanja (competitionId), ki jih
  našteje lestvica sezone (`/standings?season=`): Premier ima Opening Round
  Phase 1 (11 krogov) → P2 Top 6 / Bottom 6 → Closing Round Phase 1 → P2 (2025/26:
  šest tekmovanj, 32 krogov), Challenge League Phase 1 → Top 8 / Play-Out.
  Poznejša faza dobi kroge za zadnjim krogom faz, iz katerih so prišli njeni
  klubi; vzporedni skupini si delita številke (`krogiSezone`, kot oefb).
  Tekme istega tipa, ki jih lestvica ne našteje (dodatne kvalifikacije,
  odločilne tekme), izpustimo. Dve vzporedni skupini, ki sta za fantasy dve
  ligi (Amateur League 2023/24: Group A in B), potrebujeta `/<competitionId>`.
- **Tekme**: `/competitions/<tip>/pastMatches` in `/upcomingMatches`
  (`?season=&pageSize=50&page=`, stran za koncem je `[]`). Vrstica nima ne
  izida ne kroga; `isLineupAvailable` je napačen (false tudi pri polni postavi)
  — ne beremo ga. **Pretekle vrne največ 100 zadnjih tekem tekmovanja** (tudi
  po straneh, s `teamId` ali `date`), zato vir starejše prebere po šifri
  `/matches/<id>` navzdol od najnižje znane do treh zgrešenih zapored, in še
  luknje bloka do 120 šifer (`dopolniZacetek`; NL II 2025/26: 100 + 30 + 3,
  NL I 2025/26: luknja 23 tekem za prestavljeno zgodnjo tekmo). Odigrane,
  tuje in neobstoječe (`{"ni":404}`) gredo v svoj predpomnilnik
  (`po-sifri-<id>.json`) in se ne berejo znova; neodigrana tekma našega
  tekmovanja se bere vsakič (prestavljena dobi datum in pozneje PLAYED). Ime
  mora biti drugačno od `tekma-<id>.json`, ki ga dobi `prenesi`: gostiteljev
  `prenesi` shrani vsak odgovor pod tem imenom in tekma, prvič prebrana kot
  SCHEDULED, bi taka ostala za vselej. Zadeva le tekmovanja z več kot 100 tekmami (NL I, NL II,
  Challenge Phase 1); upcoming ima isto mejo, a pozni krogi pridejo sami.
- **Krog API ne pozna.** COMET izda šifre tekem tekmovanja po krogih, zato je
  krog zaporedje šifer (`krogiPoSifrah`): nov krog, ko bi klub igral drugič ali
  je krog poln (N/2). Izbrisana tekma pusti luknjo (NL I 2026/27: 53185946,
  krog 3 s 5 tekmami); na novo vpisana tekma z visoko šifro gre v luknjo, kjer
  ne igra nobeden od klubov. Ponovljena tekma (isti par še enkrat, NL II
  2025/26: Msida : Dingli 50920555 in 51962893, obe PLAYED) mesta nima in ostane
  svoj krog na koncu (opozorilo).
- **Zapisnik** = `/matches/<id>/result` (`homeScore`, `awayScore`, `status`
  PLAYED) + `/matches/<id>/lineup` (`homeTeam.players`, `awayTeam.players`):
  `id` igralca je **stalna šifra osebe COMET → `reg_st`**, `number`,
  `startingLineup`, `isGoalkeeper` (→ GK), `isCaptain`. Dogodki so pri
  igralcu z minuto ("45+2'" → 45, "90+3'" → 90): `GOAL`, `PENALTY` (gol z
  11 m), `OWN_GOAL` (pri strelčevi ekipi, šteje nasprotniku), `PENALTY_FAILED`,
  `YELLOW`, `SECOND_YELLOW` (prvi rumeni je svoj dogodek → 1 rumeni + 1 rdeči),
  `RED`, `SUBSTITUTION` (`playerId` noter, `playerIdTwo` ven) — **minute so
  točne**. **Menjava je zapisana pri obeh igralcih** (10 dogodkov za 5 menjav):
  dogodke beremo enkrat po `id` dogodka. Dogodek brez igralca (drugi rumeni
  trenerju, v `/result` brez `playerName`) v postavi ni in ne šteje. Nastopi
  gredo po šifri (`nastopi` iz oefb). Polčasa ni.
- **Ime** je pomešano ("Nathan Steve MANGION", "ATTARD Luke"); priimek so
  besede z velikimi črkami → "Mangion Nathan Steve" (`imeIgralca`;
  "MCPARLAND" postane "Mcparland" — identiteta je šifra).
- **Šifra zapisnika v bazi je `mt<id>`** (COMET drugih zvez ima isti
  številski prostor). Čas je UTC → ljubljanski (Malta je v istem pasu).
- **Nepopoln** (ekipa z manj kot 7 začetniki) kot pri frf/fas: izid se
  zapiše, nastopi le znane ekipe; **kontumacija** 3:0 / 0:3 brez obeh postav
  nima zapisnika. Razpored kontumacije ne označi (seznam nima izida) — admin
  ročno, kot pri NZS. Tekma s stanjem SCHEDULED v preteklosti (NL I 2026/27:
  Mellieha : Mtarfa, ena postava) ni odigrana.
- Klubi: ključ brez narekovajev ("St. George's" = "St. George’s"), kratko ime
  brez FC/SC. Victoria Hotspurs (Gozo) igra v Challenge League in je navaden
  klub vira.
- *Uskladi pozicije* z `vir = mfa` (vratar po večini tekem); ostale pozicije
  na glasovanje.

**Pravice (pregled 15. 10. 2026, ni pravni nasvet).** robots.txt na
www.mfa.com.mt in matchcentre.mfa.com.mt: `User-agent: * / Disallow:` (vse
dovoljeno, brez pravil za AI-robote); api.mfa.com.mt robots.txt nima (404).
Pogojev uporabe na straneh MFA ni. API je nedokumentiran (glava `x-version`
je glava strani same); vljudnostni mail MFA je predlagan (raziskava
2026-10-15), dovoljenja še nimamo. Beremo odkrito (`User-Agent: SLFF fantasy
(https://slff.eu)`, **3 s** med zahtevki, zapisnikov, starejših od tedna, ne
beremo znova). Sodnikov, trenerjev in fotografij ne beremo; vzorci
`scripts/vzorci/mt-mfa-*` so brez njih. **Ob 403, 429 ali izzivu se uvoz
ustavi — ne obhajaj** (`MfaZavrnitev`, izhod 4). Odgovor, ki ni JSON (stran
vzdrževanja, prazen, odrezan), ustavi uvoz lige z navadno napako (izhod 1) in
ne gre v predpomnilnik (`vir.zaPredpomnilnik`), zato ga naslednji uvoz
prebere znova.

Preizkus v živo (15. 10. 2026, brez baze; seznami + zadnji krog, 3 s med
zahtevki, ~60 zahtevkov, 0 zavrnitev):

| liga | krogov / tekem (odigranih) | klubov | zapisnikov | goli = izid | postav po 11 | vratar | menjav (nastopov s klopi) | 990 minut |
|---|---|---|---|---|---|---|---|---|
| mt-premier (krog 7) | 10 / 60 (42) | 12 | 6 | 17/17 | 12/12 | 12/12 | 51 (51) | 11/12 (rdeči) |
| mt-challenge (krog 3) | 11 / 88 (24) | 16 | 8 | 18/18 | 16/16 | 16/16 | 66 (66) | 15/16 (rdeči) |
| mt-nl1 (krog 3) | 10 / 59 (15) | 12 | 5 | 15/15 | 10/10 | 10/10 | 45 (45) | 8/10 (2 rdeča) |
| mt-nl2 (krog 4) | 11 / 77 (28) | 14 | 7 | 29/29 | 14/14 | 14/14 | 65 (65) | 14/14 |

Opozorilo vira: v NL I (Senglea : Kalkara, mt53185944) rumeni karton brez
minute. Arhivi 2025/26 (seznami z dopolnitvijo po šifri, po ena ali dve
tekmi zadnjega kroga): Premier 32 krogov / 192 tekem (6 faz), Challenge 22 /
176 (Phase 1 + Top 8 in Play-Out po 4 tekme), NL I 26 / 182 (181 odigranih;
100 s seznama + 82 po šifri), NL II 22 / 132 + ponovljena tekma kot 23. krog;
vzorčeni zapisniki vsi 11 + 11, vratar, goli = izid.

Vpisane so 4 lige (migracija 20261016091500), **neaktivne**, zveza `mfa`:

| liga | tekoča 2026/27 | arhiv 2025/26 |
|---|---|---|
| mt-premier | `58539/2027` | `58539/2026` |
| mt-challenge | `2601248/2027` | `2601248/2026` |
| mt-nl1 | `2601267/2027` | `2601267/2026` |
| mt-nl2 | `6234492/2027` | `6234492/2026` |

Uvoz (ena za drugo, **šele po vklopu države MT v nočni uvoz in vmesnik**):
`gh workflow run uvoz-lige.yml -f liga=mt-nl2 -f arhiv=6234492/2026 -f
cene=true`. Zapisnik sta dva zahtevka (izid in postava) po 3 s; arhiv 130–190
tekem je ~15–20 minut na ligo.
