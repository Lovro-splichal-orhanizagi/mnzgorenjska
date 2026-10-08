import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { jezik } from '../i18n/jedro.ts'
import { prijaviOrodja, type StanjeStrani } from '../lib/podporaOrodja'

/**
 * Klepet za podporo (HelpStack).
 *
 * Skripta se nalozi sele po prvem izrisu in z `requestIdleCallback`, ker
 * podpora ni razlog, da bi lestvica cakala nanjo: gre za 65 kB tuje kode,
 * ki jo potrebuje eden od stotih obiskovalcev.
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

/**
 * Odpre klepet ("Pomoč" v meniju) — druga pot poleg mehurčka, ki se med
 * odprtim oknom čez ves zaslon umakne (index.css). Skripta se morda še nalaga:
 * počakamo, da widget postavi okno, in ga odpremo, največ 10 s.
 */
export function odpriPodporo() {
  const zacetek = Date.now()
  const poskusi = () => {
    const klepet = (window as Window & { ChatWidget?: Klepet }).ChatWidget
    if (klepet?.open && document.getElementById('chat-widget-container')) klepet.open()
    else if (Date.now() - zacetek < 10000) window.setTimeout(poskusi, 300)
  }
  poskusi()
}

function pocakajNaMirovanje(opravilo: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(opravilo, { timeout: 5000 })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(opravilo, 3000)
  return () => window.clearTimeout(id)
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

  useEffect(() => {
    if (document.querySelector('script[src^="https://helpstack.eu/widget.js"]')) return
    return pocakajNaMirovanje(() => {
      izberiKanal().then((id) => {
        if (document.querySelector('script[src^="https://helpstack.eu/widget.js"]')) return
        const s = document.createElement('script')
        s.src = skripta(id)
        s.async = true
        document.body.appendChild(s)
      })
    })
  }, [])

  // Ime povemo, ko je znano — tudi ce se je uporabnik prijavil sele pozneje.
  // Odvisni smo od imena, ne od seje: seja je ob vsakem osveženju žetona nov
  // objekt in bi interval zagnala znova.
  const ime =
    (session?.user?.user_metadata?.display_name as string | undefined) ??
    (session?.user?.user_metadata?.name as string | undefined)
  useEffect(() => {
    if (!ime) return
    let ustavljeno = false
    // Skripta se nalaga v ozadju; ko se javi, ji povemo, kdo pise.
    const cakaj = window.setInterval(() => {
      const klepet = (window as Window & { ChatWidget?: Klepet }).ChatWidget
      if (ustavljeno || !klepet?.identify) return
      klepet.identify({ name: ime })
      window.clearInterval(cakaj)
    }, 1000)
    window.setTimeout(() => window.clearInterval(cakaj), 30000)
    return () => {
      ustavljeno = true
      window.clearInterval(cakaj)
    }
  }, [ime])

  return null
}
