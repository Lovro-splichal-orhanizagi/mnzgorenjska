import { poKrogih } from './zapisniki.mjs'
import { razclenjevalnikZa } from '../zapisnik-pomurje.mjs'
import { naredikljucKluba, kratkoIme, poenostavi } from '../klubi.mjs'

// tisk0 je položaj na strani, zato ga ne uporabljamo kot šifro tekme.
const OSNOVNI = 'https://www.mnzlendava.si'

const vir = {
  ime: 'mnzle',
  polnoIme: 'MNZ Lendava',
  drzava: 'SI',
  osnovniNaslov: 'https://www.mnzlendava.si',
  zapisnikiPoKrogih: true,
  ...razclenjevalnikZa('mnzle'),
  // `<sezona>/<slug>`; sezona je del poti, slug pa nosi letnico še enkrat.
  naslovKroga: (koda, krog) => {
    const [sezona, slug] = String(koda).split('/')
    return `${OSNOVNI}/sezona-${sezona}/${slug}/zapisniki?krog=${krog}`
  },
  naslovRazporeda: (koda) => {
    const [sezona, slug] = String(koda).split('/')
    return `${OSNOVNI}/sezona-${sezona}/${slug}/razpored`
  },
  zapisniki: (koda, prenesi) => poKrogih(vir, koda, prenesi),
  kljucKluba: naredikljucKluba({}),
  kratkoIme,
  poenostavi,
}

export default vir
