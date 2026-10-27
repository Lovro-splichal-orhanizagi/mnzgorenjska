// Real app behavior with an entirely intercepted API. Never reads/writes a database.
// Run: node scripts/test-community-round-ui.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54329'
process.env.VITE_SUPABASE_ANON_KEY = 'offline-ui-test'
// Keep Vite's normal dependency discovery: a clean checkout must also bundle
// CommonJS dependencies imported by React Router, without a prewarmed cache.
const server = await createServer({ server: { host: '127.0.0.1', port: 5198, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: process.env.UI_BROWSER_CHANNEL })
const artifactDir = process.env.UI_ARTIFACT_DIR
if (artifactDir) await mkdir(artifactDir, { recursive: true })
let failures = 0
const match = {
  match_id: 400, competition_id: 1, round_id: 40, round_number: 4,
  season: '2026/27', played_on: '2026-09-13', home_team_id: 10, away_team_id: 11,
  home_name: 'Home Club', home_short: 'HOME', home_logo: null,
  away_name: 'Away Club', away_short: 'AWAY', away_logo: null,
  home_goals: 2, away_goals: 2, golov: null, brez_asistence: null,
  glasovanje_do: null, glasovanje_odprto: false,
  statistics_status: 'unavailable_historical', statistics_reason: 'private-registry-hash-should-not-render',
}
const player = { id: 42, competition_id: 1, team_id: 10, full_name: 'Known Player',
  position: 'FWD', value: 6, active: true, points: 5, matches: 1, goals: 1, minutes: 90,
  team_name: 'Home Club', team_short: 'HOME', team_logo: null, season: '2026/27',
  owners: null, form: 5, last_round: 5, points_per_match: 5, points_per_value: .8,
  assists: 0, clean_sheets: 0, rank: 1 }
const league = { id: 1, slug: 'clani', name: 'Test League', short_name: 'Test League',
  active: true, country_code: 'SI', country_name: 'Slovenija', federation_code: 'mnzg',
  federation_name: 'Test Federation', federation_short: 'TF', federation_url: null,
  federation_sort: 1, prvi_fantasy_krog: 1, sezona_koledarska: false }
async function app(path, { status = 'pending_cards', score = [2, 2], zeroGoals = false, lang = 'sl', observations = true, authenticated = true, cardStatus = 'pending', roundPending = true, voteError = false, loadError = false, missingConfirmed = false, matchCompetition = 1, cardType = 'red', width = 390, unavailable = 1, historicalUnavailable = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: 'sl-SI' })
  await context.addInitScript(({ lang, league, authenticated }) => {
    if (authenticated) localStorage.setItem('sb-cobtigdsmlftvpfqtnas-auth-token', JSON.stringify({ access_token: 'dummy.offline.token', refresh_token: 'offline', expires_at: Math.floor(Date.now()/1000)+3600, user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', user_metadata: { jezik: 'sl' } } }))
    localStorage.setItem('slff-jezik-izbran', lang)
    localStorage.setItem('slff-drzava', 'SI')
    localStorage.setItem('slff-tekmovanje', 'clani')
    localStorage.setItem('slff-lige-v1', JSON.stringify({ cas: Date.now(), lige: [league] }))
  }, { lang, league, authenticated })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === 'http://127.0.0.1:5198') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54329') return route.abort()
    const table = url.pathname.split('/').at(-1)
    const fantasy = { fantasy_team_id: 8, team_name: 'Pending Fantasy', owner_name: 'Manager', owner_id: '00000000-0000-0000-0000-000000000001', total_points: 42, competition_id: 1, statistics_pending: roundPending }
    const roundPoints = { round_id: 40, fantasy_team_id: 8, team_name: fantasy.team_name, owner_name: fantasy.owner_name, owner_id: fantasy.owner_id, points: roundPending ? null : 12, penalty: 0, rank: roundPending ? null : 1, statistics_pending: roundPending }
    const fantasyRows = {
      fantasy_team_standings: [fantasy], fantasy_round_points: [roundPoints], fantasy_round_standings: [roundPoints],
      fantasy_teams: [{ id: 8, name: fantasy.team_name }],
      rounds: [{ id: 40, number: 4, season: '2026/27', competition_id: 1 }],
      zadnji_odigrani_krog: [{ id: 40, number: 4, season: '2026/27' }],
      tuja_postava: [{ player_id: 42, ime: 'Phantom Substitute', klub: 'Home Club', pozicija: 'FWD', mnozitelj: 3, je_kapetan: false, je_namestnik: true, je_zacetnik: false, tocke: 4 }],
    }
    if (table in fantasyRows) {
      const object = route.request().headers().accept?.includes('application/vnd.pgrst.object+json')
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(object ? fantasyRows[table][0] : fantasyRows[table]) })
    }
    if (table === 'match_fussball_card_votes' || table === 'vote_fussball_card') {
      const body = route.request().postDataJSON()
      if (table === 'match_fussball_card_votes') { assert.deepEqual(body, { p_match_id: 400 }); if (loadError) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'private-report-envelope', code: 'XX000' }) }) }
      else { assert.deepEqual(body, { p_event_id: 71, p_player_id: 42 }); if (voteError) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'restricted-private-detail', code: '42501' }) }) }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, statistics_pending: status === 'pending_cards', threshold: 3, events: [{ id: 71, type: cardType, private_source_id: 'withheld-source-identity', voter_ids: ['private-voter-id'], minute: 45, added: 2, team_id: 10, team_name: 'Home Club', status: table === 'vote_fussball_card' ? 'queued' : cardStatus, confirmed_player_id: cardStatus === 'confirmed' ? (missingConfirmed ? 999 : 42) : null, my_vote: table === 'vote_fussball_card' ? 42 : null, candidates: [{ player_id: 42, full_name: 'Known Player', shirt_number: 9, votes: table === 'vote_fussball_card' ? 3 : 1 }, { player_id: 43, full_name: 'Reserve Player', shirt_number: 18, votes: 0 }] }] }) })
    }
    const p = observations ? { ...player, goals: zeroGoals ? 0 : player.goals } : { ...player, points: 0, matches: 0, goals: 0, minutes: 0 }
    let rows = []
    if (table === 'competitions_view') rows = [league]
    if (table === 'sezone') rows = [{ competition_id: 1, season: '2026/27', tekoca: true, odigranih: 2,
      statistics_complete_matches: 1, statistics_unavailable_matches: unavailable }]
    if (table === 'sezone') {
      if (historicalUnavailable) rows.push({ competition_id: 1, season: '2025/26', tekoca: false, odigranih: 3, statistics_complete_matches: 2, statistics_unavailable_matches: historicalUnavailable })
      if (url.searchParams.get('tekoca') === 'eq.true') rows = rows.filter(s => s.tekoca)
      if (url.searchParams.has('season')) rows = rows.filter(s => `eq.${s.season}` === url.searchParams.get('season'))
      if (url.searchParams.has('statistics_unavailable_matches')) rows = rows.filter(s => s.statistics_unavailable_matches > 0)
    }
    if (table === 'match_assist_status') rows = status === 'pending' ? [] : [{ ...match, competition_id: matchCompetition, home_goals: score[0], away_goals: score[1], statistics_status: status,
      ...(status === 'available' ? { golov: 1, brez_asistence: 1, glasovanje_odprto: true } : {}) }]
    if (table === 'matches') rows = [{ import_warnings: [] }]
    if (table === 'appearances' && status === 'available') rows = [{ id: 8, match_id: 400, player_id: 42, team_id: 10,
      started: true, shirt_number: 9, minutes_played: 90, goals: 1, own_goals: 0,
      penalties_scored: 0, penalties_missed: 0, penalties_saved: 0, yellow_cards: 0,
      red_cards: 0, goals_conceded: 2, clean_sheet: false, players: { full_name: 'Known Player', position: 'FWD' } }]
    if (table === 'appearance_points' && status === 'available') rows = [{ appearance_id: 8, points: 5, assists: 0, pravila: 2 }]
    if (table === 'goals' && status === 'available') rows = [{ id: 9, minute: 20, team_id: 10, scorer: { id: 42, full_name: 'Known Player' }, is_penalty: false, is_own_goal: false, score_home: 1, score_away: 0, assist_player_id: null }]
    if (table === 'player_overview') rows = [p]
    if (table === 'player_season_standings') rows = observations ? [p] : []
    if (table === 'player_season_standings' && url.searchParams.get('goals') === 'gt.0') rows = rows.filter(p => p.goals > 0)
    if (table === 'players') rows = [{ ...p, teams: { name: 'Home Club', short_name: 'HOME', logo_url: null } }]
    if (table === 'teams') rows = [{ id: 10, name: 'Home Club', short_name: 'HOME', logo_url: null }]
    if (table === 'competition_teams') rows = [{ competition_id: 1, competitions: league }]
    if (table === 'lestvica_lige') rows = [{ team_id: 10, ime: 'Home Club', kratko: 'HOME', sezona: '2026/27', tekme: 2, mesto: 1, zmage: 1, remiji: 1, porazi: 0, dani_goli: 3, prejeti_goli: 1, tocke: 4, forma: ['W', 'D'] }]
    const object = route.request().headers().accept?.includes('application/vnd.pgrst.object+json')
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/1' }, body: JSON.stringify(object ? rows[0] ?? null : rows) })
  })
  await page.goto(`http://127.0.0.1:5198${path}`)
  await page.locator('main').waitFor()
  if (status !== 'pending') await page.locator('main h1').waitFor()
  else await page.locator('main a[href*="/results"]').waitFor()
  await page.waitForLoadState('networkidle')
  assert.deepEqual(errors, [], 'app must render without runtime errors')
  return { page, context }
}
async function check(name, fn) { if (process.env.UI_TEST_FILTER && !name.includes(process.env.UI_TEST_FILTER)) return; try { await fn(); console.log(`PASS ${name}`) } catch (e) { failures++; console.error(`FAIL ${name}: ${e.message}`) } }
try {
  await check('pending fantasy round shows dash and no phantom auto-substitution', async () => {
    const { page, context } = await app('/team/8')
    try { const main = page.locator('main'); assert.match(await main.innerText(), /Točke kroga čakajo/); assert.match(await main.innerText(), /—/); assert.doesNotMatch(await main.innerText(), /Phantom Substitute/); assert.equal(await main.locator('a[href*="/player/42"]').count(), 0) } finally { await context.close() }
  })
  await check('resolved fantasy round preserves verified lineup and points', async () => {
    const { page, context } = await app('/team/8', { roundPending: false })
    try { const main = page.locator('main'); assert.doesNotMatch(await main.innerText(), /Točke kroga čakajo/); assert.match(await main.innerText(), /12/); assert.equal(await main.locator('a[href*="/player/42"]').count() > 0, true) } finally { await context.close() }
  })
  await check('pending standings have no winner or shareable zero round', async () => {
    const { page, context } = await app('/standings')
    try { const main = page.locator('main'); assert.match(await main.innerText(), /Točke kroga čakajo/); assert.doesNotMatch(await main.innerText(), /Zmagovalec.*4|Phantom Substitute/); assert.equal(await main.getByRole('button', { name: /Deli/ }).count(), 0) } finally { await context.close() }
  })
} finally {
  await browser.close()
  server.httpServer?.closeAllConnections()
  await server.close()
}
if (failures) process.exitCode = 1
