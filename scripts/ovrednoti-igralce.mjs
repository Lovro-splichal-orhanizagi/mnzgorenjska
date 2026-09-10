// Izračuna vrednost igralcev iz statistike prejšnjih sezon.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/ovrednoti-igralce.mjs
//   ... --sezona 2025/26
//   ... --tekmovanje mladinci   (mladinska liga; brez tega člani)
//
// Vsaka liga se vrednoti zase: percentili mladincev nimajo nič opraviti s
// percentili članov, sicer bi mladince do zadnjega stlačilo na dno cenika.
//
// Vrednost je med 4.0 in 12.0 (kot pri klasičnem fantasyju). Sestavljena je iz:
//   - točk na 90 minut (kako dober je, ko igra),
//   - zanesljivosti (koliko je sploh igral — malo minut pomeni malo dokazov),
//   - bonusa za izkušnje iz višjih lig (podatek z NZS, če ga administrator vnese).
//
// Igralci brez zadostnih minut dobijo privzeto vrednost, da niso precenjeni
// zaradi enega samega dobrega nastopa.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { tekmovanje as najdiTekmovanje } from './tekmovanje.mjs'
import { vseVrstice } from './strani.mjs'
import { premakniProti, NAJVECJI_TEDENSKI_PREMIK } from './premik-cene.mjs'

const NAJNIZJA = 4.0
const NAJVISJA = 12.0
const PRIVZETA = 4.5
const MIN_MINUT = 270 // pod tem ni dovolj dokazov (3 cele tekme)
const MINUT_ZA_POLNO_ZAUPANJE = 900 // 10 celih tekem

// Zgornja meja po pozicijah — kot v Premier League Fantasy so najdražji
// vezisti in napadalci, vratarji pa poceni. Brez tega bi vratar z eno dobro
// sezono stal enako kot najboljši strelec lige.
const MEJE = {
  GK: [4.0, 7.0],
  DEF: [4.0, 9.5],
  MID: [4.0, 12.0],
  FWD: [4.0, 12.0],
}

// Cena raste s percentilom na EKSPONENT. Linearna lestvica je dala povprečje
// 8.0, kar pomeni 15 × 8 = 120 za kader in 100 proračuna — ekipe ni bilo mogoče
// sestaviti brez same najcenejše polnitve. Pri eksponentu 3 je mediana 5.0 in
// povprečje 6.0, torej povprečen kader stane ~90 in ostane nekaj za okrepitve.
const EKSPONENT = 3

// Bonus za nastope v višjih ligah (NZS)
const BONUS_LIGE = {
  '1SNL': 2.0,
  '2SNL': 1.2,
  '3SNL': 0.6,
}

function izEnv() {
  try {
    const vsebina = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      vsebina
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter((v) => v.includes('=') && !v.startsWith('#'))
        .map((v) => {
          const i = v.indexOf('=')
          return [v.slice(0, i).trim(), v.slice(i + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

function arg(ime, privzeto = null) {
  const i = process.argv.indexOf('--' + ime)
  if (i < 0) return privzeto
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

const env = izEnv()
const BASE =
  process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY (npx supabase status)')
  process.exit(1)
}
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

const sezona = arg('sezona')
// Tedenski zagon: cene ne postavi na novo, ampak jih priblizuje izracunani —
// najvec za `--najvec` (privzeto 1.0) na zagon. Brez tega bi igralec, ki je
// jeseni pri 4.5 nabral minute, cez noc stal 9.0, uporabnik pa ga ima v ekipi
// po stari ceni. Sidro borze (`value_start`) potuje z njim, sicer bi cena
// takoj trcila ob mejo 3.0 od sidra.
const tedensko = process.argv.includes('--tedensko')
// `--samo-nove` predela le igralce brez `value_start` — tiste, ki jih uvoz
// prvič pripelje v bazo. Obstoječih cen se ne dotakne. Uporabno v tedenskem
// cronu, kjer polna ovrednota lahko premika stare cene skokovito, mi pa
// samo hočemo, da vsakič novi rekruti dobijo pravo sidro.
const samoNove = process.argv.includes('--samo-nove')
const najvecPremik = Number(arg('najvec', NAJVECJI_TEDENSKI_PREMIK))
const tekmovanje = await najdiTekmovanje(db, arg('tekmovanje', 'clani'))
console.log(`Tekmovanje: ${tekmovanje.name}${samoNove ? ' — samo novi' : ''}`)

const igralci = await vseVrstice((od, do_) =>
  db
    .from('players')
    .select(
      'id, full_name, position, value, value_start, value_locked, nzs_top_league, nzs_top_league_minutes',
    )
    .eq('competition_id', tekmovanje.id)
    .order('id')
    .range(od, do_),
)

const naSi = new Set((igralci ?? []).map((p) => p.id))

// --- statistika ------------------------------------------------------------
// `player_season_stats` nima stolpca za tekmovanje, zato pade sem vse — pri
// stirih ligah cez 2400 vrstic. Brez branja po straneh bi PostgREST vrnil
// prvih tisoc in liga, ki bi bila v vrsti zadnja, bi ostala brez statistike:
// vsi igralci po 4.5 in nobene napake.
let stat
try {
  stat = await vseVrstice((od, do_) => {
    let q = db
      .from('player_season_stats')
      .select('player_id, season, minutes, goals, points, matches, clean_sheets, yellow_cards, red_cards')
    if (sezona) q = q.eq('season', sezona)
    return q.order('player_id').order('season').range(od, do_)
  })
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

// seštej po igralcu (če je sezon več)
const poIgralcu = new Map()
for (const s of (stat ?? []).filter((s) => naSi.has(s.player_id))) {
  const t = poIgralcu.get(s.player_id) ?? { minutes: 0, goals: 0, points: 0, matches: 0, clean_sheets: 0, yellow_cards: 0, red_cards: 0 }
  t.minutes += s.minutes ?? 0
  t.goals += s.goals ?? 0
  t.points += Number(s.points ?? 0)
  t.matches += s.matches ?? 0
  t.clean_sheets += s.clean_sheets ?? 0
  t.yellow_cards += s.yellow_cards ?? 0
  t.red_cards += s.red_cards ?? 0
  poIgralcu.set(s.player_id, t)
}
console.log(`Igralcev s statistiko: ${poIgralcu.size} od ${naSi.size}`)

// --- surova ocena ----------------------------------------------------------
// POMEMBNO: vrednost namenoma NE izhaja iz fantasy točk, ker so te odvisne od
// pozicije. Dokler skupnost pozicij ne izglasuje, ima večina igralcev pozicijo
// NULL in bi za gole in "brez prejetega gola" dobila 0 točk — vrednotenje bi
// tako precenilo vratarje (edine z znano pozicijo iz zapisnika).
// Zato ocenjujemo iz surove statistike, ki je od pozicije neodvisna.
const ocene = new Map()
for (const p of igralci ?? []) {
  const s = poIgralcu.get(p.id)
  if (!s || s.minutes < MIN_MINUT) continue

  const na90 = (v) => v / (s.minutes / 90)
  const goliNa90 = na90(s.goals)
  const csDelez = s.clean_sheets / Math.max(1, s.matches)
  const kartoniNa90 = na90(s.yellow_cards + 3 * s.red_cards)

  const ocena =
    goliNa90 * 3.0 + // napadalni prispevek
    csDelez * 1.0 + // obrambni prispevek
    Math.min(1, s.minutes / MINUT_ZA_POLNO_ZAUPANJE) * 0.8 - // igra redno
    kartoniNa90 * 0.5 // nediscipliniranost

  const zaupanje = Math.min(1, s.minutes / MINUT_ZA_POLNO_ZAUPANJE)
  // koren zaupanja: malo minut ceno zniža, a je ne izniči
  ocene.set(p.id, ocena * Math.sqrt(zaupanje))
}
console.log(`Igralcev z dovolj minutami (>=${MIN_MINUT}): ${ocene.size}`)

if (ocene.size === 0) {
  console.log('Ni dovolj podatkov za vrednotenje.')
  process.exit(0)
}

// --- razvrstitev v cenovni razpon -----------------------------------------
// Percentil je odpornejši od linearne lestvice, ker en izjemen igralec
// ne stisne vseh ostalih na dno.
// Percentil računamo znotraj pozicije: napadalci v tem točkovanju kot skupina
// dosegajo višje ocene od branilcev, zato bi jih skupna lestvica vse potisnila
// v vrh cenika — povprečen napadalec je stal 9.9 in trije so pojedli tretjino
// proračuna.
const poPoziciji = new Map()
for (const p of igralci ?? []) {
  const o = ocene.get(p.id)
  if (o == null) continue
  const koda = p.position ?? 'MID'
  if (!poPoziciji.has(koda)) poPoziciji.set(koda, [])
  poPoziciji.get(koda).push(o)
}
for (const seznam of poPoziciji.values()) seznam.sort((a, b) => a - b)

const percentilV = (urejene, v) => {
  let lo = 0
  let hi = urejene.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (urejene[mid] < v) lo = mid + 1
    else hi = mid
  }
  return lo / Math.max(1, urejene.length - 1)
}

const zaokrozi = (v) => Math.round(v * 2) / 2 // na 0.5 natančno

let posodobljenih = 0
let zaklenjenih = 0
const premaknjenih = []
const razpored = new Map()

for (const p of igralci ?? []) {
  if (p.value_locked) {
    zaklenjenih++
    continue
  }
  // V nacinu "samo novi" pustimo obstojece cene pri miru — zanima nas samo
  // sidro (value_start) za igralce, ki so ravno prisli v bazo.
  if (samoNove && p.value_start != null) continue

  const koda = p.position ?? 'MID'
  const [spodnja, zgornja] = MEJE[koda] ?? [NAJNIZJA, NAJVISJA]

  let vrednost
  const ocena = ocene.get(p.id)
  if (ocena == null) {
    vrednost = PRIVZETA
  } else {
    const q = percentilV(poPoziciji.get(koda) ?? [], ocena)
    vrednost = spodnja + Math.pow(q, EKSPONENT) * (zgornja - spodnja)
  }

  // bonus za višje lige (NZS)
  const bonus = BONUS_LIGE[p.nzs_top_league] ?? 0
  if (bonus > 0) {
    const minute = p.nzs_top_league_minutes ?? 0
    // polni bonus pri 900+ minutah v tisti ligi
    vrednost += bonus * Math.min(1, minute / 900 || 1)
  }

  vrednost = zaokrozi(Math.min(zgornja, Math.max(spodnja, vrednost)))
  razpored.set(vrednost, (razpored.get(vrednost) ?? 0) + 1)

  // `value_start` je sidro borze (cena se od njega lahko oddalji največ 3.0).
  // Postavimo ga le, kadar ga še ni IN imamo dovolj podatkov — sicer bi
  // novega Ljubljancana z 90 min zasidrali na 4.5 in do konca sezone borza
  // ne bi imela manevrskega prostora, kljub temu da bo cez cez pet krogov
  // pokazal, da spada v 8.0-9.0 razred.
  const popravek = { value: vrednost }
  if (p.value_start == null && ocena != null) popravek.value_start = vrednost

  if (tedensko) {
    const stara = Number(p.value)
    vrednost = premakniProti(stara, vrednost, najvecPremik)
    popravek.value = vrednost
    if (vrednost === stara) continue
    // Sidro potuje z isto razliko: cena, ki se je pomaknila, mora imeti okoli
    // sebe enak manevrski prostor kot prej, sicer bi borza takoj obstala.
    if (p.value_start != null)
      popravek.value_start = Math.round((Number(p.value_start) + (vrednost - stara)) * 2) / 2
    premaknjenih.push({ ime: p.full_name, iz: stara, v: vrednost })
  }

  const { error: eUpd } = await db
    .from('players')
    .update(popravek)
    .eq('id', p.id)
  if (eUpd) console.log(`  ${p.full_name}: ${eUpd.message}`)
  else posodobljenih++
}

console.log(`\nPosodobljenih: ${posodobljenih}, zaklenjenih (ročno): ${zaklenjenih}`)

if (tedensko) {
  premaknjenih.sort((a, b) => Math.abs(b.v - b.iz) - Math.abs(a.v - a.iz))
  console.log(`Premaknjenih cen: ${premaknjenih.length} (največ ${najvecPremik} na zagon)`)
  for (const x of premaknjenih.slice(0, 10))
    console.log(`  ${x.iz.toFixed(1)} → ${x.v.toFixed(1)}  ${x.ime}`)
}

console.log('\nPorazdelitev vrednosti:')
for (const v of [...razpored.keys()].sort((a, b) => a - b))
  console.log(`  ${v.toFixed(1)}  ${'█'.repeat(Math.ceil(razpored.get(v) / 3))} ${razpored.get(v)}`)

const { data: najdrazji } = await db
  .from('player_overview')
  .select('full_name, team_name, position, value, points, minutes, goals')
  .eq('competition_id', tekmovanje.id)
  .order('value', { ascending: false })
  .limit(12)
console.log('\nNajdražji igralci:')
for (const p of najdrazji ?? [])
  console.log(
    `  ${String(p.value).padStart(5)}  ${p.full_name.padEnd(26)} ${(p.team_name ?? '').padEnd(20)} ${String(p.position ?? '—').padEnd(4)} ${String(p.points).padStart(6)} tock, ${p.goals} golov, ${p.minutes} min`,
  )
