import { izPovezav } from './zapisniki.mjs'
// Primorska članska liga (3199) združuje MNZ Nova Gorica in MNZ Koper;
// en vir ohrani skupno tekmovanje tudi pri uvozu klubov obeh zvez.
import { parsirajZapisnik, nastopi, vBesedilo, izlusciPovezaveZapisnikov } from '../zapisnik-gorica.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'
import { ZAHOD } from './vzdevki-3snl.mjs'

const OSNOVNI = 'https://mnzgorica.si'
const rezultati = (liga) => `${OSNOVNI}/tekmovanja/${liga}/rezultati`

const vir = {
  ime: 'mnzng',
  polnoIme: 'MNZ Nova Gorica',
  drzava: 'SI',
  osnovniNaslov: OSNOVNI,
  naslovRazporeda: rezultati,
  naslovSeznamaTekem: rezultati,
  naslovLestvice: (liga) => `${OSNOVNI}/tekmovanja/${liga}/lestvica`,

  // Prva argumenta ostajata enaka drugim virom. Krog mora uvoznik vzeti
  // iz izlusciPovezaveZapisnikov: iz samega ID tekme ga ni mogoče sklepati.
  naslovZapisnika: (liga, zapisnikId, krog) => {
    if (!Number.isInteger(Number(krog)) || Number(krog) < 1)
      throw new Error('MNZ Nova Gorica: naslov zapisnika potrebuje krog iz povezave na rezultate.')
    return `${OSNOVNI}/tekmovanja/${liga}/zapisnik/${Number(krog)}/${zapisnikId}`
  },

  // Obstoječi uvoz registracij bere drugi CMS; tega vira z njim ne podpiramo.
  imaRegistracije: false,
  parsirajZapisnik,
  izlusciPovezaveZapisnikov,
  nastopi,
  vBesedilo,
  // 3. SNL gre skozi dva vira (tekoca sezona in arhiv pri razlicnih
  // zvezah), zato morata oba priti do istega kljuca kluba.
  kljucKluba: naredikljucKluba({ ...ZAHOD }),
  kratkoIme,
  poenostavi,

  // Seznam tekem da povezave, nato stran na tekmo.
  povezaveZapisnikov: (html) => (izlusciPovezaveZapisnikov(html) ?? []).map(p => ({ id: p.matchId ?? p.id, krog: p.krog })),
  zapisniki: (koda, prenesi) => izPovezav(vir, koda, prenesi),
}

export default vir
