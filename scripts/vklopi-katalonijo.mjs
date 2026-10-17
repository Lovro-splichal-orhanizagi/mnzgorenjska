// Narrow, two-phase release of the 27 imported upper Catalan groups.
// One coordinated ES Actions run: prepare (default), then activate with the
// reviewed batch SHA on the SAME commit. No prices, positions or imports change.
// The existing RPC does not atomically compare this manifest: the guarantee is
// coordinated Actions writers plus an immediate full reread before each RPC.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { vseVrstice } from './strani.mjs'
import { oceniPripravljenost, najcenejsiKader } from '../src/lib/pripravljenost.ts'

export const KATALONSKE_LIGE = ['es-ct-elit', ...['primera', 'segona', 'tercera'].flatMap((level, i) =>
  Array.from({ length: [3, 6, 17][i] }, (_, n) => `es-ct-${level}-g${n + 1}`))]
const REPOSITORY = 'Lovro-splichal-orhanizagi/mnzgorenjska'
const PERMISSION_DATE = '2026-10-17'
const fail = message => { throw new Error(`Vklop Katalonije: ${message}`) }
export const sha256 = value => createHash('sha256').update(value).digest('hex')
export function kanonicno(value) {
  const normalize = x => Array.isArray(x) ? x.map(normalize) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, normalize(x[k])])) : x
  return JSON.stringify(normalize(value))
}
const rows = xs => [...xs].sort((a, b) => a.id - b.id)
const timestamp = value => typeof value === 'string' && value.length ? Date.parse(value) : NaN
const integer = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
function currentSeason(now) {
  // Mirror tekoca_sezona's Europe/Ljubljana date, including the July boundary.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]))
  const y = Number(parts.year) - (Number(parts.month) < 7 ? 1 : 0)
  return `${y}/${String(y + 1).slice(-2)}`
}

/** Reuse the production paginator, but require exact counts and unique ids.
 * A short server page (or lost final page) cannot silently pass the audit. */
export async function preberiVse(query, label) {
  let expected = null
  const data = await vseVrstice(async (start, end) => {
    const result = await query(start, end)
    if (result.error) throw new Error(`${label}: ${result.error.message ?? result.error}`)
    if (!integer(result.count) || expected !== null && expected !== result.count)
      fail(`${label}: manjka/stanje se spreminja pri exact count`)
    expected = result.count
    return result
  })
  if (data.length !== expected) fail(`${label}: število vrstic ${data.length} ni exact count ${expected}`)
  if (data.some(x => !integer(x.id, 1)) || new Set(data.map(x => x.id)).size !== data.length)
    fail(`${label}: podvojena/neveljavna identiteta`)
  return data
}
const APPEARANCE_COLUMNS = 'id,match_id,player_id,team_id,shirt_number,started,minute_on,minute_off,minutes_played,goals,own_goals,penalties_scored,penalties_missed,penalties_saved,yellow_cards,red_cards,goals_conceded,clean_sheet,is_goalkeeper'
const GOAL_COLUMNS = 'id,match_id,scorer_id,team_id,minute,is_own_goal,is_penalty,score_home,score_away'
async function rpc(db, name, args) {
  const { data, error } = await db.rpc(name, args)
  if (error || data === null || data === undefined) fail(`${name}: ${error?.message ?? 'manjka odgovor'}`)
  return data
}
export async function preberiPosnetek(db, slug) {
  const { data: c, error } = await db.from('competitions')
    .select('id,slug,active,source,source_league_code,country_id,federation_id,prvi_fantasy_krog,sezona_koledarska,countries(code)')
    .eq('slug', slug).single()
  if (error || !c) fail(`${slug}: ${error?.message ?? 'liga manjka'}`)
  const competition = { ...c, country_code: c.countries?.code ?? c.country_code }
  delete competition.countries
  const season = await rpc(db, 'sezona_lige', { p_competition_id: c.id })
  const rounds = await preberiVse((start, end) => db.from('rounds')
    .select('id,competition_id,season,number,deadline_at', { count: 'exact' }).eq('competition_id', c.id).eq('season', season).order('id').range(start, end), 'rounds')
  const matches = rounds.length ? await preberiVse((start, end) => db.from('matches')
    .select('id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,imported_at,import_warnings,kontumacija,vir_brez_izida', { count: 'exact' })
    .in('round_id', rounds.map(r => r.id)).order('id').range(start, end), 'matches') : []
  // Match-based filtering is deliberate: unimported games and invalid players
  // must remain visible, especially for the RPC's distinct played-round choice.
  const ids = matches.map(m => m.id)
  const appearances = ids.length ? await preberiVse((start, end) => db.from('appearances').select(APPEARANCE_COLUMNS, { count: 'exact' })
    .in('match_id', ids).order('id').range(start, end), 'appearances') : []
  const goals = ids.length ? await preberiVse((start, end) => db.from('goals').select(GOAL_COLUMNS, { count: 'exact' })
    .in('match_id', ids).order('id').range(start, end), 'goals') : []
  const players = await preberiVse((start, end) => db.from('players')
    .select('id,competition_id,team_id,active,position,value', { count: 'exact' }).eq('competition_id', c.id).order('id').range(start, end), 'players')
  const state = await rpc(db, 'stanje_lige', { p_competition_id: c.id })
  return { competition, season, rounds, matches, appearances, goals, players, state }
}

/** Exact semantics of 20261016183300_vklop_zgodaj_odigrana_tekma.sql.
 * Count distinct played rounds, never appearances/matches or imported_at. */
export function izberiPrviKrog(s, now) {
  const matches = new Map(s.matches.map(m => [m.id, m]))
  const playedIds = new Set(s.appearances.map(a => matches.get(a.match_id)?.round_id))
  const played = s.rounds.filter(r => playedIds.has(r.id)).map(r => r.number)
  const future = s.rounds.filter(r => timestamp(r.deadline_at) > now).sort((a, b) => a.number - b.number)
  const gap = future.find(r => !playedIds.has(r.id))?.number ?? null
  const laterCount = played.filter(n => n > gap).length
  const last = Math.max(0, ...played.filter(n => gap === null || n < gap || laterCount > 2))
  return future.find(r => r.number > last) ?? null
}
function futureProblems(s, round, now) {
  const problems = []
  if (!round || timestamp(round.deadline_at) <= now) return ['Ni prihodnjega prvega kroga z veljavnim rokom.']
  const games = s.matches.filter(m => m.round_id === round.id), ids = new Set(games.map(m => m.id))
  if (games.length !== 8) problems.push('Prvi fantasy krog nima 8 tekem.')
  if (s.appearances.some(a => ids.has(a.match_id))) problems.push('Prvi fantasy krog že ima nastop.')
  const today = new Date(now).toISOString().slice(0, 10)
  if (games.some(m => !validDate(m.played_on) || m.played_on <= today)) problems.push('Datum tekme prvega fantasy kroga ni po današnjem UTC dnevu.')
  return problems
}

export function preveriLigo(s, now = Date.now(), { allowActive = false } = {}) {
  const problems = [], add = text => problems.push(text)
  const { competition: c, rounds, matches, appearances, goals, players, state } = s
  if (!KATALONSKE_LIGE.includes(c.slug) || c.source !== 'fcf' || c.country_code !== 'ES' || c.sezona_koledarska !== false) add('Nedovoljen obseg: samo 27 zgornjih FCF skupin ES.')
  if (c.active !== false && !allowActive) add('Liga je že aktivna.')
  if (s.season !== currentSeason(now)) add('Napačna tekoča sezona.')
  for (const [name, data] of Object.entries({ rounds, matches, appearances, goals, players })) {
    if (data.some(x => !integer(x.id, 1)) || new Set(data.map(x => x.id)).size !== data.length) add(`${name}: neveljavna ali podvojena identiteta.`)
  }
  const roundMap = new Map(rounds.map(r => [r.id, r]))
  if (rounds.length !== 30 || new Set(rounds.map(r => r.number)).size !== 30 || rounds.some(r => !integer(r.number, 1, 30) || r.competition_id !== c.id || r.season !== s.season)) add('Razpored potrebuje 30 enoličnih krogov tekoče sezone te lige.')
  if (rounds.some(r => !Number.isFinite(timestamp(r.deadline_at)))) add('Vsi krogi potrebujejo veljaven rok.')
  const clubs = new Set(matches.flatMap(m => [m.home_team_id, m.away_team_id]))
  if (matches.length !== 240 || clubs.size !== 16 || [...clubs].some(id => !integer(id, 1))) add('Razpored potrebuje 240 tekem in 16 klubov.')
  if (new Set(matches.map(m => `${m.home_team_id}/${m.away_team_id}`)).size !== 240 || matches.some(m => m.home_team_id === m.away_team_id)) add('Razpored potrebuje 240 različnih usmerjenih parov.')
  if (new Set(matches.map(m => m.zapisnik_id)).size !== matches.length || matches.some(m => !/^es\d+$/.test(m.zapisnik_id ?? ''))) add('Neveljavna/podvojena identiteta zapisnika FCF.')
  for (const r of rounds) {
    const ms = matches.filter(m => m.round_id === r.id)
    if (ms.length !== 8 || new Set(ms.flatMap(m => [m.home_team_id, m.away_team_id])).size !== 16) add(`Krog ${r.number} nima 8 disjunktnih tekem 16 klubov.`)
  }
  const matchMap = new Map(matches.map(m => [m.id, m])), playerMap = new Map(players.map(p => [p.id, p]))
  const appMap = new Map(), appsByMatch = new Map(), goalsByMatch = new Map(), keeperClubs = new Set(), benchClubs = new Set()
  for (const a of appearances) {
    const m = matchMap.get(a.match_id), p = playerMap.get(a.player_id), key = `${a.match_id}/${a.player_id}`
    if (appMap.has(key)) add(`Nastop ${a.id}: podvojena identiteta igralca na tekmi.`)
    appMap.set(key, a)
    if (!m || ![m.home_team_id, m.away_team_id].includes(a.team_id)) add(`Nastop ${a.id}: napačen klub tekme.`)
    // A transferred player's current club need not match historical appearance.
    if (!p || p.competition_id !== c.id) add(`Nastop ${a.id}: igralec ni v tekmovanju.`)
    if (!integer(a.minute_on, 0, 90) || !integer(a.minute_off, 0, 90) || !integer(a.minutes_played, 0, 90) || a.minute_on > a.minute_off || a.minutes_played !== a.minute_off - a.minute_on || a.started === true && a.minute_on !== 0) add(`Nastop ${a.id}: neveljavne minute.`)
    if (typeof a.started !== 'boolean' || typeof a.is_goalkeeper !== 'boolean' || typeof a.clean_sheet !== 'boolean' || ['goals', 'own_goals', 'penalties_scored', 'penalties_missed', 'penalties_saved', 'yellow_cards', 'red_cards', 'goals_conceded'].some(k => !integer(a[k]))) add(`Nastop ${a.id}: neznana/neveljavna statistika.`)
    if (!appsByMatch.has(a.match_id)) appsByMatch.set(a.match_id, [])
    appsByMatch.get(a.match_id).push(a)
    if (m?.imported_at && !m.kontumacija) {
      if (a.started && a.is_goalkeeper) keeperClubs.add(a.team_id)
      if (!a.started && a.minutes_played > 0) benchClubs.add(a.team_id)
    }
  }
  for (const g of goals) {
    const m = matchMap.get(g.match_id), a = appMap.get(`${g.match_id}/${g.scorer_id}`)
    if (!m || !a || a.team_id !== g.team_id) add(`Gol ${g.id}: gol nima ustreznega nastopa strelca/kluba.`)
    if (a && (g.minute < a.minute_on || g.minute > a.minute_off)) add(`Gol ${g.id}: minuta ni znotraj nastopa strelca.`)
    if (!integer(g.minute, 0, 90) || typeof g.is_own_goal !== 'boolean' || typeof g.is_penalty !== 'boolean' || g.is_own_goal && g.is_penalty || ![null, undefined].includes(g.score_home) && !integer(g.score_home) || ![null, undefined].includes(g.score_away) && !integer(g.score_away)) add(`Gol ${g.id}: neveljavna statistika/minuta.`)
    if (!goalsByMatch.has(g.match_id)) goalsByMatch.set(g.match_id, [])
    goalsByMatch.get(g.match_id).push(g)
  }
  let fullRounds = 0
  for (const r of rounds) if (matches.filter(m => m.round_id === r.id && m.imported_at).length === 8) fullRounds++
  if (!fullRounds) add('Ni niti enega v celoti uvoženega kroga.')
  for (const m of matches) {
    if (!roundMap.has(m.round_id)) add(`Tekma ${m.id}: napačen krog.`)
    if (!validDate(m.played_on)) add(`Tekma ${m.id}: neveljaven datum.`)
    if (!Array.isArray(m.import_warnings) || m.import_warnings.length) add(`Tekma ${m.id}: nerešena uvozna opozorila.`)
    if (typeof m.kontumacija !== 'boolean' || typeof m.vir_brez_izida !== 'boolean') add(`Tekma ${m.id}: neznano stanje statistike.`)
    if (m.imported_at !== null && !Number.isFinite(timestamp(m.imported_at))) add(`Tekma ${m.id}: neveljaven čas uvoza.`)
    if (!m.imported_at && !m.kontumacija && !m.vir_brez_izida && validDate(m.played_on) && now - Date.parse(`${m.played_on}T23:59:59.999Z`) > 48 * 3600000) add(`Tekma ${m.id}: zamuda zapisnika nad 48 ur po koncu UTC dneva.`)
    const aps = appsByMatch.get(m.id) ?? [], gs = goalsByMatch.get(m.id) ?? []
    if (!m.imported_at || m.kontumacija) continue
    if (!integer(m.home_goals) || !integer(m.away_goals)) add(`Tekma ${m.id}: neznan izid.`)
    for (const team of [m.home_team_id, m.away_team_id]) {
      const starters = aps.filter(a => a.team_id === team && a.started === true)
      if (starters.length !== 11) add(`Tekma ${m.id}/${team}: XI ni natanko 11.`)
      if (starters.filter(a => a.is_goalkeeper === true).length !== 1) add(`Tekma ${m.id}/${team}: začetni vratar ni natanko eden.`)
    }
    const credited = gs.map(g => g.is_own_goal ? (g.team_id === m.home_team_id ? m.away_team_id : m.home_team_id) : g.team_id)
    if (credited.filter(id => id === m.home_team_id).length !== m.home_goals || credited.filter(id => id === m.away_team_id).length !== m.away_goals) add(`Tekma ${m.id}: goli po upravičencu niso izid.`)
    for (const a of aps) {
      const own = gs.filter(g => g.scorer_id === a.player_id && g.is_own_goal).length
      const scored = gs.filter(g => g.scorer_id === a.player_id && !g.is_own_goal).length
      const penalties = gs.filter(g => g.scorer_id === a.player_id && g.is_penalty).length
      if (a.goals !== scored || a.own_goals !== own || a.penalties_scored !== penalties) add(`Nastop ${a.id}: goli statistike niso dogodki.`)
    }
  }
  for (const club of clubs) {
    if (!keeperClubs.has(club)) add(`Klub ${club}: ni izrecnega začetnega vratarja.`)
    if (!benchClubs.has(club)) add(`Klub ${club}: ni dokaza nastopa s klopi.`)
  }
  const active = players.filter(p => p.active)
  if (active.some(p => !clubs.has(p.team_id) || !['GK', 'DEF', 'MID', 'FWD'].includes(p.position) || p.value === null || !Number.isFinite(Number(p.value)) || Number(p.value) <= 0) || new Set(active.map(p => p.team_id)).size !== 16) add('Aktivni igralci/cene/pozicije/klubi niso popolni.')
  const roster = active.map(({ id, team_id, position, value }) => ({ id, team_id, position, value }))
  const positions = Object.fromEntries(['GK', 'DEF', 'MID', 'FWD'].map(p => [p, active.filter(a => a.position === p).length]))
  if (!state || state.privzetih !== active.filter(p => Number(p.value) === 4.5).length || Number(state.najvisja_cena) !== Math.max(0, ...active.map(p => Number(p.value))) || state.klubov !== new Set(active.map(p => p.team_id)).size || kanonicno(state.po_pozicijah) !== kanonicno(positions) || kanonicno(rows(state.igralci ?? [])) !== kanonicno(rows(roster)) || state.aktivnih !== active.length || state.krogov_tekoce !== rounds.length) add('Stanje pripravljenosti in prebrani igralci/krogi se ne ujemajo.')
  const readiness = oceniPripravljenost({ aktivnih: state?.aktivnih ?? 0, privzetih: state?.privzetih ?? 0, klubov: state?.klubov ?? 0, najvisjaCena: Number(state?.najvisja_cena ?? 0), poPozicijah: state?.po_pozicijah ?? {}, nastopovSKlopi: state?.nastopov_s_klopi ?? 0, golovBrezNastopa: state?.golov_brez_nastopa ?? 0, krogovTekoce: state?.krogov_tekoce ?? 0, igralci: state?.igralci })
  problems.push(...readiness.tezave.map(t => `${t.kljuc}: ${t.kaj}`))
  const prviKrog = izberiPrviKrog(s, now)
  problems.push(...futureProblems(s, prviKrog, now))
  return { pripravljena: !problems.length, tezave: [...new Set(problems)], prviKrog, counts: { rounds: rounds.length, matches: matches.length, clubs: clubs.size, appearances: appearances.length, goals: goals.length, imported: matches.filter(m => m.imported_at).length, fullRounds }, najcenejsiKader: najcenejsiKader(state?.igralci ?? []), odstotekPrivzetih: readiness.odstotekPrivzetih }
}
function normalizedSnapshot(s) {
  return { ...s, rounds: rows(s.rounds), matches: rows(s.matches), appearances: rows(s.appearances), goals: rows(s.goals), players: rows(s.players), state: { ...s.state, igralci: rows(s.state.igralci ?? []) } }
}
function leagueManifest(snapshot, sourceCommit, now) {
  const quality = preveriLigo(snapshot, now)
  const manifest = { version: 1, sourceCommit, permissionConfirmed: PERMISSION_DATE, snapshot: normalizedSnapshot(snapshot), quality }
  return { slug: snapshot.competition.slug, manifest, sha256: sha256(kanonicno(manifest)), quality }
}
function checkedSlugs(slugs) {
  if (!Array.isArray(slugs) || !slugs.length || new Set(slugs).size !== slugs.length || slugs.some(s => !KATALONSKE_LIGE.includes(s))) fail('Nedovoljen ali podvojen obseg lig.')
  return [...slugs].sort()
}
export async function pripraviBatch({ db, slugs = KATALONSKE_LIGE, sourceCommit, read = slug => preberiPosnetek(db, slug), now = Date.now }) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) fail('Manjka celoten source commit SHA.')
  const requested = checkedSlugs(slugs), leagues = []
  for (const slug of requested) {
    try {
      const snapshot = await read(slug)
      if (snapshot.competition.slug !== slug) fail('prebrana napačna liga')
      leagues.push(leagueManifest(snapshot, sourceCommit, now()))
    } catch (e) {
      leagues.push({ slug, sha256: null, quality: { pripravljena: false, tezave: [`Branje ni popolno: ${e.message}`] } })
    }
  }
  const manifest = { version: 1, operation: 'verified-fcf-upper-groups', country: 'ES', sourceCommit, permissionConfirmed: PERMISSION_DATE, requested,
    leagues: leagues.map(l => ({ slug: l.slug, competitionId: l.manifest?.snapshot.competition.id ?? null, sha256: l.sha256, quality: l.quality })) }
  return { manifest, sha256: sha256(kanonicno(manifest)), leagues }
}
export function actionsOnly(env, sourceCommit) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== REPOSITORY || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') || env.GITHUB_SHA !== sourceCommit) fail('Zapis zahteva repository Actions na istem pregledanem commitu.')
}
export async function aktivirajBatch({ db, slugs, sourceCommit, approvedSha, read = slug => preberiPosnetek(db, slug), now = Date.now, env = process.env, onProgress = () => {} }) {
  actionsOnly(env, sourceCommit)
  if (!/^[a-f0-9]{64}$/.test(approvedSha ?? '')) fail('Manjka veljaven odobreni SHA256.')
  const batch = await pripraviBatch({ db, slugs, sourceCommit, read, now })
  onProgress({ phase: 'preflight', batch, results: [] })
  if (batch.sha256 !== approvedSha) fail('Odobreni SHA256 se ne ujema s celotnim trenutnim paketom; ponovno pripravi/preglej.')
  const results = []
  for (const league of batch.leagues.filter(l => l.quality.pripravljena)) {
    try {
      // Earlier activated leagues intentionally do not enter this league hash.
      const snapshot = await read(league.slug), fresh = leagueManifest(snapshot, sourceCommit, now())
      if (!fresh.quality.pripravljena || fresh.sha256 !== league.sha256) fail(`${league.slug}: stanje/SHA se je spremenilo pred vklopom.`)
      // Time can advance during a full reread: check it once more at the RPC boundary.
      const first = izberiPrviKrog(snapshot, now()), temporal = futureProblems(snapshot, first, now())
      if (first?.id !== fresh.quality.prviKrog?.id || temporal.length) fail(`${league.slug}: spremenjen rok/datum: ${temporal.join(' ')}`)
      const response = await rpc(db, 'vklopi_ligo_sredi_sezone', { p_slug: league.slug })
      if (response.vklopljena !== true || response.prvi_krog !== first.number) fail(`${league.slug}: RPC ni potrdil pričakovanega kroga: ${JSON.stringify(response)}`)
      const after = await read(league.slug), verified = preveriLigo(after, now(), { allowActive: true })
      if (after.competition.active !== true || after.competition.prvi_fantasy_krog !== first.number || verified.prviKrog?.id !== first.id || !verified.pripravljena) fail(`${league.slug}: vklop je bil poklican, readback ne potrdi prihodnjega prvega kroga: ${verified.tezave.join(' ')}`)
      // Only the competition activation fields may change, including all prices/stats.
      const expected = normalizedSnapshot(snapshot), actual = normalizedSnapshot(after)
      expected.competition = { ...expected.competition, active: true, prvi_fantasy_krog: first.number }
      if (kanonicno(actual) !== kanonicno(expected)) fail(`${league.slug}: readback kaže spremembo podatkov poleg vklopa.`)
      results.push({ slug: league.slug, active: true, prviKrog: first.number, deadline: first.deadline_at, sha256: league.sha256 })
      onProgress({ phase: 'activation', batch, results })
    } catch (e) {
      results.push({ slug: league.slug, error: e.message, state: 'Preveri readback; RPC je lahko že vklopil ligo.' })
      onProgress({ phase: 'failed', batch, results })
      e.results = results
      throw e // Partial failure stops; no unapproved replacement or later RPC.
    }
  }
  return { batch, results }
}
function writeArtifacts(directory, payload) {
  mkdirSync(directory, { recursive: true })
  const { batch } = payload
  writeFileSync(resolve(directory, 'batch.json'), kanonicno(batch.manifest))
  writeFileSync(resolve(directory, 'batch.sha256'), `${batch.sha256}\n`)
  for (const l of batch.leagues) if (l.manifest) writeFileSync(resolve(directory, `${l.slug}.json`), kanonicno(l.manifest))
  writeFileSync(resolve(directory, 'summary.json'), JSON.stringify({ preparedAt: new Date().toISOString(), phase: payload.phase, sha256: batch.sha256, sourceCommit: batch.manifest.sourceCommit, leagues: batch.manifest.leagues, results: payload.results ?? [] }, null, 2) + '\n')
}
async function main() {
  const args = process.argv.slice(2), arg = key => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1] }
  const mode = args[0] ?? 'prepare'
  if (!['prepare', 'activate'].includes(mode)) fail('Uporaba: prepare|activate [--lige slug,slug] [--approved-sha256 SHA] [--output release]')
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  actionsOnly(process.env, sourceCommit)
  const directory = resolve(arg('--output') ?? 'release/katalonija'), slugs = arg('--lige') ? arg('--lige').split(',').map(s => s.trim()) : KATALONSKE_LIGE
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key || new URL(base).protocol !== 'https:') fail('Manjka Actions konfiguracija baze.')
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(base, key, { auth: { persistSession: false } })
  const options = { db, slugs, sourceCommit }
  if (mode === 'prepare') {
    const batch = await pripraviBatch(options)
    writeArtifacts(directory, { phase: 'prepare', batch, results: [] })
    console.log(JSON.stringify({ sha256: batch.sha256, candidates: batch.leagues.filter(l => l.quality.pripravljena).map(l => l.slug), blocked: batch.leagues.filter(l => !l.quality.pripravljena).map(l => ({ slug: l.slug, reasons: l.quality.tezave })) }, null, 2))
  } else {
    const result = await aktivirajBatch({ ...options, approvedSha: arg('--approved-sha256'), onProgress: payload => writeArtifacts(directory, payload) })
    writeArtifacts(directory, { phase: 'complete', ...result })
    console.log(JSON.stringify({ sha256: result.batch.sha256, results: result.results }, null, 2))
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
