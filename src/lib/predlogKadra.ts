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
import { POZICIJE, VRSTNI_RED, MAX_IZ_KLUBA, PRORACUN, STEVILO_PRVIH, lahkoZacne } from './pravila.ts'
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

/**
 * Z `nakljucje` dobi vsak igralec oceno, pomnozeno s faktorjem 0.5–1.5. Kader
 * ostane veljaven in v proracunu, le da vsak klik izbere drugacnega — sicer bi
 * vsi, ki pritisnejo gumb, igrali z isto ekipo.
 */
function uporabni(
  igralci: readonly IgralecZaPredlog[],
  nakljucje?: () => number,
): Kandidat[] {
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
      ocena: oceni(i, cena) * (nakljucje ? 0.5 + nakljucje() : 1),
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
function izboljsaj(
  kader: Kandidat[],
  kandidati: Kandidat[],
  proracun: number,
  // Igralci, ki so v kadru ze in jih ne menjamo — stejejo le za omejitev kluba.
  fiksni: readonly Kandidat[] = [],
): Kandidat[] {
  const vKadru = new Set([...kader, ...fiksni].map((k) => k.id))
  let poraba = kader.reduce((v, k) => v + centi(k.cena), 0)
  const meja = centi(proracun)

  // Meja je le varovalo pred neskoncno zanko. Pri 60 je nakljucni predlog
  // porabil vse korake za drobne menjave enake cene in ostal pri 60 M€.
  for (let krog = 0; krog < 600; krog++) {
    let najboljsa: { ven: Kandidat; noter: Kandidat; donos: number } | null = null

    const poKlubu = new Map<number, number>()
    for (const k of [...kader, ...fiksni]) poKlubu.set(k.team_id, (poKlubu.get(k.team_id) ?? 0) + 1)

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
 * Brez `nakljucje` je predlog vedno isti (za preverbe), z njim vsakic drug.
 */
export function predlagajKader(
  igralci: readonly IgralecZaPredlog[],
  proracun: number = PRORACUN,
  nakljucje?: () => number,
): PredlaganIgralec[] | null {
  const kandidati = uporabni(igralci, nakljucje)
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

export interface IgralecVDelnemKadru {
  id: number
  position: Pozicija | null
  team_id: number | null
  value: number | string | null
  je_zacetnik: boolean
  je_kapetan: boolean
  je_namestnik: boolean
}

export interface DopolnjenIgralec extends PredlaganIgralec {
  /** Igralec je bil v kadru ze prej; `false` za dodane. */
  obstojeci: boolean
}

/**
 * Dopolni zacet kader do petnajst. Kdor je izbral pet igralcev in obstal, ne
 * izgubi svoje izbire: obstojeci ostanejo, kjer so, manjkajoca mesta pa se
 * zapolnijo enako kot pri predlogu — najprej najcenejse, nato izboljsave, a
 * samo med dodanimi in v okviru denarja, ki je se na voljo.
 *
 * Postava: obstojeci zacetniki ostanejo v njej, prosta mesta dobijo najboljsi
 * s klopi. Kapetana in namestnika doloci le, ce ju se ni. Vrne `null`, kadar
 * dopolnitve v okviru denarja ni.
 */
export function dopolniKader(
  igralci: readonly IgralecZaPredlog[],
  obstojeci: readonly IgralecVDelnemKadru[],
  denar: number,
  nakljucje?: () => number,
): DopolnjenIgralec[] | null {
  // Igralca brez pozicije ne znamo umestiti; raje nic kot tiho izpustiti.
  if (obstojeci.some((o) => !o.position || o.team_id == null)) return null
  const vKadru = new Set(obstojeci.map((o) => o.id))
  const kvote = { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Pozicija, number>
  for (const p of VRSTNI_RED) {
    kvote[p] = POZICIJE[p].kader - obstojeci.filter((o) => o.position === p).length
    if (kvote[p] < 0) return null
  }
  const zasedeno = new Map<number, number>()
  for (const o of obstojeci)
    if (o.team_id != null) zasedeno.set(o.team_id, (zasedeno.get(o.team_id) ?? 0) + 1)

  const vsi = uporabni(igralci, nakljucje)
  const kandidati = vsi.filter((k) => !vKadru.has(k.id))
  const poOceni = [...kandidati].sort((a, b) => b.ocena - a.ocena)
  const osnova = najcenejsiIzbor(
    poOceni.map((k) => ({ ...k, value: k.cena })),
    { kvote, zasedeno },
  )
  if (!osnova) return null
  if (osnova.reduce((v, k) => v + centi(k.cena), 0) > centi(denar)) return null

  // Obstojeci kot kandidati — za stetje klubov in za oceno pri postavi.
  const ocenaOd = new Map(vsi.map((k) => [k.id, k.ocena]))
  const fiksni: Kandidat[] = obstojeci.map((o) => ({
    id: o.id,
    position: o.position as Pozicija,
    team_id: o.team_id as number,
    cena: Number(o.value ?? 0),
    ocena: ocenaOd.get(o.id) ?? Number(o.value ?? 0),
  }))
  const dodani = izboljsaj(osnova, kandidati, denar, fiksni)
  const kader = [...fiksni, ...dodani]

  // Obstojeci zacetniki ostanejo; prosta mesta najboljsim, ki smejo zaceti.
  let zacetniki = new Set(obstojeci.filter((o) => o.je_zacetnik).map((o) => o.id))
  const prvi = kader.filter((k) => zacetniki.has(k.id))
  for (const k of [...kader].sort((a, b) => b.ocena - a.ocena)) {
    if (zacetniki.has(k.id) || !lahkoZacne(k.position, prvi)) continue
    zacetniki.add(k.id)
    prvi.push(k)
  }
  // Ce obstojeca postava ne dopusca veljavne enajsterice, jo postavimo znova.
  if (zacetniki.size !== STEVILO_PRVIH) {
    zacetniki = postavi(kader)
  }

  const poOceniVPostavi = kader
    .filter((k) => zacetniki.has(k.id))
    .sort((a, b) => b.ocena - a.ocena)
  const prej = (polje: 'je_kapetan' | 'je_namestnik') =>
    obstojeci.find((o) => o[polje] && zacetniki.has(o.id))?.id
  const kapetan = prej('je_kapetan') ?? poOceniVPostavi.find((k) => k.id !== prej('je_namestnik'))?.id
  const namestnik = prej('je_namestnik') ?? poOceniVPostavi.find((k) => k.id !== kapetan)?.id

  return kader.map((k) => ({
    id: k.id,
    position: k.position,
    team_id: k.team_id,
    value: k.cena,
    je_zacetnik: zacetniki.has(k.id),
    je_kapetan: k.id === kapetan,
    je_namestnik: k.id === namestnik,
    obstojeci: vKadru.has(k.id),
  }))
}
