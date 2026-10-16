// Kartica igralca za objavo (oblika FIFA Ultimate Team).
//
// Deli jo igralec sam ali starši: "moj je v 8. krogu zabil dva". Tu so
// besedila in mere; risanje je v `src/components/KarticaIgralca.tsx`.
import { mnozina, oblika, GOLI, IME_POZICIJE, TOCKE } from './pomozno'
import { t } from '../i18n/jedro.ts'
import type { Pozicija } from './tipi'

export const SIRINA_K = 1080
export const VISINA_K = 1350

export interface NastopZaKartico {
  minute: number | null
  goli: number | null
  asistence: number | null
  cistaMreza: boolean | null
  obranjene: number | null
}

export interface PodatkiKartice {
  ime: string
  priimek: string
  stevilka: number | null
  pozicija: Pozicija | null
  klub: string
  klubKratko: string | null
  grb: string | null
  liga: string
  /** Krog zadnjega nastopa; brez njega kartica pokaže sezono. */
  krog: number | null
  tocke: number | null
  dosezki: string[]
  /** Surove številke nastopa za statistiko na kartici. */
  nastop: NastopZaKartico | null
  tekma: string | null
  sezona: { tocke: number; tekem: number; golov: number } | null
  /** Trenutna cena in zadnji premik borze. */
  cena: number | null
  premikCene: number
  /** Odstotek človeških ekip lige z igralcem; null, ko je izbranost skrita (`owners`). */
  izbran: number | null
  /** Kratka povezava, izpisana na sliki ("slff.eu/player/123"). */
  naslov: string
}

/**
 * Kaj je igralec naredil na tekmi — samo tisto, s čimer se kdo pohvali.
 * Kartoni in avtogoli ne sodijo na kartico, ki jo objavi mama.
 */
export function dosezkiNastopa(n: NastopZaKartico, pozicija: Pozicija | null): string[] {
  const out: string[] = []
  const goli = n.goli ?? 0
  const asist = n.asistence ?? 0
  const obr = n.obranjene ?? 0
  if (goli > 0) out.push(goli === 1 ? oblika(1, GOLI) : mnozina(goli, GOLI))
  if (asist > 0) out.push(asist === 1 ? t('igralci.kartica.asistenca') : t('igralci.kartica.asistence', { n: asist }))
  if (obr > 0) out.push(obr === 1 ? t('igralci.kartica.obramba') : t('igralci.kartica.obrambe', { n: obr }))
  if (n.cistaMreza && (pozicija === 'GK' || pozicija === 'DEF')) out.push(t('igralci.kartica.mrezaBrezGola'))
  if ((n.minute ?? 0) > 0) out.push(t('igralci.kartica.minut', { n: n.minute }))
  return out
}

/** "Triglav Kranj 3 : 1 Bled" — domači vedno levo, kot na zapisniku. */
export function vrsticaTekme(
  domaci: string | null,
  gostje: string | null,
  goliDomaci: number | null,
  goliGostje: number | null,
): string | null {
  if (!domaci || !gostje) return null
  if (goliDomaci == null || goliGostje == null) return `${domaci} – ${gostje}`
  return `${domaci} ${goliDomaci} : ${goliGostje} ${gostje}`
}

export function imePozicije(p: Pozicija | null): string {
  return p ? IME_POZICIJE[p] : t('igralci.kartica.igralec')
}

/** "točk v 8. krogu" / "točke v sezoni" — beseda za veliko številko. */
export function podnapisTock(tocke: number, krog: number | null): string {
  const beseda = oblika(tocke, TOCKE)
  return krog ? t('igralci.kartica.tockVKrogu', { beseda, krog }) : t('igralci.kartica.tockVSezoni', { beseda })
}

/** Izbranost v odstotkih; brez lastnikov (skrita) ali ekip je ni. */
export function odstotekIzbranosti(lastnikov: number | null, ekip: number | null): number | null {
  if (lastnikov == null || !ekip) return null
  return Math.min(100, Math.round((lastnikov / ekip) * 100))
}

/** Povezava za na sliko: brez sheme in poizvedbe ("slff.eu/player/123"). */
export function kratkiNaslov(povezava: string): string {
  return povezava.replace(/^[a-z]+:\/\//i, '').replace(/[?#].*$/, '')
}

/**
 * Velikost priimka: kratek priimek je velik kot na sličici, dolg se manjša,
 * dokler ne pride v širino. `meri` vrne širino pri dani velikosti.
 */
export function velikostPriimka(
  sirina: number,
  meri: (px: number) => number,
  najvec = 210,
  najmanj = 72,
): number {
  let px = najvec
  while (px > najmanj && meri(px) > sirina) px -= 4
  return Math.max(najmanj, px)
}

export function imeDatotekeKartice(ime: string, priimek: string, krog: number | null): string {
  const cist = `${ime}-${priimek}${krog ? `-${t('igralci.kartica.datotekaKrog', { krog })}` : ''}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || t('igralci.kartica.datotekaIgralec')}.png`
}
