import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

export const OWN_URL = 'https://slff.eu/'
export const MAX_BYTES = 4 * 1024 * 1024
const SAFE_CODES = new Set(['EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ABORT_ERR', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'BODY_LIMIT'])

export function fixedRequestOptions() {
  return { headers: { 'Cache-Control': 'no-cache' }, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) }
}

export function safeError(error) {
  const allowed = value => typeof value === 'string' && SAFE_CODES.has(value) ? value : null
  return { name: ['TypeError', 'Error', 'AbortError'].includes(error?.name) ? error.name : 'Error', code: allowed(error?.code), causeCode: allowed(error?.cause?.code) }
}

export async function readBoundedResponse(response, elapsedMs) {
  const hash = createHash('sha256')
  let bytes = 0
  let markerCarry = ''
  let markerCount = 0
  let marker = null
  const markerPattern = /<meta\s+name=["']slff-commit["']\s+content=["']([0-9a-f]{40})["']\s*\/?\s*>/gi
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > MAX_BYTES) throw Object.assign(new Error('response body limit'), { code: 'BODY_LIMIT' })
    hash.update(chunk)
    const text = markerCarry + chunk.toString('utf8')
    for (const match of text.matchAll(markerPattern)) {
      if (match.index + match[0].length > markerCarry.length) {
        markerCount += 1
        marker = match[1]
      }
    }
    markerCarry = text.slice(-256)
  }
  return { status: response.status, ok: response.status >= 200 && response.status < 300, bytes, sha256: hash.digest('hex'), markerCount, marker: markerCount === 1 ? marker : null, elapsedMs }
}

export async function ownFetch(fetchImpl = globalThis.fetch) {
  const started = Date.now()
  try {
    const response = await fetchImpl(OWN_URL, fixedRequestOptions())
    return await readBoundedResponse(response, Date.now() - started)
  } catch (error) {
    return { status: null, ok: false, bytes: null, sha256: null, markerCount: 0, marker: null, elapsedMs: Date.now() - started, error: safeError(error) }
  }
}

function gh(path) {
  const output = execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 })
  return JSON.parse(output)
}

function verifyRunAndMain() {
  const repo = 'Lovro-splichal-orhanizagi/mnzgorenjska'
  const runId = process.env.GITHUB_RUN_ID
  const head = process.env.GITHUB_SHA
  if (process.env.GITHUB_REF !== 'refs/heads/codex-g9-served-fetch-diagnostic-20261030' || process.env.GITHUB_RUN_ATTEMPT !== '1' || !/^[0-9]+$/.test(runId ?? '') || !/^[0-9a-f]{40}$/.test(head ?? '')) throw new Error('workflow identity gate')
  const run = gh(`repos/${repo}/actions/runs/${runId}`)
  const root = actor => actor?.id === 25134229 && actor?.login === 'nejcar20'
  if (String(run.id) !== runId || run.run_attempt !== 1 || run.head_sha !== head || run.head_branch !== 'codex-g9-served-fetch-diagnostic-20261030' || run.event !== 'workflow_dispatch' || run.path !== '.github/workflows/ci.yml' || run.status !== 'in_progress' || run.conclusion !== null || run.repository?.full_name !== repo || run.head_repository?.full_name !== repo || !root(run.actor) || !root(run.triggering_actor)) throw new Error('actual root diagnostic run required')
  const branch = gh(`repos/${repo}/branches/main`)
  if (branch?.name !== 'main' || branch.commit?.sha !== 'a760cfaea30c458d38886273f65f232fedd08edf') throw new Error('actual expected main required')
  return { runId, diagnosticSha: head, mainSha: branch.commit.sha, rootActor: true, rootTrigger: true }
}

async function freshProcessFetch() {
  const source = `import { ownFetch } from ${JSON.stringify(new URL(import.meta.url).href)}; console.log(JSON.stringify(await ownFetch()))`
  try {
    const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'TEMP', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]))
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 40000, maxBuffer: 8192, env })
    return JSON.parse(stdout)
  } catch (error) {
    return { status: null, ok: false, bytes: null, sha256: null, markerCount: 0, marker: null, elapsedMs: null, error: safeError(error) }
  }
}

export async function runDiagnostic() {
  const identity = verifyRunAndMain()
  const before = await ownFetch()
  const wait = new Int32Array(new SharedArrayBuffer(4))
  const blockStarted = Date.now()
  Atomics.wait(wait, 0, 0, 430000)
  const blockElapsedMs = Date.now() - blockStarted
  const after = await ownFetch()
  const fresh = await freshProcessFetch()
  return { schemaVersion: 1, kind: 'g9-served-fetch-transport-diagnostic', classification: 'SYNTHETIC_SYNC_BLOCK_NOT_CAUSAL_REPRODUCTION', identity, request: { urlFixed: true, cacheControlNoCache: true, credentialsOmit: true, redirectError: true, timeoutMs: 30000, maxBodyBytes: MAX_BYTES }, syntheticBlock: { requestedMs: 430000, elapsedMs: blockElapsedMs }, before, after, freshProcess: fresh, flags: { sourceReplay: false, providerHttp: false, database: false, nativeAction: false, productionWrite: false } }
}

if (process.argv[2] === 'fresh-fetch') {
  ownFetch().then(result => process.stdout.write(JSON.stringify(result) + '\n')).catch(() => process.exitCode = 1)
} else if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runDiagnostic().then(result => process.stdout.write(JSON.stringify(result) + '\n')).catch(error => {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, kind: 'g9-served-fetch-transport-diagnostic', status: 'HOLD', error: safeError(error), flags: { sourceReplay: false, providerHttp: false, database: false, nativeAction: false, productionWrite: false } }) + '\n')
    process.exitCode = 1
  })
}
