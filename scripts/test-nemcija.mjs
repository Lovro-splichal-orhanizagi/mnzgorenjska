// Country integration uses actual pure consumers; no API keys, HTTP server or sends.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runInNewContext } from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import { ugibajDrzavo, drzavaLige, drzavaVstopa, zeljenJezik, znaneDrzave } from '../src/lib/drzavaUgib.ts'
import { jezikLige, izpisRoka, PAS_DRZAVE } from '../supabase/functions/posli-opomnik/sporocila.ts'
import { stran, obdelovalec } from './hetzner/html/streznik.mjs'
import config from '../vite.config.js'

test('Germany is recognized by explicit country, German region and Berlin without claiming Austria or Switzerland', () => {
  assert(znaneDrzave().includes('DE'))
  assert.equal(ugibajDrzavo({ shranjena: 'DE', ip: 'SI' }), 'DE')
  assert.equal(ugibajDrzavo({ ip: 'DE', jeziki: ['sl'] }), 'DE')
  assert.equal(ugibajDrzavo({ jeziki: ['de-DE'] }), 'DE')
  assert.equal(ugibajDrzavo({ jeziki: ['de'], casovniPas: 'Europe/Berlin' }), 'DE')
  assert.equal(ugibajDrzavo({ jeziki: ['de-AT'], casovniPas: 'Europe/Berlin' }), 'AT')
  assert.equal(ugibajDrzavo({ jeziki: ['de-CH'] }), null)
  assert.equal(ugibajDrzavo({ jeziki: ['de'] }), null)
})

test('German entry and league URLs choose German and preserve an explicit language preference', () => {
  assert.equal(drzavaVstopa('/de'), 'DE')
  assert.equal(drzavaVstopa('/de/'), 'DE')
  assert.equal(drzavaLige('de-regionalliga-nordost'), 'DE')
  assert.equal(zeljenJezik({ drzava: 'DE' }), 'de')
  assert.equal(zeljenJezik({ drzava: 'DE', izbran: 'en' }), 'en')
})

test('every supported language names Germany in the country selector', async () => {
  for (const language of ['sl', 'sk', 'hr', 'cs', 'hu', 'de', 'sr', 'ro', 'et', 'pl', 'es', 'lv', 'mk', 'en']) {
    const { aplikacija } = await import(`../src/i18n/${language}/aplikacija.ts`)
    assert.equal(aplikacija.izbiraDrzave.imena.DE, 'Deutschland', language)
  }
})

test('German reminders use German text and Berlin daylight-saving time without sending anything', () => {
  assert.equal(jezikLige({ drzava: 'DE' }), 'de')
  assert.equal(PAS_DRZAVE.DE, 'Europe/Berlin')
  assert.match(izpisRoka('2026-07-01T12:00:00Z', { drzava: 'DE' }), /Mittwoch.*14:00/)
  assert.match(izpisRoka('2026-12-01T12:00:00Z', { drzava: 'DE' }), /Dienstag.*13:00/)
})

test('server renders the German country entry and keeps inactive leagues hidden', async () => {
  const liga = { slug: 'de-regionalliga-nordost', name: 'Regionalliga Nordost', country_code: 'DE', country_name: 'Deutschland', federation_short: 'NOFV', active: true }
  const context = {
    lige: [liga],
    rest: async () => { throw Error('country entry must not request private data') },
    besede: { de: { 'aplikacija.naslovStrani.ligeDrzave': 'Fantasy-Ligen: {drzava} — {lige}', 'tekme.tabela.naslov': 'Tabelle' } },
  }
  const page = await stran('/de/', null, context)
  assert.equal(page.status, 200)
  assert.equal(page.kanonicni, 'https://slff.eu/de')
  assert.match(page.opis, /Fantasy-Ligen: Deutschland/)
  assert.match(page.vsebina, /NOFV/)
  assert.match(page.vsebina, /Tabelle/)
  const hidden = await stran('/de', null, { ...context, lige: [{ ...liga, active: false }] })
  assert.equal(hidden.status, 404)
})

test('the real country-card build plugin produces German HTML with Germany locale and URL', async () => {
  const output = mkdtempSync(join(tmpdir(), 'slff-de-build-'))
  try {
    writeFileSync(join(output, 'index.html'), readFileSync(new URL('../index.html', import.meta.url)))
    const plugin = config.plugins.flat().find(p => p.name === 'kartice-drzav')
    plugin.configResolved({ root: output, build: { outDir: '.' } })
    await plugin.closeBundle()
    const html = readFileSync(join(output, 'de.html'), 'utf8')
    assert.match(html, /<html lang="de">/)
    assert.match(html, /property="og:locale" content="de_DE"/)
    assert.match(html, /property="og:url" content="https:\/\/slff.eu\/de"/)
    assert.match(html, /Fantasy-Liga/)
    assert.match(readFileSync(join(output, 'at.html'), 'utf8'), /content="de_AT"/)
    writeFileSync(join(output, 'html-besede.json'), JSON.stringify({ de: {} }))
    const handler = obdelovalec({ koren: output, rest: async () => [{ slug: 'de-regionalliga-nordost', name: 'Regionalliga Nordost', country_code: 'DE', country_name: 'Deutschland', active: true }] })
    let body, status
    await handler({ url: '/de', method: 'GET' }, { writeHead: s => { status = s }, end: value => { body = value } })
    assert.equal(status, 200)
    assert.match(body, /<html lang="de">/, 'HTTP handler must select the generated German card')
    assert.match(body, /property="og:locale" content="de_DE"/)
    assert.match(body, /property="og:description" content="[^"]*Fantasy-Liga/)
    const fallback = obdelovalec({ koren: output, rest: async () => { throw Error('public API unavailable') } })
    for (const url of ['/de/', '/table?t=de-regionalliga-nordost']) {
      await fallback({ url, method: 'GET' }, { writeHead: s => { status = s }, end: value => { body = value } })
      assert.equal(status, 200)
      assert.equal(body, html, 'API failure must preserve the German country card')
    }
  } finally { rmSync(output, { recursive: true, force: true }) }
})

test('Vercel country and league rewrites reach the same generated German HTML', () => {
  const { rewrites } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(rewrites.find(r => r.source === '/de')?.destination, '/de.html')
  const league = rewrites.find(r => r.has?.some(h => h.type === 'query' && h.key === 't' && new RegExp(`^${h.value}$`).test('de-regionalliga-nordost')))
  assert.equal(league?.destination, '/de.html')
  const routes = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(routes, /path="\/de"\s+element=\{<VstopDrzave drzava="DE"/)
})

test('German entry visits use the existing country category and never send tracking from classification', () => {
  // Evaluate the actual TypeScript module with only React/Supabase imports isolated.
  // The classifier itself is unchanged; a tracking side effect fails this test.
  const source = readFileSync(new URL('../src/lib/obiski.ts', import.meta.url), 'utf8')
  const outputText = stripTypeScriptTypes(source)
    .replace(/^import .* from '(?:react|react-router-dom|\.\/supabase)'\r?\n/gm, '')
    .replace(/^export /gm, '')
  const exports = {}
  runInNewContext(`${outputText}\nexports.imeStrani = imeStrani`, {
    exports, supabase: { rpc() { throw Error('classification must not track') } },
  })
  assert.equal(exports.imeStrani('/de'), 'vstop_drzave')
  assert.equal(exports.imeStrani('/de/'), 'vstop_drzave')
  assert.equal(exports.imeStrani('/de/unknown'), null)
})
