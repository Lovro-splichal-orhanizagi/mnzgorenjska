// Slike nagrad tedenskega pregleda mini lige — ena nagrada ali cel krog.
//
// Postavitev je ista kot pri tedenskem pregledu ekipe (`tedenskiPregled.ts`):
// pokončna slika 1080x1920, vse bistveno v sredinskem kvadratu 1080x1080.
// Kvadrat za klepet je isti izris, le obrezan (elementi `samoPokoncno` ga
// nimajo). Tu je računski del; riše `SlikaNagrade.tsx`, `npm run smoke`
// preveri, da nič ne pade s slike in da gredo mladim le poze brez piva.
//
// Pravila prijaznosti (docs/podatkovni-model.md, *Nagrade tedenskega
// pregleda*): šala gre na račun maskote ali ekipe v mini ligi, nikoli na
// resničnega igralca — ta je na sliki le s pohvalo (kapetan, adut).

import { t } from '../i18n/jedro.ts'
import { formatirajTocke, oblika, tockZ, TOCKE_TOZILNIK } from './pomozno.ts'
import { prilagodiVelikost } from './plakat.ts'
import {
  SIRINA_P,
  KVADRAT,
  ROB_P,
  KREM,
  ZLATA,
  vDveVrstici,
  type ElementPregleda,
  type Meri,
} from './tedenskiPregled.ts'
import type { VrstaZgodbe, Zgodba } from './miniLige.ts'

const KREM_TIH = 'rgba(243,237,224,.72)'

// --- poze maskote ------------------------------------------------------------

/** Poza maskote za nagrado (datoteke v `public/logo/maskota/`). */
const POZA: Record<VrstaZgodbe | 'pregled', string> = {
  manager: 'manager',
  kapetan: 'kapetan',
  adut: 'adut',
  skok: 'dvigalo',
  padec: 'padec',
  klop: 'klop',
  zlica: 'zlica',
  spodbuda: 'spodbuda',
  pregled: 'manager',
}

/**
 * Poze, v katerih drži pivo. Za mini lige z mladinsko ligo imajo različico
 * `-mladi` (sok) — isti seznam kot `S_PIJACO` v `scripts/maskota-poze.mjs`
 * (smoke ju primerja).
 */
export const POZE_S_PIVOM: readonly string[] = ['manager', 'kapetan', 'spodbuda']

/** Pot do poze; v mladinski mini ligi nikoli poza s pivom. */
export function pozaNagrade(vrsta: VrstaZgodbe | 'pregled', mladinska: boolean): string {
  const poza = POZA[vrsta]
  const mladi = mladinska && POZE_S_PIVOM.includes(poza)
  return `/logo/maskota/${poza}${mladi ? '-mladi' : ''}.svg`
}

/** Razmerje slike poze (viewBox 1060x1190). */
export const RAZMERJE_POZE = 1190 / 1060

// --- besedila ----------------------------------------------------------------

/** Naslov nagrade brez sličice ("Lesena žlica"). */
export function imeNagrade(vrsta: VrstaZgodbe): string {
  return t(`lestvice.pregled.${vrsta}`)
}

/** Šala na sliki (brez imena ekipe — to je na sliki posebej). */
export function salaZgodbe(z: Zgodba): string {
  switch (z.vrsta) {
    case 'kapetan': {
      const n = Number(z.skupaj ?? z.tocke)
      return t('lestvice.pregled.sala.kapetan', {
        igralec: z.igralec ?? '',
        tocke: `${formatirajTocke(n)} ${oblika(n, TOCKE_TOZILNIK)}`,
      })
    }
    case 'adut':
      return t('lestvice.pregled.sala.adut', {
        igralec: z.igralec ?? '',
        tocke: `${formatirajTocke(z.tocke)} ${tockZ(z.tocke)}`,
      })
    default:
      return t(`lestvice.pregled.sala.${z.vrsta}`)
  }
}

/** Številka nagrade v besedi: "52 točk", "▲ 2 mesti · zdaj 1.", "7 točk na klopi". */
export function vrednostZgodbe(z: Zgodba): string {
  const tocke = (n: number) => `${formatirajTocke(n)} ${tockZ(n)}`
  switch (z.vrsta) {
    case 'skok':
      return t('lestvice.pregled.vrednostSkok', { n: z.mest ?? 0, mesto: z.mesto ?? 0 })
    case 'padec':
      return t('lestvice.pregled.vrednostPadec', { n: z.mest ?? 0, mesto: z.mesto ?? 0 })
    case 'klop':
      return t('lestvice.pregled.vrednostKlop', { tocke: tocke(z.tocke) })
    case 'kapetan':
      return tocke(Number(z.skupaj ?? z.tocke))
    default:
      return tocke(z.tocke)
  }
}

/** Vrstica v sliki celega pregleda: kdo in koliko. */
export function kratkoZgodbe(z: Zgodba): { glavno: string; vrednost: string } {
  switch (z.vrsta) {
    case 'kapetan':
      return { glavno: `${z.igralec ?? ''} · ${z.ekipa}`, vrednost: formatirajTocke(Number(z.skupaj ?? z.tocke)) }
    case 'adut':
      return { glavno: `${z.igralec ?? ''} · ${z.ekipa}`, vrednost: formatirajTocke(z.tocke) }
    case 'skok':
      return { glavno: z.ekipa, vrednost: t('lestvice.zgodba.gor', { n: z.mest ?? 0 }) }
    case 'padec':
      return { glavno: z.ekipa, vrednost: t('lestvice.zgodba.dol', { n: z.mest ?? 0 }) }
    default:
      return { glavno: z.ekipa, vrednost: formatirajTocke(z.tocke) }
  }
}

/** Ime datoteke: liga, krog in nagrada (ali `pregled`). */
export function imeDatotekeNagrade(liga: string, krog: number, vrsta: VrstaZgodbe | 'pregled'): string {
  const cist = liga
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'mini-liga'}-${krog}-krog-${vrsta}.png`
}

// --- postavitev --------------------------------------------------------------

export type ElementSlike =
  | ElementPregleda
  /** Poza maskote; `x`, `y` sta zgornji levi kot. */
  | { vrsta: 'maskota'; id: string; x: number; y: number; w: number; h: number; url: string; samoPokoncno?: boolean }

export interface PodatkiNagrade {
  zgodba: Zgodba
  /** Ime mini lige. */
  liga: string
  krog: number
  mladinska: boolean
}

export interface PodatkiCelotnega {
  zgodbe: Zgodba[]
  liga: string
  krog: number
  mladinska: boolean
}

/** Največja pisava med `px` in `najmanj`, nato "…" (kot v `tedenskiPregled.ts`). */
function vSirino(besedilo: string, px: number, najmanj: number, teza: number, sirina: number, meri: Meri) {
  const v = prilagodiVelikost(besedilo, px, najmanj, sirina, (p, s) => meri(s, p, teza))
  let b = besedilo
  if (meri(b, v, teza) > sirina) {
    while (b.length > 1 && meri(`${b}…`, v, teza) > sirina) b = b.slice(0, -1)
    b = `${b.trimEnd()}…`
  }
  return { besedilo: b, px: v }
}

/**
 * Besedilo po besedah v največ `najvec` vrstic; zadnja dobi "…", če ne gre.
 * Beseda, daljša od vrstice (dolgo ime brez presledkov), se skrajša.
 */
export function vVrstice(besedilo: string, px: number, teza: number, sirina: number, meri: Meri, najvec: number): string[] {
  const besede = besedilo.split(/\s+/).filter(Boolean)
  const vrstice: string[] = []
  let i = 0
  while (i < besede.length && vrstice.length < najvec) {
    let vrstica = besede[i++]
    while (i < besede.length && meri(`${vrstica} ${besede[i]}`, px, teza) <= sirina) vrstica = `${vrstica} ${besede[i++]}`
    vrstice.push(vrstica)
  }
  if (i < besede.length) vrstice[vrstice.length - 1] = `${vrstice[vrstice.length - 1]} ${besede.slice(i).join(' ')}`
  return vrstice.map((v) => vSirino(v, px, px, teza, sirina, meri).besedilo)
}

/** Skupno obema slikama: znak zgoraj, liga, nadnaslov, slff.eu, vabilo spodaj. */
function okvir(liga: string, krog: number, meri: Meri, sirinaGlave = SIRINA_P - 2 * ROB_P): ElementSlike[] {
  const S = SIRINA_P
  const K = KVADRAT.y
  const sirina = S - 2 * ROB_P
  const l = vSirino(liga, 32, 22, 600, sirinaGlave, meri)
  const nad = vSirino(t('lestvice.zgodba.nadnaslov', { krog }), 34, 24, 800, sirinaGlave, meri)
  const vabilo = vSirino(t('lestvice.pregled.slikaVabilo'), 40, 28, 700, sirina, meri)
  return [
    // Napis namesto grba: grb (in ikona) kažeta maskoto s pivom in cigareto,
    // slike nagrad pa gredo tudi v mladinske mini lige.
    { vrsta: 'besedilo', id: 'znak', besedilo: 'SLFF', x: S / 2, y: 300, px: 128, teza: 900, barva: KREM, poravnava: 'center', razmik: 6, samoPokoncno: true },
    { vrsta: 'besedilo', id: 'znak.podnapis', besedilo: 'SUNDAY LEAGUE FANTASY FOOTBALL', x: S / 2, y: 352, px: 26, teza: 800, barva: ZLATA, poravnava: 'center', razmik: 4, samoPokoncno: true },
    { vrsta: 'besedilo', id: 'liga', besedilo: l.besedilo, x: ROB_P, y: K + 88, px: l.px, teza: 600, barva: KREM_TIH, poravnava: 'left' },
    { vrsta: 'besedilo', id: 'nadnaslov', besedilo: nad.besedilo, x: ROB_P, y: K + 140, px: nad.px, teza: 800, barva: ZLATA, poravnava: 'left', razmik: 3 },
    { vrsta: 'pravokotnik', id: 'splet.crta', x: ROB_P, y: K + KVADRAT.visina - 88, w: 72, h: 5, barva: ZLATA },
    { vrsta: 'besedilo', id: 'splet', besedilo: 'slff.eu', x: ROB_P, y: K + KVADRAT.visina - 30, px: 44, teza: 900, barva: KREM, poravnava: 'left' },
    { vrsta: 'besedilo', id: 'vabilo', besedilo: vabilo.besedilo, x: S / 2, y: K + KVADRAT.visina + 130, px: vabilo.px, teza: 700, barva: KREM_TIH, poravnava: 'center', samoPokoncno: true },
  ]
}

/** Velik naslov v eni ali dveh vrsticah; vrne elemente in osnovnico zadnje. */
function naslovVVrsticah(
  id: string,
  besedilo: string,
  y: number,
  px: [number, number, number],
  teza: number,
  barva: string,
  sirina: number,
  meri: Meri,
): { el: ElementSlike[]; spodaj: number } {
  const [najvec, prelom, najmanj] = px
  const ena = vSirino(besedilo, najvec, prelom, teza, sirina, meri)
  const vrstici = ena.besedilo === besedilo ? [besedilo] : vDveVrstici(besedilo, prelom, teza, sirina, meri).slice(0, 2)
  const v = vrstici.map((b) => vSirino(b, vrstici.length === 1 ? ena.px : prelom, najmanj, teza, sirina, meri))
  const el: ElementSlike[] = v.map((b, i) => ({
    vrsta: 'besedilo',
    id: i === v.length - 1 ? id : `${id}.${i}`,
    besedilo: b.besedilo,
    x: ROB_P - 4,
    y: y + i * Math.round(b.px * 1.02),
    px: b.px,
    teza,
    barva,
    poravnava: 'left',
    razmik: -Math.round(b.px * 0.02),
  }))
  return { el, spodaj: y + (v.length - 1) * Math.round(v[v.length - 1].px * 1.02) }
}

/** Mesto maskote na sliki ene nagrade: desno spodaj v kvadratu. */
export const MASKOTA_NAGRADE = { w: 500, h: Math.round(500 * RAZMERJE_POZE) }

/** Slika ene nagrade. Koordinate v prostoru 1080x1920. */
export function postaviNagrado(p: PodatkiNagrade, meri: Meri): ElementSlike[] {
  const S = SIRINA_P
  const K = KVADRAT.y
  const sirina = S - 2 * ROB_P
  const z = p.zgodba
  const e = okvir(p.liga, p.krog, meri)

  // Maskota desno spodaj, nad nogo kvadrata; besedilo pod njeno glavo gre
  // le v levi stolpec.
  const m = MASKOTA_NAGRADE
  const mx = S - m.w - 36
  const my = K + KVADRAT.visina - m.h - 56
  e.push({ vrsta: 'maskota', id: 'maskota', x: mx, y: my, w: m.w, h: m.h, url: pozaNagrade(z.vrsta, p.mladinska) })
  const levo = mx - ROB_P - 12
  // Vrstica, ki je že ob maskoti, gre le v levi stolpec.
  const sirinaPri = (y: number, polna: number) => (y < my + 40 ? polna : levo)

  const naslov = naslovVVrsticah('naslov', imeNagrade(z.vrsta).toUpperCase(), K + 252, [104, 72, 52], 900, KREM, sirina + 8, meri)
  e.push(...naslov.el)

  const yEkipe = naslov.spodaj + 86
  const ekipa = naslovVVrsticah('ekipa', z.ekipa, yEkipe, [64, 52, 40], 800, ZLATA, sirinaPri(yEkipe + 60, sirina), meri)
  e.push(...ekipa.el)

  const yVrednosti = ekipa.spodaj + 62
  const vrednost = vSirino(vrednostZgodbe(z), 40, 30, 700, sirinaPri(yVrednosti, sirina), meri)
  e.push({ vrsta: 'besedilo', id: 'vrednost', besedilo: vrednost.besedilo, x: ROB_P, y: yVrednosti, px: vrednost.px, teza: 700, barva: KREM, poravnava: 'left' })

  // Šala: levi stolpec ob maskoti, do pet vrstic, nad nogo.
  const px = 38
  const visina = Math.round(px * 1.3)
  const prvaY = yVrednosti + 84
  const prostor = Math.max(1, Math.floor((K + KVADRAT.visina - 120 - prvaY) / visina) + 1)
  vVrstice(salaZgodbe(z), px, 600, levo, meri, Math.min(5, prostor)).forEach((v, i) =>
    e.push({ vrsta: 'besedilo', id: `sala.${i}`, besedilo: v, x: ROB_P, y: prvaY + i * visina, px, teza: 600, barva: KREM_TIH, poravnava: 'left' }),
  )
  return e
}

/** Mesto maskote na sliki celega pregleda: majhna, desno zgoraj. */
export const MASKOTA_PREGLEDA = { w: 200, h: Math.round(200 * RAZMERJE_POZE) }
export const NAJVEC_VRSTIC_PREGLEDA = 8

/** Slika celega pregleda: naslov in vrstica na nagrado. */
export function postaviCelPregled(p: PodatkiCelotnega, meri: Meri): ElementSlike[] {
  const S = SIRINA_P
  const K = KVADRAT.y
  const sirina = S - 2 * ROB_P
  const m = MASKOTA_PREGLEDA
  const e = okvir(p.liga, p.krog, meri, sirina - m.w)

  e.push({ vrsta: 'maskota', id: 'maskota', x: S - ROB_P - m.w + 30, y: K + 50, w: m.w, h: m.h, url: pozaNagrade('pregled', p.mladinska) })
  const naslov = vSirino(t('lestvice.pregled.slikaPregled').toUpperCase(), 84, 48, 900, sirina - m.w - 10, meri)
  e.push({ vrsta: 'besedilo', id: 'naslov', besedilo: naslov.besedilo, x: ROB_P - 4, y: K + 236, px: naslov.px, teza: 900, barva: KREM, poravnava: 'left', razmik: -Math.round(naslov.px * 0.02) })

  const zgodbe = p.zgodbe.slice(0, NAJVEC_VRSTIC_PREGLEDA)
  const vrh = K + 300
  const dno = K + KVADRAT.visina - 120
  const visina = Math.min(104, Math.floor((dno - vrh) / Math.max(1, zgodbe.length)))
  zgodbe.forEach((z, i) => {
    const y = vrh + i * visina
    const { glavno, vrednost } = kratkoZgodbe(z)
    const sirinaVrednosti = meri(vrednost, 40, 900)
    const oznaka = vSirino(imeNagrade(z.vrsta).toUpperCase(), 24, 18, 800, sirina, meri)
    const g = vSirino(glavno, 40, 28, 800, sirina - sirinaVrednosti - 28, meri)
    e.push(
      { vrsta: 'besedilo', id: `vrstica.${i}.oznaka`, besedilo: oznaka.besedilo, x: ROB_P, y: y + 30, px: oznaka.px, teza: 800, barva: ZLATA, poravnava: 'left', razmik: 2 },
      { vrsta: 'besedilo', id: `vrstica.${i}.glavno`, besedilo: g.besedilo, x: ROB_P, y: y + 76, px: g.px, teza: 800, barva: KREM, poravnava: 'left' },
      { vrsta: 'besedilo', id: `vrstica.${i}.vrednost`, besedilo: vrednost, x: S - ROB_P, y: y + 76, px: 40, teza: 900, barva: KREM, poravnava: 'right' },
    )
    if (i < zgodbe.length - 1)
      e.push({ vrsta: 'pravokotnik', id: `vrstica.${i}.crta`, x: ROB_P, y: y + visina - 8, w: sirina, h: 2, barva: 'rgba(243,237,224,.12)' })
  })
  return e
}
