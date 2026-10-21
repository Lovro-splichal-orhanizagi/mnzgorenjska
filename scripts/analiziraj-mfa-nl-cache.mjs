// Retained-cache evidence only. This module has no database or source transport.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import mfa, { vseTekme, krogiSezone, razcleniRazpored, vZapisnik, naslovIzida, naslovPostave } from './viri/mfa.mjs'
import { assertMfaReportTiming } from './viri/mfa-report-validation.mjs'

const TYPES = { 'mt-nl1': '2601267', 'mt-nl2': '6234492' }
const IDS = { 'mt-nl1': 973, 'mt-nl2': 974 }
const MAX_FILES = 2000
const MAX_BYTES = 64 * 1024 * 1024
const MAX_JSON_BYTES = 2 * 1024 * 1024
export function validateAuditInputs(league, sourceRunId) {
  if (!Object.hasOwn(TYPES, league) || !/^[1-9]\d{0,19}$/.test(String(sourceRunId))) throw Error('NL audit requires mt-nl1/mt-nl2 and a numeric source_run_id')
  return { league, sourceRunId: String(sourceRunId) }
}
export function validateSourceRun(run, id, repository) {
  if (String(run?.id) !== String(id) || run.path !== '.github/workflows/uvoz-lige.yml' || run.head_branch !== 'main' || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.run_attempt !== 1 || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository) throw Error('Source must be a completed first-attempt main uvoz-lige.yml run in this repository')
  return run
}
export function createCacheReader({ cacheRoot = 'scripts/.predpomnilnik/mfa', outputRoot = 'mfa-nl-cache-audit-output', maxFiles = MAX_FILES, maxBytes = MAX_BYTES } = {}) {
  const catalog = new Map(), requests = []
  let bytes = 0
  const read = async (url, requestedFile) => {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(requestedFile)) throw Error(`unsafe cache filename: ${requestedFile}`)
    // Production backfill prefers po-sifri metadata; pass mapa:null to prevent
    // the adapter reading/writing behind this verified, manifested reader.
    const backfill = /^tekma-(\d+)\.json$/.exec(requestedFile)
    let file = requestedFile
    if (backfill) {
      try { lstatSync(join(cacheRoot, `po-sifri-${backfill[1]}.json`)); file = `po-sifri-${backfill[1]}.json` } catch (e) { if (e.code !== 'ENOENT') throw e }
    }
    const path = join(cacheRoot, file)
    let stat
    try { stat = lstatSync(path) } catch (e) { if (e.code === 'ENOENT') throw Error(`required cached MFA response missing: ${file}`); throw e }
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`cache item is not a regular nonsymlink file: ${file}`)
    if (stat.size > MAX_JSON_BYTES || (!catalog.has(file) && (catalog.size >= maxFiles || bytes + stat.size > maxBytes))) throw Error('MFA cache audit exceeds JSON/file/byte bound')
    const raw = readFileSync(path)
    JSON.parse(raw.toString('utf8'))
    const sha256 = createHash('sha256').update(raw).digest('hex')
    if (!catalog.has(file)) {
      mkdirSync(join(outputRoot, 'cache'), { recursive: true })
      writeFileSync(join(outputRoot, 'cache', file), raw, { flag: 'wx', mode: 0o444 })
      catalog.set(file, { file, bytes: raw.length, sha256, mtime: stat.mtime.toISOString() }); bytes += raw.length
    } else if (catalog.get(file).sha256 !== sha256) throw Error(`cache changed during audit: ${file}`)
    requests.push({ url, requestedFile, file })
    return raw.toString('utf8')
  }
  read.catalog = catalog; read.requests = requests
  return read
}
function analyze(match, krog, resultRaw, lineupRaw) {
  const id = `mt${match.id}`, issues = []
  const z = vZapisnik(JSON.parse(resultRaw), JSON.parse(lineupRaw), { id, tekma: match, url: `https://matchcentre.mfa.com.mt/match/${match.id}` })
  if (!z) return { id, issues: ['cached result does not parse as PLAYED'], report: null }
  try { assertMfaReportTiming(z) } catch (e) { issues.push(e.message) }
  issues.push(...z.opozorila)
  if (z.nepopoln) issues.push('incomplete report')
  if (z.kontumacija) issues.push('forfeit report: no individual statistics')
  const players = mfa.nastopi(z)
  for (const p of players) {
    if (!Number.isSafeInteger(p.regSt) || p.regSt <= 0) issues.push(`player identity missing: ${p.ime}`)
    if (!Number.isFinite(p.minute) || p.minute < 0 || p.minute > 90) issues.push(`invalid minutes: ${p.regSt}: ${p.minute}`)
  }
  const teams = [z.domaci, z.gostje].map((team, idx) => {
    const actualMinutes = players.filter(p => p.ekipaIdx === idx).reduce((n, p) => n + p.minute, 0)
    const expectedMinutes = 990 - z.rdeci.filter(r => r.ekipaIdx === idx && Number.isInteger(r.minuta) && players.some(p => p.ekipaIdx === idx && p.regSt === r.regSt)).reduce((n, r) => n + 90 - r.minuta, 0)
    if (!z.nepopoln && !z.kontumacija && actualMinutes !== expectedMinutes) issues.push(`team ${idx} minutes ${actualMinutes}, expected ${expectedMinutes}`)
    return { team: team.ime, starters: team.postava.length, goalkeepers: team.postava.filter(p => p.vratar).length, actualMinutes, expectedMinutes }
  })
  const lineup = JSON.parse(lineupRaw)
  const redEvents = ['homeTeam', 'awayTeam'].flatMap(side => (lineup[side]?.players ?? []).flatMap(p => (p.events ?? []).filter(e => ['RED', 'SECOND_YELLOW'].includes(e.type)).map(e => ({ team: side === 'homeTeam' ? z.domaci.ime : z.gostje.ime, type: e.type, eventId: e.id, sourcePlayerId: e.playerId, player: e.playerName ?? p.name, minute: e.time ?? null }))))
  return { id, krog, issues: [...new Set(issues)], teams, players: players.map(p => ({ team: p.ekipa, name: p.ime, shirt: p.st, sourcePlayerId: p.regSt, regSt: p.regSt, position: p.pozicija, started: p.zacetnik, minuteOn: p.minutaOd, minuteOff: p.minutaDo, minutes: p.minute, goals: p.goli, yellows: p.rumeni, reds: p.rdeci, missedPenalties: p.zgreseneEnajstmetrovke })), report: z, score: z.rezultat, goals: z.goli.map(g => ({ team: g.ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, player: g.ime, shirt: g.st, sourcePlayerId: g.regSt, regSt: g.regSt, minute: g.minuta, ownGoal: g.avtogol, penalty: g.enajstmetrovka })), sourceUrl: z.url, goalCount: z.goli.length, lineups: teams, warnings: z.opozorila, redEvents }
}
export async function audit({ league, sourceRunId, cacheRoot = 'scripts/.predpomnilnik/mfa', outputRoot = 'mfa-nl-cache-audit-output', maxFiles = MAX_FILES, maxBytes = MAX_BYTES } = {}) {
  validateAuditInputs(league, sourceRunId)
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw Error('MFA NL cache audit is offline; network forbidden') }
  try {
    mkdirSync(outputRoot, { recursive: false })
    const read = createCacheReader({ cacheRoot, outputRoot, maxFiles, maxBytes }), inventory = [], reports = []
    const seen = new Set()
    for (const [year, kind] of [[2026, 'archive'], [2027, 'current']]) {
      const code = `${TYPES[league]}/${year}`, before = read.requests.length
      const matches = await vseTekme(code, read, { mapa: null })
      const pages = read.requests.slice(before).filter(r => /\/(pastMatches|upcomingMatches)\?/.test(r.url)).map(r => ({ ...r, count: JSON.parse(readFileSync(join(outputRoot, 'cache', r.file))).length }))
      for (const type of ['pastMatches', 'upcomingMatches']) {
        const counts = pages.filter(p => p.url.includes(`/${type}?`)).map(p => p.count)
        if (!counts.length || counts.at(-1) >= 50 || counts.slice(0, -1).some(n => n !== 50)) throw Error(`${code}: ${type} inventory pagination incomplete`)
      }
      if (!matches.length || (kind === 'archive' && !matches.some(t => t.status === 'PLAYED'))) throw Error(`${code}: missing fixture inventory`)
      inventory.push({ kind, code, season: `${year - 1}/${String(year).slice(2)}`, completeUpcomingPagination: true, matches, rounds: razcleniRazpored(matches), pages, counts: { fixtures: matches.length, played: matches.filter(t => t.status === 'PLAYED').length } })
      for (const { krog, t } of krogiSezone(matches)) {
        if (seen.has(String(t.id))) throw Error(`duplicate fixture identity: ${t.id}`)
        seen.add(String(t.id))
        if (t.status !== 'PLAYED') continue
        const resultRaw = await read(naslovIzida(t.id), `tekma-${t.id}-izid.json`)
        const lineupRaw = await read(naslovPostave(t.id), `tekma-${t.id}-postava.json`)
        let row
        try { row = analyze(t, krog, resultRaw, lineupRaw) } catch (e) { row = { id: `mt${t.id}`, issues: [`report analysis failed: ${e.message}`] } }
        reports.push({ kind, season: `${year - 1}/${String(year).slice(2)}`, sourceId: String(t.id), fixture: { date: row.report?.datum, home: t.homeTeam.name, away: t.awayTeam.name, status: t.status, competitionId: String(t.competitionId), startDate: t.startDate }, ...row })
      }
    }
    const issues = reports.some(r => r.issues.length)
    const provenance = { league, sourceRunId, source: 'retained MFA cache; offline only', issues }
    const save = (file, value) => {
      const body = JSON.stringify(value, null, 2) + '\n'
      if (Buffer.byteLength(body) > MAX_BYTES) throw Error('audit artifact JSON exceeds byte bound')
      writeFileSync(join(outputRoot, file), body, { flag: 'wx' })
    }
    save('fixture-inventory.json', { ...provenance, league: { id: IDS[league], slug: league, source: 'mfa', source_league_code: `${TYPES[league]}/2027` }, inventory, reports, cacheCatalog: [...read.catalog.values()], limits: { maxFiles, maxBytes, actualFiles: read.catalog.size, actualBytes: [...read.catalog.values()].reduce((n, f) => n + f.bytes, 0) } })
    save('report-analysis.json', { ...provenance, reports })
    save('cache-manifest.json', { ...provenance, files: [...read.catalog.values()], requests: read.requests, limits: { maxFiles, maxBytes, maxJsonBytes: MAX_JSON_BYTES } })
    return { ...provenance, inventory, reports }
  } finally { globalThis.fetch = originalFetch }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] === '--verify-run') {
    validateAuditInputs(process.env.AUDIT_LEAGUE, process.env.SOURCE_RUN_ID)
    validateSourceRun(JSON.parse(readFileSync(process.argv[3])), process.env.SOURCE_RUN_ID, process.env.GITHUB_REPOSITORY)
  } else {
    const result = await audit({ league: process.env.AUDIT_LEAGUE, sourceRunId: process.env.SOURCE_RUN_ID })
    console.log(`${result.league}: ${result.reports.length} reports; issues=${result.issues}; evidence saved`)
  }
}
