// Izložba preverjenega igralca: podatki (`izlozba_igralca`), klici funkcije
// `posnetki-igralca` (nalaganje v Cloudflare Stream, žetoni za ogled,
// izbris) in moč profila. Kaj kdo vidi, odloči baza (`izlozba_dovoljena`).
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { t } from '../i18n'
import type { Kljuc } from '../i18n/jedro'

export type StanjePosnetka = 'nalaganje' | 'obdelava' | 'pripravljen' | 'napaka'
export type PregledPosnetka = 'caka' | 'odobren' | 'zavrnjen'
export type Skupina = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface Posnetek {
  id: number
  naslov: string
  izpostavljen: boolean
  vrstni_red: number
  trajanje: number | null
  stanje: StanjePosnetka
  pregled: PregledPosnetka
  razlog: string | null
}

export interface Izlozba {
  glavni: number
  lastnik: boolean
  dovoljena: boolean
  /** Stikalo `posnetki_igralcev` je klicatelju vklopljeno. */
  vidi: boolean
  /** Oseba izpolni pogoj polnoletnosti (brez mladinske vrstice). */
  odrasla: boolean
  posnetki?: Posnetek[]
  privolitev?: { letnik: number; regije: string[] } | null
  scout?: { skupina: Skupina; percentil: number } | null
  mreza?: boolean
  ogledi?: { ogledov: number; klubov: number } | null
  najvec?: number
}

/**
 * Naslova za ogled (~2 uri): `video` je podpisan naslov R2 za <video>,
 * `iframe` predvajalnik Streama; v preizkusnem načinu null.
 */
export interface Ogled {
  id: number
  tip: 'video' | 'iframe' | null
  predvajaj: string | null
  slika: string | null
}

export const NAJVEC_POSNETKOV = 6
/** 100 MB na posnetek (R2: 10 GB brezplačnega prostora mora zadoščati). */
export const NAJVEC_BAJTOV = 100 * 1024 * 1024
export const NAJVEC_SEKUND = 180
/** Vrste, ki jih sprejme R2 (in Stream); .mov je video/quicktime. */
export const VRSTE_VIDEA = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export type VrstaVidea = (typeof VRSTE_VIDEA)[number]

export async function naloziIzlozbo(igralecId: number): Promise<Izlozba | null> {
  const { data, error } = await supabase.rpc('izlozba_igralca', { p_player_id: igralecId })
  if (error) return null
  return (data as unknown as Izlozba | null) ?? null
}

/** Klic funkcije; napako vrne kot prevedeno besedilo (po `hint`). */
export async function posnetki<T>(telo: Record<string, unknown>): Promise<{ data?: T; napaka?: string }> {
  const { data, error } = await supabase.functions.invoke('posnetki-igralca', { body: telo })
  if (!error) return { data: data as T }
  let hint: string | null = null
  if (error instanceof FunctionsHttpError) {
    hint = await (error.context as Response)
      .json()
      .then((j: { hint?: string | null }) => j?.hint ?? null)
      .catch(() => null)
  }
  return { napaka: prevediHint(hint) }
}

const HINTI: Record<string, Kljuc> = {
  'posnetki-polno': 'igralci.izlozba.napakaPolno',
  'posnetki-meja': 'igralci.izlozba.napakaMeja',
  'posnetki-naslov': 'igralci.izlozba.napakaNaslov',
  'posnetki-izklopljeno': 'igralci.izlozba.napakaIzklopljeno',
  'posnetki-prostor': 'igralci.izlozba.napakaProstor',
  'posnetki-vrsta': 'igralci.izlozba.napakaVrsta',
  'posnetki-velikost': 'igralci.izlozba.napakaVelikost',
  'plus-znaki': 'igralci.preverjen.napake.znaki',
}

export function prevediHint(hint: string | null | undefined): string {
  if (hint && HINTI[hint]) return t(HINTI[hint])
  if (hint === 'plus-neprimerno' || hint === 'plus-rezervirano') return t('igralci.preverjen.napake.neprimerno')
  return t('igralci.izlozba.napaka')
}

export async function ogledi(ids: number[]): Promise<Map<number, Ogled>> {
  const m = new Map<number, Ogled>()
  if (!ids.length) return m
  const r = await posnetki<{ posnetki: Ogled[] }>({ akcija: 'ogled', posnetki: ids })
  for (const o of r.data?.posnetki ?? []) m.set(o.id, o)
  return m
}

/** Vrsta videa iz datoteke (brskalnik včasih pusti prazno, npr. .mov). */
export function vrstaVidea(datoteka: File): VrstaVidea | null {
  const t = datoteka.type.toLowerCase()
  if ((VRSTE_VIDEA as readonly string[]).includes(t)) return t as VrstaVidea
  if (t) return null
  const k = datoteka.name.toLowerCase().split('.').pop()
  return k === 'mp4' || k === 'm4v' ? 'video/mp4' : k === 'mov' ? 'video/quicktime' : k === 'webm' ? 'video/webm' : null
}

export interface PripravljenVideo {
  vrsta: VrstaVidea
  trajanje: number
  /** Plakat (sličica) iz okvirja videa, JPEG do ~100 kB. */
  slika: Blob
}

/**
 * Preveri video v brskalniku (vrsta, ≤ 100 MB, ≤ 3 min iz metapodatkov) in
 * iz enega okvirja nariše plakat. Brskalnik, ki videa ne zna dekodirati
 * (HEVC v namiznem Chromu), vrne `napakaFormat` z navodilom za MP4/H.264.
 */
export function pripraviVideo(datoteka: File): Promise<PripravljenVideo | { napaka: Kljuc }> {
  const vrsta = vrstaVidea(datoteka)
  if (!vrsta) return Promise.resolve({ napaka: 'igralci.izlozba.napakaVrsta' })
  if (datoteka.size > NAJVEC_BAJTOV) return Promise.resolve({ napaka: 'igralci.izlozba.napakaVelikost' })
  return new Promise((resolve) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(datoteka)
    let koncano = false
    const konec = (izid: PripravljenVideo | { napaka: Kljuc }) => {
      if (koncano) return
      koncano = true
      URL.revokeObjectURL(url)
      v.removeAttribute('src')
      v.load()
      resolve(izid)
    }
    const format = () => konec({ napaka: 'igralci.izlozba.napakaFormat' })
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onerror = format
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration) || !v.videoWidth) return format()
      if (v.duration > NAJVEC_SEKUND + 0.5) return konec({ napaka: 'igralci.izlozba.napakaDolzina' })
      v.currentTime = Math.min(1, v.duration / 3)
    }
    v.onseeked = () => {
      const sirina = Math.min(640, v.videoWidth)
      const platno = document.createElement('canvas')
      platno.width = sirina
      platno.height = Math.round((v.videoHeight / v.videoWidth) * sirina)
      const ctx = platno.getContext('2d')
      if (!ctx) return format()
      ctx.drawImage(v, 0, 0, platno.width, platno.height)
      platno.toBlob(
        (slika) => (slika ? konec({ vrsta, trajanje: v.duration, slika }) : format()),
        'image/jpeg',
        0.82,
      )
    }
    setTimeout(format, 15000)
    v.src = url
  })
}

/** PUT na podpisan naslov R2 (vrsta je podpisana, velikost nastavi brskalnik). */
export function naloziPut(
  naslov: string,
  telo: Blob,
  glave: Record<string, string>,
  napredek?: (odstotek: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', naslov)
    for (const [k, v] of Object.entries(glave)) xhr.setRequestHeader(k, v)
    if (napredek) xhr.upload.onprogress = (e) => e.lengthComputable && napredek(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => resolve(false)
    xhr.send(telo)
  })
}

/** Neposredno nalaganje v Stream (multipart, polje "file") z napredkom. */
export function naloziVStream(naslov: string, datoteka: File, napredek: (odstotek: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const f = new FormData()
    f.append('file', datoteka)
    xhr.upload.onprogress = (e) => e.lengthComputable && napredek(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => resolve(false)
    xhr.open('POST', naslov)
    xhr.send(f)
  })
}

/** Počaka, da Stream video obdela (do ~3 minute). */
export async function pocakajObdelavo(id: number): Promise<StanjePosnetka | null> {
  for (let i = 0; i < 45; i++) {
    const r = await posnetki<{ stanje: StanjePosnetka }>({ akcija: 'stanje', id })
    const s = r.data?.stanje ?? null
    if (s === 'pripravljen' || s === 'napaka') return s
    await new Promise((ok) => setTimeout(ok, 4000))
  }
  return null
}

export const trajanjeBesedilo = (s: number | null | undefined) => {
  if (s == null) return null
  const c = Math.round(s)
  return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`
}

/** Vrh percentila za pozitiven kazalnik (5, 10, 25 %) ali null. */
export function vrhOdstotek(percentil: number): number | null {
  if (percentil >= 95) return 5
  if (percentil >= 90) return 10
  if (percentil >= 75) return 25
  return null
}

export type Korak = 'foto' | 'pasica' | 'opis' | 'posnetek' | 'trije' | 'prestop'

/** Moč profila: koraki po vrsti, opravljen delež in naslednji korak. */
export function mocProfila(s: {
  foto: boolean
  pasica: boolean
  opis: boolean
  posnetkov: number
  prestop: boolean
}): { odstotek: number; naslednji: Korak | null } {
  const koraki: [Korak, boolean][] = [
    ['posnetek', s.posnetkov >= 1],
    ['foto', s.foto],
    ['opis', s.opis],
    ['pasica', s.pasica],
    ['trije', s.posnetkov >= 3],
    ['prestop', s.prestop],
  ]
  const opravljenih = koraki.filter(([, ok]) => ok).length
  return {
    odstotek: Math.round((opravljenih / koraki.length) * 100),
    naslednji: koraki.find(([, ok]) => !ok)?.[0] ?? null,
  }
}
