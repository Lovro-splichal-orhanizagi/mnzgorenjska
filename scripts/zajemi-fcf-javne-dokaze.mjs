import { lstatSync, fstatSync, mkdirSync, openSync, closeSync, writeFileSync, unlinkSync, readdirSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { prenesiSPonovitvami } from './prenos.mjs'
import vir, { PREMOR_MS, jeIzziv, vrstaStrani, glavaStrani } from './viri/fcf.mjs'

const IDS = Object.freeze(['4109388', '4109643', '4109649', '4116202', '4116215', '4118352', '4118358'])
const EXPECTED = Object.freeze([['SEGONA CATALANA', 'GRUP 1'], ['SEGONA CATALANA', 'GRUP 2'], ['SEGONA CATALANA', 'GRUP 2'], ['TERCERA CATALANA', 'GRUP 2'], ['TERCERA CATALANA', 'GRUP 2'], ['TERCERA CATALANA', 'GRUP 9'], ['TERCERA CATALANA', 'GRUP 9']])
const OUTPUT = 'fcf-javni-dokazi'
const MAX_BYTES = 2 * 1024 * 1024
const REASONS = new Set(['redirect', 'source-refusal', 'http-status', 'challenge', 'missing-acta', 'wrong-page', 'invalid-header', 'wrong-season', 'wrong-group', 'empty-body', 'network-error', 'timeout', 'body-too-large', 'output-write-failed'])
const SHA = /^[a-f0-9]{40}$/
const ID = /^[1-9][0-9]{0,19}$/
class AuditFailure extends Error {}
const fail = reason => { throw new AuditFailure(reason) }
const utc = () => new Date().toISOString()

// Never follow a symlink, including an existing ancestor above the checkout.
function inspect(path, directory = false) {
  let current = parse(path).root
  const parts = relative(current, path).split(sep).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i])
    let stat
    try { stat = lstatSync(current) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
    if (stat.isSymbolicLink() || ((i < parts.length - 1 || directory) && !stat.isDirectory())) fail('unsafe-output')
    if (i === parts.length - 1) return stat
  }
  return lstatSync(current)
}

function metadataValid(env) {
  const factor = env.SLFF_PREMOR_FAKTOR
  return env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' &&
    env.GITHUB_REF === 'refs/heads/main' && SHA.test(env.GITHUB_SHA ?? '') && ID.test(env.GITHUB_RUN_ID ?? '') && env.GITHUB_RUN_ATTEMPT === '1' &&
    (factor === undefined || (typeof factor === 'string' && factor.trim() !== '' && Number.isFinite(Number(factor)) && Number(factor) >= 1 && Number(factor) * PREMOR_MS <= 2_147_483_647))
}

function safeHeaders(headers) {
  const type = (headers.get('content-type') ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const encoding = (headers.get('content-encoding') ?? '').toLowerCase().trim()
  const length = headers.get('content-length') ?? ''
  const date = name => {
    const value = headers.get(name)
    if (!value || value.length > 64) return null
    const time = Date.parse(value)
    return Number.isFinite(time) ? new Date(time).toISOString() : null
  }
  return {
    contentType: /^(text\/html|application\/xhtml\+xml)(; ?charset=(utf-8|iso-8859-1))?$/.test(type) ? type : null,
    contentEncoding: ['identity', 'gzip', 'br', 'deflate', 'zstd'].includes(encoding) ? encoding : null,
    contentLength: /^\d{1,16}$/.test(length) && Number.isSafeInteger(Number(length)) ? Number(length) : null,
    date: date('date'), lastModified: date('last-modified'),
  }
}

// Cancellation is best effort: status and timeout take priority over stream errors.
function cancel(body) { try { void body?.cancel().catch(() => {}) } catch { /* No error details leave this boundary. */ } }
async function boundedBody(response, signal) {
  signal.throwIfAborted()
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader(), buffer = Buffer.allocUnsafe(MAX_BYTES)
  let length = 0, rejectAbort
  const aborted = new Promise((_, reject) => { rejectAbort = reject })
  const abort = () => { rejectAbort(signal.reason); try { void reader.cancel().catch(() => {}) } catch { /* Best effort. */ } }
  signal.addEventListener('abort', abort, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const part = await Promise.race([reader.read(), aborted])
      signal.throwIfAborted()
      if (part.done) break
      if (length + part.value.byteLength > MAX_BYTES) {
        try { void reader.cancel().catch(() => {}) } catch { /* Best effort. */ }
        fail('body-too-large')
      }
      // Copy immediately: an upstream stream may reuse its chunk buffer.
      Buffer.from(part.value).copy(buffer, length)
      length += part.value.byteLength
    }
    return buffer.subarray(0, length)
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock() }
}

function validate(bytes, expected) {
  // Original entity bytes are retained separately; decoding is only for validation.
  const text = bytes.toString('utf8')
  if (!text.trim()) fail('empty-body')
  if (jeIzziv(text)) fail('challenge')
  const kind = vrstaStrani(text)
  if (kind === 'ni') fail('missing-acta')
  if (kind !== 'zapisnik') fail('wrong-page')
  let header
  try { header = glavaStrani(text) } catch { fail('invalid-header') }
  const plausible = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160 && !/[\x00-\x1f\x7f]/.test(value)
  if (!header || !['domaci', 'gostje', 'tekmovanje', 'skupina', 'sezona'].every(key => plausible(header[key]))) fail('invalid-header')
  if (header.sezona !== '2026/27') fail('wrong-season')
  if (header.tekmovanje !== expected[0] || header.skupina !== expected[1]) fail('wrong-group')
  return { pageKind: kind, pageHeader: { domaci: header.domaci, gostje: header.gostje, tekmovanje: header.tekmovanje, skupina: header.skupina, sezona: header.sezona, krog: Number.isInteger(header.krog) && header.krog > 0 && header.krog <= 100 ? header.krog : null } }
}

/** Fixed one-attempt public audit. fetchFn replaces native fetch only in offline tests. */
export async function zajemi({ root, env = process.env, fetchFn = (...args) => fetch(...args) } = {}) {
  const finish = (status, artifactReady = false) => ({ status, artifactReady })
  // Check the actual inherited pacing too: the shared module reads it at import.
  if (!metadataValid(env) || !metadataValid({ ...env, SLFF_PREMOR_FAKTOR: process.env.SLFF_PREMOR_FAKTOR })) return finish(1)
  let output, owned
  try {
    if (typeof root !== 'string' || !isAbsolute(root) || resolve(root) !== root || !inspect(root, true)) return finish(1)
    output = join(root, OUTPUT)
    if (inspect(output)) return finish(1)
    mkdirSync(output, { mode: 0o700 }); owned = inspect(output, true)
  } catch { return finish(1) }
  const files = IDS.map(id => ({ id, requestedURL: `https://www.fcf.cat/ca/competicio/acta/${id}`, status: 'not-attempted' }))
  const manifest = {
    schemaVersion: 1, audit: 'fixed-seven-fcf-public-reports', byteSemantics: 'http-decoded-entity-bytes-without-text-reencoding',
    sourceCommit: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT,
    budget: 7, attemptedCount: 0, startedUTC: utc(), endedUTC: null, state: 'running', reason: null, files,
  }
  const written = new Map()
  let outputSafe = true
  const checkOwned = () => {
    if (!outputSafe) fail('output-write-failed')
    const stat = inspect(output, true)
    if (!stat || stat.dev !== owned.dev || stat.ino !== owned.ino) fail('output-write-failed')
    const names = readdirSync(output)
    if (names.length !== written.size) fail('output-write-failed')
    for (const name of names) {
      const expected = written.get(name), actual = inspect(join(output, name))
      if (!expected || !actual?.isFile() || ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].some(key => actual[key] !== expected[key])) fail('output-write-failed')
    }
  }
  const write = (name, bytes) => {
    checkOwned()
    let fd
    try {
      fd = openSync(join(output, name), 'wx', 0o600)
      written.set(name, null)
      writeFileSync(fd, bytes)
      written.set(name, fstatSync(fd))
      closeSync(fd); fd = undefined
    } catch {
      if (fd !== undefined) {
        try { closeSync(fd) } catch { outputSafe = false }
        fd = undefined
        try {
          const stat = inspect(output, true)
          if (!stat || stat.dev !== owned.dev || stat.ino !== owned.ino) fail('output-write-failed')
          unlinkSync(join(output, name)); written.delete(name)
        } catch { outputSafe = false }
      }
      fail('output-write-failed')
    }
  }
  for (const [i, row] of files.entries()) {
    row.status = 'attempting'; row.attemptUTC = utc(); manifest.attemptedCount++
    let bytes
    try {
      await prenesiSPonovitvami(row.requestedURL, {
        glave: vir.glave, premorMs: PREMOR_MS, zamiki: [], casovnaOmejitevMs: 90000, log: () => {},
        fetchFn: async (url, init) => {
          checkOwned()
          const response = await fetchFn(url, { ...init, method: 'GET', redirect: 'manual' })
          row.captureUTC = utc(); row.httpStatus = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null
          row.responseHeaders = safeHeaders(response.headers)
          if (response.status !== 200 || response.redirected) {
            cancel(response.body)
            fail(response.redirected || response.status >= 300 && response.status < 400 ? 'redirect' : [403, 429].includes(response.status) ? 'source-refusal' : 'http-status')
          }
          bytes = await boundedBody(response, init.signal)
          return response
        },
      })
      const summary = validate(bytes, EXPECTED[i])
      const artifactFile = `acta-${row.id}.html`
      write(artifactFile, bytes)
      Object.assign(row, summary, { status: 'captured', identity: 'fixed-no-redirect-http-receipt', artifactFile, byteCount: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
    } catch (error) {
      row.status = 'failed'; row.httpStatus ??= null
      row.reason = ['AbortError', 'TimeoutError'].includes(error?.name) ? 'timeout' : error instanceof AuditFailure && REASONS.has(error.message) ? error.message : 'network-error'
      manifest.state = 'failed'; manifest.reason = row.reason
      break
    }
  }
  if (manifest.state === 'running') manifest.state = 'complete'
  manifest.endedUTC = utc()
  try {
    write('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
    checkOwned()
    return finish(manifest.state === 'complete' ? 0 : 1, true)
  } catch { return finish(1) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) process.exitCode = 1
  else {
    const result = await zajemi({ root: process.cwd() })
    process.exitCode = result.status
    // An invocation-owned safely written manifest is the sole upload authority.
    if (result.artifactReady && process.env.GITHUB_OUTPUT) {
      try { appendFileSync(process.env.GITHUB_OUTPUT, 'evidence_ready=true\n') } catch { process.exitCode = 1 }
    }
  }
}
