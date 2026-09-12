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
  kljucKluba: naredikljucKluba({ ...VZHOD }),
  kratkoIme,
  poenostavi,
}

export default vir
