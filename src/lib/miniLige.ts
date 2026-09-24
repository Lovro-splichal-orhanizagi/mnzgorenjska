// Mini lige — pravila, ki niso slog.
//
// Ločeno od strani, da jih preverja `npm run smoke` brez omrežja: normalizacija
// kode in razvrstitev lestvice odločata, ali se človek pridruži in kdo je prvi.

import { t } from '../i18n/jedro.ts'

/** Vrstica pogleda `mini_liga_lestvica`. */
export interface MiniVrstica {
  fantasy_team_id: number | null
  team_name: string | null
  owner_name: string | null
  total_points: number | null
  rounds_played: number | null
  points_per_round: number | null
  competition_short: string | null
  federation_short: string | null
}

export interface MiniLiga {
  id: number
  name: string
  code: string
  owner_id: string
}

/** Znaki, iz katerih je koda — brez dvoumnih 0/O in 1/I/L. */
export const ZNAKI_KODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const DOLZINA_KODE = 6

/**
 * Pripravi kodo, kot jo je človek vtipkal.
 *
 * Koda potuje po SMS, na glas ali na listku, zato pride nazaj z malimi
 * črkami, presledki ali vezaji. Vse to je ista koda — zavrniti jo zaradi
 * oblike pomeni izgubiti človeka na zadnjem koraku.
 */
export function ocistiKodo(vnos: string): string {
  return (vnos ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Ali je koda sploh lahko veljavna? Preveri PREDEN gremo na strežnik. */
export function kodaJeVeljavna(vnos: string): boolean {
  const k = ocistiKodo(vnos)
  if (k.length !== DOLZINA_KODE) return false
  return [...k].every((z) => ZNAKI_KODE.includes(z))
}

/**
 * Zakaj koda ni sprejemljiva — v jeziku, ki uporabniku pomaga.
 * `null` pomeni, da je v redu.
 */
export function zakajNiVeljavna(vnos: string): string | null {
  const k = ocistiKodo(vnos)
  if (k.length === 0) return t('lestvice.miniLige.vpisiKodo')
  if (k.length !== DOLZINA_KODE)
    return t('lestvice.miniLige.dolzinaKode', { dolzina: DOLZINA_KODE, vpisal: k.length })
  const slabi = [...new Set([...k].filter((z) => !ZNAKI_KODE.includes(z)))]
  if (slabi.length)
    return t('lestvice.miniLige.slabiZnaki', { znaki: slabi.join(', ') })
  return null
}

/** Lestvica mini lige: po skupnih točkah, ob enakem izidu po imenu. */
export function razvrstiMini(vrstice: MiniVrstica[]): (MiniVrstica & { mesto: number })[] {
  const st = (v: number | null | undefined) => Number(v ?? 0)
  const urejene = [...vrstice].sort(
    (a, b) =>
      st(b.total_points) - st(a.total_points) ||
      st(b.rounds_played) - st(a.rounds_played) ||
      (a.team_name ?? '').localeCompare(b.team_name ?? '', 'sl'),
  )
  let zadnji: number | null = null
  let mesto = 0
  return urejene.map((v, i) => {
    const tock = st(v.total_points)
    if (zadnji === null || tock !== zadnji) mesto = i + 1
    zadnji = tock
    return { ...v, mesto }
  })
}

/**
 * Ali so v mini ligi ekipe iz več lig?
 *
 * Če so, mora lestvica pokazati, iz katere lige je katera ekipa — sicer je
 * videti, kot da nekdo igra po drugačnih pravilih. Če so vse iz iste, je
 * stolpec šum.
 */
export function vecLig(vrstice: MiniVrstica[]): boolean {
  return new Set(vrstice.map((v) => v.competition_short).filter(Boolean)).size > 1
}

/** Povezava, ki vabi: klik naredi vse, kode ne tipka nihče. */
export function povezavaVabila(koda: string, naslov: string): string {
  return `${naslov}/l/${ocistiKodo(koda)}`
}

/**
 * Povabilo, ki ga človek prilepi v pogovor.
 *
 * Skupine amaterskih ekip živijo na WhatsAppu in Viberju; to besedilo gre
 * tja. Kratko in z izzivom — "premagaj me" je razlog, da kdo klikne.
 */
export function besediloVabila(ime: string, koda: string, naslov: string): string {
  return t('lestvice.miniLige.besediloVabila', { ime, povezava: povezavaVabila(koda, naslov) })
}

/**
 * Deli povabilo: na telefonu odpre sistemski list (naravnost v skupino),
 * sicer kopira. Vrne, kaj se je zgodilo, da stran pove pravo stvar.
 */
export async function deliVabilo(
  ime: string,
  koda: string,
): Promise<'deljeno' | 'kopirano' | 'preklicano' | 'neuspelo'> {
  const naslov = window.location.origin
  const besedilo = besediloVabila(ime, koda, naslov)
  if (navigator.share) {
    try {
      await navigator.share({ title: t('lestvice.miniLige.naslovVabila', { ime }), text: besedilo })
      return 'deljeno'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'preklicano'
    }
  }
  try {
    await navigator.clipboard.writeText(besedilo)
    return 'kopirano'
  } catch {
    return 'neuspelo'
  }
}

/**
 * Povabilo, ki čaka: človek je kliknil povezavo, a se mora najprej prijaviti
 * ali sestaviti ekipo. Kodo si zapomnimo in vstop dokončamo, ko ima ekipo —
 * brez tega bi se moral vrniti na povezavo, ki je ostala v tujem pogovoru.
 */
export const KLJUC_VABILA = 'slff-mini-liga-vabilo'

export function shraniVabilo(koda: string): void {
  try {
    localStorage.setItem(KLJUC_VABILA, ocistiKodo(koda))
  } catch {
    /* zasebni način: povabilo se izgubi, stran še vedno dela */
  }
}

export function preberiVabilo(): string | null {
  try {
    const k = localStorage.getItem(KLJUC_VABILA)
    return k && kodaJeVeljavna(k) ? k : null
  } catch {
    return null
  }
}

export function pozabiVabilo(): void {
  try {
    localStorage.removeItem(KLJUC_VABILA)
  } catch {
    /* nič */
  }
}

/** Privzeto ime nove lige: "Jernej in prijatelji" — en klik, brez tipkanja. */
export function privzetoImeLige(vzdevek: string | null | undefined): string {
  const v = (vzdevek ?? '').trim().split(/\s+/)[0]
  const ime = v ? t('lestvice.miniLige.privzetoIme', { ime: v }) : t('lestvice.miniLige.privzetoImeBrez')
  return ime.length > 40 ? ime.slice(0, 40) : ime
}
