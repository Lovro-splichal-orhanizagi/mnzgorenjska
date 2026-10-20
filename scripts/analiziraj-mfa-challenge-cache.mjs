// Fixed, cache-only export for the Malta Challenge League. It cannot fetch.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import mfa, { naslovIzida, naslovPostave, razcleniRazpored, sifraZapisnika, vseTekme, vZapisnik } from './viri/mfa.mjs'

const JOBS = [
  { kind: 'archive', code: '2601248/2026', season: '2025/26', played: 176 },
  { kind: 'current', code: '2601248/2027', season: '2026/27', played: 32 },
]
const CACHE = 'scripts/.predpomnilnik/mfa'
const OUTPUT = 'mfa-challenge-cache-audit-output'
const MAX_FILES = 650
const MAX_BYTES = 16 * 1024 * 1024
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

function safeName(name) {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9._-]+\.json$/.test(name) || name === '.' || name === '..') throw new Error(`unsafe cache filename: ${name}`)
  return name
}

export function copyVerifiedCacheFile({ cacheRoot, outputRoot, file, maxFiles = MAX_FILES, maxBytes = MAX_BYTES, totals = { files: 0, bytes: 0 } }) {
  safeName(file)
  const source = join(cacheRoot, file)
  let stat
  try { stat = lstatSync(source) } catch (e) {
    if (e.code === 'ENOENT') throw new Error(`required cached MFA response missing: ${file}`)
    throw e
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`cached MFA item is not a regular nonsymlink file: ${file}`)
  if (totals.files + 1 > maxFiles || totals.bytes + stat.size > maxBytes) throw new Error('MFA cache audit export exceeds file/byte bound')
  const raw = readFileSync(source)
  const target = join(outputRoot, 'cache', file)
  mkdirSync(dirname(target), { recursive: true })
  try { writeFileSync(target, raw, { flag: 'wx', mode: 0o444 }) } catch (e) {
    if (e.code !== 'EEXIST') throw e
    const existing = lstatSync(target)
    if (!existing.isFile() || existing.isSymbolicLink() || !readFileSync(target).equals(raw)) throw new Error(`existing audit copy differs from source cache: ${file}`)
  }
  const copied = readFileSync(target)
  const result = { file, bytes: raw.length, sha256: sha(raw), copiedBytes: copied.length, copiedSha256: sha(copied) }
  if (result.sha256 !== result.copiedSha256 || result.bytes !== result.copiedBytes) throw new Error(`copied MFA cache hash mismatch: ${file}`)
  totals.files++
  totals.bytes += raw.length
  return { ...result, path: target }
}

export function createCacheReader({ cacheRoot = CACHE, outputRoot = OUTPUT, maxFiles = MAX_FILES, maxBytes = MAX_BYTES } = {}) {
  const totals = { files: 0, bytes: 0 }
  const requests = []
  const read = async (url, file) => {
    const request = { url, file, sha256: null, copiedSha256: null, bytes: null, copiedBytes: null }
    requests.push(request)
    const copied = copyVerifiedCacheFile({ cacheRoot, outputRoot, file, maxFiles, maxBytes, totals })
    const body = readFileSync(copied.path, 'utf8')
    Object.assign(request, copied, { path: undefined })
    return body
  }
  read.requests = requests
  read.totals = totals
  return read
}

function normalizedReport(id, match, resultRaw, lineupRaw) {
  const z = vZapisnik(JSON.parse(resultRaw), JSON.parse(lineupRaw), { id: sifraZapisnika(id), tekma: match })
  if (!z) throw new Error(`${id}: cached result/lineup did not parse as PLAYED`)
  const players = mfa.nastopi(z).map(({ ekipa, ime, st, pozicija, zacetnik, minutaOd, minutaDo, minute, goli, rumeni, rdeci, zgreseneEnajstmetrovke }) => ({
    team: ekipa, name: ime, shirt: st, position: pozicija, started: zacetnik,
    minuteOn: minutaOd, minuteOff: minutaDo, minutes: minute, goals: goli,
    yellows: rumeni, reds: rdeci, missedPenalties: zgreseneEnajstmetrovke,
  }))
  return {
    id: z.zapisnikId, sourceId: String(id), fixture: { date: z.datum, home: match.homeTeam.name, away: match.awayTeam.name, status: match.status, competitionId: String(match.competitionId), startDate: match.startDate },
    sourceUrl: z.url, score: z.rezultat, goalCount: z.goli.length,
    goals: z.goli.map(({ ekipaIdx, ime, st, minuta, avtogol, enajstmetrovka }) => ({ team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, player: ime, shirt: st, minute: minuta, ownGoal: avtogol, penalty: enajstmetrovka })),
    appearances: players.length, players,
    lineups: [z.domaci, z.gostje].map(t => ({ team: t.ime, starters: t.postava.length, goalkeepers: t.postava.filter(p => p.pozicija === 'GK').length })),
    substitutions: z.menjave.map(({ ekipaIdx, minuta, noter, ven }) => ({ team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, minute: minuta, on: noter.ime, off: ven.ime })),
    warnings: z.opozorila,
  }
}

export async function audit({ cacheRoot = CACHE, outputRoot = OUTPUT, maxFiles = MAX_FILES, maxBytes = MAX_BYTES } = {}) {
  globalThis.fetch = () => { throw new Error('MFA Challenge cache audit is offline; network access is forbidden') }
  mkdirSync(outputRoot, { recursive: false })
  const prenesi = createCacheReader({ cacheRoot, outputRoot, maxFiles, maxBytes })
  const inventory = []
  const parsed = []
  for (const job of JOBS) {
    const matches = await vseTekme(job.code, prenesi, { mapa: cacheRoot })
    const rounds = razcleniRazpored(matches)
    const pages = prenesi.requests.filter(r => r.url.includes(`/competitions/2601248/`) && r.url.includes(`season=${job.code.split('/')[1]}`)).map(r => ({ url: r.url, file: r.file, bytes: r.bytes, sha256: r.sha256, itemCount: JSON.parse(readFileSync(join(cacheRoot, r.file), 'utf8')).length }))
    for (const kind of ['pastMatches', 'upcomingMatches']) {
      const group = pages.filter(p => p.url.includes(`/${kind}?`))
      if (!group.length || group.at(-1).itemCount >= 50 || group.slice(0, -1).some(p => p.itemCount !== 50)) throw new Error(`${job.kind}: ${kind} pagination is incomplete or inconsistent`)
    }
    const played = matches.filter(t => t.status === 'PLAYED')
    if (played.length !== job.played) throw new Error(`${job.kind}: expected ${job.played} PLAYED fixtures, found ${played.length}`)
    const upcoming = matches.filter(t => t.status !== 'PLAYED' && Date.parse(t.startDate) > Date.now())
    if (job.kind === 'current') {
      const upcomingPages = pages.filter(r => r.url.includes('/upcomingMatches?'))
      if (upcomingPages.length !== 1 || upcomingPages[0].itemCount >= 50)
        throw new Error('current upcoming pagination was not proven complete by a short first page')
      if (!upcoming.length) throw new Error('current season has no future fixture to establish a current schedule')
      const futureIds = new Set(upcoming.map(t => String(t.id)))
      const futureRounds = rounds.filter(r => r.tekme.some(t => futureIds.has(String(t.mfaId)))).map(r => r.stevilka)
      if (!futureRounds.includes(5)) throw new Error(`current cache does not prove the expected upcoming round 5; found ${futureRounds.join(',')}`)
    }
    inventory.push({ kind: job.kind, code: job.code, season: job.season, sourceHeaders: mfa.glave, sourceGroupIds: [...new Set(matches.map(t => String(t.competitionId)))].sort(), rounds, counts: { fixtures: matches.length, played: played.length, future: upcoming.length }, pages, completeUpcomingPagination: job.kind === 'current' })
    for (const t of played) {
      const id = String(t.id)
      const resultFile = `tekma-${id}-izid.json`
      const lineupFile = `tekma-${id}-postava.json`
      const resultRaw = await prenesi(naslovIzida(id), resultFile, true)
      const lineupRaw = await prenesi(naslovPostave(id), lineupFile, true)
      const row = normalizedReport(id, t, resultRaw, lineupRaw)
      if (row.fixture.status !== 'PLAYED') throw new Error(`${id}: expected a PLAYED source report`)
      parsed.push({ kind: job.kind, season: job.season, ...row, rawFiles: [resultFile, lineupFile] })
    }
  }
  if (parsed.length !== 208) throw new Error(`expected exactly 208 cached played reports, found ${parsed.length}`)
  if (new Set(parsed.map(r => r.sourceId)).size !== 208) throw new Error('duplicate source match IDs across Challenge seasons')
  const catalogs = [...new Map(prenesi.requests.map(r => [r.file, r])).values()].map(({ url, file, bytes, sha256, copiedBytes, copiedSha256 }) => ({ url, file, bytes, sha256, copiedBytes, copiedSha256 }))
  const reportIds = new Set(parsed.map(r => r.sourceId))
  const metadata = []
  for (const id of reportIds) {
    const file = `po-sifri-${id}.json`
    try {
      const raw = readFileSync(join(cacheRoot, file))
      const st = lstatSync(join(cacheRoot, file))
      if (!st.isFile() || st.isSymbolicLink()) throw new Error(`invalid metadata cache item ${file}`)
      const d = JSON.parse(raw)
      metadata.push({ file, bytes: raw.length, sha256: sha(raw), metadata: Object.fromEntries(['id', 'ni', 'competitionId', 'competitionTypeId', 'status'].filter(k => Object.hasOwn(d, k)).map(k => [k, d[k]])) })
      const copied = copyVerifiedCacheFile({ cacheRoot, outputRoot, file, maxFiles, maxBytes, totals: prenesi.totals })
      const { path: _path, ...safe } = copied
      catalogs.push(safe)
    } catch (e) { if (e.code !== 'ENOENT') throw e }
  }
  const manifest = {
    source: 'MFA Malta Football Association public cache (offline parse only)',
    league: { slug: 'mt-challenge', source: 'mfa', source_league_code: '2601248/2027' },
    years: [2026, 2027], requestReads: prenesi.requests.map(({ path: _path, ...r }) => r),
    cacheCatalog: catalogs, poSifriMetadata: metadata,
    limits: { maxFiles, maxBytes, actualFiles: prenesi.totals.files, actualBytes: prenesi.totals.bytes },
    inventory, reports: parsed,
  }
  writeFileSync(join(outputRoot, 'fixture-inventory.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o444 })
  writeFileSync(join(outputRoot, 'touched-catalog.json'), `${JSON.stringify({ files: catalogs, limits: manifest.limits }, null, 2)}\n`, { flag: 'wx', mode: 0o444 })
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await audit()
  console.log(`Audited Challenge cache: ${result.reports.length} played reports, ${result.cacheCatalog.length} cache files, ${result.limits.actualBytes} bytes`)
}
