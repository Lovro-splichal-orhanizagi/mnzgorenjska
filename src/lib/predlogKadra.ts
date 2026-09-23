// Predlog kadra: ekipa v enem kliku.
//
// Novinec pristane na praznem igriscu ob trgu s petsto igralci in mora izbrati
// natanko 15 imen, ki hkrati ustrezajo razmerju pozicij, proracunu in omejitvi
// treh igralcev iz kluba. Od 354 registriranih jih ekipe ni zacelo 196 — in
// samo 7 jih je odnehalo sredi sestavljanja. Ustavi jih torej prazen zacetek,
// ne zahtevnost urejanja. Ta predlog spremeni petnajst odlocitev v eno, ki jo
// potem lahko poljubno popravijo.
//
// Postopek je namenoma dvostopenjski:
//   1. sestavi NAJCENEJSI veljaven kader — ta po definiciji obstaja in ustreza
//      vsem omejitvam,
//   2. ga nato izboljsuje z menjavami, dokler jih proracun prenese.
// Obratna pot (zberi najboljse in potem rezi) se lahko zaplete v kader, ki ga
// ni mogoce dokoncati — zadnjih nekaj mest zmanjka denarja in ni poti nazaj.
import { POZICIJE, VRSTNI_RED, MAX_IZ_KLUBA, PRORACUN, STEVILO_PRVIH } from './pravila.ts'
import { najcenejsiIzbor } from './pripravljenost.ts'
import type { Pozicija } from './tipi'

export interface IgralecZaPredlog {
  id: number
  position: Pozicija | null
  team_id: number | null
  value: number | string | null
  /** Tocke tekoce sezone; ce jih ni, se kakovost oceni po ceni. */
  points?: number | string | null
  form?: number | string | null
}

export interface PredlaganIgralec {
  id: number
  position: Pozicija
  team_id: number
  value: number
  je_zacetnik: boolean
  je_kapetan: boolean
  je_namestnik: boolean
}

interface Kandidat {
  id: number
  position: Pozicija
  team_id: number
  cena: number
  ocena: number
}

/**
 * Kakovost igralca. Tocke tekoce sezone povedo najvec; dokler jih ni (nova
 * liga, prvi krog), je cena najboljsi priblizek — izracunana je iz lanskih
 * minut in ucinka.
 */
function oceni(i: IgralecZaPredlog, cena: number): number {
  const tocke = Number(i.points ?? 0)
  const forma = Number(i.form ?? 0)
  if (Number.isFinite(tocke) && tocke !== 0) return tocke + forma / 10
  return cena
}

function uporabni(igralci: readonly IgralecZaPredlog[]): Kandidat[] {
  const videni = new Set<number>()
  const out: Kandidat[] = []
  for (const i of igralci) {
    const cena = Number(i.value)
    if (!i.position || i.team_id == null || !Number.isFinite(cena) || cena <= 0) continue
    if (videni.has(i.id)) continue
    videni.add(i.id)
    out.push({
      id: i.id,
      position: i.position,
      team_id: i.team_id,
      cena,
      ocena: oceni(i, cena),
    })
  }
  return out
}

/** Denar racunamo v centih, da se kader na meji proracuna ne zavrne zaradi 0.1 + 0.2. */
const centi = (v: number) => Math.round(v * 100)

/**
 * Najcenejsi veljaven kader. Pohlepno jemanje po pozicijah tu ne zadostuje:
 * v ligi s petimi klubi (15 igralcev, najvec 3 iz kluba) mora vsak klub dati
 * natanko tri, in ce vratarji porabijo mesta v napacnih klubih, napadalcev
 * zmanjka. Zato isti izracun kot pri preverbi pripravljenosti lige.
 */
function najcenejsi(kandidati: Kandidat[]): Kandidat[] | null {
  // Pri enaki ceni naj ostane boljsi igralec.
  const poOceni = [...kandidati].sort((a, b) => b.ocena - a.ocena)
  return najcenejsiIzbor(poOceni.map((k) => ({ ...k, value: k.cena })))
}

/**
 * Izboljsuje kader z menjavami znotraj iste pozicije, dokler kaksna se
 * izboljsa oceno in ostane v proracunu. Vsakic vzame menjavo z najvecjim
 * prirastkom na porabljen evro, da se ves denar ne porabi za enega igralca.
 */
function izboljsaj(kader: Kandidat[], kandidati: Kandidat[], proracun: number): Kandidat[] {
  const vKadru = new Set(kader.map((k) => k.id))
  let poraba = kader.reduce((v, k) => v + centi(k.cena), 0)
  const meja = centi(proracun)

  for (let krog = 0; krog < 60; krog++) {
    let najboljsa: { ven: Kandidat; noter: Kandidat; donos: number } | null = null

    const poKlubu = new Map<number, number>()
    for (const k of kader) poKlubu.set(k.team_id, (poKlubu.get(k.team_id) ?? 0) + 1)

    for (const ven of kader) {
      for (const noter of kandidati) {
        if (noter.position !== ven.position) continue
        if (vKadru.has(noter.id)) continue
        const razlika = centi(noter.cena) - centi(ven.cena)
        if (poraba + razlika > meja) continue
        // Klub odhajajocega se sprosti, zato ga pri stetju odstejemo.
        const vKlubu =
          (poKlubu.get(noter.team_id) ?? 0) - (noter.team_id === ven.team_id ? 1 : 0)
        if (vKlubu >= MAX_IZ_KLUBA) continue
        const prirastek = noter.ocena - ven.ocena
        if (prirastek <= 0) continue
        // Zastonj izboljsava je vedno dobrodosla; sicer steje donos na evro.
        const donos = razlika <= 0 ? Infinity : prirastek / razlika
        if (!najboljsa || donos > najboljsa.donos) {
          najboljsa = { ven, noter, donos }
        }
      }
    }

    if (!najboljsa) break
    const mesto = kader.indexOf(najboljsa.ven)
    poraba += centi(najboljsa.noter.cena) - centi(najboljsa.ven.cena)
    vKadru.delete(najboljsa.ven.id)
    vKadru.add(najboljsa.noter.id)
    kader[mesto] = najboljsa.noter
  }

  return kader
}

/** Postava: najboljsih 11, ki se drzijo spodnjih in zgornjih mej po pozicijah. */
function postavi(kader: Kandidat[]): Set<number> {
  const poOceni = [...kader].sort((a, b) => b.ocena - a.ocena)
  const izbrani = new Set<number>()
  const steje: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }

  // Najprej obvezni minimumi, sicer jih lahko zmanjka.
  for (const poz of VRSTNI_RED) {
    for (const k of poOceni) {
      if (steje[poz] >= POZICIJE[poz].min) break
      if (k.position !== poz || izbrani.has(k.id)) continue
      izbrani.add(k.id)
      steje[poz]++
    }
  }
  // Nato prosta mesta najboljsim, ki se smejo v postavo.
  for (const k of poOceni) {
    if (izbrani.size >= STEVILO_PRVIH) break
    if (izbrani.has(k.id)) continue
    if (steje[k.position] >= POZICIJE[k.position].max) continue
    izbrani.add(k.id)
    steje[k.position]++
  }
  return izbrani
}

/**
 * Predlaga cel kader. Vrne `null`, kadar v ligi veljavnega kadra sploh ni
 * mogoce sestaviti (premalo igralcev ali predrago) — takrat gumba ne kazemo.
 */
export function predlagajKader(
  igralci: readonly IgralecZaPredlog[],
  proracun: number = PRORACUN,
): PredlaganIgralec[] | null {
  const kandidati = uporabni(igralci)
  const osnova = najcenejsi(kandidati)
  if (!osnova) return null
  if (osnova.reduce((v, k) => v + centi(k.cena), 0) > centi(proracun)) return null

  const kader = izboljsaj(osnova, kandidati, proracun)
  const zacetniki = postavi(kader)

  // Kapetan in namestnik sta najboljsa dva iz POSTAVE — kapetan s klopi ne
  // igra in bi mnozitelj propadel.
  const poOceni = kader
    .filter((k) => zacetniki.has(k.id))
    .sort((a, b) => b.ocena - a.ocena)
  const kapetan = poOceni[0]?.id
  const namestnik = poOceni[1]?.id

  return kader.map((k) => ({
    id: k.id,
    position: k.position,
    team_id: k.team_id,
    value: k.cena,
    je_zacetnik: zacetniki.has(k.id),
    je_kapetan: k.id === kapetan,
    je_namestnik: k.id === namestnik,
  }))
}
