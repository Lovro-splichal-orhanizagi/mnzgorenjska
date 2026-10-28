import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, utimesSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vir from './viri/fcf.mjs'
import {assertHistoricalReportImportable} from './lib/historical-statistics-import.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const html = readFileSync(new URL('./vzorci/es-fcf-acta-rdeci-4139542.html', import.meta.url), 'utf8')
const competition = () => ({ slug: 'es-ct-quarta-g1', source: 'fcf', source_league_code: '4139542-4139779', sezona_koledarska: false })
const options = () => ({ id: 'es4139542', tekmovanje: competition(), sezona: '2026/27', danes: Date.parse('2026-10-18T12:00:00Z') })
const cache = id => `scripts/.predpomnilnik/fcf/acta-${id}.html`
const snapshot = file => ({ bytes: readFileSync(file).toString('hex'), mtime: statSync(file).mtimeMs })
const importerSource = readFileSync(new URL('./uvoz-zapisnikov.mjs', import.meta.url), 'utf8')
function fixture(t) {
  const before = process.cwd(), dir = mkdtempSync(join(tmpdir(), 'fcf-single-'))
  process.chdir(dir)
  mkdirSync('scripts/.predpomnilnik/fcf', { recursive: true })
  t.after(() => { process.chdir(before); rmSync(dir, { recursive: true, force: true }); t.mock.restoreAll() })
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unstubbed real network forbidden') })
  return dir
}

test('existing --zapisnik target reads only its exact source document', async t => {
  fixture(t)
  const calls = []
  const prenesi = async (url, file, fresh) => {
    calls.push(url)
    assert.equal(url, 'https://www.fcf.cat/ca/competicio/acta/4139542')
    assert.equal(calls.length, 1, 'must not traverse a second report')
    assert.equal(fresh, true)
    writeFileSync('scripts/.predpomnilnik/fcf/' + file, html)
    return html
  }
  const reader = vir.posamezniZapisnik('4139542-4139779', options())
  const reports = await reader(prenesi)
  assert.deepEqual(calls, ['https://www.fcf.cat/ca/competicio/acta/4139542'])
  assert.deepEqual(reports.map(r => r.id), ['es4139542'])
  assert.equal(reports[0].rawSha256, createHash('sha256').update(html).digest('hex'))
})

for (const id of [true, null, 4139542, '', '4139542', 'es04139542', 'es4139542\n', ' es4139542', 'es4139542 ',
  'es4139542,es4139543', '../4139542', 'https://www.fcf.cat/ca/competicio/acta/4139542',
  'fas4139542', 'es4139541', 'es4139780', 'es4116202', 'es9007199254740993']) {
  test(`rejects malformed/foreign/out-of-range target before transfer: ${JSON.stringify(id)}`, t => {
    fixture(t)
    const before = readdirSync('scripts/.predpomnilnik/fcf')
    let requests = 0
    assert.throws(() => {
      const reader = vir.posamezniZapisnik(competition().source_league_code, { ...options(), id })
      requests++; void reader(() => { requests++ })
    }, /fcf:/)
    assert.equal(requests, 0)
    assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf'), before)
  })
}
for (const [name, patch] of [
  ['foreign source override', { tekmovanje: { source: 'fas' } }],
  ['non-Catalan slug', { tekmovanje: { slug: 'es-as-tercera-g2' } }],
  ['calendar season', { tekmovanje: { sezona_koledarska: true } }],
  ['missing season metadata', { sezona: null }], ['old season', { sezona: '2025/26' }],
  ['unbound code override', { koda: '4139542-4139543' }],
  ['malformed configured block', { koda: '04139542-4139779', tekmovanje: { source_league_code: '04139542-4139779' } }],
  ['invalid reverse block', { koda: '4139779-4139542', tekmovanje: { source_league_code: '4139779-4139542' } }],
  ['unsafe block integer', { koda: '9007199254740992-9007199254740993', tekmovanje: { source_league_code: '9007199254740992-9007199254740993' } }],
]) test(`rejects ${name} synchronously before transfer or cache change`, t => {
  fixture(t)
  const opts = { ...options(), ...patch, tekmovanje: { ...competition(), ...patch.tekmovanje } }
  assert.throws(() => vir.posamezniZapisnik(patch.koda ?? competition().source_league_code, opts), /fcf:/)
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf'), [])
})

test('valid closed target cache is reused without any network or neighboring-cache mutation', async t => {
  fixture(t)
  writeFileSync(cache(4139542), html)
  writeFileSync(cache(4139543), 'untouched neighbor')
  const before = [cache(4139542), cache(4139543)].map(snapshot)
  const reports = await vir.posamezniZapisnik(competition().source_league_code, options())(() => { throw Error('transfer forbidden') })
  assert.deepEqual(reports.map(r => r.id), ['es4139542'])
  assert.deepEqual([cache(4139542), cache(4139543)].map(snapshot), before)
})

test('recent closed target follows svezi=true freshness and replaces only its own cache', async t => {
  fixture(t)
  writeFileSync(cache(4139542), html)
  writeFileSync(cache(4139543), 'untouched neighbor')
  const before = snapshot(cache(4139543)), calls = []
  const reader = vir.posamezniZapisnik(competition().source_league_code, { ...options(), danes: Date.parse('2026-09-21T12:00:00Z') })
  const reports = await reader(async (url, file, fresh) => {
    calls.push(url); assert.equal(fresh, true)
    assert.match(file, /^\.paired-4139542-[a-f0-9-]+\.html$/)
    writeFileSync('scripts/.predpomnilnik/fcf/' + file, html)
    return html
  })
  assert.equal(reports.length, 1); assert.equal(calls.length, 1)
  assert.deepEqual(snapshot(cache(4139543)), before)
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf').sort(), ['acta-4139542.html', 'acta-4139543.html'])
})

test('future target respects existing weekly cache freshness and returns no played report', async t => {
  fixture(t)
  const pending = readFileSync(new URL('./vzorci/es-fcf-acta-pendent-4139743.html', import.meta.url), 'utf8')
  writeFileSync(cache(4139743), pending)
  const now = Date.now(), opts = { ...options(), id: 'es4139743' }
  utimesSync(cache(4139743), new Date(now - 86400000), new Date(now - 86400000))
  assert.deepEqual(await vir.posamezniZapisnik(competition().source_league_code, opts)(() => { throw Error('transfer forbidden') }), [])
  utimesSync(cache(4139743), new Date(now - 8 * 86400000), new Date(now - 8 * 86400000))
  const calls = []
  assert.deepEqual(await vir.posamezniZapisnik(competition().source_league_code, opts)(async (url, file) => {
    calls.push(url); writeFileSync('scripts/.predpomnilnik/fcf/' + file, pending); return pending
  }), [])
  assert.deepEqual(calls, ['https://www.fcf.cat/ca/competicio/acta/4139743'])
})

for (const [name, change] of [
  ['route', s => s.replaceAll('4139542', '4139543')],
  ['group', s => s.replaceAll('GRUP 1', 'GRUP 2')],
  ['season', s => s.replaceAll('2026', '2025')],
]) for (const cached of [false, true]) test(`${cached ? 'cached' : 'fresh'} wrong ${name} rejects without accepted cache replacement`, async t => {
  fixture(t)
  const bad = change(html)
  if (cached) writeFileSync(cache(4139542), bad)
  const before = cached ? snapshot(cache(4139542)) : null
  let requests = 0
  await assert.rejects(vir.posamezniZapisnik(competition().source_league_code, options())(async (url, file) => {
    requests++; writeFileSync('scripts/.predpomnilnik/fcf/' + file, bad); return bad
  }), /fcf:/)
  assert.equal(requests, cached ? 0 : 1)
  if (cached) assert.deepEqual(snapshot(cache(4139542)), before)
  else assert.equal(existsSync(cache(4139542)), false)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').some(name => name.startsWith('.paired-')), false)
})

function actualTransfer(t, response) {
  const network = []
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    network.push(url)
    assert.equal(opts.headers['User-Agent'], 'SLFF fantasy (slff.eu; splih.94@gmail.com)')
    return new Response(response.body, { status: response.status })
  })
  const body = importerSource.slice(importerSource.indexOf('async function prenesi('), importerSource.indexOf('// --- predpomnilnik za klube'))
  const read = runInNewContext(`(${body.trim()})`, {
    MAPA: 'scripts/.predpomnilnik/fcf', existsSync, readFileSync, writeFileSync, vir,
    smeVPredpomnilnik: () => true,
    // Replace the wall clock delay only; retain the real shared wrapper and fcfFetch.
    prenesiSPonovitvami: (url, opts) => {
      assert.equal(opts.premorMs, 3000); assert.strictEqual(opts.fetchFn, vir.fetch)
      return prenesiSPonovitvami(url, { ...opts, premorMs: 0, zamiki: [] })
    },
  })
  return { read, network }
}
for (const response of [
  { status: 200, body: html }, { status: 401, body: 'refused' }, { status: 403, body: 'refused' }, { status: 429, body: 'refused' },
  { status: 200, body: '<title>Just a moment</title>' },
]) test(`actual importer transfer/fcfFetch HTTP${response.status} ${response.body === html ? 'normal' : 'stop'} touches one target only`, async t => {
  fixture(t)
  const { read, network } = actualTransfer(t, response)
  const result = vir.posamezniZapisnik(competition().source_league_code, options())(read)
  if (response.body === html) assert.equal((await result).length, 1)
  else {
    await assert.rejects(result, e => response.status === 401 ? e.status === 401 : e.zavrnitev === true)
    assert.equal(existsSync(cache(4139542)), false)
  }
  assert.deepEqual(network, ['https://www.fcf.cat/ca/competicio/acta/4139542'])
})

test('cached challenge stops without a source retry or accepted cache rewrite', async t => {
  fixture(t)
  writeFileSync(cache(4139542), '<title>Just a moment</title>')
  const before = snapshot(cache(4139542))
  await assert.rejects(vir.posamezniZapisnik(competition().source_league_code, options())(() => {
    throw Error('cached challenge must not trigger source transfer')
  }), e => e.zavrnitev === true)
  assert.deepEqual(snapshot(cache(4139542)), before)
})

test('changed Calonge body still trips the actual correction guard before accepted cache output', async t => {
  fixture(t)
  // Extraction wrapper is changed only to exercise a candidate route. It is NOT original capture bytes.
  const changed = readFileSync(new URL('./vzorci/es-fcf-calonge-4116202.html', import.meta.url), 'utf8')
    .replace('[\\"extracted-fixture\\"]', '[\\"\\",\\"ca\\",\\"competicio\\",\\"acta\\",\\"4116202\\"]')
  const opts = { ...options(), id: 'es4116202', tekmovanje: { ...competition(), slug: 'es-ct-tercera-g2', source_league_code: '4116188-4116427' } }
  let calls = 0
  await assert.rejects(vir.posamezniZapisnik('4116188-4116427', opts)(async (url, file) => {
    calls++; writeFileSync('scripts/.predpomnilnik/fcf/' + file, changed); return changed
  }), /fcf: spremenjen zapisnik4116202/)
  assert.equal(calls, 1)
  assert.equal(existsSync(cache(4116202)), false)
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf'), [])
})

test('normal full provider stream continues reading every member of the supplied block', async t => {
  fixture(t)
  const second = readFileSync(new URL('./vzorci/es-fcf-acta-quarta-4139543.html', import.meta.url), 'utf8'), calls = []
  const reports = await vir.zapisniki('4139542-4139543', async (url, file) => {
    calls.push(url); const body = url.endsWith('4139542') ? html : second
    writeFileSync('scripts/.predpomnilnik/fcf/' + file, body); return body
  })
  assert.deepEqual(calls, ['https://www.fcf.cat/ca/competicio/acta/4139542', 'https://www.fcf.cat/ca/competicio/acta/4139543'])
  assert.deepEqual(reports.map(r => r.id), ['es4139542', 'es4139543'])
})

function importerWiring({ provider = vir, selected = 'es4139542', season = '2026/27', metadataError = null, cleanup = false, transfer } = {}) {
  const calls = []
  const preflightStart = importerSource.indexOf("const samoZapisnik = arg('zapisnik')")
  const cleanupStart = importerSource.indexOf('// --- čiščenje demo podatkov')
  const listStart = importerSource.indexOf('// --- seznam zapisnikov')
  assert.ok(preflightStart < cleanupStart, 'actual capability preparation must precede actual cleanup block')
  assert.ok(preflightStart < importerSource.indexOf('if (!existsSync(MAPA))'), 'preflight precedes cache writes')
  const preflight = importerSource.slice(preflightStart, importerSource.indexOf('// --- prenos s predpomnilnikom'))
  const cleanupBody = importerSource.slice(cleanupStart, listStart)
  const traversal = importerSource.slice(importerSource.indexOf('console.log(`Berem zapisnike vira'), importerSource.indexOf('if (omeji)'))
  const script = `(async () => { ${preflight}\n${cleanupBody}\n${traversal}\nreturn zapisniki })()`
  const db = {
    async rpc(name, args) { calls.push(['rpc', name, args]); return { data: season, error: metadataError } },
    from() { calls.push(['write']); throw Error('simulated cleanup write boundary reached') },
  }
  return { calls, result: runInNewContext(script, {
    assertHistoricalReportImportable, installedG1Supplement: undefined, arg: name => name === 'zapisnik' ? selected : null, db, pocisti: cleanup,
    vir: provider, tekmovanje: { ...competition(), id: 123 }, liga: competition().source_league_code,
    prenesi: transfer ?? (() => { throw Error('unexpected source traversal') }),
    preskoci: new Set(['old']), sveziZapisniki: new Set(['changed']), console: { log() {} },
  }) }
}

test('actual importer preflight and dispatch use FCF one-report hook instead of full stream', async t => {
  fixture(t)
  const requests = []
  const { result, calls } = importerWiring({ provider: {
    ...vir, zapisniki() { throw Error('full traversal must not run') },
    posamezniZapisnik(code, opts) { return vir.posamezniZapisnik(code, { ...opts, danes: options().danes }) },
  }, transfer: async (url, file) => {
    requests.push(url); writeFileSync('scripts/.predpomnilnik/fcf/' + file, html); return html
  } })
  const reports = await result
  assert.deepEqual(requests, ['https://www.fcf.cat/ca/competicio/acta/4139542'])
  assert.deepEqual(structuredClone(calls), [['rpc', 'sezona_lige', { p_competition_id: 123 }]])
  assert.deepEqual(Array.from(reports, r => r.id), ['es4139542'])
})

for (const [name, opts] of [
  ['foreign target', { selected: 'es4116202' }],
  ['malformed target', { selected: '../4139542' }],
  ['season metadata failure', { metadataError: { message: 'season unavailable' } }],
  ['wrong actual season', { season: '2025/26' }],
]) test(`actual importer rejects ${name} before even simulated cleanup/source writes`, async t => {
  fixture(t)
  const { result, calls } = importerWiring({ ...opts, cleanup: true })
  await assert.rejects(result, /fcf:|sezone posameznega zapisnika/)
  assert.equal(calls.some(c => c[0] === 'write'), false)
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf'), [])
})

test('actual importer normal mode preserves ordinary stream and does not read new metadata', async () => {
  const streamCalls = [], reports = [{ id: 'one', z:{} }, { id: 'two', z:{} }]
  const { result, calls } = importerWiring({ selected: null, provider: {
    ime: 'fcf', posamezniZapisnik() { throw Error('single hook must not run') },
    zapisniki(...args) { streamCalls.push(args); return reports },
  } })
  assert.deepEqual(await result, reports)
  assert.equal(calls.length, 0)
  assert.equal(streamCalls.length, 1); assert.equal(streamCalls[0].length, 2)
  assert.equal(streamCalls[0][0], competition().source_league_code)
})

for (const name of ['fas', 'dfb']) test(`actual importer ${name} fallback retains its stream/options and final ID filter`, async () => {
  const streamCalls = [], selected = name + '1'
  const { result, calls } = importerWiring({ selected, provider: {
    ime: name, zapisniki(...args) { streamCalls.push(args); return [{ id: selected, z:{} }, { id: name + '2', z:{} }] },
  } })
  assert.deepEqual(Array.from(await result, r => r.id), [selected])
  assert.equal(calls.length, 0)
  assert.equal(streamCalls.length, 1)
  assert.equal(streamCalls[0].length, name === 'dfb' ? 3 : 2)
  if (name === 'dfb') {
    const opts = streamCalls[0][2]
    assert.equal(opts.samoZapisnik, selected)
    assert.deepEqual([...opts.preskoci], ['old']); assert.deepEqual([...opts.sveziZapisniki], ['changed'])
  }
})
