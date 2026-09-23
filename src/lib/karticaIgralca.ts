// Kartica igralca za objavo — sličica iz albuma, ne statistična tabela.
//
// Deli jo igralec sam ali starši: "moj je v 8. krogu zabil dva". Zato je
// junak ime in to, kar je naredil na tekmi, ne rang ali cena. Oblika je
// Panini sličica, ker jo pozna vsak, ki je kdaj zbiral nogometni album, in
// ker nedeljske lige ne prikaže nihče drug — v tem je vsa njena vrednost.
//
// Tu so besedila in mere; risanje je v `src/components/KarticaIgralca.tsx`.
import { mnozina, oblika, GOLI, IME_POZICIJE } from './pomozno'
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
  tekma: string | null
  sezona: { tocke: number; tekem: number; golov: number } | null
  ekip: number | null
}

const ASISTENCE: [string, string, string, string] = ['asistenca', 'asistenci', 'asistence', 'asistenc']
const OBRAMBE: [string, string, string, string] = [
  'obranjena enajstmetrovka',
  'obranjeni enajstmetrovki',
  'obranjene enajstmetrovke',
  'obranjenih enajstmetrovk',
]

/**
 * Kaj je igralec naredil na tekmi — samo tisto, s čimer se kdo pohvali.
 * Kartoni in avtogoli ne sodijo na kartico, ki jo objavi mama.
 */
export function dosezkiNastopa(n: NastopZaKartico, pozicija: Pozicija | null): string[] {
  const out: string[] = []
  const goli = n.goli ?? 0
  const asist = n.asistence ?? 0
  const obr = n.obranjene ?? 0
  if (goli > 0) out.push(goli === 1 ? 'gol' : mnozina(goli, GOLI))
  if (asist > 0) out.push(asist === 1 ? 'asistenca' : mnozina(asist, ASISTENCE))
  if (obr > 0) out.push(obr === 1 ? OBRAMBE[0] : mnozina(obr, OBRAMBE))
  if (n.cistaMreza && (pozicija === 'GK' || pozicija === 'DEF')) out.push('mreža brez gola')
  if ((n.minute ?? 0) > 0) out.push(`${n.minute} min`)
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
  return p ? IME_POZICIJE[p] : 'Igralec'
}

/** "točk v 8. krogu" / "točke v sezoni" — beseda za veliko številko. */
export function podnapisTock(tocke: number, krog: number | null): string {
  const beseda = oblika(tocke, ['točka', 'točki', 'točke', 'točk'])
  return krog ? `${beseda} v ${krog}. krogu` : `${beseda} v sezoni`
}

/** "V 34 fantasy ekipah" — kolikim je ta igralec v ekipi. */
export function stavekEkip(n: number | null): string | null {
  if (!n || n < 1) return null
  return `V ${n} ${oblika(n, ['fantasy ekipi', 'fantasy ekipah', 'fantasy ekipah', 'fantasy ekipah'])}`
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
  const cist = `${ime}-${priimek}${krog ? `-${krog}-krog` : ''}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'igralec'}.png`
}
