// Naslov zavihka po strani. SPA ima sicer en sam <title> iz index.html in vsak
// zavihek, zaznamek ter zadetek v iskalniku se imenuje enako.
import { useEffect } from 'react'
import { t } from '../i18n/jedro.ts'
import { DOMENA } from './platforma.ts'


/**
 * Nastavi `document.title` na "{deli, ločeni s ·} · SLFF"; brez naslova ostane
 * osnovni. Prazni deli (liga se še nalaga) odpadejo.
 */
export function useNaslov(...deli: Array<string | null | undefined>): void {
  const naslov = deli.filter(Boolean).join(' · ')
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = naslov ? t('aplikacija.naslovStrani.zStranjo', { naslov }) : t('aplikacija.naslovStrani.osnova')
  }, [naslov])
}

/**
 * Strani, katerih vsebina ni odvisna od lige: povezava nanje `?t=` ne dobi in
 * kanonični naslov ga nima, da iskalnik ne vidi iste strani pod vsako ligo.
 * Predpona s poševnico na koncu velja za vse pod njo.
 */
const BREZ_LIGE = ['/legal', '/login', '/account', '/reminders', '/new-password', '/novo-geslo', '/admin', '/auth/', '/l/']

export function jeBrezLige(pot: string): boolean {
  return BREZ_LIGE.some((p) => (p.endsWith('/') ? pot.startsWith(p) : pot === p))
}

/**
 * Kanonični naslov strani: pot in izbrana liga (`?t=`), brez ostalih
 * parametrov (filtri, izbrani krog), da iskalnik ne šteje vsake kombinacije
 * za svojo stran. Strani brez lige (`jeBrezLige`) ga nimajo.
 */
// `/players/` in `/players` sta ista stran (isto pravilo v streznik.mjs).
const brezPosevnice = (pot: string): string => pot.replace(/(.)\/+$/, '$1')

export function kanonicni(pot: string, iskanje: string): string {
  pot = brezPosevnice(pot)
  const t = jeBrezLige(pot)
    ? null
    : ligaStrani && brezPosevnice(ligaStrani.pot) === pot
      ? ligaStrani.slug
      : new URLSearchParams(iskanje).get('t')
  return `${DOMENA}${pot}${t ? `?t=${encodeURIComponent(t)}` : ''}`
}

/**
 * Liga, ki jo stran pove sama (igralec, klub, tekma, ekipa so iz ene lige):
 * `/player/5?t=mladinci` in `/player/5` sta ista stran igralca članov.
 */
let ligaStrani: { pot: string; slug: string | null } | null = null

function zapisiKanonicni(href: string): void {
  let povezava = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!povezava) {
    povezava = document.createElement('link')
    povezava.rel = 'canonical'
    document.head.appendChild(povezava)
  }
  povezava.href = href
}

/** Nastavi <link rel="canonical"> na trenutno pot; če ga še ni, ga ustvari. */
export function useKanonicni(pot: string, iskanje: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    zapisiKanonicni(kanonicni(pot, iskanje))
  }, [pot, iskanje])
}

/**
 * Kanonični `?t=` po ligi vsebine, ne po izbrani. `undefined` = liga še ni
 * znana, `null` = privzeta liga (brez parametra). Kliči `useKanonicnaLiga`
 * iz `tekmovanje.tsx`, ki privzeto ligo preslika v null.
 */
export function useLigaStrani(slug: string | null | undefined): void {
  useEffect(() => {
    if (slug === undefined || typeof document === 'undefined') return
    const pot = window.location.pathname
    ligaStrani = { pot, slug }
    zapisiKanonicni(kanonicni(pot, window.location.search))
    return () => {
      ligaStrani = null
    }
  }, [slug])
}

/** Zasebne strani (ekipa, račun, prijava, povabila): iskalnik jih ne indeksira. */
// Isti seznam ima Caddy (scripts/hetzner/Caddyfile).
const ZASEBNE = ['/my-team', '/mini-leagues', '/mini-leagues/', '/login', '/account', '/reminders', '/new-password', '/novo-geslo', '/admin', '/auth/', '/team/', '/l/']

export const jeZasebna = (pot: string): boolean =>
  ZASEBNE.some((p) => (p.endsWith('/') ? pot.startsWith(p) : pot === p || pot === `${p}/`))

/**
 * Strani, ki je ni (neznan igralec, klub, tekma, ekipa): Caddy vrne 200, ker
 * ne ve, kateri id obstaja, zato iskalniku to pove <meta name="robots">.
 */
export function useNoindex(aktivno: boolean): void {
  useEffect(() => {
    if (typeof document === 'undefined' || !aktivno) return
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [aktivno])
}
