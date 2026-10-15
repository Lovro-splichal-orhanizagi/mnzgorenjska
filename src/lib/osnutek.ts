// Osnutek ekipe brez prijave: obiskovalec sestavi ekipo, preden ima račun.
// Hrani se v brskalniku po ligi; po prijavi ga Moja ekipa vzame za kader
// prazne ekipe, po shranjevanju ga pozabi. Shramba je le udobje — če ne dela
// (zasebno okno), osnutek pač ne preživi osvežitve.
import type { Pozicija } from './tipi'

export interface VrsticaOsnutka {
  player_id: number
  is_starter: boolean
  is_captain: boolean
  is_vice: boolean
  buy_value: number
  buy_position: Pozicija | null
}

interface IgralecZaOsnutek {
  id: number
  position: Pozicija | null
  value: number | null
  active?: boolean | null
  izstopil_at?: string | null
}

/** Ali se igralca da kupiti: aktiven in klub ni izstopil iz lige. */
export const naTrgu = (i: { active?: boolean | null; izstopil_at?: string | null }) =>
  i.active !== false && !i.izstopil_at

const kljuc = (ligaId: number) => `slff-osnutek-${ligaId}`
const NAJVEC = 15

export function preberiOsnutek(ligaId: number): unknown {
  try {
    return JSON.parse(localStorage.getItem(kljuc(ligaId)) ?? 'null')
  } catch {
    return null
  }
}

/** Prazen kader osnutek pobriše. Cen ne hrani — ob branju veljajo današnje. */
export function shraniOsnutek(ligaId: number, vrstice: VrsticaOsnutka[]) {
  try {
    if (!vrstice.length) return localStorage.removeItem(kljuc(ligaId))
    localStorage.setItem(
      kljuc(ligaId),
      JSON.stringify(
        vrstice.map(({ player_id, is_starter, is_captain, is_vice }) => ({
          player_id,
          is_starter,
          is_captain,
          is_vice,
        })),
      ),
    )
  } catch {
    /* zasebno okno */
  }
}

export function pozabiOsnutek(ligaId: number) {
  try {
    localStorage.removeItem(kljuc(ligaId))
  } catch {
    /* zasebno okno */
  }
}

/**
 * Osnutek iz shrambe, preverjen proti današnjemu trgu: igralci, ki jih ni več
 * na trgu, odpadejo, cena in pozicija sta današnji, kapetan in namestnik sta
 * vsak največ eden in le med začetniki. Proračun, kvote in klube preveri
 * stran kot pri ročni sestavi.
 */
export function veljavenOsnutek(surovo: unknown, trg: IgralecZaOsnutek[]): VrsticaOsnutka[] {
  if (!Array.isArray(surovo)) return []
  const poId = new Map(trg.map((i) => [i.id, i]))
  const videni = new Set<number>()
  let kapetan = false
  let namestnik = false
  const izid: VrsticaOsnutka[] = []
  for (const v of surovo as Record<string, unknown>[]) {
    if (izid.length >= NAJVEC || !v || typeof v !== 'object') continue
    const id = Number(v.player_id)
    const igralec = poId.get(id)
    if (!igralec || !naTrgu(igralec) || videni.has(id)) continue
    videni.add(id)
    const zacne = v.is_starter === true
    const jeKapetan: boolean = zacne && !kapetan && v.is_captain === true
    const jeNamestnik: boolean = zacne && !jeKapetan && !namestnik && v.is_vice === true
    kapetan ||= jeKapetan
    namestnik ||= jeNamestnik
    izid.push({
      player_id: id,
      is_starter: zacne,
      is_captain: jeKapetan,
      is_vice: jeNamestnik,
      buy_value: Number(igralec.value ?? 0),
      buy_position: igralec.position ?? null,
    })
  }
  return izid
}
