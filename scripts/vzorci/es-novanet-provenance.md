# Novanet captured-fixture provenance

Captured before implementation in the supplied research scratchpad. Full pages are retained, including irrelevant navigation, score decoys, scripts and CSS. No source scripts are executed. Fixture files are normalized to UTF-8; original metadata charset declarations are preserved as capture evidence. `es/a5.html` and `es/g3.html` were already UTF-8 browser saves despite their ISO metadata; all other supplied raw files decode as ISO-8859-15.

Original capture root: `/private/tmp/claude-501/-Users-jernejjankocica-Projects-SLFF/12a5e10f-024e-4f61-ba92-e46660e3eedf/scratchpad`.

| Fixture | Original capture | Raw SHA-256 |
|---|---|---|
| `es-novanet-aragon-940027-full.html` | `arag/m1.html` | `0176d300acca8835aed5c186abeb62d47997af34a45c80dbcb7d3222eda405ad` |
| `es-novanet-aragon-953743.html` | `arag/m2.html` | `2cdbbd7ab04d9d81052b005e6b71894e3fd3d01f4a20451d7b2cef5aba4c5c23` |
| `es-novanet-galicia-1446110-full.html` | `fg1.html` | `cbba76baddfb082ce9627d0839d418b363f26865974a43a97314af6d346052c2` |
| `es-novanet-galicia-1448233.html` | `fg2.html` | `fe1d395cb45547ede86c0da703b4de962107a2bbd89ca3bb666ba6b21f66afa9` |
| `es-novanet-aragon-round4.html` | `arag/g.html` | `9a4b77832e45b92beb6a98108614a5d39d86bf4ec82ebe5749b508a23f5c3895` |
| `es-novanet-aragon-round5.html` | `es/a5.html` | `f149fe3ad7450d3c54677ba132d28d0e041f1042484794a77fd1d783a5cac4c8` |
| `es-novanet-galicia-round1.html` | `jor3.html` | `b0fb8fbccfb85bb601ff8be8222f366c73a093381bf8b54fe246e17e2d0dee53` |
| `es-novanet-galicia-round3.html` | `es/g3.html` | `bf1ec1b960110548f6ca22929ff2e6946cb9a83fdb5134889ed9d536e92d34cf` |

Independently inspected expected matches (header result and every goal progression decoded from document-local mappings, not hidden digits or research claims):

| Report | Teams | Date/time | Round | Result |
|---|---|---|---|---|
| Aragón 940027 | CUARTE-C.D. / EL GANCHO C.F. | 2026-10-04 19:30 | 5 | 4:0 |
| Aragón 953743 | SAN MATEO-C.D. / RACING HISPANIDAD | 2026-10-03 17:30 | 4 | 5:1 |
| Galicia 1446110 | C.D. ALLARIZ / C.D. SEIXALBO | 2026-09-19 17:00 | 3 | 2:0 |
| Galicia 1448233 | A.D. RIO OURO / C.D. SAN CIPRIAN | 2026-09-26 17:30 | 1 | 3:2 |

940027 includes an own goal by PEREZ CAMACHO MIGUEL, penalty by ALGABA LOPEZ ALEJANDRO, an exact-name staff caution (Auxiliar MAQUEDA HERRERO ALEJANDRO), and two cautions for substitute MUÑOZ ZEUFACK YANNICK. The parser excludes the explicitly identified staff caution and represents the second player caution as a dismissal. Shirts and ordering do not identify goalkeepers; those positions remain unknown.

Tests compare all four original report/round pairs unchanged on teams/date/round/kickoff/result. Three pairs also agree on season. The Aragón940027 pair is contradictory: round code21 is explicitly labelled2025-2026 in its own season selector, but report940027 says2026-2027. Adapter report import rejects that pair; schedule import also rejects the2026dates outside the selected2025-2026 July1..June30 season window. Pure report/round inspection remains useful. The full source orchestration test deliberately reduces the real Galicia round-one page to one original match table and one round option, preserving and relocating the original shared decoder function. That transformation tests traversal/consumer integration, not full-season network coverage.

Active source configuration bindings observed in original round pages:

- `aragon:22:23183364:23183365` — round 4, 3ª REGIONAL 1.
- `aragon:21:23183349:23183350` — round 5, 1ª REGIONAL (1). Same-page season dropdown labels21 as2025-2026, contradicting report940027 season2026-2027; rejected for import.
- `galicia:22:26991090:27507293` — round 3, pairs with report 1446110.
- `galicia:22:26990830:27759837` — round 1, pairs with report 1448233.

These captures do not verify any current/archive league pair. They do not authorize league activation.

Adapter consumer output adds federation suffixes `(Aragón)` / `(Galicia)` to persisted club names only after raw report/round checks. Pure fixture parsers retain the original names. This prevents cross-federation and ordinary unqualified-FCF exact-name fallback merges. Within-federation homonymous distinct clubs are not resolved by the current name-keyed schema; no validated cross-template club-ID mapping was established.

Production public captures collected 2026-10-16 by the parent research session:
`es-novanet-galicia-1448235.html`, `es-novanet-galicia-1448237.html`,
`es-novanet-galicia-1448238.html`, copied unchanged from
`/private/tmp/slff-production-research/galicia-{id}.html`.
Official URLs: `https://www.futgal.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa={id}&cod_acta={id}`.
1448235 demonstrates report `S.D. POL B` versus schedule `S.D. POL "B"`.
1448237/38 demonstrate an explicitly empty final card table without a Tarjetas heading.

`es-novanet-galicia-live-round1-20261016.html` is the unchanged live CI public HTTP
capture at 2026-10-16T17:08:29.416Z, after anonymous server-issued session bootstrap.
URL: `https://www.futgal.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=22&CodCompeticion=26990830&CodGrupo=27759837&CodJornada=1`.
SHA256: `b8a3d6c0e4631fe78b56c8db3f9171421fc09bd7930b0494727b51197d1599f9`.
The call `ntype("idh444742",2,0,"fa-12")` removes a multi-digit decoy class;
the separately validated fixed table contains 9 at index 2. Expected five scores
also agree with the independently captured reports 1448236/33/35/37/34.

Archive CI captures copied unchanged from `live-galicia-archive-v2`, 2026-10-16:
- `es-novanet-galicia-1306462.html`, SHA256 `2110e21843f82566dc0f43f7289c486e3018128ea8c44c426595b42122b9f0d2`:
  official card timestamps 999, including a second recorded yellow after90+4.
  No event timing or dismissal semantics are inferred; whole match is withheld.
- `es-novanet-galicia-1306457.html`, SHA256 `9ae3a9f3abe28f5e67d1a9790f2e6655bc0dfb080fc2ee3a57b6f76223697964`:
  guest substitutions heading/table absent, with no explicit empty-change table;
  whole match remains incomplete.
URLs follow `https://www.futgal.es/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa={id}&cod_acta={id}`.
The source continuation test separately injects the exact observed999 card spelling
into a current fixture; this synthetic mutation tests withholding rather than
claiming that current match had such a card.

`es-novanet-galicia-live-round3-20261016.html` is unchanged CI capture at
2026-10-16T17:25:53.913Z, SHA256 `8ee2a31670ca85acdafd49dd110b953307d8a2e410359f0d294a810067ff1a51`.
Official round URL is the current round1 URL above with `CodJornada=3`.
Five future matches show an explicitly empty `<h4><strong> </strong></h4>`
and `NFG_CmpPrevio` link; dates are 17 October (1448244) and18 October (others).
These are unplayed, with null scores, not0–0 or missing tables.

`es-novanet-galicia-1306469.html` is unchanged CI archive capture, SHA256
`ce5d1955409462579692c65df922fbed02b661ee559601cac70d28f2e0b2f5ae`.
Official match URL follows the report URL pattern above with ID1306469.
A goal at96 and substitution at95 have no explicit base/stoppage split.
Generic parsing rejects them. In explicitly verified regular90-minute league
context only, their clock keys normalize to90+6/90+5, source labels remain
preserved, and fantasy minutes remain capped at90. Unknown league contexts,
extra-time and shootout markers remain unsupported.
