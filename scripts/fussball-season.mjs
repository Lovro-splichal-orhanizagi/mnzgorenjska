import { randomUUID } from 'node:crypto'
import { razberiKrog } from './viri/fussball.mjs'
import { inspectFussballLineup, razberiFantasyZapisnik } from './viri/fussball-statistika.mjs'
import * as discovery from './viri/fussball-discovery.mjs'

const BASE = 'https://www.fussball.de'
const STAFFEL = /^[A-Z0-9]{32}-G$/
const MATCH_ID = /^[A-Z0-9]{32}$/
const FONT_ID = /^[a-z0-9]{8}$/
const fail = (message, code = 'FUSSBALL_SCHEDULE_INVALID') => Object.assign(new Error(`fussball season: ${message}`), { code })
const text = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes)

class NeedObservedFont extends Error {
  constructor(id, token) {
    super(`__SLFF_OBSERVED_FONT_${token}_${id}__`)
    this.fontId = id
  }
}

function roundUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(`${BASE}/`)) return null
  const match = url.match(/^https:\/\/www\.fussball\.de\/spieltag\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?-\/spieltag\/([1-9]\d{0,2})\/staffel\/([A-Z0-9]{32}-G)$/)
  return match ? { round: Number(match[1]), staffel: match[2] } : null
}

function baseRoundUrl(url) {
  if (typeof url !== 'string') return null
  const match = url.match(/^https:\/\/www\.fussball\.de\/spieltag\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?-\/staffel\/([A-Z0-9]{32}-G)$/)
  return match?.[1] ?? null
}

function reportId(url) {
  if (typeof url !== 'string') return null
  return url.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1] ?? null
}

function lineupId(url) {
  if (typeof url !== 'string') return null
  return url.match(/^https:\/\/www\.fussball\.de\/ajax\.match\.lineup\/\-\/mode\/PAGE\/spiel\/([A-Z0-9]{32})(?:\/ticker-id\/selectedTickerId)?$/)?.[1] ?? null
}

function validDate(date) {
  if (typeof date !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date
}

function validScore(score) {
  return score === null || (score && Number.isInteger(score.domaci) && Number.isInteger(score.gostje) &&
    score.domaci >= 0 && score.domaci <= 99 && score.gostje >= 0 && score.gostje <= 99)
}

function validAdministrativeResult(value) {
  const closed = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) &&
    Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key))
  return closed(value, ['schemaVersion', 'kind', 'marker', 'displayedScores', ...(value?.marker === 'W' ? ['rawMarker'] : [])]) && value.schemaVersion === 1 &&
    ((value.kind === 'confirmed-administrative-decision' && value.marker === 'V') ||
     (value.kind === 'confirmed-sports-court-decision' && value.marker === 'U') ||
     (value.kind === 'confirmed-match-authority-decision' && value.marker === 'W' && ['w', 'W'].includes(value.rawMarker))) &&
    Array.isArray(value.displayedScores) && value.displayedScores.length === 2 &&
    value.displayedScores.every(score => closed(score, ['domaci', 'gostje']) && validScore(score))
}

function validateFixture(fixture, { round, rescheduled = false } = {}) {
  if (!fixture || !MATCH_ID.test(fixture.id ?? '') || fixture.zapisnikId !== `de-fussball-${fixture.id}` || reportId(fixture.url) !== fixture.id)
    throw fail('fixture source ID, report ID or URL is invalid')
  if (rescheduled ? fixture.krog !== null : fixture.krog !== round)
    throw fail('fixture has conflicting round assignment')
  if (!validDate(fixture.datum) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fixture.ura ?? '') ||
      typeof fixture.domaci !== 'string' || !fixture.domaci.trim() || typeof fixture.gostje !== 'string' || !fixture.gostje.trim() ||
      !validScore(fixture.rezultat))
    throw fail('fixture header has invalid date, time, clubs or score')
  if (Object.hasOwn(fixture, 'administrativeResult') &&
      (fixture.rezultat !== null || !validAdministrativeResult(fixture.administrativeResult)))
    throw fail('fixture has an invalid or conflicting administrative result')
}

function normalizedSelector(items, staffel) {
  if (!Array.isArray(items) || !items.length || items.length > 80) throw fail('round selector is empty or unbounded')
  const out = []
  for (const item of items) {
    const scoped = roundUrl(item?.url)
    if (!Number.isInteger(item?.krog) || !scoped || scoped.staffel !== staffel || scoped.round !== item.krog)
      throw fail('round selector contains an out-of-scope link')
    out.push({ krog: item.krog, url: item.url })
  }
  if (out.some((item, index) => item.krog !== index + 1) || new Set(out.map(item => item.url)).size !== out.length)
    throw fail('round selector is not a complete contiguous inventory')
  return out
}

function fixtureHeader(fixture) {
  const admin = fixture.administrativeResult
  return JSON.stringify([fixture.domaci, fixture.gostje, fixture.datum, fixture.ura, fixture.rezultat,
    ...(admin ? [[admin.schemaVersion, admin.kind, admin.marker, admin.displayedScores.map(s => [s.domaci, s.gostje])]] : [])])
}

/** Combines already-parsed round pages into one season-scoped fixture inventory. */
export function assembleFussballSchedule(roundPages, { season, staffel } = {}) {
  if (!/^20\d{2}\/\d{2}$/.test(season ?? '') || !STAFFEL.test(staffel ?? '') || !Array.isArray(roundPages) || !roundPages.length)
    throw fail('season, staffel and round pages are required')
  const seedPages = roundPages.filter(page => baseRoundUrl(page?.url) === staffel)
  if (seedPages.length > 1) throw fail('duplicate base seed round page')
  const seedParsed = roundPages[0]?.parsed
  if (seedParsed?.sezona !== season) throw fail('seed round season does not match requested season')
  const selector = normalizedSelector(seedParsed.krogi, staffel)
  const selectorJson = JSON.stringify(selector)
  const byRound = new Map()
  for (const page of roundPages) {
    const parsed = page?.parsed
    if (!parsed || parsed.sezona !== season) throw fail('round page season does not match requested season')
    const selected = parsed.krog
    if (!Number.isInteger(selected) || !selector[selected - 1]) throw fail('round page has invalid selected round')
    const actualSelector = normalizedSelector(parsed.krogi, staffel)
    if (JSON.stringify(actualSelector) !== selectorJson) throw fail('round page selector changed during collection')
    const selectedRows = parsed.krogi.filter(item => item.izbran === true)
    if (selectedRows.length !== 1 || selectedRows[0].krog !== selected) throw fail('selected round evidence is inconsistent')
    const isSeed = baseRoundUrl(page.url) === staffel
    const actualUrl = roundUrl(page.url)
    if (isSeed) {
      if (baseRoundUrl(page.url) !== staffel) throw fail('seed round URL is out of scope')
    } else if (!actualUrl || actualUrl.staffel !== staffel || actualUrl.round !== selected || page.url !== selector[selected - 1].url) {
      throw fail('requested round URL does not match the selected round')
    }
    if (byRound.has(selected)) throw fail('duplicate round page')
    byRound.set(selected, parsed)
  }
  if (byRound.size !== selector.length || selector.some(item => !byRound.has(item.krog)))
    throw fail('missing round page from advertised inventory')

  const fixtures = [], rescheduled = new Map(), ids = new Set()
  for (const item of selector) {
    const parsed = byRound.get(item.krog)
    if (!Array.isArray(parsed.tekme) || !Array.isArray(parsed.prestavljene)) throw fail('round parser omitted fixture rows')
    for (const fixture of parsed.tekme) {
      validateFixture(fixture, { round: item.krog })
      if (ids.has(fixture.id)) throw fail('fixture has more than one primary round assignment')
      ids.add(fixture.id)
      fixtures.push(fixture)
    }
    for (const fixture of parsed.prestavljene) {
      validateFixture(fixture, { rescheduled: true })
      if (rescheduled.has(fixture.id)) {
        if (fixtureHeader(rescheduled.get(fixture.id)) !== fixtureHeader(fixture))
          throw fail('postponed references conflict with each other')
        continue
      }
      rescheduled.set(fixture.id, fixture)
    }
  }
  for (const [id, extra] of rescheduled) {
    const primary = fixtures.find(fixture => fixture.id === id)
    if (!primary) throw fail('postponed row does not refer to a primary fixture')
    if (fixtureHeader(primary) !== fixtureHeader(extra)) throw fail('postponed row conflicts with primary fixture header')
  }
  return { season, staffel, fixtures, rescheduledIds: [...rescheduled.keys()].sort(), rounds: selector.map(item => item.krog) }
}

function parserDependencies(parsers) {
  return {
    inspectPage: parsers.inspectPage ?? discovery.inspectFussballPage,
    inspectLineup: parsers.inspectLineup ?? inspectFussballLineup,
    fontUrl: parsers.fontUrl ?? discovery.fussballFontUrl,
    parseRound: parsers.parseRound ?? razberiKrog,
    parseFantasyReport: parsers.parseFantasyReport ?? razberiFantasyZapisnik,
  }
}

function validatePageInfo(info, { kind, staffel, matchId } = {}) {
  if (!info || typeof info.url !== 'string' || !Array.isArray(info.fontIds) ||
      !info.fontIds.every(id => FONT_ID.test(id)) || new Set(info.fontIds).size !== info.fontIds.length ||
      [...info.fontIds].sort().some((id, index) => id !== info.fontIds[index]) ||
      info.cssTemplate !== `${BASE}/export.fontface/-/id/%ID%/type/css`)
    throw fail(`invalid ${kind} page discovery result`)
  if (kind === 'round' && (baseRoundUrl(info.url) ?? roundUrl(info.url)?.staffel) !== staffel)
    throw fail('round canonical identity has the wrong staffel')
  if (kind === 'report' && reportId(info.url) !== matchId) throw fail('report canonical identity has the wrong match ID')
}

function makeFontsLoader(readSource, parsers) {
  const cache = new Map()
  return async (fontIds, cssTemplate) => {
    const out = Object.create(null)
    for (const id of fontIds) {
      if (!FONT_ID.test(id)) throw fail('invalid discovered font ID')
      if (!cache.has(id)) {
        const cssUrl = cssTemplate.replace('%ID%', id)
        const cssDoc = await readSource(cssUrl, 'css')
        let url
        try { url = parsers.fontUrl(text(cssDoc.bytes), id) } catch (error) {
          throw Object.assign(new Error(error.message), { code: 'FUSSBALL_FONT_CSS_UNSUPPORTED' })
        }
        const expected = `${BASE}/export.fontface/-/format/woff/id/${id}/type/font`
        if (url !== expected) throw fail('font CSS resolved to a different field ID')
        const fontDoc = await readSource(url, 'font')
        cache.set(id, { bytes: new Uint8Array(fontDoc.bytes), sha256: fontDoc.sha256 })
      }
      const font = cache.get(id)
      out[id] = { bytes: new Uint8Array(font.bytes), sha256: font.sha256 }
    }
    return out
  }
}

function makeLazyFontParser(loadFonts, allowedIds, cssTemplate, token, parse) {
  const allowed = new Set(allowedIds)
  const loaded = Object.create(null)
  let requested = null
  const fonts = new Proxy(loaded, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !Object.hasOwn(target, key) && allowed.has(key)) {
        requested = new NeedObservedFont(key, token)
        throw requested
      }
      return Reflect.get(target, key, receiver)
    },
  })

  return async () => {
    for (let retry = 0; retry <= allowedIds.length; retry++) {
      requested = null
      let missing = null, value
      try {
        value = await parse(fonts)
      } catch (error) {
        if (error instanceof NeedObservedFont) missing = error
        else {
          // The strict report parser wraps decoder errors but preserves their
          // message. Match only this invocation's unguessable sentinel.
          const suffix = `__SLFF_OBSERVED_FONT_${token}_([a-z0-9]{8})__`
          const wrapped = error?.code === 'FUSSBALL_REPORT_INVALID' &&
            typeof error.message === 'string' && error.message.match(new RegExp(`${suffix}$`))
          if (!wrapped) throw error
          missing = { fontId: wrapped[1] }
        }
      }
      missing ??= requested
      if (!missing) return value
      if (!missing || !allowed.has(missing.fontId) || Object.hasOwn(loaded, missing.fontId))
        throw fail('lazy font retry requested an unobserved or repeated field ID')
      const fetched = await loadFonts([missing.fontId], cssTemplate)
      loaded[missing.fontId] = fetched[missing.fontId]
    }
    throw fail('lazy font parser exceeded its observed field-ID bound')
  }
}

/** Shared strict parser session; source reads remain owned by the caller's stopped client. */
export function createFussballParserSession(readSource, injectedParsers = {}, {cardPolicy,season} = {}) {
  if(cardPolicy!==undefined&&cardPolicy!=='community-v1')throw fail('invalid card policy')
  const parsers = parserDependencies(injectedParsers)
  const loadFonts = makeFontsLoader(readSource, parsers), token = randomUUID()
  const parse = (ids, template, fn) => makeLazyFontParser(loadFonts, ids, template, token, fn)()
  return {
    async round(html, {staffel, url}) {
      const info = parsers.inspectPage(html, {kind:'round', staffel})
      // Dated seeds are admitted by strict discovery; season collection still has its own base-only seed gate.
      const parsed = await parse(info.fontIds, info.cssTemplate, fonts => parsers.parseRound(html, {fonts,staffel,url}))
      return {info, parsed}
    },
    async report(fixture) {
      const mainDocument = await readSource(fixture.url, 'report'), mainHtml = text(mainDocument.bytes)
      const info = parsers.inspectPage(mainHtml, {kind:'report',matchId:fixture.id})
      validatePageInfo(info, {kind:'report',matchId:fixture.id})
      if (!info.lineupUrl || lineupId(info.lineupUrl) !== fixture.id)
        throw fail('report has no exact observed lineup URL', 'FUSSBALL_LINEUP_LINK_MISSING')
      const lineupDocument = await readSource(info.lineupUrl, 'lineup'), lineupHtml = text(lineupDocument.bytes)
      let lineupFonts
      try {
        lineupFonts = parsers.inspectLineup(lineupHtml)
        if (!Array.isArray(lineupFonts) || !lineupFonts.every(id => FONT_ID.test(id)) || new Set(lineupFonts).size !== lineupFonts.length)
          throw fail('lineup discovery returned invalid font IDs', 'FUSSBALL_LINEUP_INVALID')
      } catch (error) {throw Object.assign(error,{code:error?.code ?? 'FUSSBALL_LINEUP_INVALID'})}
      const ids = [...new Set([...info.fontIds,...lineupFonts])].sort()
      const result = await parse(ids, info.cssTemplate, fonts => parsers.parseFantasyReport(mainHtml,lineupHtml,{fonts,id:fixture.id,lineupId:fixture.id,...(cardPolicy?{cardPolicy,season}:{})}))
      validateFantasyResult(result,fixture,{cardPolicy})
      return {fixture,result}
    },
  }
}
export {validateFixture as validateFussballFixture}

function sameResult(a, b) {
  return a && b && a.domaci === b.domaci && a.gostje === b.gostje
}

function validateFantasyResult(result, fixture, {cardPolicy} = {}) {
  const z = result?.z
  const pending=cardPolicy==='community-v1'&&result?.statisticsPending===true&&result?.reportStatistikaPripravljena===false&&result?.cardEnvelope&&z&&!Object.hasOwn(result,'nastopi')&&!Object.hasOwn(z,'goli')
  if ((!pending&&result?.reportStatistikaPripravljena !== true) || result?.sezonskiUvozPodprt !== false ||
      result?.activationEligible !== false || z?.nepopoln !== true ||
      (!pending&&!Array.isArray(result.nastopi)) || !Array.isArray(result.nepripisaniRumeni))
    throw fail('strict report parser did not return a report-only success envelope', 'FUSSBALL_REPORT_ENVELOPE_INVALID')
  if (z.zapisnikId !== fixture.zapisnikId || z.datum !== fixture.datum || z.ura !== fixture.ura || z.krog !== fixture.krog ||
      z.domaci?.ime !== fixture.domaci || z.gostje?.ime !== fixture.gostje || !sameResult(z.rezultat, fixture.rezultat))
    throw fail('parsed report header does not match its scheduled fixture', 'FUSSBALL_REPORT_HEADER_MISMATCH')
}

function reportFailure(fixture, error) {
  const code = typeof error?.code === 'string' && error.code ? error.code : 'FUSSBALL_REPORT_INVALID'
  return { fixture, code, reason: String(error?.message ?? error) }
}

function unscoredCounts(fixtures, asOfDate) {
  const rows = fixtures.filter(fixture => fixture.rezultat === null && !Object.hasOwn(fixture, 'administrativeResult'))
  const out = { total: rows.length, past: 0, current: 0, future: 0, unknownDate: 0 }
  for (const fixture of rows) {
    if (!validDate(fixture.datum)) out.unknownDate++
    else if (fixture.datum < asOfDate) out.past++
    else if (fixture.datum > asOfDate) out.future++
    else out.current++
  }
  return out
}

export async function collectFussballSeason({
  seedUrl,
  staffel,
  season,
  client,
  reportLimit = null,
  asOfDate: requestedAsOfDate,
  onProgress,
  cardPolicy,
} = {}, injectedParsers = {}) {
  if(cardPolicy!==undefined&&cardPolicy!=='community-v1')throw fail('invalid card policy')
  if (requestedAsOfDate !== undefined && !validDate(requestedAsOfDate))
    throw fail('asOfDate must be a valid YYYY-MM-DD calendar date', 'FUSSBALL_AS_OF_DATE_INVALID')
  if (!client || typeof client.read !== 'function' || !STAFFEL.test(staffel ?? '') || !/^20\d{2}\/\d{2}$/.test(season ?? '') ||
      (reportLimit !== null && (!Number.isInteger(reportLimit) || reportLimit < 0)))
    throw fail('client, valid season/staffel and a nonnegative integer sample limit are required')
  const seedStaffel = baseRoundUrl(seedUrl)
  if (seedStaffel !== staffel) throw fail('seed URL does not match the requested staffel')
  const parsers = parserDependencies(injectedParsers)
  const sourceErrors = new WeakSet()
  const readSource = async (url, kind) => {
    let document
    try { document = await client.read(url, kind) } catch (error) {
      if (error && (typeof error === 'object' || typeof error === 'function')) sourceErrors.add(error)
      throw error
    }
    return document
  }
  const readPage = async (url, kind) => {
    const document = await readSource(url, kind)
    return { document, html: text(document.bytes) }
  }
  const loadFonts = makeFontsLoader(readSource, parsers)
  const fontRetryToken = randomUUID()
  const parseWithObservedFonts = (fontIds, cssTemplate, parse) =>
    makeLazyFontParser(loadFonts, fontIds, cssTemplate, fontRetryToken, parse)()
  const progress = async event => { if (onProgress) await onProgress(event) }

  const pageRecords = []
  const { document: seedDocument, html: seedHtml } = await readPage(seedUrl, 'round')
  const capturedAt = seedDocument?.capturedAt
  const capturedAtDate = typeof capturedAt === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(capturedAt) &&
    Number.isFinite(Date.parse(capturedAt)) ? new Date(capturedAt).toISOString().slice(0, 10) : null
  const asOfDate = requestedAsOfDate ?? capturedAtDate
  if (!asOfDate || !validDate(asOfDate)) throw fail('a valid asOfDate or seed capture timestamp is required', 'FUSSBALL_AS_OF_DATE_REQUIRED')
  const seedInfo = parsers.inspectPage(seedHtml, { kind: 'round', staffel })
  validatePageInfo(seedInfo, { kind: 'round', staffel })
  const seedParsed = await parseWithObservedFonts(seedInfo.fontIds, seedInfo.cssTemplate,
    fonts => parsers.parseRound(seedHtml, { fonts, staffel, url: seedUrl }))
  pageRecords.push({ url: seedUrl, parsed: seedParsed })
  await progress({ phase: 'round', round: seedParsed.krog, total: seedParsed.krogi?.length ?? null, url: seedUrl })

  const seedSelector = normalizedSelector(seedParsed.krogi, staffel)
  const seedRound = Number(seedParsed.krog)
  for (const item of seedSelector) {
    if (item.krog === seedRound) continue
    const { html } = await readPage(item.url, 'round')
    const info = parsers.inspectPage(html, { kind: 'round', staffel })
    validatePageInfo(info, { kind: 'round', staffel })
    const parsed = await parseWithObservedFonts(info.fontIds, info.cssTemplate,
      fonts => parsers.parseRound(html, { fonts, staffel, url: item.url }))
    pageRecords.push({ url: item.url, parsed })
    await progress({ phase: 'round', round: parsed.krog, total: seedSelector.length, url: item.url })
  }

  const schedule = assembleFussballSchedule(pageRecords, { season, staffel })
  await progress({ phase: 'schedule-complete', rounds: schedule.rounds.length, fixtures: schedule.fixtures.length })

  const administrativeFixtures = schedule.fixtures.filter(fixture => Object.hasOwn(fixture, 'administrativeResult'))
    .map(fixture => ({fixture, code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED', reason:'Administrative result retained without ordinary played statistics'}))
  const played = schedule.fixtures.filter(fixture => fixture.rezultat !== null)
  const selected = reportLimit == null ? played : played.slice(0, reportLimit)
  const reports = [], rejectedReports = [], pendingReports = []
  const reportSession = createFussballParserSession(readSource, injectedParsers,{cardPolicy,season})
  for (let index = 0; index < selected.length; index++) {
    const fixture = selected[index]
    await progress({ phase: 'report', matchId: fixture.id, index: index + 1, total: selected.length })

    try { const entry=await reportSession.report(fixture);(cardPolicy==='community-v1'&&entry.result.statisticsPending===true?pendingReports:reports).push(entry) }
    catch (error) {
      if (sourceErrors.has(error)) throw error
      rejectedReports.push(reportFailure(fixture,error))
    }
  }

  const unscored = unscoredCounts(schedule.fixtures, asOfDate)
  return {
    version: 1,
    scope: { provider: 'fussball', seedUrl, staffel, season, asOfDate,...(cardPolicy?{cardPolicy}:{}) },
    schedule,
    ...(administrativeFixtures.length ? {administrativeFixtures} : {}),
    reports,
    ...(cardPolicy?{pendingReports,cardEnvelopes:[...reports,...pendingReports].map(e=>e.result.cardEnvelope)}:{}),
    rejectedReports,
    coverage: {
      expectedRounds: schedule.rounds.length,
      capturedRounds: pageRecords.length,
      fixtures: schedule.fixtures.length,
      playedFixtures: played.length,
      ...(administrativeFixtures.length ? {administrativeFixtures:administrativeFixtures.length} : {}),
      attemptedReports: selected.length,
      completeReports: reports.length,
      ...(cardPolicy?{pendingReports:pendingReports.length}:{}),
      rejectedReports: rejectedReports.length,
      sampled: reportLimit !== null && selected.length < played.length,
      unscoredFixtures: unscored,
    },
    activationEligible: false,
  }
}
