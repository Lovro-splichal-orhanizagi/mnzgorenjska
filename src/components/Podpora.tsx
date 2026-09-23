import { useEffect } from 'react'
import { useAuth } from '../lib/useAuth'

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
 */
const WIDGET_ID = 'cmucx868b000cv2atsowgly81'
const SKRIPTA = `https://helpstack.eu/widget.js?id=${WIDGET_ID}`

interface Klepet {
  identify?: (identiteta: unknown, podatki?: unknown) => void
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

export default function Podpora() {
  const { session } = useAuth()

  useEffect(() => {
    if (document.querySelector(`script[src="${SKRIPTA}"]`)) return
    return pocakajNaMirovanje(() => {
      const s = document.createElement('script')
      s.src = SKRIPTA
      s.async = true
      document.body.appendChild(s)
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
