// Ali je liga pripravljena, da jo vklopimo.
//
// Vklop je ena vrstica (`active = true`), posledice pa niso: od tistega hipa
// ljudje sestavljajo ekipe iz tega cenika. Liga, v kateri stane vsak igralec
// 4.5, nima igre — 15 × 4.5 = 67.5 pri proračunu 100, vsaka ekipa je enaka in
// nič ne razlikuje dobre izbire od slabe.
//
// Preverbe niso naključne. Vsaka je napaka, ki se je pri MNZ Ljubljana res
// zgodila in **ni ničesar javila**: uvoz je poročal uspeh in vpisal smeti.
import { POZICIJE, VELIKOST_EKIPE, MAX_IZ_KLUBA } from './pravila.ts'
import type { Pozicija } from './tipi'

/** Delež igralcev s privzeto ceno, pri katerem cenik še loči dobre od slabih. */
const NAJVEC_PRIVZETIH_ODSTOTKOV = 70

/** Brez vsaj enega dražjega igralca cenik nima vrha. */
const NAJNIZJI_VRH = 8

export interface StanjeLige {
  aktivnih: number
  privzetih: number
  klubov: number
  najvisjaCena: number
  poPozicijah: Record<Pozicija, number>
  nastopovSKlopi: number
  golovBrezNastopa: number
  krogovTekoce: number
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

/** Najmanj klubov, da je kader sploh mogoč (največ trije igralci iz kluba). */
const NAJMANJ_KLUBOV = Math.ceil(VELIKOST_EKIPE / MAX_IZ_KLUBA)

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

  if (s.klubov < NAJMANJ_KLUBOV)
    tezave.push({
      kljuc: 'klubi',
      kaj: `Klubov je ${s.klubov}, potrebnih je vsaj ${NAJMANJ_KLUBOV}.`,
      zakaj: `Iz kluba smeš izbrati največ ${MAX_IZ_KLUBA} igralce, zato kadra ${VELIKOST_EKIPE} igralcev iz manj klubov ni mogoče sestaviti.`,
    })

  for (const [koda, pravilo] of Object.entries(POZICIJE)) {
    const naVoljo = s.poPozicijah?.[koda as Pozicija] ?? 0
    if (naVoljo < pravilo.kader)
      tezave.push({
        kljuc: `pozicija-${koda}`,
        kaj: `${pravilo.naslov}: na voljo ${naVoljo}, kader jih potrebuje ${pravilo.kader}.`,
        zakaj: 'Ekipe ne bo mogoče sestaviti; pozicije dopolni glasovanje ali uvoz.',
      })
  }

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
