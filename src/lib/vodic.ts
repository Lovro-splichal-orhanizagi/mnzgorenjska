// Vodič za novince na Moji ekipi: trije koraki od praznega igrišča do
// shranjene ekipe (Sestavi mi ekipo → igrišče → Shrani).
//
// Zakaj: 14. 10. 2026 je bilo 55 % računov brez ekipe. Prazno Mojo ekipo je
// v tednu videlo 3618 sej, "Sestavi mi ekipo" jih je kliknilo 786 — ustavijo
// se pred prvim klikom, ne med sestavljanjem.
//
// driver.js (≈5 kB) se naloži šele, ko se vodič res začne, zato ga drugi ne
// prenesejo. Dela enako na spletu, telefonu in v aplikaciji (Capacitor nalaga
// isti dist/). Pokaže se enkrat na ligo; "Preskoči" ga ugasne za vedno.
// Shramba je le udobje — če ne dela (zasebno okno), se vodič pač pokaže znova.
import type { Driver } from 'driver.js'
import { t } from '../i18n'
import { zabeleziKorak } from './lijak'

const PRESKOCEN = 'slff-vodic-preskocen'
const kljucLige = (ligaId: number) => `slff-vodic-${ligaId}`

let vodic: Driver | null = null
/** Vodič je tekel v tej seji — prva shramba šteje kot "do konca". */
let zacet = false

function beri(kljuc: string) {
  try {
    return localStorage.getItem(kljuc)
  } catch {
    return null
  }
}

function pisi(kljuc: string) {
  try {
    localStorage.setItem(kljuc, '1')
  } catch {
    /* zasebno okno */
  }
}

/**
 * Ali naj se vodič v tej ligi začne (ni bil preskočen ne že prikazan).
 * `?vodic` v naslovu ga pokaže znova (pregled, podpora).
 */
export function vodicNaVrsti(ligaId: number) {
  if (new URLSearchParams(window.location.search).has('vodic')) return true
  return !beri(PRESKOCEN) && !beri(kljucLige(ligaId))
}

/** Prvi viden element s ciljem — Shrani je na telefonu v spodnjem pasu, na računalniku zgoraj. */
function viden(cilj: string): Element {
  const vsi = [...document.querySelectorAll<HTMLElement>(`[data-pomoc="${cilj}"]`)]
  return vsi.find((el) => el.getClientRects().length > 0) ?? vsi[0] ?? document.body
}

/** Odprto okno (izbira lige, podatki o igralcu …) — vodič počaka nanj. */
const odprtoOkno = () => document.querySelector('[aria-modal="true"]') != null

/**
 * Začne vodič, ko je stran pripravljena in ni odprtega okna (počaka največ
 * pol minute). Vrne funkcijo za preklic čakanja.
 */
export function zacniVodic(ligaId: number): () => void {
  let preklicano = false
  let poskusov = 0
  let casovnik = 0
  const poskusi = () => {
    if (preklicano || vodic) return
    if (odprtoOkno() || !document.querySelector('[data-pomoc="sestavi-mi"]')) {
      if (++poskusov < 30) casovnik = window.setTimeout(poskusi, 1000)
      return
    }
    void zazeni(ligaId, () => preklicano)
  }
  casovnik = window.setTimeout(poskusi, 800)
  return () => {
    preklicano = true
    window.clearTimeout(casovnik)
  }
}

async function zazeni(ligaId: number, preklicano: () => boolean) {
  const [{ driver }] = await Promise.all([import('driver.js'), import('driver.js/dist/driver.css')])
  if (preklicano() || vodic || odprtoOkno()) return
  pisi(kljucLige(ligaId))
  zacet = true
  zabeleziKorak('vodic_zacetek')
  vodic = driver({
    popoverClass: 'slff-vodic',
    showProgress: true,
    // driver.js sam zamenja {{current}} in {{total}}; naš t() jih ne sme pojesti.
    progressText: t('mojaEkipa.vodic.napredek', { trenutni: '{{current}}', skupaj: '{{total}}' }),
    nextBtnText: t('mojaEkipa.vodic.naprej'),
    doneBtnText: t('mojaEkipa.vodic.razumem'),
    stagePadding: 6,
    stageRadius: 12,
    smoothScroll: true,
    // Klik mimo ne zapre: na telefonu se zgodi po nesreči. Zapre križec.
    overlayClickBehavior: () => {},
    allowKeyboardControl: true,
    onCloseClick: () => {
      pisi(PRESKOCEN)
      zabeleziKorak('vodic_preskok')
      ustaviVodic()
    },
    onDestroyed: () => {
      vodic = null
    },
    steps: [
      {
        element: () => viden('sestavi-mi'),
        popover: {
          title: t('mojaEkipa.vodic.sestaviNaslov'),
          description: t('mojaEkipa.vodic.sestaviOpis'),
          side: 'bottom',
          align: 'center',
          // Naprej je klik na sam gumb (predlagaj → vodicPoPredlogu).
          showButtons: ['close'],
        },
      },
      {
        element: () => viden('igrisce'),
        popover: {
          title: t('mojaEkipa.vodic.igrisceNaslov'),
          description: t('mojaEkipa.vodic.igrisceOpis'),
          side: 'top',
          align: 'center',
          showButtons: ['next', 'close'],
        },
      },
      {
        element: () => viden('shrani'),
        popover: {
          title: t('mojaEkipa.vodic.shraniNaslov'),
          description: t('mojaEkipa.vodic.shraniOpis'),
          side: 'top',
          align: 'end',
          // Naprej je klik na Shrani (poskusiShraniti → vodicObShranjevanju).
          showButtons: ['close'],
        },
      },
    ],
  })
  vodic.drive(0)
}

/** Predlog je sestavljen: ko se igrišče izriše, pokaži ga. Vrne, ali vodič teče. */
export function vodicPoPredlogu(): boolean {
  if (!vodic || vodic.getActiveIndex() !== 0) return Boolean(vodic)
  window.setTimeout(() => vodic?.moveTo(1), 450)
  return true
}

/**
 * Uporabnik je pritisnil Shrani: vodič se umakne, da ne prekrije sporočila
 * ali seznama, kaj še manjka.
 */
export function vodicObShranjevanju() {
  ustaviVodic()
}

/** Prva ekipa je shranjena: če jo je pripeljal vodič, to šteje kot konec. */
export function vodicKonec() {
  if (!zacet) return
  zacet = false
  zabeleziKorak('vodic_konec')
}

export function ustaviVodic() {
  vodic?.destroy()
  vodic = null
}
