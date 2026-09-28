// Mini lige — pravila, ki niso slog.
//
// Ločeno od strani, da jih preverja `npm run smoke` brez omrežja: normalizacija
// kode in razvrstitev lestvice odločata, ali se človek pridruži in kdo je prvi.

import { t } from '../i18n/jedro.ts'
import { formatirajTocke, oblika, tockZ, TOCKE_TOZILNIK } from './pomozno.ts'

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
 * Povezavi, ki odpreta pogovor z že napisanim besedilom.
 *
 * Na računalniku sistemskega lista za deljenje ni (ali ne pozna Viberja),
 * zato imata WhatsApp in Viber svoj gumb. `wa.me` dela tudi brez
 * nameščenega WhatsAppa (odpre spletno različico); `viber://` le z
 * nameščenim Viberjem, a tam, kjer ga ni, ga tudi nihče ne pogreša.
 */
export function povezaveDeljenja(besedilo: string): { whatsapp: string; viber: string } {
  const b = encodeURIComponent(besedilo)
  return {
    whatsapp: `https://wa.me/?text=${b}`,
    viber: `viber://forward?text=${b}`,
  }
}

export type IzidDeljenja = 'deljeno' | 'kopirano' | 'preklicano' | 'neuspelo'

/**
 * Deli besedilo: na telefonu odpre sistemski list (naravnost v skupino),
 * sicer kopira. Vrne, kaj se je zgodilo, da stran pove pravo stvar.
 */
export async function deliBesedilo(naslov: string, besedilo: string): Promise<IzidDeljenja> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: naslov, text: besedilo })
      return 'deljeno'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'preklicano'
    }
  }
  return kopiraj(besedilo)
}

/** Kopira v odložišče; brez dovoljenja (stari brskalnik, iframe) vrne 'neuspelo'. */
export async function kopiraj(besedilo: string): Promise<IzidDeljenja> {
  try {
    await navigator.clipboard.writeText(besedilo)
    return 'kopirano'
  } catch {
    return 'neuspelo'
  }
}

/** Deli povabilo v mini ligo (sistemski list ali odložišče). */
export async function deliVabilo(ime: string, koda: string): Promise<IzidDeljenja> {
  return deliBesedilo(
    t('lestvice.miniLige.naslovVabila', { ime }),
    besediloVabila(ime, koda, window.location.origin),
  )
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

// --------------------------------------------------------------------------
// Tedenski pregled
// --------------------------------------------------------------------------

/** Ekipa v krogu, kot jo vrne `tedenski_pregled_mini_lige`. */
export interface VrsticaPregleda {
  ekipa_id: number
  ekipa: string
  lastnik: string | null
  tocke: number
  mesto: number
  /** Za koliko mest se je ekipa premaknila na lestvici mini lige; `null` v prvem krogu. */
  premik: number | null
}

export interface TedenskiPregled {
  sezona: string | null
  krog: number | null
  krogi: number[]
  ekip?: number
  vrstice?: VrsticaPregleda[]
  kapetan?: { ekipa_id: number; igralec_id: number; igralec: string; tocke: number; skupaj: number } | null
  klop?: { ekipa_id: number; tocke: number } | null
  adut?: { ekipa_id: number; igralec_id: number; igralec: string; tocke: number } | null
}

export type VrstaZgodbe = 'manager' | 'zlica' | 'kapetan' | 'klop' | 'skok' | 'padec' | 'adut'

export interface Zgodba {
  vrsta: VrstaZgodbe
  ekipaId: number
  ekipa: string
  lastnik: string | null
  /** Točke, o katerih govori zgodba (ekipe, igralca ali klopi). */
  tocke: number
  igralec?: string
  igralecId?: number
  /** Kapetan: točke z množiteljem. */
  skupaj?: number
  /** Skok ali padec: za koliko mest in na katero mesto. */
  mest?: number
  mesto?: number
}

/**
 * Iz surovega pregleda sestavi zgodbe kroga, v vrstnem redu, ki se bere kot
 * poročilo: zmagovalec, kapetan, adut, dvigalo, klop in na koncu žlica.
 *
 * Zgodba brez tekmeca ni zgodba: pri eni sami ekipi ostanejo le kapetan in
 * klop, žlica pa samo, kadar zadnji res zaostaja za prvim.
 */
export function zgodbeKroga(p: TedenskiPregled | null | undefined): Zgodba[] {
  const vrstice = p?.vrstice ?? []
  if (!p || vrstice.length === 0) return []
  const poId = new Map(vrstice.map((v) => [v.ekipa_id, v]))
  const ekipa = (id: number) => {
    const v = poId.get(id)
    return { ekipaId: id, ekipa: v?.ekipa ?? '', lastnik: v?.lastnik ?? null }
  }
  const st = (x: unknown) => Number(x ?? 0)
  const urejene = [...vrstice].sort((a, b) => st(b.tocke) - st(a.tocke) || a.ekipa.localeCompare(b.ekipa, 'sl'))
  const vec = urejene.length > 1
  const zgodbe: Zgodba[] = []

  const prvi = urejene[0]
  if (vec) zgodbe.push({ vrsta: 'manager', ...ekipa(prvi.ekipa_id), tocke: st(prvi.tocke) })

  if (p.kapetan)
    zgodbe.push({
      vrsta: 'kapetan',
      ...ekipa(p.kapetan.ekipa_id),
      tocke: st(p.kapetan.tocke),
      skupaj: st(p.kapetan.skupaj),
      igralec: p.kapetan.igralec,
      igralecId: p.kapetan.igralec_id,
    })

  if (vec && p.adut)
    zgodbe.push({
      vrsta: 'adut',
      ...ekipa(p.adut.ekipa_id),
      tocke: st(p.adut.tocke),
      igralec: p.adut.igralec,
      igralecId: p.adut.igralec_id,
    })

  if (vec) {
    // Največji skok in največji padec; ob enakem premiku zmaga višje mesto.
    const s = urejene.filter((v) => (v.premik ?? 0) !== 0)
    const gor = s.filter((v) => st(v.premik) > 0).sort((a, b) => st(b.premik) - st(a.premik) || a.mesto - b.mesto)[0]
    const dol = s.filter((v) => st(v.premik) < 0).sort((a, b) => st(a.premik) - st(b.premik) || a.mesto - b.mesto)[0]
    if (gor) zgodbe.push({ vrsta: 'skok', ...ekipa(gor.ekipa_id), tocke: st(gor.tocke), mest: st(gor.premik), mesto: gor.mesto })
    if (dol) zgodbe.push({ vrsta: 'padec', ...ekipa(dol.ekipa_id), tocke: st(dol.tocke), mest: -st(dol.premik), mesto: dol.mesto })
  }

  if (p.klop && st(p.klop.tocke) > 0)
    zgodbe.push({ vrsta: 'klop', ...ekipa(p.klop.ekipa_id), tocke: st(p.klop.tocke) })

  const zadnji = urejene[urejene.length - 1]
  if (vec && st(zadnji.tocke) < st(prvi.tocke))
    zgodbe.push({ vrsta: 'zlica', ...ekipa(zadnji.ekipa_id), tocke: st(zadnji.tocke) })

  return zgodbe
}

/** Ena vrstica zgodbe v jeziku bralca — za kartico in za sporočilo v skupino. */
export function opisZgodbe(z: Zgodba): string {
  const tocke = `${formatirajTocke(z.tocke)} ${tockZ(z.tocke)}`
  switch (z.vrsta) {
    case 'manager':
      return t('lestvice.pregled.managerOpis', { ekipa: z.ekipa, tocke })
    case 'kapetan':
      return t('lestvice.pregled.kapetanOpis', {
        ekipa: z.ekipa,
        igralec: z.igralec ?? '',
        // "prinesel 1 točko / 12 točk" — tožilnik.
        tocke: `${formatirajTocke(z.skupaj ?? z.tocke)} ${oblika(Number(z.skupaj ?? z.tocke), TOCKE_TOZILNIK)}`,
      })
    case 'adut':
      return t('lestvice.pregled.adutOpis', { ekipa: z.ekipa, igralec: z.igralec ?? '', tocke })
    case 'skok':
      return t('lestvice.pregled.skokOpis', { ekipa: z.ekipa, n: z.mest ?? 0, mesto: z.mesto ?? 0 })
    case 'padec':
      return t('lestvice.pregled.padecOpis', { ekipa: z.ekipa, n: z.mest ?? 0, mesto: z.mesto ?? 0 })
    case 'klop':
      return t('lestvice.pregled.klopOpis', { ekipa: z.ekipa, tocke })
    case 'zlica':
      return t('lestvice.pregled.zlicaOpis', { ekipa: z.ekipa, tocke })
  }
}

/** Naslov zgodbe s sličico ("🏆 Manager kroga"). */
export function naslovZgodbe(z: Zgodba): string {
  return `${IKONE_ZGODB[z.vrsta]} ${t(`lestvice.pregled.${z.vrsta}`)}`
}

export const IKONE_ZGODB: Record<VrstaZgodbe, string> = {
  manager: '🏆',
  kapetan: '©️',
  adut: '🃏',
  skok: '🚀',
  padec: '🪂',
  klop: '🪑',
  zlica: '🥄',
}

/**
 * Pregled kroga kot sporočilo za skupino: naslov, zgodbe, povezava na ligo.
 * Kdor ga dobi in še ni v ligi, pride noter prek iste povezave kot povabilo.
 */
export function besediloPregleda(
  ime: string,
  krog: number,
  zgodbe: Zgodba[],
  koda: string,
  naslov: string,
): string {
  return [
    t('lestvice.pregled.sporociloNaslov', { ime, krog }),
    ...zgodbe.map((z) => `${IKONE_ZGODB[z.vrsta]} ${opisZgodbe(z)}`),
    povezavaVabila(koda, naslov),
  ].join('\n')
}
