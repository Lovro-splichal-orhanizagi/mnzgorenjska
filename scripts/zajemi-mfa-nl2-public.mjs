// Ephemeral, fixed NL II public evidence capture. No database dependencies.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, writeFileSync, utimesSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import mfa, { vseTekme, naslovIzida, naslovPostave, jeZavrnitev } from './viri/mfa.mjs'
import { audit } from './analiziraj-mfa-nl-cache.mjs'

const BRANCH = 'codex/mfa-nl-public-capture-20261021'
const MAX_REQUESTS = 550
const MAX_BODY = 2 * 1024 * 1024
const MAX_BYTES = 64 * 1024 * 1024
const MAX_FILES = 2000
const WEEK = 7 * 86400000
const sha = raw => createHash('sha256').update(raw).digest('hex')
const save = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
export function assertCapturePin(env = process.env) {
  if (!/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA ?? '') || env.EXPECTED_SHA !== env.GITHUB_SHA || env.GITHUB_REF !== `refs/heads/${BRANCH}` || env.GITHUB_RUN_ATTEMPT !== '1') throw Error('Capture requires the reviewed branch SHA and first run attempt')
}
export function validateResumeRun(run, id, repository, expectedSha) {
  if (!/^[1-9]\d{0,19}$/.test(String(id)) || String(run?.id) !== String(id) || run.path !== '.github/workflows/razdeli-zlite-igralce.yml' || run.head_branch !== BRANCH || run.head_sha !== expectedSha || run.status !== 'completed' || run.run_attempt !== 1 || run.event !== 'workflow_dispatch' || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository) throw Error('Resume requires an exact completed first-attempt capture run on the same reviewed branch SHA')
}
export function assertCaptureURL(input) {
  const u = new URL(input)
  if (u.origin !== 'https://api.mfa.com.mt' || u.username || u.password || u.hash) throw Error('Capture URL outside fixed MFA origin')
  const fixture = /^\/api\/matches\/[1-9]\d{0,11}(?:\/(result|lineup))?$/.test(u.pathname)
  if (fixture && !u.search) return u
  const competition = /^\/api\/competitions\/6234492\/(standings|pastMatches|upcomingMatches)$/.exec(u.pathname)
  if (competition) {
    const expected = competition[1] === 'standings' ? ['season'] : ['season', 'pageSize', 'page']
    if ([...u.searchParams.keys()].length === expected.length && expected.every(k => u.searchParams.has(k)) && ['2026', '2027'].includes(u.searchParams.get('season')) && (expected.length === 1 || (u.searchParams.get('pageSize') === '50' && /^([1-9]|[1-3][0-9]|40)$/.test(u.searchParams.get('page'))))) return u
  }
  throw Error('Capture URL outside fixed NL II endpoints/seasons')
}
async function boundedBody(response) {
  const chunks = [], reader = response.body?.getReader()
  let bytes = 0, truncated = false, error = null
  if (reader) try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const keep = Math.min(value.length, MAX_BODY - bytes)
      if (keep) { chunks.push(Buffer.from(value.subarray(0, keep))); bytes += keep }
      if (keep < value.length) { truncated = true; await reader.cancel(); break }
    }
  } catch (e) { error = e } finally { reader.releaseLock() }
  return { raw: Buffer.concat(chunks), truncated, error }
}
export function createCaptureReader({ cacheRoot = 'scripts/.predpomnilnik/mfa', outputRoot = 'mfa-nl2-public-capture-output', now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)), fetchFn = globalThis.fetch, maxRequests = MAX_REQUESTS, maxBytes = MAX_BYTES } = {}) {
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > MAX_REQUESTS) throw Error('Capture request budget must be at most 550')
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw Error('Capture total byte budget must be a positive integer')
  maxBytes = Math.min(maxBytes, MAX_BYTES)
  mkdirSync(cacheRoot, { recursive: true }); mkdirSync(outputRoot, { recursive: true })
  mkdirSync(join(outputRoot, 'cache'), { recursive: true }); mkdirSync(join(outputRoot, 'responses'), { recursive: true })
  const state = { league: 'mt-nl2', codes: ['6234492/2026', '6234492/2027'], complete: false, denied: false, maxRequests, maxBytes, cacheHits: 0, requests: [], reads: [] }
  const catalog = new Map(), matches = new Map()
  let stopped = null, exportedBytes = 0
  const receipt = join(cacheRoot, 'capture-status.json')
  const persist = (writeReceipt = true) => {
    const status = { ...state, requests: undefined, reads: undefined, actualRequests: state.requests.length, files: catalog.size, bytes: exportedBytes }
    save(join(outputRoot, 'capture-status.json'), status)
    if (writeReceipt) save(receipt, status)
    save(join(outputRoot, 'capture-ledger.json'), state)
    save(join(outputRoot, 'cache-manifest.json'), { files: [...catalog.values()], maxFiles: MAX_FILES, maxBytes, exportedBytes, maxBodyBytes: MAX_BODY })
  }
  let receiptStat = null
  try { receiptStat = lstatSync(receipt) } catch (e) { if (e.code !== 'ENOENT') throw e }
  if (receiptStat) {
    if (!receiptStat.isFile() || receiptStat.isSymbolicLink() || receiptStat.size > MAX_BODY) throw Error('Unsafe capture receipt')
    const prior = JSON.parse(readFileSync(receipt))
    if (prior.denied === true) {
      state.denied = true; state.error = 'Prior capture was refused; no automatic resume or further source access'
      persist(false)
      throw Error(state.error)
    }
  }
  function assertByteBudget(bytes) {
    if (exportedBytes + bytes > maxBytes) throw Error('Capture total export byte bound exceeded; response body may not be retained')
  }
  function copy(file, raw, mtime, generated = false) {
    if (!catalog.has(file)) {
      if (catalog.size >= MAX_FILES) throw Error('Capture export file bound exceeded')
      assertByteBudget(raw.length)
      writeFileSync(join(outputRoot, 'cache', file), raw)
      utimesSync(join(outputRoot, 'cache', file), mtime, mtime)
      catalog.set(file, { file, bytes: raw.length, sha256: sha(raw), mtime: new Date(mtime).toISOString(), generated }); exportedBytes += raw.length
    } else if (catalog.get(file).sha256 !== sha(raw)) throw Error(`Cache body changed within capture: ${file}`)
  }
  const read = async (url, requestedFile) => {
    if (stopped) throw Error(`Capture stopped: ${stopped}`)
    assertCaptureURL(url)
    if (!/^[A-Za-z0-9_-]+\.json$/.test(requestedFile)) throw Error('Unsafe capture cache filename')
    const metadata = /^tekma-(\d+)\.json$/.exec(requestedFile), report = /^tekma-(\d+)-(izid|postava)\.json$/.exec(requestedFile)
    if (report && !matches.has(report[1])) throw Error('Report is not in the fixed source fixture inventory')
    const file = metadata ? `po-sifri-${metadata[1]}.json` : requestedFile, path = join(cacheRoot, file)
    try {
      let stat = null
      try { stat = lstatSync(path) } catch (e) { if (e.code !== 'ENOENT') throw e }
      if (stat) {
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BODY) throw Error(`Unsafe cached source body: ${file}`)
        const raw = readFileSync(path), data = JSON.parse(raw)
        if (mfa.jeIzziv(raw) || mfa.jePrijava(raw)) throw mfa.zavrnitev('cached challenge/auth response')
        const match = report ? matches.get(report[1]) : data
        const oldPlayed = match?.status === 'PLAYED' && Number.isFinite(Date.parse(match.startDate)) && now() - Date.parse(match.startDate) > WEEK
        if ((metadata && [400, 404].includes(data.ni)) || (oldPlayed && (metadata || report))) {
          copy(file, raw, stat.mtime, metadata && data.ni != null); state.cacheHits++
          state.reads.push({ url, requestedFile, file, cacheHit: true, sha256: sha(raw) }); persist()
          return raw.toString('utf8')
        }
      }
      if (exportedBytes >= maxBytes) throw Error('Capture total export byte bound exhausted before next request')
      if (state.requests.length >= maxRequests) throw Error(`Capture request budget ${maxRequests} exhausted`)
      await sleep(3000)
      const row = { index: state.requests.length + 1, url, requestedFile, file, method: 'GET', cacheHit: false, startedAt: new Date(now()).toISOString(), status: null, bodySha256: null, bodyBytes: 0, completeBody: false, bodyRetained: false, refusal: false }
      state.requests.push(row); persist()
      let response
      try {
        response = await fetchFn(url, { method: 'GET', headers: mfa.glave, redirect: 'manual', signal: AbortSignal.timeout(30000) })
        row.status = response.status
        const { raw, truncated, error: bodyError } = await boundedBody(response)
        row.bodySha256 = sha(raw); row.bodyBytes = raw.length; row.completeBody = !truncated && !bodyError
        const failBody = () => {
          assertByteBudget(raw.length)
          writeFileSync(join(outputRoot, 'responses', `${row.index}.bin`), raw)
          exportedBytes += raw.length; row.bodyRetained = true; row.bodyFile = `responses/${row.index}.bin`
        }
        const body = raw.toString('utf8')
        if (jeZavrnitev(response.status) || mfa.jeIzziv(body) || mfa.jePrijava(body)) {
          const refusal = mfa.zavrnitev(`capture response refused at ${url}`, response.status)
          try { failBody() } catch (e) { refusal.message += `; ${e.message}` }
          throw refusal
        }
        if (truncated) { failBody(); throw Error('Source body exceeds byte bound; retained prefix only') }
        if (bodyError) { failBody(); throw bodyError }
        if (!response.ok) {
          failBody()
          if (metadata && [400, 404].includes(response.status)) {
            const sentinel = Buffer.from(JSON.stringify({ ni: response.status }))
            assertByteBudget(sentinel.length)
            writeFileSync(path, sentinel); copy(file, sentinel, lstatSync(path).mtime, true)
            row.absentMetadata = true
            const error = Error(`Expected metadata absence HTTP${response.status}`); error.status = response.status; error.expectedMetadataAbsence = true; throw error
          }
          const error = Error(`Capture HTTP${response.status}`); error.status = response.status; throw error
        }
        try { JSON.parse(body) } catch { failBody(); throw Error('Source response is not JSON') }
        assertByteBudget(raw.length)
        writeFileSync(path, raw); copy(file, raw, lstatSync(path).mtime)
        row.bodyRetained = true
        row.bodyFile = `cache/${file}`
        state.reads.push({ url, requestedFile, file, cacheHit: false, sha256: sha(raw) })
        return body
      } catch (e) { row.error = e.message; row.refusal = !!e.zavrnitev; throw e }
      finally { row.finishedAt = new Date(now()).toISOString(); persist() }
    } catch (e) {
      if (!e.expectedMetadataAbsence) { stopped = e.message; state.denied ||= !!e.zavrnitev; state.error = e.message }
      persist(); throw e
    }
  }
  read.state = state; read.persist = persist; read.matches = matches
  return read
}
export async function capture(options = {}) {
  const { cacheRoot = 'scripts/.predpomnilnik/mfa', outputRoot = 'mfa-nl2-public-capture-output', runId = process.env.GITHUB_RUN_ID } = options
  if (!/^[1-9]\d{0,19}$/.test(String(runId))) throw Error('Capture requires numeric run ID')
  const read = createCaptureReader({ ...options, cacheRoot, outputRoot })
  Object.assign(read.state, { runId: String(runId), reviewedSha: process.env.EXPECTED_SHA ?? null, resumeSourceRunId: process.env.SOURCE_RUN_ID || null })
  read.persist()
  try {
    for (const code of ['6234492/2026', '6234492/2027']) {
      const fixtures = await vseTekme(code, read, { mapa: null })
      if (!fixtures.length) throw Error(`${code}: fixture inventory empty`)
      for (const match of fixtures) {
        if (read.matches.has(String(match.id))) throw Error(`Duplicate fixture source identity: ${match.id}`)
        read.matches.set(String(match.id), match)
        if (match.status !== 'PLAYED') continue
        await read(naslovIzida(match.id), `tekma-${match.id}-izid.json`)
        await read(naslovPostave(match.id), `tekma-${match.id}-postava.json`)
      }
    }
    await audit({ league: 'mt-nl2', sourceRunId: String(runId), cacheRoot, outputRoot: join(outputRoot, 'audit') })
    read.state.complete = true
    return read.state
  } catch (e) { read.state.error = e.message; read.state.denied ||= !!e.zavrnitev; throw e }
  finally { read.persist() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertCapturePin()
  if (process.argv[2] === '--verify-pin') console.log('Reviewed capture pin verified; no source access')
  else if (process.argv[2] === '--verify-resume') validateResumeRun(JSON.parse(readFileSync(process.argv[3])), process.env.SOURCE_RUN_ID, process.env.GITHUB_REPOSITORY, process.env.EXPECTED_SHA)
  else await capture()
}
