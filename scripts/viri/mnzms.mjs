import { razporedMurskaSobota } from '../razporedi.mjs'
import { poKrogih } from './zapisniki.mjs'
import { razclenjevalnikZa } from '../zapisnik-pomurje.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

// Kartice vsebujejo obe ekipi zaporedoma in javno šifro vsake tekme.
const OSNOVNI = 'https://www.mnzveza-ms.si'

const vir = {
  ime: 'mnzms',
  polnoIme: 'MNZ Murska Sobota',
  drzava: 'SI',
  osnovniNaslov: 'https://www.mnzveza-ms.si',
  zapisnikiPoKrogih: true,
  ...razclenjevalnikZa('mnzms'),
  // Vidni zavihek "Zapisniki" na `/arhiv` je vedno prazen — zapisniki so na
  // svojem naslovu `/zapisnik`. Kdor pogleda le `/arhiv`, sklepa, da jih ni.
  naslovKroga: (koda, krog) => {
    const [sezona, liga] = String(koda).split(':')
    return `${OSNOVNI}/zapisnik?sezona=${sezona}&liga=${liga}&kolo=${krog}`
  },
  // Brez `podatek=program` vrne `/arhiv` stran BREZ razporeda — s statusom
  // 200 in podobne velikosti, zato je videti pravilna. Krogov na njej ni.
  naslovRazporeda: (koda) => {
    const [sezona, liga] = String(koda).split(':')
    return `${OSNOVNI}/arhiv?sezona=${sezona}&liga=${liga}&podatek=program`
  },
  zapisniki: (koda, prenesi) => poKrogih(vir, koda, prenesi),
  // Razpored te zveze ni v obliki "Domači : Gostje"; splošni
  // razčlenjevalnik bi vrnil nič krogov in uvoz bi se ustavil.
  razcleniRazpored: razporedMurskaSobota,
  kljucKluba: naredikljucKluba({}),
  kratkoIme,
  poenostavi,
}

export default vir
