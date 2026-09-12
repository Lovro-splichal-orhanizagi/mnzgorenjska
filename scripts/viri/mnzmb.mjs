import { razporedMaribor } from '../razporedi.mjs'
import { izPovezav } from './zapisniki.mjs'
// Šifra lige vsebuje sezono; ob prehodu v novo leto jo poda tekmovanje.
// Nastope računa skupna logika, ker je pogodba parserja povsem enaka.
import { parsirajZapisnik, izlusciIdjeZapisnikov } from '../zapisnik-maribor.mjs'
import { nastopi, vBesedilo } from '../zapisnik.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

const OSNOVNI = 'https://mnzmaribor.si'
const naslovLige = (liga) => `${OSNOVNI}/tekmovanje/${encodeURIComponent(liga)}`

const vir = {
  ime: 'mnzmb',
  polnoIme: 'MNZ Maribor',
  drzava: 'SI',
  osnovniNaslov: OSNOVNI,

  naslovRazporeda: (liga) => `${naslovLige(liga)}/tekme`,
  naslovSeznamaTekem: (liga) => `${naslovLige(liga)}/tekme`,
  naslovLestvice: naslovLige,
  naslovZapisnika: (liga, zapisnikId) =>
    `${naslovLige(liga)}/zapisnik/?event=${encodeURIComponent(zapisnikId)}`,

  parsirajZapisnik,
  izlusciIdjeZapisnikov,
  nastopi,
  vBesedilo,

  // Vzorec ne dokazuje vzdevkov; preslikave druge zveze bi združile napačne klube.
  // Razpored te zveze ni v obliki "Domači : Gostje"; splošni
  // razčlenjevalnik bi vrnil nič krogov in uvoz bi se ustavil.
  razcleniRazpored: razporedMaribor,
  kljucKluba: naredikljucKluba(),
  kratkoIme,
  poenostavi,

  // Seznam tekem da povezave, nato stran na tekmo.
  povezaveZapisnikov: (html) => (izlusciIdjeZapisnikov(html) ?? []).map(id => ({ id, krog: null })),
  zapisniki: (koda, prenesi) => izPovezav(vir, koda, prenesi),
}

export default vir
