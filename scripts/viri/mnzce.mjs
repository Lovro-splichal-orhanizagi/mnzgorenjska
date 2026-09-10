// Vir: MNZ Celje (www.mnzcelje.com)
//
// Tretja zveza na istem CMS-u kot Kranj in Ljubljana, zato je datoteka tanka.
// Ena sama članska liga — "Medobčinska članska liga", deset klubov, 18 krogov.
//
// Šifra lige pripada SEZONI, ne ligi:
//   2026/2027  1902 · 2025/2026  1801 · 2024/2025  1701
//
// Posebnost, ki je stala popravka razčlenjevalnika: sezono piše z dvema
// števkama ("Medobčinska članska liga - Golgeter 26/27"). Star izraz je
// zahteval štiri in je segel mimo naslova nazaj v meni, kjer je našel
// 2007/08 — cel arhiv bi pristal dvajset let v preteklosti.
import { parsirajZapisnik, nastopi, vBesedilo } from '../zapisnik.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const OSNOVNI = 'https://www.mnzcelje.com'

// Zaenkrat prazen. Vzdevki se pokažejo šele, ko klub sredi sezone spremeni
// ime; ugibati jih vnaprej pomeni združiti dva različna kluba.
const ISTI_KLUB = {}

export default {
  ime: 'mnzce',
  polnoIme: 'MNZ Celje',
  drzava: 'SI',
  osnovniNaslov: OSNOVNI,

  naslovRazporeda: (liga) =>
    `${OSNOVNI}/index.cfm?akc=tekmovanja&liga=${liga}&prikazi=razpored`,

  naslovSeznamaTekem: (liga) => `${OSNOVNI}/index.cfm?akc=tekmovanja&liga=${liga}`,

  naslovZapisnika: (liga, zapisnikId) =>
    `${OSNOVNI}/index.cfm?akc=zapisnik&liga=${liga}&zapisnik=${zapisnikId}`,

  naslovDelegiranja: (liga, krog) =>
    `${OSNOVNI}/print.cfm?prikazi=delegiranje&liga=${liga}` +
    `&krog=${krog}&sodnik=1&delegat=1&klub=1&liga1=1`,

  naslovDokumenta: (pot) => `${OSNOVNI}/${encodeURI(pot)}`,

  // Celje prestopov ne objavlja na strani `akc=registracije`; uvoz naj to
  // pove naravnost, ker je "0 zapisnikov" videti kot okvara.
  imaRegistracije: false,
  naslovRegistracij: () => `${OSNOVNI}/index.cfm?akc=registracije`,

  parsirajZapisnik,
  nastopi,
  vBesedilo,

  kljucKluba: naredikljucKluba(ISTI_KLUB),
  kratkoIme,
  poenostavi,
}
