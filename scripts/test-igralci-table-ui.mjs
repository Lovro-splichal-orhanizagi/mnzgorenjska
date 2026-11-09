// Tabela igralcev: vsak glavi stolpec ima svojo celico v vrstici (SLF-364).
// Brez celice za Mreže sta Minute in Izbran zdrsnili pod napačni glavi.
// Real app behavior with an entirely intercepted API. Never reads/writes a database.
// Run: node scripts/test-igralci-table-ui.mjs   (UI_ARTIFACT_DIR=dir shrani posnetke)
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright'
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54329'
process.env.VITE_SUPABASE_ANON_KEY = 'offline-ui-test'
const server = await createServer({ server: { host: '127.0.0.1', port: 5211, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: process.env.UI_BROWSER_CHANNEL })
const artifactDir = process.env.UI_ARTIFACT_DIR
if (artifactDir) await mkdir(artifactDir, { recursive: true })
let failures = 0
const player = { id: 42, competition_id: 1, team_id: 10, full_name: 'Known Player',
  position: 'DEF', value: 6, active: true, points: 31, matches: 5, goals: 2, minutes: 1234,
  team_name: 'Home Club', team_short: 'HOME', team_logo: null, season: '2026/27',
  owners: null, form: 5, last_round: 4, points_per_match: 6.2, points_per_value: 5.1,
  assists: 1, clean_sheets: 7, rank: 1 }
const league = { id: 1, slug: 'clani', name: 'Test League', short_name: 'Test League',
  active: true, country_code: 'SI', country_name: 'Slovenija', federation_code: 'mnzg',
  federation_name: 'Test Federation', federation_short: 'TF', federation_url: null,
  federation_sort: 1, prvi_fantasy_krog: 1, sezona_koledarska: false }
async function app(width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: 'sl-SI' })
  await context.addInitScript(({ league }) => {
    localStorage.setItem('sb-cobtigdsmlftvpfqtnas-auth-token', JSON.stringify({ access_token: 'dummy.offline.token', refresh_token: 'offline', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', user_metadata: { jezik: 'sl' } } }))
    localStorage.setItem('slff-jezik-izbran', 'sl')
    localStorage.setItem('slff-drzava', 'SI')
    localStorage.setItem('slff-tekmovanje', 'clani')
    localStorage.setItem('slff-lige-v1', JSON.stringify({ cas: Date.now(), lige: [league] }))
  }, { league })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === 'http://127.0.0.1:5211') return route.continue()
    if (url.origin !== 'http://127.0.0.1:54329') return route.abort()
    const table = url.pathname.split('/').at(-1)
    let rows = []
    if (table === 'competitions_view') rows = [league]
    if (table === 'sezone') rows = [{ competition_id: 1, season: '2026/27', tekoca: true, odigranih: 5,
      statistics_complete_matches: 5, statistics_unavailable_matches: 0 }]
    if (table === 'player_season_standings') rows = [player]
    if (table === 'players') rows = [{ ...player, teams: { name: 'Home Club', short_name: 'HOME', logo_url: null } }]
    if (table === 'teams') rows = [{ id: 10, name: 'Home Club', short_name: 'HOME', logo_url: null }]
    if (table === 'competition_teams') rows = [{ competition_id: 1, competitions: league }]
    const object = route.request().headers().accept?.includes('application/vnd.pgrst.object+json')
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/1' }, body: JSON.stringify(object ? rows[0] ?? null : rows) })
  })
  await page.goto('http://127.0.0.1:5211/players')
  await page.locator('main table tbody tr').first().waitFor()
  await page.waitForLoadState('networkidle')
  assert.deepEqual(errors, [], 'app must render without runtime errors')
  return { page, context }
}
async function check(name, fn) { try { await fn(); console.log(`PASS ${name}`) } catch (e) { failures++; console.error(`FAIL ${name}: ${e.message}`) } }
// Vidni stolpci glave in prve vrstice, po vrsti in z dejansko izrisanim x.
const stolpci = (page) => page.evaluate(() => {
  const vidno = (el) => getComputedStyle(el).display !== 'none'
  const naslovi = [...document.querySelectorAll('main table thead th')].filter(vidno)
  const celice = [...document.querySelectorAll('main table tbody tr:first-child td')].filter(vidno)
  const sredina = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2) }
  return {
    naslovi: naslovi.map((th) => th.innerText.trim().replace(/\s*↓$/, '')),
    celice: celice.map((td) => td.innerText.trim()),
    zamik: naslovi.map((th, i) => celice[i] ? Math.abs(sredina(th) - sredina(celice[i])) : null),
  }
})
try {
  for (const [width, pricakovano] of [
    [1366, { Mreže: '7', Minute: '1234', Izbran: '–' }],
    [390, { Mreže: '7' }],
  ]) await check(`header and body cells line up (${width}px)`, async () => {
    const { page, context } = await app(width)
    try {
      const { naslovi, celice, zamik } = await stolpci(page)
      assert.equal(celice.length, naslovi.length, `glava ima ${naslovi.length} stolpcev, vrstica ${celice.length}: ${JSON.stringify({ naslovi, celice })}`)
      for (const [naslov, vrednost] of Object.entries(pricakovano)) {
        const i = naslovi.findIndex((n) => n.startsWith(naslov))
        assert.ok(i >= 0, `glava ${naslov} manjka: ${naslovi}`)
        assert.equal(celice[i], vrednost, `pod ${naslov} je ${celice[i]}`)
      }
      if (width < 640) assert.ok(!naslovi.some((n) => n.startsWith('Minute')), 'Minute ostanejo skrite na telefonu')
      // Vsaka celica leži pod svojo glavo: stolpca z desno poravnavo sta lahko različno široka le za odmik besedila.
      assert.ok(zamik.every((z) => z !== null && z < 60), `celice niso pod glavami: ${zamik}`)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'stran ne sme imeti vodoravnega drsenja; tabela drsi sama')
      if (artifactDir) await page.screenshot({ path: `${artifactDir}/igralci-${width}.png`, fullPage: true })
    } finally { await context.close() }
  })
} finally {
  await browser.close()
  await server.close()
}
if (failures) { console.error(`${failures} test(s) failed`); process.exit(1) }
