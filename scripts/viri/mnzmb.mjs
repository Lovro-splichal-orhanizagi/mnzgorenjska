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

  // Razpored te zveze ni v obliki "Domači : Gostje"; splošni
  // razčlenjevalnik bi vrnil nič krogov in uvoz bi se ustavil.
  razcleniRazpored: razporedMaribor,
  // Maribor piše klub vsako sezono in v vsaki selekciji drugače: člani s
  // sponzorjem ("Miklavž AT 24"), mladinci z vrsto društva ("Nk Miklavž"),
  // lanski arhiv brez obojega ("Miklavž"). Desno je ime iz tekoče članske
  // sezone; Dobrovce in Korotan igrata 3. SNL in sta vpisana pri Ptuju.
  kljucKluba: naredikljucKluba({
    'nk pohorje': 'pohorje',
    'nk jurovski dol': 'jurovski dol',
    'malečnik': 'malečnik asfalterstvo brus',
    'nk malečnik': 'malečnik asfalterstvo brus',
    'miklavž': 'miklavž at 24',
    'nk miklavž': 'miklavž at 24',
    'mb tabor': 'novogradnje mb tabor',
    'nk mb tabor': 'novogradnje mb tabor',
    'roho': 'roho krovstvo tit',
    'nš roho': 'roho krovstvo tit',
    'dobrovce': 'premium dobrovce',
    'nk dobrovce': 'premium dobrovce',
    'nk korotan prevalje': 'korotan prevalje',
    'radlje u19': 'radlje',
    'nš nk radlje u19': 'radlje',
    'nk fram bitifit': 'fram bitifit',
    'kovinar maribor': 'nk kovinar maribor',
    'nk kovinar': 'nk kovinar maribor',
    'pobrežje': 'nk pobrežje',
    'nk pobrežje maribor': 'nk pobrežje',
  }),
  kratkoIme,
  poenostavi,

  // Seznam tekem da povezave, nato stran na tekmo.
  povezaveZapisnikov: (html) => (izlusciIdjeZapisnikov(html) ?? []).map(id => ({ id, krog: null })),
  zapisniki: (koda, prenesi) => izPovezav(vir, koda, prenesi),
}

export default vir
