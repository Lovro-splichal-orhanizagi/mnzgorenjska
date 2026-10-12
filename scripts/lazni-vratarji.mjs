// Igralec iz polja, ki ga je ENA oznaka vratarja za vselej prekrstila v GK.
//
// Uvoz (`smeVVrata` v uvoz-zapisnikov.mjs) igralca z neznano ali ugibano
// pozicijo prekrsti v vratarja (GK, position_source 'zapisnik'), brž ko ga en
// sam zapisnik označi za vratarja, in ga nazaj ne vrne nič. Srbski viri (fsb,
// fss, fssid) označijo le vratarja, zato je za uvoz vsak igralec iz polja
// "neznan" in vsaka posamezna oznaka zadošča. COMET pa igralca iz polja na
// posamezni tekmi kdaj vodi kot vratarja (vnos kluba): Mirković Dalibor
// (Šarbanovac, rs-bor-okruzna) je pet tekem začel z 11 ob vratarju Paunoviću,
// na eni (76083196) pa ga fss.rs našteje prvega z 1 in prvaliga.rs mu da (G).
// Razčlenjevalnik je prav prebral, uvoz pa je napadalca s 6 goli prekrstil v
// vratarja, čigar gol je vreden več točk. Ob vklopu srbskih lig 12. 10. 2026 je
// bilo takih 112.
//
// Pravilo (zadnja sezona, v kateri je igralec začel kako tekmo — letos ali, če
// letos še ni igral, lani; le ZAČETKI — rezervni vratar, ki vstopi, pri
// namigu "prvi začetnik" oznake nima): igralec je LAŽEN vratar, če je vsaj
// NAJMANJ_V_POLJU tekem začel v polju, medtem ko je začel drug označen vratar
// njegove ekipe, in je takih tekem več kot tistih, ki jih je začel kot vratar.
// Lažni dobi pozicijo, kot bi jo dalo ugibanje (ugani-pozicije.mjs, razvrstitev
// znotraj kluba po golih in kartonih), s position_source 'ugibanje' — glasovanje
// ga lahko popravi.
//
// Velja za vire z `vratarPoVecini` (fsb, fss, fssid); nočni uvoz ga požene za
// vsako takšno ligo. Druge vire (HNS, MLSZ, …) usklajuje ročni *Uskladi pozicije*.
//
//   node scripts/lazni-vratarji.mjs --tekmovanje rs-bor-okruzna   # le izpis
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/lazni-vratarji.mjs --tekmovanje … --pisi
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const NAJMANJ_V_POLJU = 2

/**
 * Glasovi vratar/polje po igralcu iz začetkov njegove zadnje sezone.
 * @param {{igralec: number, tekma: number, klub: number, sezona: string, zacel: boolean, vratar: boolean}[]} nastopi
 *   nastopi lige (tudi soigralcev — iz njih vemo, ali je začel drug vratar)
 * @returns {Map<number, {gk: number, polje: number, sezona: string}>}
 */
export function glasoviVratarjev(nastopi) {
  const zVratarjem = new Set() // `${tekma}|${klub}`, kjer je začel označen vratar
  for (const n of nastopi) if (n.zacel && n.vratar) zVratarjem.add(`${n.tekma}|${n.klub}`)
  const out = new Map()
  for (const n of nastopi) {
    if (!n.zacel) continue
    let g = out.get(n.igralec)
    if (!g || String(n.sezona) > g.sezona) out.set(n.igralec, (g = { gk: 0, polje: 0, sezona: String(n.sezona) }))
    else if (String(n.sezona) < g.sezona) continue
    if (n.vratar) g.gk++
    else if (zVratarjem.has(`${n.tekma}|${n.klub}`)) g.polje++
  }
  return out
}

export const jeLazenVratar = (g) => !!g && g.polje >= NAJMANJ_V_POLJU && g.polje > g.gk

// Pričakovana sestava enajsterice brez vratarja: 4 branilci, 4 vezisti,
// 2–3 napadalci. V deležih igralskega kadra kluba (ugani-pozicije.mjs).
export const DELEZ_NAPADALCEV = 0.25
export const DELEZ_BRANILCEV = 0.42
export const MIN_MINUT = 180

/**
 * Razvrstitev kadra enega kluba (igralci iz polja z vsaj MIN_MINUT): najboljši
 * strelci na 90 minut so napadalci, med ostalimi tisti z največ kartoni
 * branilci, ostali vezisti. Pri manj kot štirih igralcih ne razvrsti nikogar.
 * @param {{id: number, goliNa90: number, kartoniNa90: number}[]} kader
 * @returns {Map<number, 'FWD'|'DEF'|'MID'>}
 */
export function razvrstiKlub(kader) {
  const out = new Map()
  const n = kader.length
  if (n < 4) return out
  // 1. najboljši strelci -> napadalci
  const poGolih = [...kader].sort((a, b) => b.goliNa90 - a.goliNa90)
  const stNapadalcev = Math.max(1, Math.round(n * DELEZ_NAPADALCEV))
  const napadalci = new Set(poGolih.slice(0, stNapadalcev).map((p) => p.id))
  // 2. med preostalimi tisti z največ kartoni -> branilci
  const ostali = kader.filter((p) => !napadalci.has(p.id))
  const poKartonih = [...ostali].sort((a, b) => {
    if (b.kartoniNa90 !== a.kartoniNa90) return b.kartoniNa90 - a.kartoniNa90
    // ob enakem številu kartonov je manj golov bolj obrambno
    return a.goliNa90 - b.goliNa90
  })
  const stBranilcev = Math.max(1, Math.round(n * DELEZ_BRANILCEV))
  const branilci = new Set(poKartonih.slice(0, stBranilcev).map((p) => p.id))
  for (const p of kader) out.set(p.id, napadalci.has(p.id) ? 'FWD' : branilci.has(p.id) ? 'DEF' : 'MID')
  return out
}

/** Na 90 minut, kot v ugani-pozicije (pod 90 minutami deli z 1). */
export const na90 = (v, minute) => v / Math.max(1, (minute ?? 0) / 90)

/**
 * Nove pozicije lažnih vratarjev: kot bi jih razvrstilo ugibanje med igralci
 * kluba brez zanesljive pozicije (lažni so po popravku med njimi);
 * premalo minut ali premajhen kader → MID.
 * @param {{id: number, team_id: number}[]} lazni
 * @param {{id: number, team_id: number, minutes: number, goals: number, kartoni: number, position_source: string}[]} igralciLige
 *   urejeni po id (kot jih bere ugani-pozicije)
 * @returns {Map<number, 'FWD'|'DEF'|'MID'>}
 */
export function pozicijeLaznih(lazni, igralciLige) {
  const zanesljivi = ['zapisnik', 'admin', 'glasovanje']
  const idji = new Set(lazni.map((p) => p.id))
  const out = new Map()
  for (const klub of new Set(lazni.map((p) => p.team_id))) {
    const kader = igralciLige
      .filter((p) => p.team_id === klub && (idji.has(p.id) || !zanesljivi.includes(p.position_source)))
      .filter((p) => (p.minutes ?? 0) >= MIN_MINUT)
      .map((p) => ({ id: p.id, goliNa90: na90(p.goals ?? 0, p.minutes), kartoniNa90: na90(p.kartoni ?? 0, p.minutes) }))
    const razvrstitev = razvrstiKlub(kader)
    for (const p of lazni) if (p.team_id === klub) out.set(p.id, razvrstitev.get(p.id) ?? 'MID')
  }
  return out
}

// --- zagon -------------------------------------------------------------------

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { vseVrstice, vrsticeIgralcevLige } = await import('./strani.mjs')
  const { tekmovanje: najdiTekmovanje, slugTekmovanja } = await import('./tekmovanje.mjs')
  const { viraZa } = await import('./viri/index.mjs')

  const pisi = process.argv.includes('--pisi')
  const BASE = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const KLJUC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!KLJUC || (pisi && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Manjka SUPABASE_SERVICE_ROLE_KEY (za izpis zadošča SUPABASE_ANON_KEY).')
    process.exit(1)
  }
  const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })
  const liga = await najdiTekmovanje(db, slugTekmovanja(null))
  if (!viraZa(liga).vratarPoVecini) {
    console.log(`${liga.slug}: vir ${liga.source} ni med viri z vratarjem po večini — preskočeno`)
    return
  }
  const vratarji = await vseVrstice((od, do_) =>
    db.from('players').select('id, full_name, team_id')
      .eq('competition_id', liga.id).eq('position', 'GK').eq('position_source', 'zapisnik')
      .order('id').range(od, do_),
  )
  if (!vratarji.length) return
  // Vsi začetki lige (tudi soigralcev: iz njih vemo, ali je začel drug vratar).
  const { data: krogi, error: eKrogi } = await db.from('rounds').select('id, season').eq('competition_id', liga.id)
  if (eKrogi) throw new Error(`${liga.slug}: krogi: ${eKrogi.message}`)
  const sezonaKroga = new Map((krogi ?? []).map((k) => [k.id, k.season]))
  const sezonaTekme = new Map()
  const idjiKrogov = [...sezonaKroga.keys()]
  for (let i = 0; i < idjiKrogov.length; i += 300) {
    for (const m of await vseVrstice((od, do_) =>
      db.from('matches').select('id, round_id').in('round_id', idjiKrogov.slice(i, i + 300)).order('id').range(od, do_),
    )) sezonaTekme.set(m.id, sezonaKroga.get(m.round_id))
  }
  const tekme = [...sezonaTekme.keys()]
  const nastopi = []
  for (let i = 0; i < tekme.length; i += 300) {
    nastopi.push(...(await vseVrstice((od, do_) =>
      db.from('appearances').select('player_id, match_id, team_id, started, is_goalkeeper')
        .in('match_id', tekme.slice(i, i + 300)).eq('started', true)
        .order('id').range(od, do_),
    )))
  }
  const glasovi = glasoviVratarjev(nastopi.map((a) => ({
    igralec: a.player_id, tekma: a.match_id, klub: a.team_id, sezona: sezonaTekme.get(a.match_id),
    zacel: a.started, vratar: a.is_goalkeeper,
  })))
  const lazni = vratarji.filter((p) => jeLazenVratar(glasovi.get(p.id)))
  if (!lazni.length) return

  const igralciLige = await vseVrstice((od, do_) =>
    db.from('player_overview').select('id, team_id, position_source, minutes, goals')
      .eq('competition_id', liga.id).order('id').range(od, do_),
  )
  const kartoni = new Map()
  for (const a of await vrsticeIgralcevLige(db, 'appearances', 'player_id, yellow_cards, red_cards', liga.id))
    kartoni.set(a.player_id, (kartoni.get(a.player_id) ?? 0) + (a.yellow_cards ?? 0) + (a.red_cards ?? 0))
  const zKartoni = igralciLige.map((p) => ({ ...p, kartoni: kartoni.get(p.id) ?? 0 }))

  console.log(`${liga.slug}: lažnih vratarjev ${lazni.length}${pisi ? '' : ' (le izpis, brez --pisi)'}`)
  let napak = 0
  const nove = pozicijeLaznih(lazni, zKartoni)
  for (const p of lazni) {
    const poz = nove.get(p.id)
    const g = glasovi.get(p.id)
    console.log(`  ${p.full_name} (id ${p.id}): GK → ${poz}   [${g.sezona}: vratar ${g.gk}, v polju ob vratarju ${g.polje}]`)
    if (!pisi) continue
    const { error } = await db.from('players').update({ position: poz, position_source: 'ugibanje' })
      .eq('id', p.id).eq('position', 'GK').eq('position_source', 'zapisnik')
    if (error) { console.error(`  ${p.full_name}: ${error.message}`); napak++ }
  }
  if (napak) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => { console.error(e.message ?? e); process.exit(1) })
}
