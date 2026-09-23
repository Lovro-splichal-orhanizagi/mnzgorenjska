// Prepoznava kluba iz imena, ki ga zapiše MNZ Gorenjska.
//
// Klub je v bazi en sam, ne glede na to, katera selekcija igra — grb in
// zgodovina naj bosta na enem mestu. Vir pa isti klub piše različno: sponzor
// se med sezonama zamenja, članska in mladinska ekipa pa ga imata lahko celo
// hkrati različnega ("Eltron Preddvor" proti "Preddvor SP Avto").
//
// Zato ime najprej poenostavimo (brez ločil in velikih črk), znane različice
// pa preslikamo na eno samo. Brez preslikave bi vsak uvoz razporeda znova
// ustvaril "svoj" klub in razklal ligo na dva zapisa.

import { vseVrstice } from './strani.mjs'

/**
 * Razreši HTML entitete v besedilu.
 *
 * Nujno PRED poenostavitvijo: `&amp;` se sicer spremeni v besedo "amp",
 * `&#8211;` pa v "8211", in klub dobi ključ, ki z ničimer ne ujema.
 * Tako se je "Kety Emmi&Impol Bistrica" v bazi razklal na tri zapise in
 * sedem odigranih tekem je ostalo brez statistike — uvoz zapisnika ni našel
 * tekme, ker je razpored zapisal klub pod drugim imenom.
 */
export const razpakiraj = (ime) =>
  String(ime)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim()

/** "Bled - Bohinj Hirter" → "bled bohinj hirter" */
export const poenostavi = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^a-zčšž0-9]+/g, ' ')
    .trim()

// Vzdevki so last VIRA, ne sistema: dve zvezi sta dva ločena nabora klubov in
// ime, ki v Kranju pomeni en klub, v Ljubljani lahko pomeni drug. Zato vsak vir
// pripelje svoj slovar (`naredikljucKluba`), spodnji pa je gorenjski.
//
// levo: kar piše vir, desno: poenostavljeno ime, pod katerim klub že poznamo
const ISTI_KLUB = {
  'arne jezero medvode': 'jezero medvode',
  'preddvor sp avto': 'eltron preddvor',
  'bled bohinj': 'bled bohinj hirter',
}

/**
 * Sestavi prepoznavo kluba za en vir.
 *
 * @param {Record<string,string>} vzdevki poenostavljeno ime → ime, ki ga že poznamo
 */
export const naredikljucKluba =
  (vzdevki = {}) =>
  (ime) => {
    const k = poenostavi(ime)
    return vzdevki[k] ?? k
  }

/** Ključ, pod katerim klub iščemo in shranjujemo (MNZ Gorenjska). */
export const kljucKluba = naredikljucKluba(ISTI_KLUB)

/** Kratica iz začetnic, kadar klub v bazo pride na novo. */
export const kratkoIme = (polnoIme) =>
  polnoIme
    .split(/\s+/)
    .filter((d) => /[a-zčšžA-ZČŠŽ0-9]/.test(d))
    .map((d) => d[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)

/**
 * Slovar ključ kluba → id za uvoz iz enega vira.
 *
 * Prej je bil to en sam `select` brez vrstnega reda in brez branja po straneh:
 * nad tisoč klubi bi del manjkal (in uvoz bi ustvaril dvojnike), pri dveh
 * klubih z istim ključem pa je zmagal tisti, ki ga je baza slučajno vrnila
 * zadnjega. Zdaj:
 *
 * - beremo po straneh, urejeno po id, in obstoječega ključa NE povozimo —
 *   pri trku ostane starejši klub;
 * - najprej velja natančno ime (poenostavljeno ime kluba je ključ sam), šele
 *   nato vzdevek;
 * - vzdevek uporabimo le za klube, ki igrajo v kateri od lig TEGA vira.
 *   Vzdevki so last vira: ime, ki ga slovar enega vira preslika, je lahko pri
 *   drugi zvezi povsem drug klub.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ ime: string, kljucKluba: (ime: string) => string }} vir
 */
export async function mapaKlubov(db, vir) {
  const vsi = await vseVrstice((od, do_) =>
    db.from('teams').select('id, name').order('id').range(od, do_),
  )

  const { data: lige, error } = await db.from('competitions').select('id').eq('source', vir.ime)
  if (error) throw new Error(`lige vira ${vir.ime}: ${error.message}`)
  const nasi = new Set()
  const idLig = (lige ?? []).map((l) => l.id)
  if (idLig.length) {
    const vrstice = await vseVrstice((od, do_) =>
      db
        .from('competition_teams')
        .select('team_id, competition_id')
        .in('competition_id', idLig)
        .order('team_id')
        .order('competition_id')
        .range(od, do_),
    )
    for (const v of vrstice) nasi.add(v.team_id)
  }

  const mapa = new Map()
  for (const k of vsi) {
    const kljuc = poenostavi(k.name)
    if (!mapa.has(kljuc)) mapa.set(kljuc, k.id)
  }
  for (const k of vsi) {
    if (!nasi.has(k.id)) continue
    const kljuc = vir.kljucKluba(k.name)
    if (!mapa.has(kljuc)) mapa.set(kljuc, k.id)
  }
  return mapa
}
