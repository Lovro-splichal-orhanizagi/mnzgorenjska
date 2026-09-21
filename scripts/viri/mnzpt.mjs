import { razporedPtuj } from '../razporedi.mjs'
import { poKrogih } from './zapisniki.mjs'
import { razclenjevalnikZa } from '../zapisnik-pomurje.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'
import { VZHOD } from './vzdevki-3snl.mjs'

// Zapisniki so po krogih; povezav za posamezno tekmo v shranjenem viru ni.
const OSNOVNI = 'https://www.mnzveza-ptuj.si'

const vir = {
  ime: 'mnzpt',
  polnoIme: 'MNZ Ptuj',
  drzava: 'SI',
  osnovniNaslov: 'https://www.mnzveza-ptuj.si',
  zapisnikiPoKrogih: true,
  ...razclenjevalnikZa('mnzpt'),
  // `<sezona>:<liga>` — obe se med sezonami spremenita (2026:3, arhiv 2025:65).
  naslovKroga: (koda, krog) => {
    const [sezona, liga] = String(koda).split(':')
    return `${OSNOVNI}/tekmovanja?sezona=${sezona}&liga=${liga}&kolo=${krog}&podatek=zapisniki`
  },
  naslovRazporeda: (koda) => {
    const [sezona, liga] = String(koda).split(':')
    return `${OSNOVNI}/tekmovanja?sezona=${sezona}&liga=${liga}&podatek=program`
  },
  zapisniki: (koda, prenesi) => poKrogih(vir, koda, prenesi),
  // 3. SNL gre skozi dva vira (tekoca sezona in arhiv pri razlicnih
  // zvezah), zato morata oba priti do istega kljuca kluba.
  // Razpored te zveze ni v obliki "Domači : Gostje"; splošni
  // razčlenjevalnik bi vrnil nič krogov in uvoz bi se ustavil.
  razcleniRazpored: razporedPtuj,
  // Mladina piše klub s svojim sponzorjem ("Hajdina Golgeter", "Korant
  // Bukovci"); desno je ime iz članske lige. Hajdina in Videm igrata 3. SNL.
  kljucKluba: naredikljucKluba({
    ...VZHOD,
    'hajdina': 'hajdina hiša daril',
    'hajdina golgeter': 'hajdina hiša daril',
    'klopotec videm': 'videm',
    'grajena': 'grajena anpro',
    'podvinci betonarna kuhar': 'iblo podvinci',
    'podvinci elektrohanza': 'iblo podvinci',
    'korant bukovci': 'bukovci',
    'korant markovci': 'markovci',
    'šd markovci': 'markovci',
    'intera drava aluminij': 'drava intera',
    'šola nogometa gorišnica': 'šd gorišnica',
    'ormož jeruzalem slovenija': 'jeruzalem slovenija ormož',
  }),
  kratkoIme,
  poenostavi,
}

export default vir
