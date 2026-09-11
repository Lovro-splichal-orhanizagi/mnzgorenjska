import { poKrogih } from './zapisniki.mjs'
import { razclenjevalnikZa } from '../zapisnik-pomurje.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

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
  kljucKluba: naredikljucKluba({}),
  kratkoIme,
  poenostavi,
}

export default vir
