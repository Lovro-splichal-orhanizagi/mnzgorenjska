import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { assembleFussballSchedule, collectFussballSeason } from './fussball-season.mjs'
import { razberiKrog } from './viri/fussball.mjs'
import { inspectFussballPage, fussballFontUrl } from './viri/fussball-discovery.mjs'
import { razberiFantasyZapisnik } from './viri/fussball-statistika.mjs'

const BASE = 'https://www.fussball.de'
const STAFFEL = '031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const MATCH_A = '031EQBPLF4000000VS5489BTVUS470OH'
const MATCH_B = '031EQBPLF5000000VS5489BTVUS470OH'
const MATCH_C = '031EQBPLF6000000VS5489BTVUS470OH'
const MATCH_D = '031EQBPLF7000000VS5489BTVUS470OH'
const MATCH_E = '031EQBPLF8000000VS5489BTVUS470OH'
const roundUrl = n => `${BASE}/spieltag/-/spieltag/${n}/staffel/${STAFFEL}`
const reportUrl = id => `${BASE}/spiel/-/spiel/${id}`
const lineupUrl = id => `${BASE}/ajax.match.lineup/-/mode/PAGE/spiel/${id}`
const match = (id, krog, extra = {}) => ({
  id,
  zapisnikId: `de-fussball-${id}`,
  url: reportUrl(id),
  krog,
  datum: '2026-10-11',
  ura: '15:00',
  domaci: `Home ${id.slice(-1)}`,
  gostje: `Away ${id.slice(-1)}`,
  rezultat: { domaci: 1, gostje: 0 },
  ...extra,
})
const selectors = (selected = 1) => [1, 2].map(krog => ({ krog, url: roundUrl(krog), izbran: krog === selected }))
const parsedRound = (krog, tekme, prestavljene = [], list = selectors(krog)) => ({
  sezona: '2026/27',
  krog,
  krogi: list,
  tekme,
  prestavljene,
})
const page = parsed => ({ url: roundUrl(parsed.krog), parsed })

test('assembles every contiguous round once and preserves source fixture fields', () => {
  const first = match(MATCH_A, 1, { sourceEvidence: 'primary raw field' })
  const second = match(MATCH_B, 1, { rezultat: null })
  const third = match(MATCH_C, 2)
  const postponed = { ...second, krog: null }
  const schedule = assembleFussballSchedule([
    page(parsedRound(1, [first, second])),
    page(parsedRound(2, [third], [postponed])),
  ], { season: '2026/27', staffel: STAFFEL })

  assert.deepEqual(schedule.rounds, [1, 2])
  assert.deepEqual(schedule.fixtures, [first, second, third])
  assert.deepEqual(schedule.rescheduledIds, [MATCH_B])
})

test('schedule rejects missing, duplicate, conflicting and out-of-scope round pages', () => {
  const one = page(parsedRound(1, [match(MATCH_A, 1)]))
  const two = page(parsedRound(2, [match(MATCH_B, 2)]))
  assert.throws(() => assembleFussballSchedule([one], { season: '2026/27', staffel: STAFFEL }), /missing|complete|round/i)
  assert.throws(() => assembleFussballSchedule([one, one, two], { season: '2026/27', staffel: STAFFEL }), /duplicate|once|round/i)
  assert.throws(() => assembleFussballSchedule([one, { ...two, parsed: { ...two.parsed, sezona: '2025/26' } }], { season: '2026/27', staffel: STAFFEL }), /season/i)
  assert.throws(() => assembleFussballSchedule([one, { ...two, parsed: { ...two.parsed, krog: '2' } }], { season: '2026/27', staffel: STAFFEL }), /selected round/i)
  assert.throws(() => assembleFussballSchedule([one, { ...two, parsed: { ...two.parsed, krogi: selectors(1).map(r => ({ ...r, url: r.url.replace(STAFFEL, '031EKNM2HG00000LVS5489BUVUR5FS5Z-G') })) } }], { season: '2026/27', staffel: STAFFEL }), /selector|staffel|scope|round/i)
  assert.throws(() => assembleFussballSchedule([one, { ...two, url: roundUrl(1) }], { season: '2026/27', staffel: STAFFEL }), /selected|requested|round/i)
})

test('schedule rejects duplicate fixture assignments and unknown or conflicting rescheduled rows', () => {
  const a = match(MATCH_A, 1)
  const duplicateA = match(MATCH_A, 2)
  const b = match(MATCH_B, 2)
  const one = page(parsedRound(1, [a]))
  assert.throws(() => assembleFussballSchedule([one, page(parsedRound(2, [duplicateA, b]))], { season: '2026/27', staffel: STAFFEL }), /duplicate|fixture|assignment/i)
  assert.throws(() => assembleFussballSchedule([one, page(parsedRound(2, [b], [{ ...a, krog: null, domaci: 'Different club' }]))], { season: '2026/27', staffel: STAFFEL }), /resched|postpon|conflict|header/i)
  assert.throws(() => assembleFussballSchedule([one, page(parsedRound(2, [b], [{ ...match(MATCH_C, null), krog: null }]))], { season: '2026/27', staffel: STAFFEL }), /resched|postpon|primary|fixture/i)
})

test('schedule deduplicates identical postponed references but rejects conflicting repeats', () => {
  const a = match(MATCH_A, 1)
  const b = match(MATCH_B, 2)
  const one = page(parsedRound(1, [a]))
  const two = page(parsedRound(2, [b], [{ ...a, krog: null }]))
  const repeated = page(parsedRound(2, [b], [{ ...a, krog: null }, { ...a, krog: null }]))
  const schedule = assembleFussballSchedule([one, repeated], { season: '2026/27', staffel: STAFFEL })
  assert.deepEqual(schedule.rescheduledIds, [MATCH_A])

  const conflicting = { ...a, krog: null, ura: '16:00' }
  assert.throws(() => assembleFussballSchedule([
    one,
    page(parsedRound(2, [b], [{ ...a, krog: null }, conflicting])),
  ], { season: '2026/27', staffel: STAFFEL }), /postpon|resched|conflict/i)
})

function makeCollectorFixture({ reportLimit = 1, reportParser } = {}) {
  const calls = []
  const seedUrl = `${BASE}/spieltag/-/staffel/${STAFFEL}`
  const urlByRound = new Map([[seedUrl, 1], [roundUrl(2), 2]])
  const primary = [
    match(MATCH_A, 1),
    match(MATCH_B, 1, { rezultat: null }),
    match(MATCH_C, 2),
    match(MATCH_D, 2, { rezultat: null }),
  ]
  const parsedByRound = new Map([
    [1, parsedRound(1, primary.slice(0, 2))],
    [2, parsedRound(2, primary.slice(2), [{ ...primary[1], krog: null }])],
  ])
  const mainById = new Map([[MATCH_A, `main:${MATCH_A}`], [MATCH_C, `main:${MATCH_C}`]])
  const lineupById = new Map([[MATCH_A, `lineup:${MATCH_A}`], [MATCH_C, `lineup:${MATCH_C}`]])
  const fontData = new Map([
    ['abcdefgh', new Uint8Array([1, 2, 3])],
    ['ijklmnop', new Uint8Array([4, 5, 6])],
  ])
  const cssUrl = id => `${BASE}/export.fontface/-/id/${id}/type/css`
  const fontUrl = id => `${BASE}/export.fontface/-/format/woff/id/${id}/type/font`
  const text = value => new TextEncoder().encode(value)
  const document = (url, kind, bytes) => ({ url, kind, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), status: 200, contentType: kind === 'css' ? 'text/css' : kind === 'font' ? 'font/woff' : 'text/html', capturedAt: '2026-10-23T00:00:00.000Z' })
  const client = {
    async read(url, kind) {
      calls.push({ url, kind })
      if (urlByRound.has(url)) return document(url, kind, text(`round:${urlByRound.get(url)}`))
      for (const [id, value] of mainById) if (url === reportUrl(id)) return document(url, kind, text(value))
      for (const [id, value] of lineupById) if (url === lineupUrl(id)) return document(url, kind, text(value))
      for (const id of fontData.keys()) if (url === cssUrl(id)) return document(url, kind, text(`css:${id}`))
      for (const [id, value] of fontData) if (url === fontUrl(id)) return document(url, kind, value)
      throw Error(`unexpected source URL ${url}`)
    },
  }
  const pageInfo = (kind, html, options) => {
    if (kind === 'round') return { url: options.roundUrl, fontIds: ['abcdefgh'], cssTemplate: `${BASE}/export.fontface/-/id/%ID%/type/css`, lineupUrl: null }
    const id = options.matchId
    return { url: reportUrl(id), fontIds: ['abcdefgh'], cssTemplate: `${BASE}/export.fontface/-/id/%ID%/type/css`, lineupUrl: lineupUrl(id) }
  }
  const parsers = {
    inspectPage: (html, options) => pageInfo(options.kind, html, { ...options, roundUrl: html === 'round:1' ? seedUrl : roundUrl(2), matchId: options.matchId }),
    inspectLineup: () => ['ijklmnop'],
    fontUrl: (css, id) => {
      assert.equal(css, `css:${id}`)
      return fontUrl(id)
    },
    parseRound: (html, { staffel }) => {
      assert.equal(staffel, STAFFEL)
      return parsedByRound.get(Number(html.slice('round:'.length)))
    },
    parseFantasyReport: reportParser ?? ((mainHtml, lineupHtml, options) => {
      const id = mainHtml.slice('main:'.length)
      assert.equal(lineupHtml, `lineup:${id}`)
      assert.equal(options.id, id)
      assert.equal(options.lineupId, id)
      assert.ok(options.fonts.abcdefgh?.bytes)
      assert.ok(options.fonts.ijklmnop?.bytes)
      const fixture = primary.find(item => item.id === id)
      return {
        reportStatistikaPripravljena: true,
        sezonskiUvozPodprt: false,
        activationEligible: false,
        z: { zapisnikId: fixture.zapisnikId, nepopoln: true, domaci: { ime: fixture.domaci }, gostje: { ime: fixture.gostje }, datum: fixture.datum, ura: fixture.ura, krog: fixture.krog, rezultat: fixture.rezultat },
        nastopi: [], nepripisaniRumeni: [],
      }
    }),
  }
  return { calls, client, parsers, seedUrl, primary, parsedByRound, reportLimit }
}

test('collector assembles the whole schedule before sampled reports and does not refetch seed', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 1 })
  const progress = []
  const result = await collectFussballSeason({
    seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client,
    reportLimit: fixture.reportLimit, onProgress: event => progress.push(event),
  }, fixture.parsers)

  assert.equal(result.version, 1)
  assert.deepEqual(result.scope, { provider: 'fussball', seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', asOfDate: '2026-10-23' })
  assert.equal(result.activationEligible, false)
  assert.deepEqual(result.schedule.rounds, [1, 2])
  assert.equal(result.schedule.fixtures.length, 4)
  assert.deepEqual(result.schedule.rescheduledIds, [MATCH_B])
  assert.equal(result.reports.length, 1)
  assert.equal(result.reports[0].fixture.id, MATCH_A)
  assert.equal(result.coverage.expectedRounds, 2)
  assert.equal(result.coverage.capturedRounds, 2)
  assert.equal(result.coverage.fixtures, 4)
  assert.equal(result.coverage.playedFixtures, 2)
  assert.equal(result.coverage.attemptedReports, 1)
  assert.equal(result.coverage.completeReports, 1)
  assert.equal(result.coverage.rejectedReports, 0)
  assert.equal(result.coverage.sampled, true)
  assert.equal(result.coverage.unscoredFixtures.total, 2)
  assert.equal(result.coverage.unscoredFixtures.past + result.coverage.unscoredFixtures.current + result.coverage.unscoredFixtures.future + result.coverage.unscoredFixtures.unknownDate, 2)
  const roundReads = fixture.calls.filter(call => call.kind === 'round').map(call => call.url)
  assert.deepEqual(roundReads, [fixture.seedUrl, roundUrl(2)])
  const lastRoundRead = Math.max(...fixture.calls.map((call, index) => call.kind === 'round' ? index : -1))
  const firstReportRead = fixture.calls.findIndex(call => call.kind === 'report')
  assert.ok(lastRoundRead < firstReportRead)
  assert.ok(progress.some(event => event.phase === 'schedule-complete'))
})

test('collector uses a validated pinned as-of date for deterministic unscored fixture counts', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 0 })
  fixture.primary[1].datum = '2026-10-23'
  fixture.parsedByRound.get(2).prestavljene[0].datum = '2026-10-23'
  fixture.primary[3].datum = '2026-10-22'
  const future = match(MATCH_E, 2, { datum: '2026-10-24', rezultat: null })
  fixture.primary.push(future)
  fixture.parsedByRound.get(2).tekme.push(future)
  const first = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 0, asOfDate: '2026-10-23' }, fixture.parsers)
  const second = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 0, asOfDate: '2026-10-23' }, fixture.parsers)
  assert.equal(first.scope.asOfDate, '2026-10-23')
  assert.deepEqual(first.coverage.unscoredFixtures, { total: 3, past: 1, current: 1, future: 1, unknownDate: 0 })
  assert.deepEqual(second.coverage.unscoredFixtures, first.coverage.unscoredFixtures)
})

test('collector requires an explicit date when the seed has no capture timestamp and validates calendar dates', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 0 })
  const client = { async read(url, kind) {
    const document = await fixture.client.read(url, kind)
    return url === fixture.seedUrl ? { ...document, capturedAt: null } : document
  } }
  await assert.rejects(collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client, reportLimit: 0 }, fixture.parsers), /asOfDate|capture date/i)
  await assert.rejects(collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 0, asOfDate: '2026-02-30' }, fixture.parsers), /asOfDate|date/i)
})

test('collector preserves source read failures as global stops', async () => {
  const fixture = makeCollectorFixture()
  const client = {
    async read(url, kind) {
      if (kind === 'report') throw Object.assign(Error('HTTP 403'), { status: 403 })
      return fixture.client.read(url, kind)
    },
  }
  await assert.rejects(collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client }, fixture.parsers), /403/)
})

test('a font source read failure during a report remains a global capture stop', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 1 })
  const client = {
    async read(url, kind) {
      if (kind === 'font' && url.endsWith('/id/ijklmnop/type/font')) throw Error('WOFF denied')
      return fixture.client.read(url, kind)
    },
  }
  await assert.rejects(collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client, reportLimit: 1 }, fixture.parsers), /WOFF denied/)
})

test('collector records semantic report failures and rejects mismatched report headers', async t => {
  await t.test('typed parser refusal stays attached to the fixture', async () => {
    const fixture = makeCollectorFixture({ reportLimit: 1, reportParser: () => { throw Object.assign(Error('red-card variant unsupported'), { code: 'FUSSBALL_REPORT_UNSUPPORTED' }) } })
    const result = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 1 }, fixture.parsers)
    assert.equal(result.reports.length, 0)
    assert.equal(result.rejectedReports.length, 1)
    assert.equal(result.rejectedReports[0].fixture.id, MATCH_A)
    assert.equal(result.rejectedReports[0].code, 'FUSSBALL_REPORT_UNSUPPORTED')
    assert.match(result.rejectedReports[0].reason, /red-card/)
    assert.equal(result.coverage.rejectedReports, 1)
  })
  await t.test('a parser success with a conflicting header is rejected', async () => {
    const fixture = makeCollectorFixture({ reportLimit: 1, reportParser: () => ({
      reportStatistikaPripravljena: true, sezonskiUvozPodprt: false, activationEligible: false,
      z: { zapisnikId: `de-fussball-${MATCH_A}`, nepopoln: true, domaci: { ime: 'wrong' }, gostje: { ime: 'Away A' }, datum: '2026-10-11', ura: '15:00', krog: 1, rezultat: { domaci: 1, gostje: 0 } },
      nastopi: [], nepripisaniRumeni: [],
    }) })
    const result = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 1 }, fixture.parsers)
    assert.equal(result.reports.length, 0)
    assert.equal(result.rejectedReports[0].code, 'FUSSBALL_REPORT_HEADER_MISMATCH')
  })
})

test('report limit zero is an explicitly sampled schedule-only result', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 0 })
  const result = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 0 }, fixture.parsers)
  assert.equal(result.coverage.playedFixtures, 2)
  assert.equal(result.coverage.attemptedReports, 0)
  assert.equal(result.coverage.sampled, true)
  assert.deepEqual(fixture.calls.filter(call => call.kind === 'report'), [])
})

test('unobserved font IDs never trigger CSS or font reads', async () => {
  const fixture = makeCollectorFixture({ reportLimit: 1, reportParser: (_main, _lineup, options) => {
    assert.equal(options.fonts.zzzzzzzz, undefined)
    throw Object.assign(Error('fixture parser rejected an unobserved font reference'), { code: 'FUSSBALL_REPORT_UNSUPPORTED' })
  } })
  const result = await collectFussballSeason({ seedUrl: fixture.seedUrl, staffel: STAFFEL, season: '2026/27', client: fixture.client, reportLimit: 1 }, fixture.parsers)
  assert.equal(result.rejectedReports[0].code, 'FUSSBALL_REPORT_UNSUPPORTED')
  assert.ok(!fixture.calls.some(call => call.url.includes('/id/zzzzzzzz/')))
})

test('collector replays an authentic saved round and report through the strict fantasy parser', async () => {
  const roundHtml = readFileSync(new URL('./vzorci/de-fussball-krog8.html', import.meta.url), 'utf8')
  const mainHtml = readFileSync(new URL('./vzorci/de-fussball-ilvesheim-main.html', import.meta.url), 'utf8')
  const lineupHtml = readFileSync(new URL('./vzorci/de-fussball-ilvesheim-lineup.html', import.meta.url), 'utf8')
  const manifest = JSON.parse(readFileSync(new URL('./vzorci/de-fussball-zapisnik.json', import.meta.url), 'utf8'))
  const fontsOnDisk = Object.fromEntries(Object.entries(manifest.fonts).map(([id, font]) => [
    id,
    { bytes: readFileSync(new URL(`./vzorci/${font.file}`, import.meta.url)), sha256: font.sha256 },
  ]))
  const seedUrl = manifest.provenance.roundUrl
  const exactReportUrl = 'https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/031EQBPLF4000000VS5489BTVUS470OH'
  const exactLineupUrl = manifest.provenance.lineupUrl
  const baseSelector = razberiKrog(roundHtml, { fonts: fontsOnDisk, staffel: STAFFEL }).krogi.slice(0, 8)
  const calls = []
  const client = {
    async read(url, kind) {
      calls.push({ url, kind })
      if (url === seedUrl || baseSelector.some(item => item.url === url)) return doc(url, kind, roundHtml)
      if (url === exactReportUrl) return doc(url, kind, mainHtml)
      if (url === exactLineupUrl) return doc(url, kind, lineupHtml)
      const cssId = url.match(/\/export\.fontface\/-\/id\/([a-z0-9]{8})\/type\/css$/)?.[1]
      if (cssId === 'ilpaevbo') throw Error('irrelevant observed font must stay unfetched')
      if (cssId) return doc(url, kind, cssFor(cssId))
      const fontId = url.match(/\/export\.fontface\/-\/format\/woff\/id\/([a-z0-9]{8})\/type\/font$/)?.[1]
      if (fontId) return doc(url, kind, fontsOnDisk[fontId]?.bytes)
      throw Error(`unexpected authentic replay URL ${url}`)
    },
  }
  function doc(url, kind, value) {
    const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new TextEncoder().encode(value)
    return { url, kind, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), status: 200,
      contentType: kind === 'css' ? 'text/css' : kind === 'font' ? 'font/woff' : 'text/html', capturedAt: '2026-10-23T00:00:00.000Z' }
  }
  function cssFor(id) {
    return `@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`
  }
  const parsedFixture = razberiKrog(roundHtml, { fonts: fontsOnDisk, staffel: STAFFEL }).tekme
    .find(item => item.id === '031EQBPLF4000000VS5489BTVUS470OH')
  assert.ok(parsedFixture)
  const parsers = {
    inspectPage: inspectFussballPage,
    fontUrl: fussballFontUrl,
    parseRound: (html, { fonts, staffel: staffelId, url }) => {
      const actual = razberiKrog(html, { fonts, staffel: staffelId })
      const selected = Number(url.match(/\/spieltag\/(\d+)\/staffel\//)?.[1] ?? actual.krog)
      return {
        ...actual,
        krog: selected,
        krogi: baseSelector.map(item => ({ ...item, izbran: item.krog === selected })),
        tekme: selected === 8 ? [parsedFixture] : [],
        prestavljene: [],
      }
    },
  }
  const result = await collectFussballSeason({ seedUrl, staffel: STAFFEL, season: '2026/27', client, reportLimit: 1 }, parsers)
  assert.equal(result.coverage.capturedRounds, 8)
  assert.equal(result.coverage.playedFixtures, 1)
  assert.equal(result.coverage.completeReports, 1)
  assert.equal(result.reports[0].fixture.id, parsedFixture.id)
  assert.equal(result.reports[0].result.nastopi.length, 30)
  assert.equal(result.reports[0].result.nepripisaniRumeni.length, 3)
  assert.deepEqual(result.reports[0].result.z.rezultat, { domaci: 2, gostje: 3 })
  assert.deepEqual(result.reports[0].result, razberiFantasyZapisnik(mainHtml, lineupHtml, {
    fonts: fontsOnDisk,
    id: parsedFixture.id,
    lineupId: parsedFixture.id,
  }))
  assert.equal(calls.filter(call => call.url === seedUrl).length, 1)
  assert.ok(calls.some(call => call.kind === 'lineup' && call.url === exactLineupUrl))
  assert.ok(calls.some(call => call.kind === 'font'))
  assert.ok(!calls.some(call => /\/export\.fontface\/-\/id\/ilpaevbo\/type\/css$/.test(call.url)))
})
