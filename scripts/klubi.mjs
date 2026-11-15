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
 * @param {{ ime: string, drzava?: string, kljucKluba: (ime: string) => string, poenostavi?: (ime: string) => string }} vir
 */
export async function mapaKlubov(db, vir) {
  // Le klubi države vira: "NK Polet" ali "NK Mladost" je v Sloveniji in na
  // Hrvaškem drug klub, natančno ime pa bi ju sicer združilo.
  let drzavaId = null
  if (vir.drzava) {
    const { data: d, error: eD } = await db.from('countries').select('id').eq('code', vir.drzava).maybeSingle()
    if (eD) throw new Error(`država vira ${vir.ime}: ${eD.message}`)
    if (!d) throw new Error(`država ${vir.drzava} (vir ${vir.ime}) ni v tabeli countries`)
    drzavaId = d.id
  }
  const vsi = await vseVrstice((od, do_) => {
    let q = db.from('teams').select('id, name').order('id')
    if (drzavaId != null) q = q.eq('country_id', drzavaId)
    return q.range(od, do_)
  })

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

  // Natančno ime v abecedi vira (`vir.poenostavi`), ne slovenski `poenostavi`:
  // ta zavrže vse razen a–ž, zato je bil "NK Tomislav (Đ)" (Đulovac) pod
  // ključem "nk tomislav" in uvoz je vanj vpisal še NK Tomislav iz Drnja.
  const natancno = vir.poenostavi ?? poenostavi
  const mapa = new Map()
  // Opt-in native identities were verified by the service context before any
  // traversal. A display rename must not create a second organization.
  for(const binding of vir.reviewedClubBindings??[]) {
    if(!vsi.some(t=>t.id===binding.teamId))throw Error('reviewed club binding: DB team absent from source country')
    const key=vir.kljucKluba(binding.canonicalName)
    if(mapa.has(key)&&mapa.get(key)!==binding.teamId)throw Error('reviewed club binding: conflicting source key')
    mapa.set(key,binding.teamId)
  }
  for (const k of vsi) {
    const kljuc = natancno(k.name)
    if (!mapa.has(kljuc)) mapa.set(kljuc, k.id)
  }
  for (const k of vsi) {
    if (!nasi.has(k.id)) continue
    const kljuc = vir.kljucKluba(k.name)
    if (!mapa.has(kljuc)) mapa.set(kljuc, k.id)
  }
  return mapa
}

// --- preimenovan klub ---------------------------------------------------------
// Zveza med sezono klub preimenuje ali ga zapiše brez kraja: "SV SW Lieboch"
// je postal "SV Schwarz - Weiß Remax Lieboch" (SLF-275), "TRGOVAČKI
// (Petrovac)" je bil v zapisniku le "TRGOVAČKI" (SLF-276), "St. Valent.ASK 1b"
// "St. Valentin ASK 1b" (SLF-456). Uvoz je vsakič ustvaril dvojnika, njegove
// prazne tekme pa so trčile v zapisnike pravega kluba. Vzdevki so to krpali
// enega po enega; zdaj ime, ki ga ključ ne najde, primerjamo s klubi, ki v tej
// ligi letos že igrajo.
//
// Klub vzamemo le ob dveh dokazih hkrati: ime se ujema v izraziti besedi
// ("lieboch", "trgovački", "valent…") in klub ima v isti ligi tekmo istega kroga
// proti istemu nasprotniku (stran doma/v gosteh enaka). Kandidat mora biti en
// sam; sicer ostane po starem (nov klub).

// Oznake moštva: "1b", "II", "U19", "Amat" ločijo drugo ekipo istega kluba.
const OZNAKA_EKIPE = /^(\d+[a-z]?|[ivx]+|[a-z]|u\d+|amat|amateure|juniors|juniori|mladi)$/u
// Besede, ki jih ima pol klubov in ne povejo, kateri klub je.
const SPLOSNE = new Set([
  'union', 'sportunion', 'sport', 'sportverein', 'verein', 'sportclub', 'sportklub', 'club', 'klub', 'football',
  'fussball', 'fußball', 'futbal', 'fudbal', 'fudbalski', 'nogometni', 'city', 'united', 'akademija', 'academy',
  'mladost', 'sloga', 'jedinstvo', 'radnički', 'radnicki', 'partizan', 'dinamo', 'dynamo', 'borac', 'polet',
  'omladinac', 'proleter', 'napredak', 'graničar', 'zvezda', 'crvena', 'hajduk', 'rudar', 'olimpija', 'slavija',
])

const besede = (kljuc) => String(kljuc).split(' ').filter(Boolean)
const oznake = (b) => b.filter((w) => OZNAKA_EKIPE.test(w)).sort().join(' ')
const izrazite = (b) => b.filter((w) => w.length >= 4 && !OZNAKA_EKIPE.test(w) && !SPLOSNE.has(w))

/** Ali sta ključa lahko isti klub pod drugim imenom (le po imenu). */
export function podobnoIme(a, b) {
  const A = besede(a)
  const B = besede(b)
  if (oznake(A) !== oznake(B)) return false
  const ib = izrazite(B)
  return izrazite(A).some((u) =>
    ib.some((v) => u === v || (Math.min(u.length, v.length) >= 5 && (u.startsWith(v) || v.startsWith(u)))),
  )
}

/**
 * Obstoječi klub, ki ga vir zdaj piše z novim imenom, ali null.
 *
 * @param {object} p
 * @param {string} p.kljuc ključ novega imena (ga mapa klubov nima)
 * @param {{krog:number, nasprotnik:number, doma:boolean}[]} p.tekme tekme novega imena v viru
 * @param {{krog:number, home:number, away:number}[]} p.tekmeBaze tekme te lige in sezone v bazi
 * @param {Map<number,string>} p.kljuciKlubov id kluba → ključ njegovega imena
 * @param {Set<number>} [p.vViru] klubi, ki jih vir še piše pod svojim imenom (niso kandidati)
 */
export function preimenovanKlub({ kljuc, tekme, tekmeBaze, kljuciKlubov, vViru = new Set() }) {
  const zadetki = new Set()
  for (const t of tekme) {
    for (const m of tekmeBaze) {
      if (m.krog !== t.krog) continue
      const kandidat = t.doma ? (m.away === t.nasprotnik ? m.home : null) : (m.home === t.nasprotnik ? m.away : null)
      if (kandidat == null || kandidat === t.nasprotnik || vViru.has(kandidat)) continue
      const k = kljuciKlubov.get(kandidat)
      if (k != null && k !== kljuc && podobnoIme(kljuc, k)) zadetki.add(kandidat)
    }
  }
  return zadetki.size === 1 ? [...zadetki][0] : null
}

/**
 * Tekme ene lige in sezone iz baze z ključi klubov, za `preimenovanKlub`.
 *
 * @returns {Promise<{tekmeBaze:{krog:number,home:number,away:number}[], kljuciKlubov:Map<number,string>}>}
 */
export async function tekmeSezone(db, competitionId, sezona, kljucKluba) {
  const vrstice = await vseVrstice((od, do_) =>
    db
      .from('matches')
      .select('id, home_team_id, away_team_id, rounds!inner(number, season, competition_id)')
      .eq('rounds.competition_id', competitionId)
      .eq('rounds.season', sezona)
      .order('id')
      .range(od, do_),
  )
  const tekmeBaze = vrstice.map((m) => ({ krog: m.rounds.number, home: m.home_team_id, away: m.away_team_id }))
  const ids = [...new Set(tekmeBaze.flatMap((m) => [m.home, m.away]))]
  const kljuciKlubov = new Map()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('teams').select('id, name').in('id', ids.slice(i, i + 200))
    if (error) throw new Error(`klubi lige ${competitionId}: ${error.message}`)
    for (const t of data ?? []) kljuciKlubov.set(t.id, kljucKluba(t.name))
  }
  return { tekmeBaze, kljuciKlubov }
}
