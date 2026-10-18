// Izračuna vrednost igralcev iz statistike prejšnjih sezon.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/ovrednoti-igralce.mjs
//   ... --sezona 2025/26
//   ... --tekmovanje mladinci   (mladinska liga; brez tega člani)
//   ... --pisi                 (dejansko zapiše; brez tega samo pokaže predlog)
//   ... --tedensko --pisi      (cene le približa izračunanim, največ --najvec)
//   ... --dovoli-aktivno       (polno vrednotenje VKLOPLJENE lige; glej spodaj)
//
// Brez `--pisi` skripta nikoli ne piše — v nobenem načinu. Prej je polno
// vrednotenje pisalo kar samo od sebe in ročni zagon na živi ligi je
// prevrednotil vse igralce, ki jih imajo ljudje v ekipah.
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
// zaradi enega samega dobrega nastopa — razen novinca iz VIŠJE lige iste
// države, ki ga vir prepozna po šifri osebe (`reg_st`): ta dobi ceno, izpeljano
// iz cene v višji ligi (`scripts/visja-liga.mjs`). Na vklopljeni ligi pride do
// nje le tedenski zagon, največ za `--najvec` na teden.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fcfTargetPricingModelSha256 } from './fcf-target-pricing-model.mjs'
import { tekmovanje as najdiTekmovanje } from './tekmovanje.mjs'
import { vseVrstice, vrsticeIgralcevLige } from './strani.mjs'
import { premakniProti, NAJVECJI_TEDENSKI_PREMIK } from './premik-cene.mjs'
import { isoTeden } from './cas.mjs'
import { ravenLige, koliko, cenaIzVisjeLige, zadnjiDveSezoni } from './visja-liga.mjs'

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

const najvec = arg('najvec', NAJVECJI_TEDENSKI_PREMIK)
const najvecPremik = Number(najvec)
if (najvec === true || String(najvec).trim() === '' || !Number.isFinite(najvecPremik) || najvecPremik < 0) {
  console.error('Neveljaven --najvec: podaj končno število, večje ali enako 0.')
  process.exit(1)
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
// po stari ceni. Izhodisce borze (`value_start`) potuje z njim, sicer bi
// gibanje cene pokazalo tedenski popravek kot dvig ali padec na borzi.
const tedensko = process.argv.includes('--tedensko')
// `--znova` povozi tedensko varovalo; za popravke, kadar je prvi zagon
// napravil kaj narobe in cene res morajo iti se enkrat.
const znova = process.argv.includes('--znova')
const tekociTeden = isoTeden()
let zeTaTeden = 0
const pisi = process.argv.includes('--pisi')
// Polno vrednotenje postavi cene na novo. Na vklopljeni ligi to pomeni, da
// se cene igralcev v kadrih premaknejo mimo borze — zato le z izrecnim
// `--dovoli-aktivno`. Tedenski zagon (omejen premik) in `--samo-nove` (samo
// igralci brez sidra) sta za živo ligo narejena in varovala ne potrebujeta.
const dovoliAktivno = process.argv.includes('--dovoli-aktivno')
// `--samo-nove` predela le igralce brez `value_start` — tiste, ki jih uvoz
// prvič pripelje v bazo. Obstoječih cen se ne dotakne. Uporabno v tedenskem
// cronu, kjer polna ovrednota lahko premika stare cene skokovito, mi pa
// samo hočemo, da vsakič novi rekruti dobijo pravo sidro.
const samoNove = process.argv.includes('--samo-nove')
const tekmovanje = await najdiTekmovanje(db, arg('tekmovanje', 'clani'))
// Exact inactive FCF replay uses the ordinary calculation below. No writes,
// weekly movement, active override or partial/new-player mode is admitted.
const releasePlan = arg('release-plan')
if (releasePlan && (typeof releasePlan !== 'string' || pisi || tedensko || samoNove || dovoliAktivno || znova || tekmovanje.active || tekmovanje.source !== 'fcf' || !['es-ct-segona-g1','es-ct-tercera-g9'].includes(tekmovanje.slug) || sezona !== '2026/27')) {
  console.error('FCF_PRICE: exact inactive full-season read-only replay required')
  process.exit(1)
}
const releaseVector = []
console.log(`Tekmovanje: ${tekmovanje.name}${samoNove ? ' — samo novi' : ''}`)
if (pisi && tekmovanje.active && !tedensko && !samoNove && !dovoliAktivno) {
  console.error(
    `Liga ${tekmovanje.slug} je vklopljena: polno vrednotenje bi prepisalo cene igralcev v ekipah.\n` +
      'Za tedenski premik uporabi --tedensko, za nove igralce --samo-nove, ' +
      'za izrecen prepis pa dodaj --dovoli-aktivno.',
  )
  process.exit(1)
}

const igralci = await vseVrstice((od, do_) =>
  db
    .from('players')
    .select(
      'id, full_name, position, position_source, value, value_start, value_locked, nzs_top_league, nzs_top_league_minutes, repriced_week, reg_st',
    )
    .eq('competition_id', tekmovanje.id)
    .order('id')
    .range(od, do_),
)

const naSi = new Set((igralci ?? []).map((p) => p.id))

// Cene igralcev z zgodovino upravlja borza, ki lahko znova uveljavi stare zapise.
// Zgodovino potrebujeta dva primera: tedenski zagon (ki borzne igralce
// preskoci) in vklopljena liga (kjer sidro sme slediti izracunu le pri
// igralcih brez borze). Pri neaktivni ligi je ne beremo — ekip ni in sidro
// tako ali tako sme slediti.
const naBorzi = new Set()
if (tedensko || tekmovanje.active) {
  try {
    const zgodovina = await vrsticeIgralcevLige(db, 'price_changes', 'player_id', tekmovanje.id)
    for (const z of zgodovina) naBorzi.add(z.player_id)
  } catch (e) {
    console.error(`Borzne zgodovine ni mogoče prebrati: ${e.message}`)
    process.exit(1)
  }
}

// --- statistika ------------------------------------------------------------
// Po straneh in po ligi. Brez branja po straneh bi PostgREST vrnil prvih
// tisoc in liga, ki bi bila v vrsti zadnja, bi ostala brez statistike: vsi
// igralci po 4.5 in nobene napake. Brez filtra na ligo pa vsaka stran znova
// seteje nastope vseh lig in pri 24 ligah pade na statement timeout.
let stat
try {
  stat = await vseVrstice((od, do_) => {
    let q = db
      .from('player_season_stats')
      .select('player_id, season, minutes, goals, points, matches, clean_sheets, yellow_cards, red_cards')
      .eq('competition_id', tekmovanje.id)
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
// Zgodaj v sezoni brez arhiva (fcf, fas) ima po 2–4 krogih le peščica
// igralcev 270 minut in liga ostane pri 4.5 — cenik ne loči nikogar. Prag
// zato sledi temu, koliko je liga sploh odigrala: tretjina minut najbolj
// zaposlenega igralca, a vsaj ena cela tekma. Lige z arhivom ali vsaj devetimi
// odigranimi krogi imajo prag nespremenjen (270). Vklopljena liga ga ima vedno
// nespremenjenega: tam cene vodi borza, nižji prag bi tedenski zagon premaknil.
const najvecMinut = Math.max(0, ...[...poIgralcu.values()].map((s) => s.minutes))
const prag = tekmovanje.active ? MIN_MINUT : Math.min(MIN_MINUT, Math.max(90, Math.floor(najvecMinut / 3)))
if (prag < MIN_MINUT) console.log(`Malo odigranega (največ ${najvecMinut} min): prag znižan na ${prag} min`)

const ocene = new Map()
for (const p of igralci ?? []) {
  const s = poIgralcu.get(p.id)
  if (!s || s.minutes < prag) continue

  const na90 = (v) => v / (s.minutes / 90)
  const goliNa90 = na90(s.goals)
  const csDelez = s.clean_sheets / Math.max(1, s.matches)
  // Rumene karte namenoma tehtamo malo (0.3 namesto 1). Branilec, ki v
  // sezoni nabere 10 rumenih, pogosto ni "slab" — ampak taksts se je
  // krcal in delal obrambe. Rdece so drugacna zgodba (izgubljena tekma
  // za soigralce), zato ostajajo pri utezi 3.
  const kartoniNa90 = na90(0.3 * s.yellow_cards + 3 * s.red_cards)

  const ocena =
    goliNa90 * 3.0 + // napadalni prispevek
    csDelez * 1.0 + // obrambni prispevek
    Math.min(1, s.minutes / MINUT_ZA_POLNO_ZAUPANJE) * 0.8 - // igra redno
    kartoniNa90 * 0.5 // nediscipliniranost

  const zaupanje = Math.min(1, s.minutes / MINUT_ZA_POLNO_ZAUPANJE)
  // koren zaupanja: malo minut ceno zniža, a je ne izniči
  ocene.set(p.id, ocena * Math.sqrt(zaupanje))
}
console.log(`Igralcev z dovolj minutami (>=${prag}): ${ocene.size}`)

if (ocene.size === 0) {
  console.log('Ni dovolj podatkov za vrednotenje.')
  process.exit(releasePlan ? 1 : 0)
}

// --- novinci iz višjih lig ----------------------------------------------------
// Igralec brez dovolj minut v tej ligi, ki ima isto šifro osebe v višji ligi
// iste države in vira in tam vsaj MIN_MINUT v zadnjih dveh sezonah, dobi ceno
// iz tamkajšnje cene (glej visja-liga.mjs). Le navzgor: kdor bi bil tako
// cenejši od privzete, ostane pri 4.5.
const zaokrozi = (v) => Math.round(v * 2) / 2 // na 0.5 natančno

let prenosi
try {
  prenosi = await ceneIzVisjihLig()
} catch (e) {
  console.error(`Cen iz višjih lig ni mogoče prebrati: ${e.message}`)
  process.exit(1)
}
console.log(`Novincev s ceno iz višje lige: ${prenosi.size}`)

async function ceneIzVisjihLig() {
  const izhod = new Map()
  const kandidati = (igralci ?? []).filter((p) => p.reg_st && !ocene.has(p.id) && !p.value_locked)
  if (!kandidati.length || !tekmovanje.country_id) return izhod

  const { data: lige, error: eLige } = await db
    .from('competitions')
    .select('id, slug, name, source, federation_id')
    .eq('country_id', tekmovanje.country_id)
  if (eLige) throw new Error(eLige.message)
  const { data: zveze, error: eZveze } = await db
    .from('federations')
    .select('id, code')
    .eq('country_id', tekmovanje.country_id)
  if (eZveze) throw new Error(eZveze.message)
  const kodaZveze = new Map((zveze ?? []).map((z) => [z.id, z.code]))
  const ravni = new Map(
    (lige ?? []).map((l) => [l.id, ravenLige({ slug: l.slug, name: l.name, zveza: kodaZveze.get(l.federation_id) })]),
  )
  const moja = ravni.get(tekmovanje.id)
  if (!moja) return izhod
  // Šifra osebe velja le znotraj vira (NZS in MNZ imata vsak svoje številke).
  const visje = (lige ?? []).filter(
    (l) => l.id !== tekmovanje.id && l.source === tekmovanje.source && koliko(ravni.get(l.id), moja) > 0,
  )
  if (!visje.length) return izhod
  const imeLige = new Map(visje.map((l) => [l.id, l.slug]))

  const poSifri = new Map()
  for (const p of kandidati) {
    if (!poSifri.has(p.reg_st)) poSifri.set(p.reg_st, [])
    poSifri.get(p.reg_st).push(p)
  }
  const sifre = [...poSifri.keys()]
  const drugi = []
  for (let i = 0; i < sifre.length; i += 100) {
    const kos = sifre.slice(i, i + 100)
    drugi.push(
      ...(await vseVrstice((od, do_) =>
        db
          .from('players')
          .select('id, reg_st, competition_id, position, value')
          .in('reg_st', kos)
          .in('competition_id', [...imeLige.keys()])
          .is('anonimiziran_at', null)
          .order('id')
          .range(od, do_),
      )),
    )
  }
  if (!drugi.length) return izhod

  const statistika = []
  for (let i = 0; i < drugi.length; i += 150) {
    const kos = drugi.slice(i, i + 150).map((d) => d.id)
    statistika.push(
      ...(await vseVrstice((od, do_) =>
        db
          .from('player_season_stats')
          .select('player_id, season, minutes')
          .in('player_id', kos)
          .order('player_id')
          .order('season')
          .range(od, do_),
      )),
    )
  }
  const sezone = new Set(zadnjiDveSezoni(statistika.map((s) => s.season)))
  const minute = new Map()
  for (const s of statistika)
    if (sezone.has(s.season)) minute.set(s.player_id, (minute.get(s.player_id) ?? 0) + (s.minutes ?? 0))

  for (const d of drugi) {
    if ((minute.get(d.id) ?? 0) < MIN_MINUT || d.value == null) continue
    const za = ravni.get(d.competition_id)
    const stopnje = koliko(za, moja)
    for (const p of poSifri.get(d.reg_st) ?? []) {
      // Brez znane pozicije v tej ligi velja tista iz višje lige: branilec z
      // 8.4 (blizu vrha branilcev) ni napadalec z 8.4.
      const mejeCilj = MEJE[p.position ?? d.position ?? 'MID'] ?? [NAJNIZJA, NAJVISJA]
      const surova = cenaIzVisjeLige(d.value, MEJE[d.position ?? 'MID'] ?? [NAJNIZJA, NAJVISJA], mejeCilj, stopnje, EKSPONENT)
      const cena = zaokrozi(Math.min(mejeCilj[1], Math.max(mejeCilj[0], surova)))
      if (cena <= PRIVZETA) continue
      const prej = izhod.get(p.id)
      if (!prej || cena > prej.cena)
        izhod.set(p.id, { cena, liga: imeLige.get(d.competition_id), tamCena: Number(d.value), minute: minute.get(d.id), stopnje })
    }
  }
  return izhod
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

let posodobljenih = 0
let neuspesnih = 0
let zaklenjenih = 0
let borznih = 0
const premaknjenih = []
const novinci = []
const razpored = new Map()

for (const p of igralci ?? []) {
  if (p.value_locked) {
    if (releasePlan) releaseVector.push({id:p.id,value:Number(p.value),value_start:p.value_start==null?null:Number(p.value_start),position:p.position,position_source:p.position_source})
    zaklenjenih++
    continue
  }
  // V nacinu "samo novi" pustimo obstojece cene pri miru — zanima nas samo
  // sidro (value_start) za igralce, ki so ravno prisli v bazo.
  if (samoNove && p.value_start != null) continue
  const ocena = ocene.get(p.id)
  const prenos = ocena == null ? prenosi.get(p.id) : null
  // Borza upravlja ceno igralca, ki je že igral v živi ligi. Novinca iz višje
  // lige, ki je pod ceno iz višje lige, tedenski zagon vseeno dvigne (z njim
  // potuje sidro, zato borzni odmik ostane) — sicer bi ostal pri 4.5.
  if (tedensko && naBorzi.has(p.id) && !(prenos && prenos.cena > Number(p.value))) {
    borznih++
    continue
  }
  // Zagon NI idempotenten: vsak premakne ceno do 1.0 in z njo sidro borze.
  // Dvakrat v istem tednu torej pomeni premik za 2.0 — prav zato je bil urnik
  // izklopljen. Igralca, ki je ta teden ze bil prevrednoten, pustimo pri miru.
  if (tedensko && !znova && p.repriced_week === tekociTeden) {
    zeTaTeden++
    continue
  }

  const koda = p.position ?? 'MID'
  const [spodnja, zgornja] = MEJE[koda] ?? [NAJNIZJA, NAJVISJA]

  let vrednost
  if (ocena == null) {
    vrednost = prenos ? prenos.cena : PRIVZETA
  } else {
    const q = percentilV(poPoziciji.get(koda) ?? [], ocena)
    vrednost = spodnja + Math.pow(q, EKSPONENT) * (zgornja - spodnja)
  }

  // bonus za višje lige (NZS)
  const bonus = BONUS_LIGE[p.nzs_top_league] ?? 0
  if (bonus > 0) {
    const minute = p.nzs_top_league_minutes
    // polni bonus pri 900+ minutah v tisti ligi. Nevpisane minute (null)
    // pomenijo poln bonus kot doslej; izrecnih 0 minut pomeni 0 bonusa
    // (prej je `|| 1` tudi iz nič naredil poln bonus).
    vrednost += bonus * (minute == null ? 1 : Math.min(1, minute / 900))
  }

  vrednost = zaokrozi(Math.min(zgornja, Math.max(spodnja, vrednost)))

  // `value_start` je izhodisce borze (od njega se meri gibanje cene).
  // Postavimo ga le, kadar ga še ni IN imamo dovolj podatkov — sicer bi
  // novega Ljubljancana z 90 min zasidrali na 4.5 in do konca sezone borza
  // ne bi imela manevrskega prostora, kljub temu da bo cez cez pet krogov
  // pokazal, da spada v 8.0-9.0 razred.
  const popravek = { value: vrednost }
  // Liga, ki se ni zazivela, nima borzne zgodovine — takrat sme sidro slediti
  // izracunu. Brez tega ponovni zagon med postavljanjem lige premakne ceno,
  // sidro pa pusti pri miru in gibanje cene pokaze premik, ki ga ni bilo.
  // Liga, ki se ni vklopljena, nima ekip — nihce teh igralcev nima v kadru,
  // zato sme sidro slediti izracunu tudi, ce je nocni posel ceno ze premaknil.
  // Pri vklopljeni ligi to stori le, kadar igralec se ni bil na borzi.
  const brezBorze = tedensko ? false : !tekmovanje.active || !naBorzi.has(p.id)

  if (tedensko) {
    const stara = Number(p.value)
    vrednost = premakniProti(stara, vrednost, najvecPremik)
    popravek.value = vrednost
    if (vrednost === stara) continue
    // Sidro potuje z isto razliko: cena, ki se je pomaknila, mora imeti okoli
    // sebe enak manevrski prostor kot prej, sicer bi borza takoj obstala.
    // Borza hrani desetinke; zaokrožitev sidra na polovico bi spremenila odmik.
    if (p.value_start != null)
      popravek.value_start = Math.round((Number(p.value_start) + (vrednost - stara)) * 10) / 10
    // Zig nosi teden (kljuc varovala) in cas (sled, kdaj natanko).
    popravek.repriced_week = tekociTeden
    popravek.repriced_at = new Date().toISOString()
    premaknjenih.push({ ime: p.full_name, iz: stara, v: vrednost })
  }

  if ((p.value_start == null || brezBorze) && (ocena != null || prenos)) popravek.value_start = vrednost
  if (releasePlan) releaseVector.push({id:p.id,value:popravek.value,value_start:popravek.value_start??(p.value_start==null?null:Number(p.value_start)),position:p.position,position_source:p.position_source})
  if (prenos && vrednost !== Number(p.value))
    novinci.push({ ime: p.full_name, iz: Number(p.value), v: vrednost, ...prenos })
  razpored.set(vrednost, (razpored.get(vrednost) ?? 0) + 1)
  if (!pisi) continue

  const { error: eUpd } = await db
    .from('players')
    .update(popravek)
    .eq('id', p.id)
  if (eUpd) {
    neuspesnih++
    console.error(`  ${p.full_name}: ${eUpd.message}`)
  } else posodobljenih++
}

if (releasePlan) writeFileSync(releasePlan,JSON.stringify({schemaVersion:1,kind:'fcf-target-price-replay',targetSlug:tekmovanje.slug,competitionId:tekmovanje.id,season:sezona,modelSha256:fcfTargetPricingModelSha256(),computedCount:ocene.size,threshold:prag,players:releaseVector.sort((a,b)=>a.id-b.id)}),{flag:'wx',mode:0o600})

if (pisi)
  console.log(`\nPosodobljenih: ${posodobljenih}, zaklenjenih (ročno): ${zaklenjenih}`)

if (tedensko) {
  console.log(`Preskočenih (cene upravlja borza): ${borznih}`)
  // Ob `--znova` je stevec vedno 0, ker varovala sploh ne vprasamo — izpis
  // "noben ni bil prevrednoten" bi bil takrat neresnica.
  console.log(
    znova
      ? `Teden ${tekociTeden}: varovalo povoženo z --znova`
      : zeTaTeden
        ? `Preskočenih (v tednu ${tekociTeden} že prevrednoteni): ${zeTaTeden}`
        : `Teden ${tekociTeden}: noben igralec še ni bil prevrednoten`,
  )
  premaknjenih.sort((a, b) => Math.abs(b.v - b.iz) - Math.abs(a.v - a.iz))
  console.log(`Predlaganih premikov cen: ${premaknjenih.length} (največ ${najvecPremik} na zagon)`)
  for (const x of premaknjenih.slice(0, 10))
    console.log(`  ${x.iz.toFixed(1)} → ${x.v.toFixed(1)}  ${x.ime}`)
}

// Načrt za pregled: kdo dobi ceno iz višje lige in od kod.
novinci.sort((a, b) => b.v - a.v)
console.log(`\nCena iz višje lige: ${novinci.length} igralcev${tedensko ? ` (premik največ ${najvecPremik} na zagon)` : ''}`)
for (const x of novinci.slice(0, 40))
  console.log(
    `  ${x.iz.toFixed(1)} → ${x.v.toFixed(1)}  ${x.ime} — ${x.liga}: ${x.tamCena.toFixed(1)}, ${x.minute} min, ${x.stopnje} ${x.stopnje === 1 ? 'raven' : 'ravni'} višje`,
  )

console.log('\nPorazdelitev vrednosti:')
for (const v of [...razpored.keys()].sort((a, b) => a - b))
  console.log(`  ${v.toFixed(1)}  ${'█'.repeat(Math.ceil(razpored.get(v) / 3))} ${razpored.get(v)}`)

if (!pisi) {
  console.log('\nTo je le predlog. Za zapis v bazo dodaj --pisi')
  process.exit(0)
}

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

if (neuspesnih > 0) {
  console.error(`\nNeuspešnih: ${neuspesnih}, uspešnih: ${posodobljenih}. Vrednotenje ni uspelo v celoti.`)
  process.exitCode = 1
}
