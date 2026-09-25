// Ali je liga pripravljena, da jo vklopimo.
//
// Vklop je ena vrstica (`active = true`), posledice pa niso: od tistega hipa
// ljudje sestavljajo ekipe iz tega cenika. Liga, v kateri stane vsak igralec
// 4.5, nima igre — 15 × 4.5 = 67.5 pri proračunu 100, vsaka ekipa je enaka in
// nič ne razlikuje dobre izbire od slabe.
//
// Preverbe niso naključne. Vsaka je napaka, ki se je pri MNZ Ljubljana res
// zgodila in **ni ničesar javila**: uvoz je poročal uspeh in vpisal smeti.
import { POZICIJE, VELIKOST_EKIPE, MAX_IZ_KLUBA, PRORACUN } from './pravila.ts'
import type { Pozicija } from './tipi'

/** Delež igralcev s privzeto ceno, pri katerem cenik še loči dobre od slabih. */
const NAJVEC_PRIVZETIH_ODSTOTKOV = 70

/** Brez vsaj enega dražjega igralca cenik nima vrha. */
const NAJNIZJI_VRH = 8

export interface IgralecZaKader {
  id: number
  team_id: number | null
  position: string | null
  value: number | string | null
}

/** Pohlepna izbira zasede klub prezgodaj; ohraniti moramo vse dosegljive kvote. */
export function najcenejsiKader(igralci: readonly IgralecZaKader[]): number | null {
  const izbor = najcenejsiIzbor(igralci)
  return izbor
    ? izbor.reduce((v, i) => v + Math.round(Number(i.value) * 100), 0) / 100
    : null
}

/**
 * Igralci najcenejšega veljavnega kadra ali `null`, če ga ni. Stanje je
 * število izbranih po pozicijah; kluba obdelamo enega za drugim, zato njegova
 * omejitev treh velja natanko enkrat. Ob enaki ceni obdrži vrstni red vhoda —
 * kdor poda igralce po kakovosti, dobi pri isti ceni boljšega.
 *
 * Z `omejitve` dopolni delno sestavljen kader: `kvote` so manjkajoča mesta po
 * pozicijah, `zasedeno` pa, koliko igralcev iz kluba je v kadru že.
 */
export function najcenejsiIzbor<T extends IgralecZaKader>(
  igralci: readonly T[],
  omejitve?: { kvote?: Record<Pozicija, number>; zasedeno?: ReadonlyMap<number, number> },
): T[] | null {
  const pozicije = Object.keys(POZICIJE) as Pozicija[]
  const kvote = pozicije.map((p) => omejitve?.kvote?.[p] ?? POZICIJE[p].kader)
  const koraki: number[] = []
  let stanj = 1
  for (const kvota of kvote) {
    koraki.push(stanj)
    stanj *= kvota + 1
  }
  const stevila = Array.from({ length: stanj }, (_, stanje) =>
    kvote.map((kvota, p) => Math.floor(stanje / koraki[p]) % (kvota + 1)),
  )
  const klubi = new Map<number, { cena: number; igralec: T }[][]>()
  const videni = new Set<number>()
  for (const i of igralci) {
    const p = pozicije.indexOf(i.position as Pozicija)
    const cena = Number(i.value)
    if (p < 0 || i.team_id == null || i.value == null ||
        !Number.isFinite(cena) || cena < 0 || videni.has(i.id)) continue
    videni.add(i.id)
    let klub = klubi.get(i.team_id)
    if (!klub) {
      klub = pozicije.map(() => [])
      klubi.set(i.team_id, klub)
    }
    // Celoštevilski centi preprečijo zavrnitev kadra točno na meji proračuna.
    klub[p].push({ cena: Math.round(cena * 100), igralec: i })
  }

  interface Moznost { stevila: number[]; zamik: number; cena: number }
  let cene = Array<number>(stanj).fill(Infinity)
  cene[0] = 0
  // Za vsak klub: iz katerega stanja in s katero možnostjo smo prišli.
  const sledi: { klub: { cena: number; igralec: T }[][]; moznosti: Moznost[]; od: Int32Array; izbira: Int32Array }[] = []
  for (const [klubId, klub] of klubi) {
    const meja = Math.max(0, MAX_IZ_KLUBA - (omejitve?.zasedeno?.get(klubId) ?? 0))
    for (const cenePozicije of klub) cenePozicije.sort((a, b) => a.cena - b.cena)
    const vsote = klub.map((cenePozicije) => {
      const vsota = [0]
      for (const { cena } of cenePozicije.slice(0, meja))
        vsota.push(vsota[vsota.length - 1] + cena)
      return vsota
    })
    const moznosti: Moznost[] = []
    const dodaj = (p: number, n: number[], skupaj: number, zamik: number, cena: number): void => {
      if (p === pozicije.length) {
        moznosti.push({ stevila: n, zamik, cena })
        return
      }
      for (let k = 0; k <= Math.min(kvote[p], meja - skupaj, vsote[p].length - 1); k++)
        dodaj(p + 1, [...n, k], skupaj + k, zamik + k * koraki[p], cena + vsote[p][k])
    }
    dodaj(0, [], 0, 0, 0)

    const nove = Array<number>(stanj).fill(Infinity)
    const od = new Int32Array(stanj).fill(-1)
    const izbira = new Int32Array(stanj).fill(-1)
    for (let stanje = 0; stanje < stanj; stanje++) {
      if (!Number.isFinite(cene[stanje])) continue
      moznosti.forEach((m, mi) => {
        if (m.stevila.some((n, p) => stevila[stanje][p] + n > kvote[p])) return
        const cilj = stanje + m.zamik
        if (cene[stanje] + m.cena < nove[cilj]) {
          nove[cilj] = cene[stanje] + m.cena
          od[cilj] = stanje
          izbira[cilj] = mi
        }
      })
    }
    cene = nove
    sledi.push({ klub, moznosti, od, izbira })
  }
  if (!Number.isFinite(cene[stanj - 1])) return null

  // Pot nazaj od polnega kadra do praznega.
  const izbrani: T[] = []
  let stanje = stanj - 1
  for (let k = sledi.length - 1; k >= 0; k--) {
    const { klub, moznosti, od, izbira } = sledi[k]
    const m = moznosti[izbira[stanje]]
    m.stevila.forEach((n, p) => {
      for (const { igralec } of klub[p].slice(0, n)) izbrani.push(igralec)
    })
    stanje = od[stanje]
  }
  return izbrani
}

export interface StanjeLige {
  aktivnih: number
  privzetih: number
  klubov: number
  najvisjaCena: number
  poPozicijah: Record<Pozicija, number>
  nastopovSKlopi: number
  golovBrezNastopa: number
  krogovTekoce: number
  igralci?: readonly IgralecZaKader[]
}

export interface Tezava {
  kljuc: string
  kaj: string
  zakaj: string
}

export interface Ocena {
  pripravljena: boolean
  odstotekPrivzetih: number
  tezave: Tezava[]
}

export function oceniPripravljenost(s: StanjeLige): Ocena {
  const tezave: Tezava[] = []
  const odstotekPrivzetih = s.aktivnih
    ? Math.round((1000 * s.privzetih) / s.aktivnih) / 10
    : 100

  if (!s.krogovTekoce)
    tezave.push({
      kljuc: 'krogi',
      kaj: 'Tekoča sezona nima krogov.',
      zakaj: 'Brez razporeda ni rokov in ni česa igrati — najprej uvozi razpored.',
    })

  // Isti minimum uporablja nočni nadzor; ločeni števci ne zajamejo prepleta omejitev.
  const cena = s.igralci ? najcenejsiKader(s.igralci) : null
  if (!s.igralci)
    tezave.push({
      kljuc: 'kader-podatki',
      kaj: 'Manjkajo podatki za preverbo kadra.',
      zakaj: 'Brez klubov, pozicij in cen igralcev izvedljivosti kadra ni mogoče potrditi.',
    })
  else if (cena === null)
    tezave.push({
      kljuc: 'kader-nemogoc',
      kaj: 'Veljavnega kadra ni mogoče sestaviti.',
      zakaj: `Kader potrebuje ${VELIKOST_EKIPE} igralcev s predpisanimi pozicijami in največ ${MAX_IZ_KLUBA} iz istega kluba.`,
    })
  else if (cena > PRORACUN)
    tezave.push({
      kljuc: 'kader-predrag',
      kaj: `Najcenejši veljaven kader stane ${cena.toFixed(1)}.`,
      zakaj: `Proračun je ${PRORACUN}, zato ekipe ni mogoče kupiti.`,
    })

  if (odstotekPrivzetih > NAJVEC_PRIVZETIH_ODSTOTKOV || s.najvisjaCena < NAJNIZJI_VRH)
    tezave.push({
      kljuc: 'cene',
      kaj: `Privzeto ceno ima ${odstotekPrivzetih} % igralcev, najvišja je ${s.najvisjaCena}.`,
      zakaj:
        'Cena je percentil znotraj lige, igralec pod 270 minutami pa dobi privzeto 4.5. ' +
        'Uvozi še eno arhivsko sezono in poženi vrednotenje brez `--sezona`, da sešteje vse.',
    })

  if (!s.nastopovSKlopi)
    tezave.push({
      kljuc: 'menjave',
      kaj: 'Nihče ni vstopil s klopi.',
      zakaj:
        'Razčlenjevalnik menjav pri tem viru ne prebere pravilno — vsi začetniki dobijo 90 minut, ' +
        'menjava pa nastopa sploh nima. Iz teh minut se računajo cene.',
    })

  if (s.golovBrezNastopa)
    tezave.push({
      kljuc: 'goli',
      kaj: `${s.golovBrezNastopa} golov nima nastopa strelca.`,
      zakaj: 'Strelec na tekmi uradno ni igral, zato gol ne prinese točk. Kaže na nepopolne postave.',
    })

  return { pripravljena: tezave.length === 0, odstotekPrivzetih, tezave }
}
