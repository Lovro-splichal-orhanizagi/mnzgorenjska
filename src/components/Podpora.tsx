import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { jezik } from '../i18n/jedro.ts'
import { t } from '../i18n'
import { prijaviOrodja, type StanjeStrani } from '../lib/podporaOrodja'

/**
 * Klepet za podporo (HelpStack).
 *
 * Skripta se nalozi sele ob prvem kliku na nas gumb (ali "Pomoč" v meniju):
 * widget s seboj pripelje 70 kB kode in dve sliki po 1,1 MB, potrebuje pa ga
 * eden od stotih obiskovalcev. Do klika je v kotu le nas gumb, ki ga ob
 * pojavu mehurčka widgeta skrije CSS (index.css, `[data-podpora]`).
 *
 * Widget ID ni skrivnost — stoji v naslovu skripte na vsaki strani, ki jo
 * vkljuci — zato je tu in ne v okoljski spremenljivki.
 *
 * Prijavljenega predstavimo s PRIKAZNIM IMENOM, ne z e-posto: v pogovoru je
 * treba vedeti, kdo pise, e-posta pa je vec, kot je za to potrebno. Kdor hoce
 * odgovor po posti, jo napise sam.
 *
 * Agent ima orodja v brskalniku (`lib/podporaOrodja.ts`): pogleda, kje je
 * obiskovalec, ga pelje na stran in mu na njej pokaže, kam klikniti.
 */
// Vsak jezik ima svoj kanal v HelpStacku s svojo bazo znanja (pravila te
// države: vir, zveze, pozicije iz zapisnika ali glasovanje). Kanali so enakega
// videza (barva, ikona, avatar), pozdrav in baza znanja sta v jeziku kanala.
// Angleščina nima svojega: dobi slovenskega, ki odgovarja v jeziku vprašanja.
// Kanale in baze znanja ureja MCP HelpStacka (od 13. 10. 2026 tudi
// `create_channel`); zapis id-jev je zunaj gita v outreach/helpstack-jeziki.
const KANALI: Record<string, string> = {
  sl: 'cmucx868b000cv2atsowgly81',
  sk: 'cmupjxbms00s0sz2cty78ex1j',
  hr: 'cmuymww46001dtk2c4j207tbd',
  cs: 'cmv6jvz6d000ftk2cuuj1vpds',
  hu: 'cmv6jw1xq000wtk2cth1k86h6',
  de: 'cmv6jw4ot001dtk2c9r3mkl2z',
  sr: 'cmv6jw7dx001utk2c2tn4oke3',
  ro: 'cmv6jwa6i002btk2c8opj9c6y',
  et: 'cmv6jwcwo002stk2cpf03ie4z',
  pl: 'cmv6jwfot0039tk2c0qbovydr',
  es: 'cmv6jwic8003qtk2c3vffzwz9',
  lv: 'cmv6jwl0l0047tk2c4uu40ayk',
  mk: 'cmv6jyq2o004otk2caifawqla',
}
const skripta = (id: string) => `https://helpstack.eu/widget.js?id=${id}`

/**
 * Kanal jezika, a le če je v HelpStacku nastavljen. Kanal brez shranjenega
 * videza (8. 10. 2026 hrvaški) vrne "Widget not configured" in widget ne
 * pokaže NIČESAR — hrvaški obiskovalci so ostali brez klepeta. Takrat raje
 * slovenski kanal (odgovarja v jeziku vprašanja) kot nič.
 */
async function izberiKanal(): Promise<string> {
  const id = KANALI[jezik()] ?? KANALI.sl
  if (id === KANALI.sl) return id
  try {
    const o = await fetch(`https://helpstack.eu/api/widget/${id}/config`)
    const j = await o.json()
    return j?.success ? id : KANALI.sl
  } catch {
    return id
  }
}

interface Klepet {
  identify?: (identiteta: unknown, podatki?: unknown) => void
  open?: () => void
}

let nalozen = false
function naloziKlepet() {
  if (nalozen) return
  nalozen = true
  izberiKanal().then((id) => {
    const s = document.createElement('script')
    s.src = skripta(id)
    s.async = true
    // Brez omrežja naj naslednji klik poskusi znova.
    s.onerror = () => {
      nalozen = false
      s.remove()
    }
    document.body.appendChild(s)
  })
}

// Ime prijavljenega, ki ga widget dobi, ko se naloži (glej Podpora spodaj).
let imeObiskovalca: string | undefined

/**
 * Odpre klepet (nas gumb, "Pomoč" v meniju). Skripto naloži ob prvem klicu,
 * počaka, da widget postavi okno, in ga odpre, največ 15 s.
 */
export function odpriPodporo(): Promise<void> {
  naloziKlepet()
  const zacetek = Date.now()
  return new Promise((koncano) => {
    const poskusi = () => {
      const klepet = (window as Window & { ChatWidget?: Klepet }).ChatWidget
      if (klepet?.open && document.getElementById('chat-widget-container')) {
        if (imeObiskovalca) klepet.identify?.({ name: imeObiskovalca })
        klepet.open()
        koncano()
      } else if (Date.now() - zacetek < 15000) window.setTimeout(poskusi, 300)
      else koncano()
    }
    poskusi()
  })
}

type UkazHelpStack = ((ukaz: 'registerTool', ime: string, fn: (p: Record<string, unknown>) => Promise<unknown>) => void) & {
  q?: unknown[]
}

export default function Podpora() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { id: ligaId, tekmovanje } = useTekmovanje()

  // Orodja berejo stanje ob klicu, zato ga držimo v ref — prijavimo jih enkrat.
  const stanje = useRef<StanjeStrani>({ pot: pathname, liga: null, prijavljen: false })
  stanje.current = {
    pot: pathname,
    liga: ligaId && tekmovanje ? { id: ligaId, slug: tekmovanje.slug, ime: tekmovanje.name } : null,
    prijavljen: Boolean(session),
  }
  const pojdi = useRef(navigate)
  pojdi.current = navigate

  useEffect(() => {
    // Ukaze pred naložitvijo skripte widget pobere iz vrste (HelpStack.q).
    const w = window as Window & { HelpStack?: UkazHelpStack }
    if (!w.HelpStack) {
      const vrsta: UkazHelpStack = (...args: unknown[]) => {
        ;(vrsta.q = vrsta.q ?? []).push(args)
      }
      w.HelpStack = vrsta
    }
    prijaviOrodja(w.HelpStack, () => stanje.current, (pot) => pojdi.current(pot))
  }, [])

  // Ime povemo, ko je znano — tudi ce se je uporabnik prijavil sele pozneje.
  const ime =
    (session?.user?.user_metadata?.display_name as string | undefined) ??
    (session?.user?.user_metadata?.name as string | undefined)
  useEffect(() => {
    imeObiskovalca = ime
    if (ime) (window as Window & { ChatWidget?: Klepet }).ChatWidget?.identify?.({ name: ime })
  }, [ime])

  const [nalaga, setNalaga] = useState(false)
  return (
    <button
      type="button"
      data-podpora
      aria-label={t('aplikacija.meni.pomoc')}
      title={t('aplikacija.meni.pomoc')}
      disabled={nalaga}
      onClick={() => {
        setNalaga(true)
        void odpriPodporo().then(() => setNalaga(false))
      }}
      className="fixed bottom-5 right-5 z-40 grid h-[60px] w-[60px] place-items-center rounded-full bg-[#2F6B4F] text-white shadow-lg transition hover:brightness-110 disabled:opacity-70"
    >
      <svg viewBox="0 0 24 24" className={`h-7 w-7 ${nalaga ? 'animiraj-utrip' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      </svg>
    </button>
  )
}
