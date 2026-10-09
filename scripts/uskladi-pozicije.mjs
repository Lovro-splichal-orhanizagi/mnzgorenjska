// Pozicije igralcev iz večine letošnjih zapisnikov (vir, ki pozicijo zapiše: Sportnet).
//
// Uvoz vzame pozicijo iz PRVEGA zapisnika, v katerem igralca vidi, in je pozneje
// ne spremeni. Ádám Erik (Želovce, sk-vk-7liga) je bil oktobra 2024 vratar pri
// Bušincah; arhiv ga je vpisal kot GK, letos je vezist in vsi letošnji
// zapisniki ga tako vodijo, na strani pa je ostal vratar (klub je pisal 7. 10. 2026).
//
// En sam zapisnik ni dovolj: klub se zmoti (Labaška je bil po eni oznaki
// vratar s 49 goli), zato velja VEČINA letošnjih zapisnikov, z vsaj dvema
// glasovoma. Če sta v postavi ekipe dva "goalkeeper"-ja, oznaka vratarja na tisti
// tekmi ne šteje (kot pri uvozu). Popravi le pozicije iz zapisnika: glasovanja
// in admina ne povozi. Kader ostane veljaven, ker veljavnost šteje pozicijo ob
// nakupu (fantasy_roster.buy_position); igralec od zdaj točkuje po pravi poziciji.
//
//   node scripts/uskladi-pozicije.mjs                          # vse sportnet lige, le izpis
//   node scripts/uskladi-pozicije.mjs --tekmovanje sk-vk-7liga
//   node scripts/uskladi-pozicije.mjs --pisi                   # zapiše (servisni ključ)
//   node scripts/uskladi-pozicije.mjs --vse-pozicije           # tudi DEF/MID/FWD med sabo
//
// Privzeto le vratar <-> igralec iz polja. Suh tek 7. 10. 2026 je našel 1892
// razlik med 20554 slovaškimi igralci, od tega 119 z vratarjem: klubi DEF/MID/FWD
// od tekme do tekme pišejo ohlapno, menjava pozicije pa preračuna točke zadnjih
// 14 dni vsem lastnikom. Polje med sabo zato le izrecno (npr. med sezonama).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { vseVrstice } from './strani.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const POZICIJA = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' }
const GLAVE = { 'User-Agent': 'SLFF fantasy (https://slff.eu)' }
const NAJMANJ_GLASOV = 2

function izEnv() {
  try {
    const v = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      v.split('\n').map((s) => s.trim())
        .filter((s) => s.includes('=') && !s.startsWith('#'))
        .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
    )
  } catch { return {} }
}
const arg = (ime) => {
  const i = process.argv.indexOf(`--${ime}`)
  return i > 0 ? process.argv[i + 1] : null
}
const pisi = process.argv.includes('--pisi')
const vsePozicije = process.argv.includes('--vse-pozicije')
// Vir: sportnet (pozicija v zapisniku), hns (zapisnik označi le vratarja) ali
// mlsz (vratar je namig: prvi začetnik, glej scripts/viri/mlsz.mjs) ali oefb
// (vratar iz skupine `tor` ali dresa "T", glej scripts/viri/oefb.mjs) ali fsb
// (vratar iz modre značke bg-info, glej scripts/viri/fsb.mjs).
// Pri hns glasove da baza: `appearances.is_goalkeeper` na vsaki tekmi. Uvoz ga
// polni od združitve #93 (7. 10. 2026 21:06 UTC); starejše vrstice so vse
// `false` in bi prave vratarje prestavile v polje, zato štejemo le tekme,
// uvožene od takrat. (Prej '2026-10-08' = polnoč UTC: izpustilo bi ponovni
// uvoz hrvaških lig, ki je tekel 7. 10. zvečer.)
const VIR = arg('vir') ?? 'sportnet'
const OZNAKA_VRATARJA_OD = '2026-10-07T21:07:00Z'
const samo = arg('tekmovanje')

const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KLJUC = pisi
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : (process.env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY)
if (!KLJUC) {
  console.error(pisi ? 'Za --pisi manjka SUPABASE_SERVICE_ROLE_KEY.' : 'Manjka SUPABASE_ANON_KEY.')
  process.exit(1)
}
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

const { data: sezona, error: eSezona } = await db.rpc('tekoca_sezona')
if (eSezona || !sezona) {
  console.error(`tekoča sezona: ${eSezona?.message ?? 'ni podatka'}`)
  process.exit(1)
}

let q = db.from('competitions').select('id, slug').eq('source', VIR).order('sort_order')
if (samo) q = q.eq('slug', samo)
const { data: lige, error } = await q
if (error) { console.error(error.message); process.exit(1) }
if (!lige?.length) { console.error(`ni ${VIR} lige ${samo ?? ''}`); process.exit(1) }

console.log(
  `Sezona ${sezona}, lig: ${lige.length}, ${vsePozicije ? 'vse pozicije' : 'le vratarji'}` +
    (pisi ? '' : ' — samo izpis (brez --pisi)'),
)
let skupaj = 0
let zapisanih = 0

/**
 * HNS: vratar ali igralec iz polja po večini tekem (vse sezone, uvožene od
 * OZNAKA_VRATARJA_OD). GK, ki je večinoma v polju, gre na ugib (MID,
 * ugibanje — ugani-pozicije ga razvrsti), večinski vratar pa postane GK.
 */
async function uskladiHns(liga) {
  const igralci = await vseVrstice((od, do_) =>
    db.from('players')
      .select('id, full_name, position, position_source, teams(name)')
      .eq('competition_id', liga.id).in('position_source', ['zapisnik', 'ugibanje', 'neznano'])
      .order('id').range(od, do_),
  )
  const poId = new Map(igralci.map((p) => [p.id, p]))
  const glasovi = new Map()
  const idji = [...poId.keys()]
  for (let k = 0; k < idji.length; k += 300) {
    const nastopi = await vseVrstice((od, do_) =>
      db.from('appearances')
        .select('player_id, is_goalkeeper, matches!inner(imported_at)')
        .in('player_id', idji.slice(k, k + 300))
        .gte('matches.imported_at', OZNAKA_VRATARJA_OD)
        .order('id').range(od, do_),
    )
    for (const a of nastopi) {
      const g = glasovi.get(a.player_id) ?? { GK: 0, POLJE: 0 }
      g[a.is_goalkeeper ? 'GK' : 'POLJE']++
      glasovi.set(a.player_id, g)
    }
  }
  const popravki = []
  for (const [id, g] of glasovi) {
    const p = poId.get(id)
    const vseh = g.GK + g.POLJE
    if (p.position === 'GK' && g.POLJE >= NAJMANJ_GLASOV && g.POLJE * 2 > vseh)
      popravki.push({ p, nova: { position: 'MID', position_source: 'ugibanje' }, g })
    else if (p.position !== 'GK' && g.GK >= NAJMANJ_GLASOV && g.GK * 2 > vseh)
      popravki.push({ p, nova: { position: 'GK', position_source: 'zapisnik' }, g })
  }
  if (!popravki.length) return
  console.log(`\n${liga.slug}`)
  for (const { p, nova, g } of popravki)
    console.log(`  ${p.full_name} (${p.teams?.name ?? '?'}, id ${p.id}): ${p.position} → ${nova.position}   [GK ${g.GK}, polje ${g.POLJE}]`)
  skupaj += popravki.length
  if (!pisi) return
  for (const { p, nova } of popravki) {
    const { error: eP } = await db.from('players').update(nova).eq('id', p.id).eq('position_source', p.position_source)
    if (eP) { console.error(`  ${p.full_name}: ${eP.message}`); process.exitCode = 1 }
    else zapisanih++
  }
}

for (const liga of lige) {
  // MLSZ vratarja ne označi; `is_goalkeeper` je namig (prvi začetnik), ki ga
  // večina tekem potrdi ali ovrže enako kot oznako HNS.
  if (VIR === 'hns' || VIR === 'mlsz' || VIR === 'oefb' || VIR === 'fsb') { await uskladiHns(liga); continue }
  const tekme = await vseVrstice((od, do_) =>
    db.from('matches')
      .select('id, source_url, rounds!inner(season, competition_id)')
      .eq('rounds.competition_id', liga.id).eq('rounds.season', sezona)
      .not('zapisnik_id', 'is', null).like('source_url', '%sportnet%')
      .order('id').range(od, do_),
  )
  if (!tekme.length) continue

  // ISSF -> { GK: 2, MID: 5, … }
  const glasovi = new Map()
  for (const t of tekme) {
    let tekma
    try {
      const o = await prenesiSPonovitvami(t.source_url, { glave: GLAVE, premorMs: 300, log: () => {} })
      if (!o.ok) continue
      tekma = await o.json()
    } catch (e) {
      console.error(`  ${t.source_url}: ${e.message}`)
      continue
    }
    for (const n of tekma.nominations ?? []) {
      const ljudje = n.athletes ?? []
      const vratarjevVPostavi = ljudje.filter(
        (a) => !a.additionalData?.substitute && a.additionalData?.position === 'goalkeeper',
      ).length
      for (const a of ljudje) {
        const issf = Number(a.additionalData?.__issfId)
        let poz = POZICIJA[a.additionalData?.position]
        if (!issf || !poz) continue
        if (poz === 'GK' && vratarjevVPostavi > 1) continue // dvoumno, kot pri uvozu
        const g = glasovi.get(issf) ?? {}
        g[poz] = (g[poz] ?? 0) + 1
        glasovi.set(issf, g)
      }
    }
  }

  const igralci = await vseVrstice((od, do_) =>
    db.from('players')
      .select('id, full_name, position, position_source, reg_st, teams(name)')
      .eq('competition_id', liga.id).eq('position_source', 'zapisnik').not('reg_st', 'is', null)
      .order('id').range(od, do_),
  )

  const popravki = []
  for (const p of igralci) {
    const g = glasovi.get(Number(p.reg_st))
    if (!g) continue
    const vseh = Object.values(g).reduce((a, b) => a + b, 0)
    const [vecina, stevilo] = Object.entries(g).sort((a, b) => b[1] - a[1])[0]
    if (vecina === p.position) continue
    if (!vsePozicije && vecina !== 'GK' && p.position !== 'GK') continue
    if (stevilo < NAJMANJ_GLASOV || stevilo * 2 <= vseh) continue
    popravki.push({ p, vecina, g })
  }
  if (!popravki.length) continue

  console.log(`\n${liga.slug} (${tekme.length} zapisnikov)`)
  for (const { p, vecina, g } of popravki) {
    const opis = Object.entries(g).map(([k, v]) => `${k} ${v}`).join(', ')
    console.log(`  ${p.full_name} (${p.teams?.name ?? '?'}, id ${p.id}): ${p.position} → ${vecina}   [${opis}]`)
  }
  skupaj += popravki.length

  if (pisi) {
    for (const { p, vecina } of popravki) {
      const { error: eP } = await db.from('players')
        .update({ position: vecina })
        .eq('id', p.id).eq('position_source', 'zapisnik')
      if (eP) { console.error(`  ${p.full_name}: ${eP.message}`); process.exitCode = 1 }
      else zapisanih++
    }
  }
}

console.log(`\nZa popravek: ${skupaj}${pisi ? `, zapisanih: ${zapisanih}` : ''}`)
