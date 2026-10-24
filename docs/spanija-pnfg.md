# Spain: regional federations on the shared "pnfg" platform

Research notes (2026-10-12) for starting a Spain importer. Nothing is imported yet.

## One platform, twelve federations

Most Spanish regional federations run the same federation software under `/pnfg/`.
URLs, page names (`NFG_*`) and `cod_primaria` codes are identical; only the domain changes.
All of them resolve to **one server, `195.53.102.51`**, which matters for throttling (below).

Competitions listed for season 2026-2027 (`NFG_CmpJornada`, all delegations, all types):

| federation | domain | competitions | seasons online |
|---|---|---|---|
| Andalucía | www.rfaf.es | 405 | 2013-14 → |
| Galicia | www.futgal.es | 88 | 2013-14 → |
| Aragón | www.futbolaragon.com | 64 | 2009-10 → |
| Murcia | www.ffrm.es | 63 | 2015-16 → |
| Castilla y León | www.rfcylf.es | 55 | 2012-13 → |
| Extremadura | www.fexfutbol.com | 45 | 2011-12 → |
| Castilla-La Mancha | www.ffcm.es | 44 | 2007-08 → |
| Asturias | www.asturfutbol.es | 43 | 2012-13 → |
| Cantabria | www.rfcf.es | 43 | 2013-14 → |
| Navarra | www.futnavarra.es | 40 | 2012-13 → |
| La Rioja | www.frfutbol.com | 35 | 2008-09 → |
| País Vasco | www.fvf-bff.eus | 33 | 2005-06 → |

About 958 competitions this season; each splits into groups (the real "leagues").
Partial group counts before throttling stopped them: Galicia 150 groups in the first 28
competitions (Preferente 2, Primera Futgal 6, Segunda 10, Tercera 15, …), Navarra ~40.

**Not on pnfg:** Madrid (rffm.es, own Next.js site), Catalonia (fcf.cat), Valencia (ffcv.es),
Baleares (ffib.es, 404). **Unknown:** Canarias, Ceuta, Melilla (guessed domains didn't answer).

## Session cookie

Without a session every page redirects to `/pnfg/NLogin` ("No se ha aceptado el cookie").
Use a cookie jar and follow redirects; the first hit sets `JSESSIONID`, the retry works:

```sh
curl -sL -c cj -b cj -A "Mozilla/5.0" "https://www.futgal.es/pnfg/NLogin?NSess=1" -o /dev/null
curl -sL -c cj -b cj -A "Mozilla/5.0" "https://www.futgal.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=1427993&cod_acta=1427993"
```

Pages are `ISO-8859-15` (decode as latin1).

## Navigation chain

All under `https://<domain>/pnfg/NPcd/`, `cod_primaria=1000120`:

| step | request | returns |
|---|---|---|
| seasons + competitions | `NFG_CmpJornada?cod_primaria=1000120` | HTML; `<select name=temporada>` (22 = 2026-2027, 21 = 2025-2026, …), `<select name=competicion>` for the current season |
| competitions of another season | `NFG_CmpJornada_Exec?cod_primaria=1000120&codtemporada=21&cod_agrupacion=&Sch_Codigo_Delegacion=&Sch_Tipo_Juego=` | JS filling the competition select (not yet tested) |
| groups | `NFG_CmpJornada_Exec?cod_primaria=1000120&codcompeticion=<id>` | `<script>var grupos=new Array("0","-- Seleccione --","<id>","GRUPO 1",…)` — pairs of id, name |
| rounds | `NFG_CmpJornada_Exec?cod_primaria=1000120&codgrupo=<id>` | JS filling the round select (not yet tested) |
| round results | `NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=…&CodGrupo=…&CodTemporada=…&CodJornada=…` | HTML match list with `CodActa` links (not yet tested) |
| match report | `NFG_CmpPartido?cod_primaria=1000120&CodActa=<id>&cod_acta=<id>` | HTML, see below (tested) |
| player | `NFG_EstadisticasJugador?cod_primaria=5000274&jugador=<id>&codacta=<id>` | player stats (not yet tested) |

Galicia filters also exist: `Sch_Codigo_Delegacion` (1 A Coruña, 2 Ferrol, 3 Santiago,
4 Ourense, 5 Vigo, 6 Pontevedra, 7 Lugo, 100 federation), `Sch_Tipo_Juego`
(1 F-11, 2 F-7, 3 futsal, 4 F-8, 5 beach, 6 veterans), `Sch_Cod_Agrupacion`.
Other pages seen: `NFG_Clubes`, `NFG_LstPartidos`, `NFG_LstCampos`, `NFG_ConsultaSanciones`.

## Match report (`NFG_CmpPartido`) contents

Checked on futgal acta 1427993 (C.D. Lalín 1–3 Silva S.D., Tercera Federación G1, J6,
11-10-2026) and futnavarra acta 25452442 (C.A. Artajones – C.D. Erriberri, Primera Autonómica):

- season, matchday, date + time, competition (group), stadium + city
- referee + 2 assistants
- both line-ups: starters and bench with shirt numbers
- coaching staff and delegates
- substitutions with minute (in / out)
- goals with minute and scorer; type by icon title (`Gol normal`, penalty, own goal)
- cards with minute; colour by image (`tarj_roja.gif`, yellow analogous)
- every player links to `NFG_EstadisticasJugador?…&jugador=<id>`: **stable player id**
- crests: `/pnfg/pimg/Clubes/<…>_ESCUDO_<club>.jpg`

### Obfuscated score digits

The final score and the running score next to each goal are **not plain text**. Each digit is

```html
<i id=idh299157 class=fa-1><script>ntype("idh299157",4,0,"fa-1");</script><span style="display:none;">1</span></i>
```

A packed `eval(function(p,a,c,k,e,d)…)` defines `ntype`, which swaps the `fa-N` class via a
lookup table. Both the initial `fa-N` class and the hidden `<span>` are decoys. Run the page's
own packed script against a stub DOM to get the real digit:

```js
const vm = require('vm');
const packed = html.match(/<script>(eval\(function\(p,a,c,k,e,d\)[\s\S]*?)<\/script>/)[1];
const els = {};
const ctx = { document: { getElementById: id => els[id] } };
ctx.top = ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(packed, ctx);
for (const [, id, a, b, cls] of html.matchAll(/ntype\("([^"]+)",(\d+),(\d+),"([^"]+)"\)/g)) {
  const c = new Set([cls]);
  els[id] = { classList: { add: x => c.add(x), remove: x => c.delete(x) } };
  vm.runInContext(`ntype(${JSON.stringify(id)},${a},${b},${JSON.stringify(cls)})`, ctx);
  console.log(id, [...c].join(' ').replace('fa-', '')); // real digit
}
```

Verified: Lalín–Silva decodes to 1–3 with running scores 1-0, 1-1, 1-2, 1-3, matching the scorers.

## Throttling (the real constraint)

- Roughly 30 requests in quick succession → every response is **200 with an empty body**
  (or 302) for more than 10 minutes.
- The block is per client IP across **all** federations (same server), so parallel
  per-federation workers don't help.
- An importer needs: ~1 request every few seconds, treat an empty body as "throttled" (back
  off, never as "no data"), cache every raw page, resume from where it stopped.
- Weekly updates of the current season are fine; full history (up to 20 seasons × 12
  federations) is days of crawling.

## Not checked yet

- **Rights**: robots.txt, aviso legal / terms of the 12 sites, and whether to ask the
  federations (or the platform vendor) first. Do this before any import, as for the other
  sources in `CLAUDE.md`.
- **User-Agent**: these tests used a browser User-Agent. The importer must read openly with
  `User-Agent: SLFF fantasy (https://slff.eu)` like every other source; re-test the throttle
  with it.
- The throttle looks deliberate. Respect it (slow down, back off); if a challenge or CAPTCHA
  appears, stop, as everywhere else. Decoding `ntype` only reads what the page shows any
  visitor; it is not a challenge bypass.

## Relation to `fcf`

`CLAUDE.md` → *Španija — vir `fcf`* covers Catalonia (fcf.cat, different system). Country
`ES`, Spanish UI and `es-` slugs already exist; a pnfg source would be a second Spanish
source (e.g. `scripts/viri/pnfg.mjs`, league code `<domain>/<competition>/<group>`).

## Next steps

1. Check rights (above).
2. Test the untested steps: other-season competitions, rounds, round results, player stats.
3. Pick the first federation (Galicia or Navarra) and import one group end to end.
4. Then reuse the same importer for the other 11 domains.
