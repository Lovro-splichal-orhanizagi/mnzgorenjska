// Real app behavior with an entirely intercepted API. Never reads/writes a database.
// Run: node scripts/test-historical-statistics-ui.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54329'
process.env.VITE_SUPABASE_ANON_KEY = 'offline-ui-test'
// Keep Vite's normal dependency discovery: a clean checkout must also bundle
// CommonJS dependencies imported by React Router, without a prewarmed cache.
const server = await createServer({ server: { host: '127.0.0.1', port: 5193, strictPort: true } })
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
  home_goals: null, away_goals: null, golov: null, brez_asistence: null,
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
async function app(path, { status = 'unavailable_historical', score = [null, null], zeroGoals = false, lang = 'sl', observations = true, width = 390, unavailable = 1, historicalUnavailable = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: 'sl-SI' })
  await context.addInitScript(({ lang, league }) => {
    localStorage.setItem('slff-jezik-izbran', lang)
    localStorage.setItem('slff-drzava', 'SI')
    localStorage.setItem('slff-tekmovanje', 'clani')
    localStorage.setItem('slff-lige-v1', JSON.stringify({ cas: Date.now(), lige: [league] }))
  }, { lang, league })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === 'http://127.0.0.1:5193') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54329') return route.abort()
    const table = url.pathname.split('/').at(-1)
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
    if (table === 'match_assist_status') rows = status === 'pending' ? [] : [{ ...match, home_goals: score[0], away_goals: score[1], statistics_status: status,
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
  await page.goto(`http://127.0.0.1:5193${path}`)
  await page.locator('main').waitFor()
  if (status !== 'pending') await page.locator('main h1').waitFor()
  else await page.locator('main a[href*="/results"]').waitFor()
  await page.waitForLoadState('networkidle')
  assert.deepEqual(errors, [], 'app must render without runtime errors')
  return { page, context }
}
async function check(name, fn) { if (process.env.UI_TEST_FILTER && !name.includes(process.env.UI_TEST_FILTER)) return; try { await fn(); console.log(`PASS ${name}`) } catch (e) { failures++; console.error(`FAIL ${name}: ${e.message}`) } }
try {
  // Catches a missing historical score entering ordinary empty-lineup/zero-stat rendering.
  for (const width of [390, 1280]) await check(`historical match marks unknown score and statistics unavailable (${width}px)`, async () => {
    const { page, context } = await app('/match/400', { width })
    try {
      const main = page.locator('main')
      assert.match(await main.locator('h1').innerText(), /Home Club[\s\S]*—[\s\S]*Away Club/)
      assert.doesNotMatch(await main.locator('h1').innerText(), /:/)
      assert.match(await main.innerText(), /Statistika ni na voljo/)
      assert.doesNotMatch(await main.innerText(), /Uradni izid je ohranjen/)
      assert.equal(await main.locator('dl dd').count(), 4)
      assert.deepEqual(await main.locator('dl dd').allTextContents(), ['—', '—', '—', '—'])
      assert.doesNotMatch(await main.innerText(), /Zapisnik te tekme ne navaja postav|0 min|0 točk|ni bilo golov|private-registry|prijavi se za glasovanje/i)
      assert.equal(await main.locator('button').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      if (artifactDir) await page.screenshot({ path: `${artifactDir}/unavailable-${width}.png`, fullPage: true })
    } finally { await context.close() }
  })
  await check('results link shows unknown score without claiming official result retained', async () => {
    const { page, context } = await app('/results')
    try { const row = page.locator('main li').filter({ hasText: 'Home Club' }); assert.match(await row.innerText(), /Home Club[\s\S]*—[\s\S]*Away Club/); assert.doesNotMatch(await row.innerText(), /:/); assert.match(await row.innerText(), /Statistika ni na voljo/); assert.equal(await row.locator('a[href*="/match/400"]').count(), 1) } finally { await context.close() }
  })
  for (const score of [[0, 0], [3, 1]]) await check(`known ${score.join(':')} result stays visible`, async () => {
    const { page, context } = await app('/match/400', { score })
    try { assert.match(await page.locator('main h1').innerText(), new RegExp(`${score[0]}:${score[1]}`)); assert.doesNotMatch(await page.locator('main h1').innerText(), /—/) } finally { await context.close() }
  })
  await check('assist page never declares unknown events confirmed or absent', async () => {
    const { page, context } = await app('/assists')
    try { const text = await page.locator('main').innerText(); assert.match(text, /Statistika ni na voljo/); assert.doesNotMatch(text, /Uradni izid je ohranjen|Vse potrjeno|Vse asistence.*potrjene|Na tej tekmi ni bilo golov/); assert.equal(await page.locator('[aria-label="Vse potrjeno"]').count(), 0) } finally { await context.close() }
  })
  await check('complete match still shows verified appearance and points', async () => {
    const { page, context } = await app('/match/400', { status: 'available' })
    try { const main = page.locator('main'); assert.equal(await main.locator('a[href*="/player/42"]').count() > 0, true); assert.match(await main.innerText(), /5/); assert.doesNotMatch(await main.innerText(), /zgodovinsko tekmo ni na voljo/); if (artifactDir) await page.screenshot({ path: `${artifactDir}/complete-mobile.png`, fullPage: true }) } finally { await context.close() }
  })
  await check('pending report retains its existing inaccessible detail state', async () => {
    const { page, context } = await app('/match/400', { status: 'pending' })
    try { assert.match(await page.locator('main').innerText(), /Te tekme ni v zapisnikih/); assert.doesNotMatch(await page.locator('main').innerText(), /zgodovinsko tekmo/); if (artifactDir) await page.screenshot({ path: `${artifactDir}/pending-mobile.png`, fullPage: true }) } finally { await context.close() }
  })
  for (const path of ['/players', '/player/42', '/club/10', '/table']) await check(`partial season coverage visible on ${path}`, async () => {
    const { page, context } = await app(path)
    try { assert.match(await page.locator('main').innerText(), /Delna statistika/); assert.match(await page.locator('main').innerText(), /1.*2/); if (artifactDir) await page.screenshot({ path: `${artifactDir}/coverage-${path.split('/')[1]}.png`, fullPage: true }) } finally { await context.close() }
  })
  await check('no verified player appearances render dashes rather than fabricated zeros', async () => {
    const { page, context } = await app('/player/42', { observations: false })
    try { const main = page.locator('main'); assert.match(await main.innerText(), /Delna statistika/); const cards = main.locator('.grid-cols-4').first(); assert.match(await cards.innerText(), /—/); assert.doesNotMatch(await cards.innerText(), /\b0\b/) } finally { await context.close() }
  })
  await check('verified zero remains zero when an actual appearance exists', async () => {
    // Zero goals is valid even when other reports are unavailable.
    const { page, context } = await app('/player/42', { zeroGoals: true })
    try { const cards = page.locator('main .grid-cols-4').first(); assert.match(await cards.innerText(), /5/); assert.match(await cards.innerText(), /90/); assert.match(await cards.innerText(), /\b0\b/) } finally { await context.close() }
  })
  await check('empty partial scorer table makes no unverified absence claim', async () => {
    const { page, context } = await app('/table', { zeroGoals: true })
    try { assert.match(await page.locator('main').innerText(), /Ni preverjenih strelcev/); assert.doesNotMatch(await page.locator('main').innerText(), /Ni preverjenih nastopov|V tej sezoni še ni strelcev/) } finally { await context.close() }
  })
  await check('profile all-season totals disclose unavailable archive coverage', async () => {
    const { page, context } = await app('/player/42', { unavailable: 0, historicalUnavailable: 1 })
    try { const notice = page.locator('main [role="status"]').filter({ hasText: 'Delna statistika' }); assert.match((await notice.allTextContents()).join(' '), /2025\/26/); assert.match(await page.locator('main .grid-cols-4').first().innerText(), /90/) } finally { await context.close() }
  })
  await check('list players without verified observations do not get zero statistics', async () => {
    const { page, context } = await app('/players', { observations: false })
    try { const row = page.locator('main tbody tr').filter({ hasText: 'Player' }); assert.match(await row.innerText(), /—/); assert.match(await row.locator('td').nth(2).innerText(), /—/) } finally { await context.close() }
  })
  await check('fully covered season preserves ordinary totals and has no partial warning', async () => {
    const { page, context } = await app('/player/42', { unavailable: 0 })
    try { assert.doesNotMatch(await page.locator('main').innerText(), /Delna statistika/); assert.match(await page.locator('main .grid-cols-4').first().innerText(), /90/) } finally { await context.close() }
  })
  for (const lang of ['sl', 'hr', 'sk', 'cs', 'hu', 'de', 'sr', 'ro', 'et', 'pl', 'es', 'lv', 'mk', 'el', 'tr', 'uk', 'hy', 'az', 'da', 'en']) await check(`historical availability has deliberate ${lang} localization`, async () => {
    const { page, context } = await app('/match/400', { lang })
    try { const main = page.locator('main'); await main.locator('dl dd').first().waitFor(); assert.equal(await main.locator('dl dd').count(), 4); const notice = await main.locator('[role="status"]').innerText(); assert.doesNotMatch(notice, /tekme\.statistika|private-registry/); if (lang !== 'sl') assert.doesNotMatch(notice, /Statistika igralcev za to zgodovinsko tekmo/); if (artifactDir && ['hr', 'de', 'es', 'en'].includes(lang)) await page.screenshot({ path: `${artifactDir}/unavailable-${lang}.png`, fullPage: true }) } finally { await context.close() }
  })
} finally { await browser.close(); await server.close() }
if (failures) process.exitCode = 1
