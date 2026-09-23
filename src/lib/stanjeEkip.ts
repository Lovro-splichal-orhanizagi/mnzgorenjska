// Obvestila o mojih ekipah — iz odgovora `stanje_mojih_ekip()` sestavi, kar
// pokaže pas na vrhu strani. Ločeno od komponente, da se da preizkusiti brez
// brskalnika.
//
// Dve ravni:
//   * napaka  — ekipa ob roku NE bo dobila točk; ne da se skriti,
//   * opozorilo — ekipa je veljavna, a nekaj je vredno vedeti (poškodovan
//     kapetan, odsoten igralec v postavi). Da se skriti; skrito ostane skrito,
//     dokler ne pride novo poročilo.
import { oblika, prikazniIme } from './pomozno'

export interface OpozoriloIgralca {
  player_id: number
  ime: string | null
  vrsta: 'poskodba' | 'odsotnost'
  opis: string | null
  datum: string
  v_postavi: boolean
  kapetan: boolean
  namestnik: boolean
}

export interface StanjeEkipe {
  competition_id: number
  slug: string
  liga: string
  team_id: number
  team_name: string
  veljavna: boolean
  brez_tock: boolean
  razlog: string | null
  krog: number | null
  rok: string | null
  opozorila: OpozoriloIgralca[]
}

export interface Obvestilo {
  kljuc: string
  slug: string
  liga: string
  besedilo: string
  podrobnost?: string
}

/** Ključ opozorila: novo poročilo o istem igralcu je novo opozorilo. */
export function kljucOpozorila(ekipa: number, o: OpozoriloIgralca): string {
  return `${ekipa}:${o.player_id}:${o.datum}`
}

function stavekIgralca(o: OpozoriloIgralca): { besedilo: string; posledica: string } {
  const ime = prikazniIme(o.ime) || 'Igralec'
  const stanje = o.vrsta === 'poskodba' ? 'je poškodovan' : 'je odsoten'
  if (o.kapetan)
    return {
      besedilo: `Kapetan ${ime} ${stanje}.`,
      posledica: 'Če ne igra, trak prevzame namestnik — morda raje izberi drugega kapetana.',
    }
  if (o.namestnik)
    return {
      besedilo: `Namestnik kapetana ${ime} ${stanje}.`,
      posledica: 'Če ne igrata ne kapetan ne namestnik, trojnih točk ni.',
    }
  if (o.v_postavi)
    return {
      besedilo: `${ime} ${stanje} in je v prvi postavi.`,
      posledica: 'Če ne igra, ga zamenja prvi igralec z iste pozicije s klopi.',
    }
  return {
    besedilo: `${ime} na klopi ${stanje}.`,
    posledica: 'Pri samodejni menjavi ga bo sistem preskočil, če ne igra.',
  }
}

export function obvestilaEkip(
  ekipe: StanjeEkipe[],
  moznosti: { skrijLigo?: string | null; skrita?: ReadonlySet<string> } = {},
): { napake: Obvestilo[]; opozorila: Obvestilo[] } {
  const napake: Obvestilo[] = []
  const opozorila: Obvestilo[] = []
  for (const e of ekipe) {
    if (moznosti.skrijLigo && e.slug === moznosti.skrijLigo) continue
    if (!e.veljavna) {
      const razlog = e.razlog ?? 'Ekipa ne izpolnjuje pravil.'
      if (e.brez_tock) {
        napake.push({
          kljuc: `napaka:${e.team_id}`,
          slug: e.slug,
          liga: e.liga,
          besedilo: e.krog
            ? `V ${e.krog}. krogu ne bo dobila točk.`
            : 'Ob naslednjem roku ne bo dobila točk.',
          podrobnost: razlog,
        })
      } else {
        // Prvi fantasy krog se zaklene tudi z nepopolnim kadrom.
        const kljuc = `nepopolna:${e.team_id}:${e.krog ?? ''}`
        if (!moznosti.skrita?.has(kljuc))
          opozorila.push({
            kljuc,
            slug: e.slug,
            liga: e.liga,
            besedilo: 'Ekipa ni popolna — ta krog se še zaklene, od naslednjega pa ne bo dobila točk.',
            podrobnost: razlog,
          })
      }
    }
    for (const o of e.opozorila ?? []) {
      const kljuc = kljucOpozorila(e.team_id, o)
      if (moznosti.skrita?.has(kljuc)) continue
      const { besedilo, posledica } = stavekIgralca(o)
      opozorila.push({
        kljuc,
        slug: e.slug,
        liga: e.liga,
        besedilo,
        podrobnost: o.opis ? `${o.opis} · ${posledica}` : posledica,
      })
    }
  }
  return { napake, opozorila }
}

/** Naslov rdečega pasu z ujemanjem v številu: ena / dve / tri-štiri / pet+. */
export function naslovNapak(n: number): string {
  if (n === 1) return 'Ena od tvojih ekip ne bo dobila točk'
  return `${n} ${oblika(n, [
    'tvoja ekipa ne bo dobila',
    'tvoji ekipi ne bosta dobili',
    'tvoje ekipe ne bodo dobile',
    'tvojih ekip ne bo dobilo',
  ])} točk`
}
