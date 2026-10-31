// Personalizacija postavke: vnos, kot ga pošlje brskalnik (trgovina_rezerviraj,
// trgovina.personaliziraj), in preverjanje, ki ga brskalnik le zrcali. Pravilo
// velja v bazi; tu je, da kupec napako vidi med tipkanjem. Seznama žaljivk
// (prepovedano_besedilo) brskalnik ne pozna: zavrne ga šele plačilo.
import type { Kljuc } from './besede'

export type Vrsta = 'ime_ekipe' | 'poljubno_ime' | 'stevilka' | 'prvak' | 'znacka'

/** Vrednost polja motiva, kot jo pošlje brskalnik: besedilo, število, id ekipe ali prvak. */
export type VrednostVnosa = string | number | { mini_liga_id: number; sezona: string }

/**
 * Vnos ene postavke. Stara oblika: ključi le izmed možnosti izdelka. Motiv:
 * le {motiv, polja, shema}; baza preveri vsako polje po vrsti.
 */
export interface Personalizacija {
  motiv?: string
  polja?: Record<string, VrednostVnosa>
  shema?: string
  ime_ekipe?: number
  poljubno_ime?: string
  stevilka?: number
  prvak?: { mini_liga_id: number; sezona: string }
  znacka?: Record<string, never>
}

export interface Moznost {
  vrsta: Vrsta
  doplacilo: number
  obvezna: boolean
}

/** Kot v bazi: presledki strnjeni in obrezani. */
export const normaliziraj = (s: string): string => s.replace(/\s+/g, ' ').trim()

const ZNAKI = /^[A-Za-zÀ-ÖØ-öø-ž .-]+$/
const CRKA = /[A-Za-zÀ-ÖØ-öø-ž]/

/** Napaka poljubnega imena (1–12 znakov, vsaj ena črka; črke, presledek, pika, vezaj) ali null. */
export function napakaImena(s: string): Kljuc | null {
  const v = normaliziraj(s)
  const n = [...v].length
  if (n === 0) return 'pers.napaka.prazno'
  if (n > 12) return 'pers.napaka.dolgo'
  if (!ZNAKI.test(v) || !CRKA.test(v)) return 'pers.napaka.znaki'
  return null
}

/** "7" → 7; vse, kar ni celo število 0–99, → null. */
export const stevilka = (s: string): number | null => (/^\d{1,2}$/.test(s.trim()) ? Number(s.trim()) : null)

/** Doplačilo na kos za izbrane možnosti ali motiv (prikaz; pravo izračuna baza). */
export const doplacilo = (moznosti: Moznost[], p: Personalizacija | undefined, motivi: { slug: string; doplacilo: number }[] = []): number =>
  !p ? 0 : p.motiv !== undefined ? (motivi.find((m) => m.slug === p.motiv)?.doplacilo ?? 0)
    : moznosti.filter((m) => m.vrsta in p).reduce((s, m) => s + m.doplacilo, 0)

// Črke vseh jezikov trgovine: latinica (tudi ș ț ə), grščina, cirilica (mk, uk), armenščina.
// Isti nabor v trgovina.vrednost_polja; pisave motivov jih imajo (risba.ts, PISAVA_MOTIVOV).
const CRKE_MOTIVA = 'A-Za-zÀ-ÖØ-öø-žȘșȚțƏəͰ-ϿЀ-џҐ-ҟԱ-֏'
const ZNAKI_MOTIVA = new RegExp(`^[${CRKE_MOTIVA}0-9 .'&!?-]+$`)
const CRKA_MOTIVA = new RegExp(`[${CRKE_MOTIVA}]`)

/**
 * Napaka vnosa polja motiva (zrcali trgovina.vrednost_polja) ali null. Prazno
 * polje tu ni napaka: obveznost preveri gumb, žaljivke baza ob plačilu.
 */
export function napakaPolja(vrsta: string, surovo: string, max = 12, letos = new Date().getFullYear(), min = 0, danes = new Date()): Kljuc | null {
  const v = normaliziraj(surovo)
  if (!v) return null
  if (vrsta === 'besedilo') {
    if ([...v].length > max) return 'motiv.napaka.dolgo'
    if (!ZNAKI_MOTIVA.test(v) || !CRKA_MOTIVA.test(v)) return 'motiv.napaka.znaki'
  }
  if (vrsta === 'stevilka' && min > 0 && (stevilka(v) ?? 0) < min) return 'motiv.napaka.ocena'
  if (vrsta === 'stevilka' && stevilka(v) === null) return 'pers.napaka.stevilka'
  if (vrsta === 'datum' && !veljavenDatum(v, danes)) return 'motiv.napaka.datum'
  if (vrsta === 'leto' && !(/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= letos)) return 'motiv.napaka.leto'
  return null
}

/** Isti dan čez leto (krajevni datum) kot current_date + interval '1 year': 29. 2. → 28. 2. */
export function letoNaprej(danes = new Date()): string {
  const [l, m] = [danes.getFullYear() + 1, danes.getMonth()]
  const d = Math.min(danes.getDate(), new Date(Date.UTC(l, m + 1, 0)).getUTCDate())
  return `${l}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "YYYY-MM-DD" (pravi dan) od 1950-01-01 do leta naprej, kot trgovina.vrednost_polja. */
export function veljavenDatum(v: string, danes = new Date()): boolean {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!d) return false
  const t = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3])))
  if (t.toISOString().slice(0, 10) !== v) return false
  return v >= '1950-01-01' && v <= letoNaprej(danes)
}

const vrednostOk = (v: unknown): boolean =>
  typeof v === 'string' || (typeof v === 'number' && Number.isSafeInteger(v))
  || (typeof v === 'object' && v !== null && !Array.isArray(v) && Number.isSafeInteger((v as { mini_liga_id?: unknown }).mini_liga_id)
    && typeof (v as { sezona?: unknown }).sezona === 'string' && Object.keys(v).length === 2)

const VRSTE: Vrsta[] = ['ime_ekipe', 'poljubno_ime', 'stevilka', 'prvak', 'znacka']

/** Shranjena vrednost je od brskalnika: vzamemo le pravo obliko, sicer null. */
export function veljavnaOblika(v: unknown): Personalizacija | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if ('motiv' in o) {
    const p = o.polja as Record<string, unknown> | undefined
    return typeof o.motiv === 'string' && /^[a-z0-9-]+$/.test(o.motiv) && typeof o.shema === 'string'
      && Object.keys(o).every((k) => ['motiv', 'polja', 'shema'].includes(k))
      && (p === undefined || (typeof p === 'object' && p !== null && !Array.isArray(p) && Object.values(p).every(vrednostOk)))
      ? (o as Personalizacija) : null
  }
  if (!Object.keys(o).every((k) => VRSTE.includes(k as Vrsta)) || Object.keys(o).length === 0) return null
  if ('ime_ekipe' in o && !Number.isSafeInteger(o.ime_ekipe)) return null
  if ('poljubno_ime' in o && typeof o.poljubno_ime !== 'string') return null
  if ('stevilka' in o && !(Number.isInteger(o.stevilka) && (o.stevilka as number) >= 0 && (o.stevilka as number) <= 99)) return null
  if ('prvak' in o) {
    const p = o.prvak as { mini_liga_id?: unknown; sezona?: unknown } | null
    if (!p || !Number.isSafeInteger(p.mini_liga_id) || typeof p.sezona !== 'string') return null
  }
  if ('znacka' in o && (typeof o.znacka !== 'object' || o.znacka === null || Object.keys(o.znacka).length > 0)) return null
  return o as Personalizacija
}

/** Isti vnos da isti niz ne glede na vrstni red ključev (istovetnost vrstice v košarici). */
export function stabilno(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? ''
  if (Array.isArray(v)) return `[${v.map(stabilno).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stabilno(o[k])}`).join(',')}}`
}

/** Velikost pisave imena v enotah 300 široke oblike: dolgo besedilo se zmanjša. */
export const velikostImena = (ime: string): number => Math.min(44, Math.floor(520 / Math.max(1, [...ime].length)))

const xml = (s: string): string =>
  s.replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[z]!)

export const PISAVA = "Inter, 'Segoe UI', Arial, sans-serif"

/** Oblika za tiskarno (hrbet majice ali skodelica): ime zgoraj, številka pod njim. Besedilo je ubežano. */
export function oblikaSvg(ime: string | null, st: number | null): string {
  const vrstice: string[] = []
  if (ime) {
    vrstice.push(`<text x="150" y="70" text-anchor="middle" font-family="${xml(PISAVA)}" font-weight="900" font-size="${velikostImena(ime)}" letter-spacing="2">${xml(ime.toUpperCase())}</text>`)
  }
  if (st !== null) {
    vrstice.push(`<text x="150" y="${ime ? 250 : 200}" text-anchor="middle" font-family="${xml(PISAVA)}" font-weight="900" font-size="170">${st}</text>`)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="300mm" viewBox="0 0 300 300">${vrstice.join('')}</svg>\n`
}

/** Celica CSV (ločilo ;): v narekovajih; začetni =, +, -, @ ne sproži formule v preglednici. */
export const celicaCsv = (v: string | number | null): string => {
  const s = v === null ? '' : String(v)
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}
