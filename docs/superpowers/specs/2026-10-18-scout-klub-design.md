# SLFF Scout — stran Klub (del 1: pregled kluba)

Datum: 18. 10. 2026. Status: odobren dizajn, čaka pregled specifikacije.

## Namen

Scout naj postane orodje, ki ga trener in skavt kluba odpreta vsak teden, ne
le ob iskanju igralca. Prvi korak je **stran Klub**: pregled lastne ekipe in
lastnega kadra iz podatkov, ki jih Scout že ima (kazalniki igralcev, Elo,
moč lig, vrzeli) in javnih podatkov tekem.

Lastnik je izbral štiri področja; razdeljena so v tri dele, vsak z lastno
specifikacijo, načrtom in objavo:

1. **Pregled kluba** (ta dokument): moj kader + uspešnost ekipe.
2. Poročilo o naslednjem nasprotniku (isti pogledi, uperjeni v nasprotnika).
3. Načrtovanje kadra (pregled povezan z vrzelmi, iskanjem in opazovanimi).

## Odločitve (lastnik, 18. 10. 2026)

| tema | odločitev |
|---|---|
| pristop | živi RPC v bazi (`scout_klub`), brez sprememb Python stroja; počasne dele se v stroj prestavi šele, če meritev na produkciji to zahteva |
| kdo se šteje | ista pravila kot drugje v Scoutu: mladinske lige, ugovor (`scout.ugovori`) in anonimizirani ne vstopijo, tudi v pogled lastnega kluba ne |
| obdobje | tekoča sezona, primerjava s prejšnjo |
| igralci z mladinsko vrstico (18. 10. 2026, dopolnitev) | Šenčur je na produkciji videl 6 od 22 igralcev. Le na strani **lastnega** kluba (ne pri administratorjevem pogledu tujega) so v kadru tudi igralci kluba z mladinsko vrstico, z oznako U19 (`mladi: true`), samo z javnimi dejstvi tekem lige in sezone kluba (nastopi, minute, delež začetkov in minut, goli, kartoni/90; brez on/off in trenda). Brez ugovora in anonimiziranih (tudi po ključu), brez povezave na profil, nikjer drugje v Scoutu. Migracija 20261018150000 |
| preizkus | administratorji SLFF (`is_admin()`) s sedežem in veljavno naročnino lahko izberejo kateri koli klub v odprti državi svoje naročnine; klub sam vidi le sebe |

## Stran

Nov zavihek **Klub** (`/club`), prvi v meniju; logotip v glavi vodi nanj,
kadar ima klub dostop (sicer na `/`). Prisilne preusmeritve po prijavi ni:
iskanje ostane na `/`, ker ga povezave že uporabljajo; gumb na `/account`
"Na iskanje" postane "Na pregled kluba".

1. **Glava** (kartica): ime kluba in lige, mesto na lestvici, oblika zadnjih
   5 tekem (Z/R/P), Elo letos in lani (Elo je v `scout.ekipe_elo` po letu,
   zato je "trend" primerjava let, ne krivulja čez sezono), moč lige znotraj
   države. **Liga kluba**: odrasla liga (ne `je_mladinski_slug`), v kateri ima
   klub tekme v tekoči sezoni (`r.season = sezona_lige(...)`); pri več tisto z
   največ tekmami, nato najmanjši id. Šele brez takih tekem
   `scout.liga_kluba` (najmočnejša liga zadnjega leta z Elo). Elo se bere le
   iz odraslih lig, najprej v ligi kluba.
2. **Uspešnost ekipe** (tekoča sezona, poleg vsakega povprečje lige):
   goli dani in prejeti na tekmo, doma proti v gosteh (točke na tekmo, dani
   in prejeti goli),
   čiste mreže (delež tekem), točke na tekmo, kartoni na tekmo. Le odigrane
   tekme (z izidom; kontumacije se štejejo kot v lestvici).
3. **Moj kader** (tabela): vsak viden igralec kluba v tekoči sezoni —
   pozicija, nastopi (le z minutami > 0), minute, delež minut ekipe, delež
   začetkov, goli (surovo število, ne goli/90), gol razlika ekipe z njim
   proti brez njega (`onoff_ref_90`), kartoni/90, trend minut (sprememba
   deleža minut proti lani v odstotnih točkah).
   Razvrščanje po stolpcu (privzeto minute), vrstica vodi na stran igralca.
   Igralci brez minut v tekoči sezoni se ne prikažejo.
4. **Globina po poziciji**: za GK/DEF/MID/FWD število igralcev z vsaj 30 %
   minut ekipe in delež minut, ki ga nosi najbolj obremenjen. Izračuna jo
   vmesnik iz `kader` (RPC ne vrne `globina[]`); odvisnost od strelca pove
   obstoječa vrzel `odvisnost` v razdelku Vrzeli.
5. **Vrzeli**: obstoječe vrzeli tega kluba (`scout.vrzeli_jedro`) se pokažejo
   na tej strani; zavihek Vrzeli ostane (del 3 ga združi).
6. **Izbirnik kluba** (le za administratorje): iskalno polje nad glavo,
   klubi odprte države naročnine (`teams.country_id`), izbira v naslovu
   (`/club?team=<id>`). Ne-administratorju tuj klub v parametru vrne napako
   (ne prezre se). Ob napaki administrator izbirnik obdrži.

Nizi so v `scout/src/besede.ts` (sl in en), brez negativnih oznak: "kazalniki
iz podatkov tekem", primerjava z ligo kot dejstvo ("1,2 prejeta gola na
tekmo, povprečje lige 1,6"), ne ocena.

## Baza

- **`public.scout_klub(p_team_id bigint default null) returns jsonb`**,
  `security definer`, `grant execute` le `authenticated`.
  - Dostop prek `scout.dostop('klub', null, jsonb_build_object('team', p_team_id))`:
    sedež, naročnina, odprta država in dnevna meja (šteje med "druge klice",
    meja 300). `scout.dnevnik.vrsta` dobi vrednost `'klub'` (preveri check).
  - Ciljni klub: `d.team_id`, razen če je `p_team_id` podan **in** `is_admin()`
    **in** klub je v `d.country_id`; sicer napaka `insufficient_privilege`
    (ne tiho preklopi na svoj klub — napačen klub na zaslonu je huje kot
    napaka). Ne-administrator s `p_team_id` = svoj klub je dovoljen.
  - Vrne en dokument: `glava`, `ekipa` (z `liga` povprečji), `kader[]`,
    `vrzeli[]` (globino izračuna vmesnik). Kader gre skozi `scout.vidni(model, country)`, da
    veljajo pravila izločanja; kazalniki iz `scout.kazalniki` zadnjega modela
    za `team_id` in tekočo sezono lige.
  - Uspešnost ekipe iz javnih `matches` (tekoča sezona lige kluba, odigrane),
    lestvica iz obstoječega `lestvica_lige(p_competition_id)`.
- Brez novih tabel. Nova migracija; tipi z `npm run tipi`.
- **Meritev pred združitvijo**: `explain analyze` na produkciji v transakciji
  z `rollback`, za največji klub; cilj pod 300 ms. Izmerjeno 13–38 ms, zato
  brez novega indeksa.

## Vmesnik

- `scout/src/strani/Klub.tsx` (nova), tip `PregledKluba` v `scout/src/baza.ts`.
- Pot `/club` z `ZahtevaSedez` v `App.tsx`; zavihek v `Okvir.tsx`.
- Videz kot preostanek Scouta (kartice, `poz-*` značke, številke `tabular-nums`).
- Tabela kadra: na telefonu vodoravno drsenje z zamrznjenim stolpcem imena.

## Varnost in testi

- `supabase/tests/varnost.sql`:
  - brez sedeža → napaka; potekla naročnina → napaka;
  - ne-administrator s tujim `p_team_id` → napaka;
  - administrator s klubom druge države → napaka;
  - igralec z ugovorom, mladinec in anonimiziran niso v `kader`;
  - lastni klub vidi igralca z mladinsko vrstico (`mladi`), ne pa takega z ugovorom ali anonimiziranega; administrator pri tujem klubu ga ne vidi;
  - klic se zapiše v `scout.dnevnik` in šteje v mejo.
- `npm run smoke:scout`: izris `/club` in nizi (sl/en, brez negativnih oznak).
- `npm run test:varnost`, `npm run typecheck`, `build:scout`.

## Zunaj obsega (dela 2 in 3)

Poročilo o nasprotniku, načrtovanje kadra, izvoz (PDF/CSV), primerjava dveh
klubov, krivulja Elo čez sezono (zahteva shranjevanje Elo po tekmah v stroju).
