// Tedenski pregled — slika ekipe po koncanem krogu, za zgodbo na Instagramu
// ali WhatsAppu.
//
// Pokoncna (1080x1920), a vse, kar sporoca, stoji v sredinskem kvadratu
// 1080x1080. Predogled v klepetu in objava v viru sliko obrezeta na kvadrat,
// zgodba pa zgoraj in spodaj pokrije ~250 px z imenom in odgovorom — zato je
// v pasovih nad in pod kvadratom samo okras (znak SLFF, vabilo).
//
// Tu je racunski del: iz podatkov kroga sestavi seznam elementov z
// ze izracunanimi polozaji in velikostmi pisave. Komponenta
// `ZgodbaKroga.tsx` jih le izrise; `npm run smoke` preveri, da nic ne
// pade iz kvadrata in da se dolga imena ne prelijejo.

import { t } from '../i18n/jedro.ts'
import { formatirajTocke, tockZ } from './pomozno'
import { imeZaPlakat, skrajsajIme, prilagodiVelikost } from './plakat'
import type { VrsticaTuje } from './tujaEkipa'

export const SIRINA_P = 1080
export const VISINA_P = 1920
/** Sredinski kvadrat — kar je v njem, preživi obrezovanje na kvadrat. */
export const KVADRAT = { y: (VISINA_P - SIRINA_P) / 2, visina: SIRINA_P }
export const ROB_P = 84

export const KREM = '#F3EDE0'
export const ZLATA = '#D9A21B'
const KREM_TIH = 'rgba(243,237,224,.72)'
const KREM_BLED = 'rgba(243,237,224,.55)'
const GOR = '#34d399'
const DOL = '#fb7185'

// --- podatki -----------------------------------------------------------------

export interface IgralecPregleda {
  player_id: number
  ime: string
  klub: string | null
  grb: string | null
  /** Tocke, ki jih pokazemo: kapetanu z mnoziteljem, najboljsemu njegove. */
  tocke: number
  mnozitelj: number
  /** Kapetan ni igral in je trak presel na namestnika. */
  namestnik: boolean
}

export interface PodatkiPregleda {
  ekipa: string
  liga: string
  krog: number
  tocke: number
  mesto: number | null
  odEkip: number | null
  /** Za koliko mest je ekipa napredovala (+) ali nazadovala (−); null = ni primerjave. */
  premik: number | null
  kapetan: IgralecPregleda | null
  najboljsi: IgralecPregleda | null
}

/**
 * Krog je koncan, ko ima zapisnik (ali kontumacijo) vsaka tekma, ki bi ze
 * morala biti odigrana. Prelozena tekma z datumom v prihodnosti pregleda ne
 * zadrzi — sicer bi en preložen derbi zaprl delitev za ves teden. Tekma brez
 * datuma velja za odigrano, dokler ne pride zapisnik, ker je ne moremo
 * razlikovati od tekme, ki zapisnik se caka.
 */
export function krogKoncan(
  tekme: Array<{ played_on: string | null; imported_at: string | null; kontumacija: boolean | null }>,
  danes: string,
): boolean {
  if (!tekme.some((m) => m.imported_at)) return false
  return tekme.every(
    (m) => m.imported_at || m.kontumacija || (m.played_on != null && m.played_on > danes),
  )
}

/** Danasnji datum v obliki `played_on` (YYYY-MM-DD), po lokalnem casu. */
export function danesIso(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dan = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dan}`
}

/**
 * Mesto na skupni lestvici sezone po krogu `krog` in premik glede na
 * prejsnji krog. Tocke krogov (`fantasy_round_points.points`) imajo kazen za
 * prestope ze odsteto — glej `lib/lestvica.ts`.
 *
 * Mesto se steje kot `rank()` v bazi: 1 + stevilo ekip z vec tockami, zato
 * si izenaceni delijo mesto.
 */
export function mestoVLigi(
  vrstice: Array<{ round_id: number | null; fantasy_team_id: number | null; points: number | string | null }>,
  stevilkaKroga: Map<number, number>,
  ekipaId: number,
  krog: number,
): { mesto: number | null; odEkip: number | null; premik: number | null } {
  const do_ = new Map<number, number>()
  const prej = new Map<number, number>()
  let prejsnjiKrogi = 0
  for (const v of vrstice) {
    if (v.round_id == null || v.fantasy_team_id == null) continue
    const n = stevilkaKroga.get(v.round_id)
    if (n == null || n > krog) continue
    const tocke = Number(v.points ?? 0)
    do_.set(v.fantasy_team_id, (do_.get(v.fantasy_team_id) ?? 0) + tocke)
    if (n < krog) {
      prej.set(v.fantasy_team_id, (prej.get(v.fantasy_team_id) ?? 0) + tocke)
      prejsnjiKrogi++
    }
  }
  const mestoIz = (skupki: Map<number, number>, id: number) => {
    const moje = skupki.get(id)
    if (moje == null) return null
    let vec = 0
    for (const [drug, tocke] of skupki) if (drug !== id && tocke > moje) vec++
    return vec + 1
  }
  const mesto = mestoIz(do_, ekipaId)
  // Ekipa, ki je zacela ta krog, se ni premaknila — prej je ni bilo.
  const mestoPrej = prejsnjiKrogi > 0 ? mestoIz(prej, ekipaId) : null
  return {
    mesto,
    odEkip: do_.size || null,
    premik: mesto != null && mestoPrej != null ? mestoPrej - mesto : null,
  }
}

/**
 * Kapetan in najboljsi igralec kroga iz vrstic `tuja_postava`.
 *
 * Kapetan je tisti, na katerem je mnozitelj — ce kapetan ni igral, je to
 * namestnik. Ce ni igral nobeden, ostane napisani kapetan z nic tockami: slika
 * ne sme tiho zamolcati, da je trak ostal brez tock.
 *
 * Najboljsi je igralec z najvec lastnimi tockami med tistimi, ki so ekipi
 * steli (mnozitelj nad nic). Ce je to kapetan, ga pokazemo enkrat.
 */
export function igralciPregleda(vrstice: VrsticaTuje[]): {
  kapetan: IgralecPregleda | null
  najboljsi: IgralecPregleda | null
} {
  const kot = (v: VrsticaTuje, tocke: number): IgralecPregleda => ({
    player_id: v.player_id,
    ime: imeZaPlakat(v.ime),
    klub: v.klub,
    grb: null,
    tocke,
    mnozitelj: v.mnozitelj,
    namestnik: v.mnozitelj > 1 && !v.je_kapetan,
  })
  const sTrakom = vrstice.find((v) => v.mnozitelj > 1) ?? vrstice.find((v) => v.je_kapetan)
  const kapetan = sTrakom ? kot(sTrakom, Number(sTrakom.tocke ?? 0) * sTrakom.mnozitelj) : null
  const naj = vrstice
    .filter((v) => v.mnozitelj > 0 && Number(v.tocke ?? 0) > 0)
    .sort((a, b) => Number(b.tocke ?? 0) - Number(a.tocke ?? 0) || (a.ime ?? '').localeCompare(b.ime ?? ''))[0]
  const najboljsi = naj ? kot(naj, Number(naj.tocke ?? 0)) : null
  return { kapetan, najboljsi }
}

/** Ime datoteke — ena ekipa ima vsak krog svojo. */
export function imeDatotekePregleda(ekipa: string, krog: number): string {
  const cist = ekipa
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `slff-${cist || 'ekipa'}-${krog}-krog.png`
}

// --- postavitev ----------------------------------------------------------------

type Poravnava = 'left' | 'right' | 'center'

export type ElementPregleda =
  | {
      vrsta: 'besedilo'
      id: string
      besedilo: string
      x: number
      /** Osnovnica besedila. */
      y: number
      px: number
      teza: number
      barva: string
      poravnava: Poravnava
      /** Razmik med crkami v px (negativen stisne naslov v blok). */
      razmik?: number
      samoPokoncno?: boolean
    }
  | { vrsta: 'pravokotnik'; id: string; x: number; y: number; w: number; h: number; barva: string; samoPokoncno?: boolean }
  /** Grb kluba v okrogli znacki; `x`, `y` sta sredisce. */
  | { vrsta: 'grb'; id: string; x: number; y: number; d: number; url: string | null; zacetnice: string }
  /** Znak SLFF; `x`, `y` sta zgornji levi kot. */
  | { vrsta: 'znak'; id: string; x: number; y: number; d: number; samoPokoncno?: boolean }

/** Sirina besedila v px pri dani velikosti in tezi — na platnu `measureText`. */
export type Meri = (besedilo: string, px: number, teza: number) => number

/** Zacetnice kluba za znacko brez grba (kot `Grb.tsx`). */
export function zacetniceKluba(ime: string | null): string {
  return (ime ?? '')
    .split(/\s+/)
    .filter((d) => /[a-zčšžA-ZČŠŽ0-9]/.test(d))
    .map((d) => d[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

/** Velikost imena ekipe — izhodisce, ki ga `prilagodiVelikost` se zmanjsa. */
export function velikostImenaEkipe(ime: string): number {
  const n = ime.length
  if (n <= 10) return 124
  if (n <= 16) return 100
  if (n <= 24) return 78
  return 62
}

/** Najvecja pisava med `px` in `najmanj`, nato "…", ce se vedno ne gre. */
function vSirino(
  besedilo: string,
  px: number,
  najmanj: number,
  teza: number,
  sirina: number,
  meri: Meri,
): { besedilo: string; px: number } {
  const v = prilagodiVelikost(besedilo, px, najmanj, sirina, (p, s) => meri(s, p, teza))
  let b = besedilo
  if (meri(b, v, teza) > sirina) {
    while (b.length > 1 && meri(`${b}…`, v, teza) > sirina) b = b.slice(0, -1)
    b = `${b.trimEnd()}…`
  }
  return { besedilo: b, px: v }
}

/**
 * Ime po besedah v dve vrstici: v prvo gre, kolikor gre. Ce ena beseda ne
 * gre niti sama, ostane za `vSirino`, ki jo skrajsa.
 */
export function vDveVrstici(besedilo: string, px: number, teza: number, sirina: number, meri: Meri): string[] {
  const besede = besedilo.split(/\s+/)
  let prva = besede[0]
  let i = 1
  while (i < besede.length && meri(`${prva} ${besede[i]}`, px, teza) <= sirina) prva = `${prva} ${besede[i++]}`
  const druga = besede.slice(i).join(' ')
  return druga ? [prva, druga] : [prva]
}

/** Oznaka premika: "▲ 2", "▼ 1" ali "=". */
export function oznakaPremika(premik: number | null): { besedilo: string; barva: string } | null {
  if (premik == null) return null
  if (premik > 0) return { besedilo: t('lestvice.zgodba.gor', { n: premik }), barva: GOR }
  if (premik < 0) return { besedilo: t('lestvice.zgodba.dol', { n: -premik }), barva: DOL }
  return { besedilo: t('lestvice.zgodba.enako'), barva: KREM_BLED }
}

/**
 * Vrstica igralca: grb v znacki, oznaka nad imenom, ime, klub, tocke desno.
 * `vrh` je zgornji rob vrstice; visoka je `VISINA_VRSTICE`.
 */
const VISINA_VRSTICE = 140
function vrsticaIgralca(
  id: string,
  oznaka: string,
  ig: IgralecPregleda,
  vrh: number,
  meri: Meri,
): ElementPregleda[] {
  const G = 112
  const levo = ROB_P + G + 32
  const tocke = formatirajTocke(ig.tocke)
  const sirinaTock = meri(tocke, 76, 900)
  const prostor = SIRINA_P - ROB_P - sirinaTock - 32 - levo
  const ime = skrajsajIme(ig.ime, prostor, (s) => meri(s, 48, 800))
  const imeV = vSirino(ime, 48, 34, 800, prostor, meri)
  const oznakaV = vSirino(oznaka, 26, 20, 700, prostor, meri)
  const out: ElementPregleda[] = [
    { vrsta: 'grb', id: `${id}.grb`, x: ROB_P + G / 2, y: vrh + VISINA_VRSTICE / 2 - 8, d: G, url: ig.grb, zacetnice: zacetniceKluba(ig.klub) },
    { vrsta: 'besedilo', id: `${id}.oznaka`, besedilo: oznakaV.besedilo, x: levo, y: vrh + 34, px: oznakaV.px, teza: 700, barva: ZLATA, poravnava: 'left', razmik: 2 },
    { vrsta: 'besedilo', id: `${id}.ime`, besedilo: imeV.besedilo, x: levo, y: vrh + 88, px: imeV.px, teza: 800, barva: KREM, poravnava: 'left' },
    { vrsta: 'besedilo', id: `${id}.tocke`, besedilo: tocke, x: SIRINA_P - ROB_P, y: vrh + 96, px: 76, teza: 900, barva: ZLATA, poravnava: 'right' },
  ]
  if (ig.klub) {
    const klub = vSirino(ig.klub, 28, 22, 600, prostor, meri)
    out.push({ vrsta: 'besedilo', id: `${id}.klub`, besedilo: klub.besedilo, x: levo, y: vrh + 126, px: klub.px, teza: 600, barva: KREM_BLED, poravnava: 'left' })
  }
  return out
}

/**
 * Sestavi sliko. Vse koordinate so v prostoru 1080x1920; komponenta jih
 * izrise pri dvakratni velikosti.
 */
export function postaviPregled(p: PodatkiPregleda, meri: Meri): ElementPregleda[] {
  const S = SIRINA_P
  const sirina = S - 2 * ROB_P
  const e: ElementPregleda[] = []

  // Pas nad kvadratom: znak SLFF. V zgodbi ga delno prekrije ime profila,
  // v kvadratu ga ni — zato tu ni nicesar, kar bi bilo treba prebrati.
  e.push({ vrsta: 'znak', id: 'znak', x: S / 2 - 90, y: 200, d: 180, samoPokoncno: true })

  // --- kvadrat ---------------------------------------------------------------
  const K = KVADRAT.y
  const liga = vSirino(p.liga, 32, 22, 600, sirina, meri)
  e.push({ vrsta: 'besedilo', id: 'liga', besedilo: liga.besedilo, x: ROB_P, y: K + 88, px: liga.px, teza: 600, barva: KREM_TIH, poravnava: 'left' })
  const nad = vSirino(t('lestvice.zgodba.nadnaslov', { krog: p.krog }), 34, 24, 800, sirina, meri)
  e.push({ vrsta: 'besedilo', id: 'nadnaslov', besedilo: nad.besedilo, x: ROB_P, y: K + 140, px: nad.px, teza: 800, barva: ZLATA, poravnava: 'left', razmik: 3 })

  // Ime ekipe cez vso sirino. Negativni razmik je sorazmeren s pisavo (kot
  // pri plakatu kluba) in ime le zozi, zato meritev brez njega ostane varna.
  // Ime je bistvo slike, zato ga pod 60 px raje prelomimo v dve vrstici,
  // kot da bi ga skrajsali v "…".
  const ime = p.ekipa.toUpperCase()
  const enaVrstica = vSirino(ime, velikostImenaEkipe(ime), 60, 900, sirina + 8, meri)
  const vrstici = enaVrstica.besedilo === ime ? [ime] : vDveVrstici(ime, 60, 900, sirina + 8, meri)
  const pxImena = vrstici.length === 1 ? enaVrstica.px : 60
  const imeV = vrstici.map((v) => vSirino(v, pxImena, 44, 900, sirina + 8, meri))
  imeV.forEach((v, i) =>
    e.push({ vrsta: 'besedilo', id: i === imeV.length - 1 ? 'ekipa' : `ekipa.${i}`, besedilo: v.besedilo, x: ROB_P - 4, y: K + 272 - (imeV.length - 1 - i) * 64, px: v.px, teza: 900, barva: KREM, poravnava: 'left', razmik: -Math.round(v.px * 0.03) }),
  )

  // Tocke kroga: velika stevilka, ob njej beseda in "v N. krogu".
  // Stevilka se zmanjsa le, ce ob njej ne bi bilo prostora za besedo
  // ("112.5" pri 250 px je siroka skoraj kot vsa slika).
  const tocke = formatirajTocke(p.tocke)
  const beseda = tockZ(p.tocke)
  const vKrogu = t('lestvice.zgodba.vKrogu', { krog: p.krog })
  const ob = Math.max(meri(beseda, 52, 800), meri(vKrogu, 36, 600)) + 16
  const pxTock = prilagodiVelikost(tocke, 250, 150, sirina - ob, (px, s) => meri(s, px, 900))
  const razmikTock = -Math.round(pxTock * 0.04)
  const sirinaTock = meri(tocke, pxTock, 900) + razmikTock * (tocke.length - 1)
  e.push({ vrsta: 'besedilo', id: 'tocke', besedilo: tocke, x: ROB_P - 8, y: K + 530, px: pxTock, teza: 900, barva: KREM, poravnava: 'left', razmik: razmikTock })
  const desno = ROB_P + sirinaTock + 16
  e.push({ vrsta: 'besedilo', id: 'tockeBeseda', besedilo: beseda, x: desno, y: K + 450, px: 52, teza: 800, barva: ZLATA, poravnava: 'left' })
  e.push({ vrsta: 'besedilo', id: 'tockeKrog', besedilo: vKrogu, x: desno, y: K + 504, px: 36, teza: 600, barva: KREM_TIH, poravnava: 'left' })

  // Mesto na skupni lestvici in premik.
  if (p.mesto != null) {
    const besedilo = p.odEkip
      ? t('lestvice.plakat.mestoOd', { mesto: p.mesto, n: p.odEkip })
      : t('lestvice.mesto', { mesto: p.mesto })
    const premik = oznakaPremika(p.premik)
    const sirinaPremika = premik ? meri(premik.besedilo, 40, 800) + 28 : 0
    const m = vSirino(besedilo, 44, 30, 700, sirina - sirinaPremika, meri)
    e.push({ vrsta: 'besedilo', id: 'mesto', besedilo: m.besedilo, x: ROB_P, y: K + 610, px: m.px, teza: 700, barva: KREM, poravnava: 'left' })
    if (premik)
      e.push({ vrsta: 'besedilo', id: 'premik', besedilo: premik.besedilo, x: ROB_P + meri(m.besedilo, m.px, 700) + 28, y: K + 610, px: 40, teza: 800, barva: premik.barva, poravnava: 'left' })
  }

  e.push({ vrsta: 'pravokotnik', id: 'crta', x: ROB_P, y: K + 650, w: sirina, h: 2, barva: 'rgba(243,237,224,.16)' })

  // Kapetan in najboljsi igralec.
  let vrh = K + 676
  const istiIgralec = p.kapetan && p.najboljsi && p.kapetan.player_id === p.najboljsi.player_id
  if (p.kapetan) {
    const trak = p.kapetan.namestnik ? t('lestvice.zgodba.namestnik') : t('lestvice.zgodba.kapetan')
    const mnozitelj = p.kapetan.mnozitelj > 1 ? ` ×${p.kapetan.mnozitelj}` : ''
    const oznaka = istiIgralec ? t('lestvice.zgodba.kapetanInNajboljsi', { trak: trak + mnozitelj }) : trak + mnozitelj
    e.push(...vrsticaIgralca('kapetan', oznaka, p.kapetan, vrh, meri))
    vrh += VISINA_VRSTICE + 12
  }
  if (p.najboljsi && !istiIgralec) e.push(...vrsticaIgralca('najboljsi', t('lestvice.zgodba.najboljsi'), p.najboljsi, vrh, meri))

  // Noga kvadrata: naslov, da ga ima tudi obrezana slika.
  e.push({ vrsta: 'besedilo', id: 'splet', besedilo: 'slff.eu', x: ROB_P, y: K + KVADRAT.visina - 30, px: 44, teza: 900, barva: KREM, poravnava: 'left' })
  e.push({ vrsta: 'pravokotnik', id: 'splet.crta', x: ROB_P, y: K + KVADRAT.visina - 88, w: 72, h: 5, barva: ZLATA })

  // Pas pod kvadratom: vabilo. Spodnjih ~250 px zgodbe pokrije polje za
  // odgovor, zato stoji visje.
  const vabilo = vSirino(t('lestvice.plakat.premagajMe'), 40, 28, 700, sirina, meri)
  e.push({ vrsta: 'besedilo', id: 'vabilo', besedilo: vabilo.besedilo, x: S / 2, y: KVADRAT.y + KVADRAT.visina + 130, px: vabilo.px, teza: 700, barva: KREM_TIH, poravnava: 'center', samoPokoncno: true })

  return e
}
