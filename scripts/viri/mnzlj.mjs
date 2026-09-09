// Vir: MNZ Ljubljana (www.mnzljubljana-zveza.si)
//
// Isti CMS kot MNZ Gorenjska — `index.cfm?akc=tekmovanja|zapisnik`,
// `print.cfm?prikazi=delegiranje` — zato je datoteka tanka. Naslova spletišča
// ni mogoče uganiti; najden je prek seznama zvez na nzs.si.
//
// Šifra lige je last SEZONE, ne lige: izbirnik sezone je POST obrazec
// (`sezona=2025/2026` na `index.cfm?akc=tekmovanja`), po katerem se šifre
// zamenjajo. Ob novi sezoni se popravi `competitions.mnzg_liga`, ne ta
// datoteka.
//
//   2026/2027   2003 Regionalna Ljubljanska liga · 2004 MNZ liga
//   2025/2026   1904 Regionalna Ljubljanska liga · 1905 MNZ liga
//
// Zapisnik ima stolpec `Leto rojstva`, ki ga Kranj nima; zato `zapisnik.mjs`
// od 5137533 stolpce naslavlja po glavi tabele in ne po zaporedju. Isti
// razčlenjevalnik torej velja za oba vira.
import { parsirajZapisnik, nastopi, vBesedilo } from '../zapisnik.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const OSNOVNI = 'https://www.mnzljubljana-zveza.si'

// Zaenkrat prazen. Vzdevki se pokažejo šele, ko sponzor spremeni ime kluba
// sredi sezone; ugibati jih vnaprej bi pomenilo združiti dva različna kluba.
const ISTI_KLUB = {}

export default {
  ime: 'mnzlj',
  polnoIme: 'MNZ Ljubljana',
  drzava: 'SI',
  osnovniNaslov: OSNOVNI,

  // --- naslovi -------------------------------------------------------------
  naslovRazporeda: (liga) =>
    `${OSNOVNI}/index.cfm?akc=tekmovanja&liga=${liga}&prikazi=razpored`,

  naslovSeznamaTekem: (liga) =>
    `${OSNOVNI}/index.cfm?akc=tekmovanja&liga=${liga}`,

  naslovZapisnika: (liga, zapisnikId) =>
    `${OSNOVNI}/index.cfm?akc=zapisnik&liga=${liga}&zapisnik=${zapisnikId}`,

  naslovDelegiranja: (liga, krog) =>
    `${OSNOVNI}/print.cfm?prikazi=delegiranje&liga=${liga}` +
    `&krog=${krog}&sodnik=1&delegat=1&klub=1&liga1=1`,

  naslovDokumenta: (pot) => `${OSNOVNI}/${encodeURI(pot)}`,

  // MNZ Ljubljana zapisnikov o prestopih ne objavlja — stran `akc=registracije`
  // je pri njih splošna. Uvoz naj to pove naravnost; "0 zapisnikov" je videti
  // kot okvara, čeprav je pravilen odgovor.
  imaRegistracije: false,
  naslovRegistracij: () => `${OSNOVNI}/index.cfm?akc=registracije`,

  // --- razčlenjevanje ------------------------------------------------------
  parsirajZapisnik,
  nastopi,
  vBesedilo,

  // --- klubi ---------------------------------------------------------------
  kljucKluba: naredikljucKluba(ISTI_KLUB),
  kratkoIme,
  poenostavi,
}
