// Tuja ekipa v zaklenjenem krogu.
//
// Vsa pravila o tem, kaj se sme videti, so v bazi (`tuja_postava`). Tu je le
// tisto, kar je treba z vrsticami se narediti, preden gredo na igrisce:
// razdeliti na postavo in klop ter iz mnozitelja izracunati, koliko je
// igralec ekipi v resnici prinesel.
import { VRSTNI_RED } from './pravila'
import type { Pozicija } from './tipi'
import type { IgralecEnajsterice } from '../components/EnajstericaNaIgriscu'

/** Vrstica, kot jo vrne `tuja_postava`. */
export interface VrsticaTuje {
  player_id: number
  ime: string | null
  klub: string | null
  pozicija: Pozicija | null
  mnozitelj: number
  je_kapetan: boolean
  je_namestnik: boolean
  je_zacetnik: boolean
  tocke: number | string | null
}

/** Koliko je igralec ekipi prinesel — mnozitelj je ze vracunan. */
export function prispevek(v: VrsticaTuje): number {
  return Number(v.tocke ?? 0) * v.mnozitelj
}

export function skupajTock(vrstice: VrsticaTuje[]): number {
  return vrstice.reduce((vsota, v) => vsota + prispevek(v), 0)
}

/**
 * Postava so tisti z mnoziteljem nad nic — torej po samodejnih menjavah, ne
 * po tem, kdo je bil ob roku napisan med zacetnike. Kdor ni igral, je padel
 * iz postave, tudi ce ga je lastnik postavil v enajsterico.
 */
export function razdeli(vrstice: VrsticaTuje[]): {
  postava: VrsticaTuje[]
  klop: VrsticaTuje[]
} {
  const mesto = (p: Pozicija | null) =>
    p ? VRSTNI_RED.indexOf(p) : VRSTNI_RED.length
  const poPoziciji = (a: VrsticaTuje, b: VrsticaTuje) =>
    mesto(a.pozicija) - mesto(b.pozicija)
  return {
    postava: vrstice.filter((v) => v.mnozitelj > 0).sort(poPoziciji),
    klop: vrstice.filter((v) => v.mnozitelj === 0).sort(poPoziciji),
  }
}

/**
 * Oznaka ob imenu: kapetan, namestnik, ali nic.
 *
 * Trak je viden le, kadar kaj pomeni: namestnik ga dobi sele, ko kapetan ni
 * igral in je mnozitelj presel nanj. Sicer je samo rezerva za trak in bi ga
 * "N" ob dresu po nepotrebnem izenacil s kapetanom.
 */
export function oznaka(v: VrsticaTuje): string | null {
  if (v.je_kapetan) return 'K'
  if (v.je_namestnik) return 'N'
  return null
}

/** Igralec, kakor ga pricakuje `EnajstericaNaIgriscu`. */
export function zaIgrisce(v: VrsticaTuje): IgralecEnajsterice {
  return {
    player_id: v.player_id,
    full_name: v.ime,
    position: v.pozicija,
    points: prispevek(v),
    team_name: v.klub,
    // Na igriscu pokazemo trak tam, kjer je mnozitelj: kapetan, ali namestnik,
    // ki je vskocil namesto njega.
    oznaka: v.mnozitelj > 1 ? (v.je_kapetan ? 'K' : 'N') : null,
  }
}

/**
 * Kapetanstvo prevzame namestnik, kadar kapetan ni igral. Mnozitelj to ze
 * pove, zato ga ni treba racunati se enkrat — le povedati je treba.
 */
export function namestnikJeVskocil(vrstice: VrsticaTuje[]): boolean {
  const kapetan = vrstice.find((v) => v.je_kapetan)
  const namestnik = vrstice.find((v) => v.je_namestnik)
  return !!kapetan && kapetan.mnozitelj === 0 && !!namestnik && namestnik.mnozitelj > 1
}
