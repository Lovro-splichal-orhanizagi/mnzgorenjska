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
