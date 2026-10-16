# Slovenija — šifre lig in posebnosti MNZ

| zveza | tekoča 2026/27 | arhiv 2025/26 | arhiv 2024/25 |
|---|---|---|---|
| mnzg — člani / mladinci | 1601 / 1603 | 1502 / 1503 | — |
| mnzlj — 1. / 2. liga | 2003 / 2004 | 1904 / 1905 | 1804 / 1805 |

**Pri 3. SNL arhiv ni pri istem viru kot tekoča sezona.** Ligo vodi NZS,
objavi pa jo tista medobčinska zveza, ki ji jo je NZS za to sezono zaupala —
in skrbništvo se seli. Zato ima šifra v delovnem toku obliko `<koda>@<vir>`:

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| snl3-vzhod | mnzpt `2026:96` | `2025-26/3-snl-v-25-26@mnzle`, `2024-25/3-snl-v-24-25@mnzle` |
| snl3-zahod | mnzng `2785` | `1703@mnzlj` (23/24), `1603@mnzlj` (22/23) |

Arhivi preostalih zvez:

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| pt-super | `2026:3` | `2025:65`, `2024:65` |
| pt-1razred | `2026:4` | `2025:67`, `2024:67` |
| ms-clani | `2026:113` | `2025:113` |
| le-pnl | `2026-27/pomurska-nogometna-liga-26-27` | `2025:112@mnzms`, `2024:112@mnzms` |
| le-mnl | `2026-27/mnl-lendava-26-27` | `2025-26/mnl-lendava-25-26` |
| ng-primorska | `3199` | `2579` (25/26) — starejših **ne** uvažaj, glej spodaj |
| mb-1clanska | `1-clanska-liga-26-27` | `1-clanska-liga-25-26` |
| mb-2clanska | `2-clanska-liga-26-27` | `2-clanska-liga-25-26` |

Mladinske lige (U19) — `prvi_fantasy_krog = 2`, `rok_pomak_ur = 2`, ker so
tekme zjutraj. Izpuščeni Celje (4 klubi) in Lendava (5): pri 15 igralcih in
največ 3 iz kluba je pet klubov spodnja meja brez izbire.

| liga | tekoča 2026/27 | arhiv |
|---|---|---|
| sml1 / sml2-vzhod / sml2-zahod (nzs) | `1-sml-eon-nextgen` / `2-sml-vzhod` / `2-sml-zahod` | `<pot>:22` (25/26), `<pot>:23` (24/25) |
| mb-u19 | `u19-mladinska-liga-26-27` | `u19-mladinska-liga-25-26`, `…-24-25` |
| lj-mladinci / lj-mladinci-2 | `2005` / `2006` | `1906`,`1806` / `1907`,`1807` |
| pt-mladinci | `2026:53` | `2025:71`, `2024:71` (šifra Mladine se s sezono menja) |
| ms-mladinci | `2026:115` | `2025:115`, `2024:115` |


Nova Gorica menija za pretekle sezone nima — stara sezona je svoje tekmovanje
s svojo šifro in do nje ne vodi nobena povezava, zato jih je treba prečesati.
Neznana šifra vrne privzeto stran s **statusom 200**, ne 404, zato je iz
vzorca lahko napačno sklepati, da arhiva ni. Starejše sezone so v drugačni
obliki: `2163` (2023/24) da 0 golov in 193 od 220 postav ni po 11 igralcev.
Zato vsak arhiv preštej, preden ga uvoziš.

Isto zaporedje za mladince — `--tekmovanje mladinci`, arhiv je `--liga 1503`:

```bash
node scripts/uvoz-zapisnikov.mjs --tekmovanje mladinci --liga 1503
node scripts/uvoz-zapisnikov.mjs --tekmovanje mladinci
node scripts/uvoz-razporeda.mjs  --tekmovanje mladinci --pisi
node scripts/ugani-pozicije.mjs  --tekmovanje mladinci --pisi
node scripts/ovrednoti-igralce.mjs --tekmovanje mladinci --sezona 2025/26 --pisi
```

Brez `--liga` skripte vzamejo šifro tekoče sezone iz `competitions.mnzg_liga`
— ob novi sezoni je treba posodobiti njo, ne skript. `uvoz-razporeda` iz
razporeda razbere, kateri klubi letos igrajo, in igralce klubov zunaj lige
deaktivira (pri mladincih vsako leto odide cela generacija).

Ljubljanski ligi (vpisani sta **neaktivni**; vklopi ju šele, ko so cene prave):

```bash
node scripts/uvoz-zapisnikov.mjs  --tekmovanje lj-1-liga --liga 1904
node scripts/uvoz-razporeda.mjs   --tekmovanje lj-1-liga --pisi
node scripts/uvoz-zapisnikov.mjs  --tekmovanje lj-1-liga
node scripts/ugani-pozicije.mjs   --tekmovanje lj-1-liga --pisi
node scripts/ovrednoti-igralce.mjs --tekmovanje lj-1-liga --sezona 2025/26 --pisi
# isto za lj-2-liga, arhiv je --liga 1905
```

Preden ligo vklopiš, **preveri razpon cen** — mora biti primerljiv z
Gorenjsko (povprečje okoli 5, resničen vrh, ne vsi po 4.5):

```sql
select round(avg(value),2), min(value), max(value),
       count(*) filter (where value = 4.5) * 100.0 / count(*) as odst_privzetih
  from players p join competitions c on c.id = p.competition_id
 where c.slug = 'lj-1-liga' and p.active;

update competitions set active = true where slug in ('lj-1-liga','lj-2-liga');
```
