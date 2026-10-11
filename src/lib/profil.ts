// Profil uporabnika: avatar brez nalaganja slik in pravila prikaznega imena.
//
// Odloča baza (`varuj_prikazno_ime`, migracija 20261012081100); tu je isto
// pravilo, da obrazec napako pove pred klicem, in prevod kode napake (`hint`).

/** Paleta avatarja; indeks je `profiles.avatar_barva` (0–11, preveri baza). */
export const BARVE_AVATARJA = [
  '#16a34a', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#14b8a6', '#64748b', '#0f766e', '#be123c',
] as const

/** Nogometne ikone (`profiles.avatar_ikona`); nabor preveri baza. */
export const IKONE_AVATARJA = {
  zoga: '⚽',
  gol: '🥅',
  pokal: '🏆',
  copat: '👟',
  rokavice: '🧤',
  dres: '🎽',
  zastavica: '🚩',
  navijac: '📣',
} as const

export type IkonaAvatarja = keyof typeof IKONE_AVATARJA

export const jeIkona = (x: unknown): x is IkonaAvatarja =>
  typeof x === 'string' && Object.prototype.hasOwnProperty.call(IKONE_AVATARJA, x)

/** Barva avatarja: izbrana, sicer stalna iz id-ja (isti človek, ista barva). */
export function barvaAvatarja(id: string | null | undefined, barva: number | null | undefined): string {
  if (barva != null && barva >= 0 && barva < BARVE_AVATARJA.length) return BARVE_AVATARJA[barva]
  let vsota = 0
  for (const c of id ?? '') vsota = (vsota * 31 + c.charCodeAt(0)) % 9973
  return BARVE_AVATARJA[vsota % BARVE_AVATARJA.length]
}

/** Do dve začetnici prikaznega imena ("Janez Novak" → "JN", "luka" → "L"). */
export function zacetniceImena(ime: string | null | undefined): string {
  const besede = (ime ?? '').trim().split(/\s+/).filter((b) => /[\p{L}\p{N}]/u.test(b))
  const crke = besede.slice(0, 2).map((b) => (b.match(/[\p{L}\p{N}]/u) ?? ['?'])[0])
  return crke.join('').toUpperCase() || '?'
}

export type NapakaImena = 'dolzina' | 'znaki' | 'rezervirano' | 'neprimerno' | 'prepogosto' | 'zasedeno'

const REZERVIRANO = /(admin|slff|moderat|support|podpora|helpstack|sysop|official|uradn|ekipaslff)/
const NEPRIMERNO = /(fuck|shit|cunt|nigg|hitler|kurac|pizd|picka|jebem|jebi|kurva|faggot|retard|fotze|kokot)/

/** Ime, kot ga shrani baza: brez presledkov na robovih in podvojenih vmes. */
export const pocistiIme = (ime: string): string => ime.replace(/\s+/g, ' ').trim()

/**
 * Znaki, rezervirane besede in žaljivke: isto kot `prepovedano_besedilo` v
 * bazi (prikazno ime in ime ter opis javne mini lige). Vrne kodo ali null.
 */
export function prepovedanoBesedilo(besedilo: string): 'znaki' | 'rezervirano' | 'neprimerno' | null {
  const v = pocistiIme(besedilo)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f<>{}[\]|\\/@#$%^*=+~`"]/.test(v) || /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/.test(v))
    return 'znaki'
  const cisto = v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0134578@$!|]/g, (c) => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' })[c] ?? c)
    .replace(/[^a-z]/g, '')
  if (REZERVIRANO.test(cisto)) return 'rezervirano'
  if (NEPRIMERNO.test(cisto)) return 'neprimerno'
  return null
}

/**
 * Isto pravilo kot `napaka_prikaznega_imena` v bazi (brez enoličnosti in
 * omejitve 7 dni, ki ju pozna le baza). Vrne kodo napake ali null.
 */
export function preveriImeProfila(ime: string): NapakaImena | null {
  const dolzina = [...pocistiIme(ime)].length
  if (dolzina < 3 || dolzina > 24) return 'dolzina'
  return prepovedanoBesedilo(ime)
}

/** Koda napake iz odgovora baze (`hint` sprožilca ali 23505 enoličnega indeksa). */
export function napakaIzBaze(napaka: { hint?: string | null; code?: string | null } | null): NapakaImena | null {
  if (!napaka) return null
  if (napaka.code === '23505') return 'zasedeno'
  const koda = napaka.hint?.replace(/^ime-/, '')
  return koda === 'dolzina' || koda === 'znaki' || koda === 'rezervirano' || koda === 'neprimerno' ||
    koda === 'prepogosto' || koda === 'zasedeno'
    ? koda
    : null
}

/** Kdaj sme uporabnik ime spet spremeniti (null = takoj). */
export function naslednjaSpremembaImena(spremenjeno: string | null | undefined, zdaj = Date.now()): Date | null {
  if (!spremenjeno) return null
  const kdaj = new Date(new Date(spremenjeno).getTime() + 7 * 24 * 3600 * 1000)
  return kdaj.getTime() > zdaj ? kdaj : null
}

/** Javni profil, kot ga vrne `javni_profil(id)`. */
export interface JavniProfil {
  id: string
  ime: string
  javen: boolean
  jaz: boolean
  avatar_barva?: number | null
  avatar_ikona?: string | null
  clan_od?: string
  navijam?: { id: number; ime: string; kratko: string | null; grb: string | null } | null
  ekipe?: {
    id: number
    ime: string
    tocke: number
    mesto: number
    ekip: number
    krogov: number
    liga: string
    liga_ime: string
    liga_kratko: string | null
    drzava: string | null
  }[]
  mini_lige?: { id: number; ime: string; clanov: number }[]
  dosezki?: {
    sezon: number
    krogov: number
    najboljsi: { tocke: number; krog: number; sezona: string; liga: string } | null
  } | null
}
