// Klub je med sezono izstopil iz lige (Tržič 2012, mladinci, oktober 2026).
//
// Igralcev NE deaktivira: kader z neaktivnim igralcem je neveljaven in ekipa
// izgubi točke vsega kroga. Namesto tega `izstop_kluba()` (migracija
// 20261001100000):
//   * igralcem nastavi `izstopil_at` — kdor jih ima, jih obdrži, kupiti jih ne
//     more nihče več, lastnik vidi opozorilo na strani,
//   * izbriše neodigrane tekme kluba v tekoči sezoni (preverba jih ne javlja
//     več, borza ne čaka nanje).
// Odigrane tekme in točke iz njih ostanejo. Nato lastnikom ekip z igralci
// kluba pošlje e-mail (posli-opomnik, vrsta `izstop-kluba`) — istemu lastniku
// ne dvakrat.
//
//   SUPABASE_SERVICE_ROLE_KEY=... LIGA=mladinci KLUB="Tržič 2012" node scripts/izstop-kluba.mjs   # suho
//   ... SUHO=false ...                                                                            # zares
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const LIGA = process.env.LIGA
const KLUB = process.env.KLUB?.trim()
if (!BASE || !SERVICE) { console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!LIGA || !KLUB) { console.error('Manjka LIGA ali KLUB'); process.exit(1) }
const suho = String(process.env.SUHO ?? 'true').toLowerCase() !== 'false'

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

const { data: liga, error: eLiga } = await db
  .from('competitions').select('id, slug').eq('slug', LIGA).maybeSingle()
if (eLiga || !liga) { console.error(`Lige ${LIGA} ni: ${eLiga?.message ?? ''}`); process.exit(1) }

// Klub po id-ju ali po imenu; ime mora biti nedvoumno med klubi te lige.
const { data: klubi, error: eKlub } = await db
  .from('competition_teams').select('team_id, name').eq('competition_id', liga.id)
if (eKlub) { console.error(eKlub.message); process.exit(1) }
const zadetki = /^\d+$/.test(KLUB)
  ? (klubi ?? []).filter((k) => k.team_id === Number(KLUB))
  : (klubi ?? []).filter((k) => k.name?.toLowerCase() === KLUB.toLowerCase())
if (zadetki.length !== 1) {
  console.error(`Klub "${KLUB}" v ligi ${LIGA}: ${zadetki.length} zadetkov. Klubi lige:`)
  for (const k of klubi ?? []) console.error(`  ${k.team_id}  ${k.name}`)
  process.exit(1)
}
const klub = zadetki[0]

const { data: sezona } = await db
  .from('rounds').select('season').eq('competition_id', liga.id)
  .order('season', { ascending: false }).limit(1).maybeSingle()
const { count: igralcev } = await db
  .from('players').select('id', { count: 'exact', head: true })
  .eq('competition_id', liga.id).eq('team_id', klub.team_id)
const { data: tekme } = await db
  .from('matches')
  .select('id, played_on, rounds!inner(number, season, competition_id)')
  .eq('rounds.competition_id', liga.id).eq('rounds.season', sezona?.season)
  .is('imported_at', null).is('zapisnik_id', null)
  .or(`home_team_id.eq.${klub.team_id},away_team_id.eq.${klub.team_id}`)
  .order('id')
const { data: kader } = await db
  .from('fantasy_roster')
  .select('fantasy_team_id, players!inner(team_id, competition_id), fantasy_teams!inner(hisna)')
  .eq('players.team_id', klub.team_id).eq('players.competition_id', liga.id)
  .eq('fantasy_teams.hisna', false)
const ekip = new Set((kader ?? []).map((v) => v.fantasy_team_id)).size

console.log(`IZSTOP KLUBA — ${klub.name} (${klub.team_id}) iz lige ${liga.slug}, sezona ${sezona?.season}`)
console.log(`  igralcev kluba:            ${igralcev}`)
console.log(`  neodigranih tekem (brišem): ${tekme?.length ?? 0}` +
  (tekme?.length ? `  — krogi ${tekme.map((t) => t.rounds.number).join(', ')}` : ''))
console.log(`  ekip z igralci kluba:      ${ekip} (${kader?.length ?? 0} mest v kadrih) — dobijo e-mail`)

if (suho) {
  console.log('\nSUHI TEK — nič ni zapisano ne poslano. Poženi s SUHO=false.')
  process.exit(0)
}

const { data: izid, error: eIzst } = await db.rpc('izstop_kluba', {
  p_competition_id: liga.id,
  p_team_id: klub.team_id,
})
if (eIzst) { console.error(`izstop_kluba: ${eIzst.message}`); process.exit(1) }
console.log(`\nOznačenih igralcev: ${izid.igralcev}, izbrisanih tekem: ${izid.izbrisanih_tekem}`)

const odgovor = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ competition_id: liga.id, vrsta: 'izstop-kluba', suho: false, najvec: 100 }),
})
const posta = await odgovor.json().catch(() => ({}))
if (!odgovor.ok) {
  console.error(`E-pošta: NAPAKA ${odgovor.status}: ${posta.error ?? ''}`)
  process.exit(1)
}
console.log(`E-pošta: ekip ${posta.kandidati_stevilo ?? 0}, poslano ${posta.poslano ?? 0}, preskočeno ${posta.preskoceno ?? 0}`)
for (const r of posta.rezultati ?? []) if (!r.ok) console.log(`  ekipa ${r.ekipa}: ${r.razlog}`)
