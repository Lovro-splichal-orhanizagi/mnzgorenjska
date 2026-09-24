// Obvestila o mojih ekipah — iz odgovora `stanje_mojih_ekip()` sestavi, kar
// pokaže pas na vrhu strani. Ločeno od komponente, da se da preizkusiti brez
// brskalnika.
//
// Dve ravni:
//   * napaka  — ekipa ob roku NE bo dobila točk; ne da se skriti,
//   * opozorilo — ekipa je veljavna, a nekaj je vredno vedeti (poškodovan
//     kapetan, odsoten igralec v postavi). Da se skriti; skrito ostane skrito,
//     dokler ne pride novo poročilo.
import { prikazniIme } from './pomozno'
import { t } from '../i18n/jedro.ts'

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
  const ime = prikazniIme(o.ime) || t('mojaEkipa.igralec')
  const vrsta = o.vrsta === 'poskodba' ? 'poskodba' : 'odsotnost'
  const vloga = o.kapetan ? 'kapetan' : o.namestnik ? 'namestnik' : o.v_postavi ? 'vPostavi' : 'naKlopi'
  return {
    besedilo: t(`mojaEkipa.opozorila.igralec.${vloga}.${vrsta}`, { ime }),
    posledica: t(`mojaEkipa.opozorila.posledica.${vloga}`),
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
      const razlog = e.razlog ?? t('mojaEkipa.opozorila.razlog')
      if (e.brez_tock) {
        napake.push({
          kljuc: `napaka:${e.team_id}`,
          slug: e.slug,
          liga: e.liga,
          besedilo: e.krog
            ? t('mojaEkipa.opozorila.brezTockKrog', { krog: e.krog })
            : t('mojaEkipa.opozorila.brezTockRok'),
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
            besedilo: t('mojaEkipa.opozorila.nepopolna'),
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
  if (n === 1) return t('mojaEkipa.opozorila.naslovNapakEna')
  return t('mojaEkipa.opozorila.naslovNapak', { n })
}
