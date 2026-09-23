// Naslov zavihka po strani. SPA ima sicer en sam <title> iz index.html in vsak
// zavihek, zaznamek ter zadetek v iskalniku se imenuje enako.
import { useEffect } from 'react'

const OSNOVA = 'SLFF — Sunday League Fantasy Football'

/** Nastavi `document.title` na "{naslov} · SLFF"; brez naslova ostane osnovni. */
export function useNaslov(naslov: string | null | undefined): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = naslov ? `${naslov} · SLFF` : OSNOVA
  }, [naslov])
}

const DOMENA = 'https://slff.eu'

/**
 * Kanonični naslov strani: pot in izbrana liga (`?t=`), brez ostalih
 * parametrov (filtri, izbrani krog), da iskalnik ne šteje vsake kombinacije
 * za svojo stran.
 */
export function kanonicni(pot: string, iskanje: string): string {
  const t = new URLSearchParams(iskanje).get('t')
  return `${DOMENA}${pot}${t ? `?t=${encodeURIComponent(t)}` : ''}`
}

/** Nastavi <link rel="canonical"> na trenutno pot; če ga še ni, ga ustvari. */
export function useKanonicni(pot: string, iskanje: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    let povezava = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!povezava) {
      povezava = document.createElement('link')
      povezava.rel = 'canonical'
      document.head.appendChild(povezava)
    }
    povezava.href = kanonicni(pot, iskanje)
  }, [pot, iskanje])
}
