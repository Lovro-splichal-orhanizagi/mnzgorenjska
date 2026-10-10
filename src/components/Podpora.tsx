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
// Vsak jezik ima svoj kanal v HelpStacku: slovaški ima slovaško bazo znanja
// (pravila brez glasovanja o pozicijah — te pridejo iz zapisnika), hrvaški
// hrvaško (vratar iz zapisnika, ostale pozicije glasovanje kot v Sloveniji).
// Kdor gleda ligo države, dobi njen kanal; ostali (sl, en) slovenskega, ki
// odgovarja v jeziku vprašanja.
const KANALI: Record<string, string> = {
  sl: 'cmucx868b000cv2atsowgly81',
  sk: 'cmupjxbms00s0sz2cty78ex1j',
  hr: 'cmuymww46001dtk2c4j207tbd',
  // Češkega kanala v HelpStacku še ni: češki obiskovalci dobijo slovenskega,
  // ki odgovarja v jeziku vprašanja. Ko kanal (s češko bazo znanja) nastane,
  // se tu njegov id zamenja.
  cs: 'cmucx868b000cv2atsowgly81',
  // Madžarskega kanala tudi še ni: madžarski obiskovalci dobijo slovenskega.
  // Ko kanal (z madžarsko bazo znanja) nastane, gre tu njegov id.
  hu: 'cmucx868b000cv2atsowgly81',
  // Nemškega (avstrijskega) kanala tudi še ni: dobijo slovenskega.
  de: 'cmucx868b000cv2atsowgly81',
  // Srbskega kanala še ni: srbski obiskovalci dobijo hrvaškega (jezik je
  // blizu, baza znanja in odgovori v hrvaščini jim ustrezajo bolje od
  // slovenskih). Ko kanal (s srbsko bazo znanja) nastane, gre tu njegov id.
  sr: 'cmuymww46001dtk2c4j207tbd',
  // Romunskega kanala še ni: romunski obiskovalci dobijo slovenskega, ki
  // odgovarja v jeziku vprašanja. Ko kanal (z romunsko bazo znanja) nastane,
  // gre tu njegov id.
  ro: 'cmucx868b000cv2atsowgly81',
  // Estonskega kanala še ni: estonski obiskovalci dobijo slovenskega, ki
  // odgovarja v jeziku vprašanja. Ko kanal (z estonsko bazo znanja) nastane,
  // gre tu njegov id.
  et: 'cmucx868b000cv2atsowgly81',
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
