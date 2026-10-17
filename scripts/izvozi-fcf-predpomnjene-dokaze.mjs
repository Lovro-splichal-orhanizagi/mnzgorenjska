import { constants, lstatSync, openSync, fstatSync, readSync, closeSync, mkdirSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const KEYS = Object.freeze(['zapisniki-ES-k1od1-39053159080-1', 'zapisniki-es-ct-elit-39067015141'])
const IDS = Object.freeze(['4109388', '4109643', '4109649', '4116202', '4116215', '4118352', '4118358'])
const OUTPUT = 'fcf-predpomnjeni-dokazi'
const MAX_BYTES = 2 * 1024 * 1024
const OPTION_NAMES = new Set(['root', 'output', 'requestedKey', 'matchedKey', 'cacheHit', 'restoreOutcome', 'extractionCommit', 'runId', 'runAttempt', 'cliValid'])
const SHA = /^[a-f0-9]{40}$/
const POSITIVE_ID = /^[1-9][0-9]{0,19}$/
const safeKey = key => KEYS.includes(key) ? key : null
const safeHit = hit => ['true', 'false', ''].includes(hit) ? hit : null
const safeOutcome = outcome => ['success', 'failure', 'cancelled', 'skipped'].includes(outcome) ? outcome : null
function fail(reason) { throw new Error(reason) }

// Walk every existing component, including ancestors of a missing member.
// The workflow owns its checkout; no recursive discovery or realpath-following
// of restored cache entries is used.
function inspect(path, directory = false) {
  const root = parse(path).root
  const parts = relative(root, path).split(sep).filter(Boolean)
  let current = root
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i])
    let stat
    try { stat = lstatSync(current) } catch (error) {
      if (error.code === 'ENOENT') return null
      fail('path-unreadable')
    }
    if (stat.isSymbolicLink()) fail('symlink')
    if ((i < parts.length - 1 || directory) && !stat.isDirectory()) fail('ancestor-not-directory')
    if (i === parts.length - 1) return stat
  }
  return lstatSync(root)
}

function freshOutput(root, output) {
  if (typeof root !== 'string' || !isAbsolute(root) || resolve(root) !== root) fail('unsafe-output')
  if (output !== join(root, OUTPUT) || !inspect(root, true)) fail('unsafe-output')
  if (inspect(output)) fail('unsafe-output')
  // No recursive mkdir: the validated parent must already exist.
  mkdirSync(output, { mode: 0o700 })
}

function record(id) {
  return { id, url: `https://www.fcf.cat/ca/competicio/acta/${id}`, cachePath: `scripts/.predpomnilnik/fcf/acta-${id}.html`, status: 'not-inspected' }
}

function metadataState(options) {
  if (Object.keys(options).some(key => !OPTION_NAMES.has(key)) || options.cliValid === false ||
      !safeKey(options.requestedKey) || safeHit(options.cacheHit) === null || !safeOutcome(options.restoreOutcome) ||
      typeof options.extractionCommit !== 'string' || !SHA.test(options.extractionCommit) ||
      typeof options.runId !== 'string' || !POSITIVE_ID.test(options.runId) ||
      typeof options.runAttempt !== 'string' || !POSITIVE_ID.test(options.runAttempt)) return ['invalid', 'invalid-metadata']
  if (options.restoreOutcome !== 'success') return ['error', 'restore-not-successful']
  if (options.matchedKey !== '' && options.matchedKey !== options.requestedKey) return ['mismatch', 'cache-key-mismatch']
  if (options.cacheHit !== 'true') return ['unavailable', 'exact-cache-hit-required']
  if (options.matchedKey !== options.requestedKey) return ['mismatch', 'cache-key-mismatch']
  return ['available', null]
}

function readOriginal(path, expected) {
  // Recheck ancestors before opening; O_NOFOLLOW rejects a replaced leaf and
  // O_NONBLOCK prevents an unexpected FIFO from blocking the bounded job.
  inspect(path)
  let fd
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const stat = fstatSync(fd)
    if (!stat.isFile()) fail('not-regular')
    if (stat.size > MAX_BYTES) fail('oversized')
    if (stat.dev !== expected.dev || stat.ino !== expected.ino || stat.size !== expected.size || stat.mtimeMs !== expected.mtimeMs) fail('source-changed')
    const buffer = Buffer.alloc(MAX_BYTES + 1)
    let length = 0, count
    while (length < buffer.length && (count = readSync(fd, buffer, length, buffer.length - length, null)) > 0) length += count
    const after = fstatSync(fd)
    if (length > MAX_BYTES) fail('oversized')
    if (length !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs) fail('source-changed')
    return buffer.subarray(0, length)
  } finally { if (fd !== undefined) closeSync(fd) }
}

const REASONS = new Set(['symlink', 'ancestor-not-directory', 'path-unreadable', 'not-regular', 'oversized', 'source-changed'])
const sourceReason = error => REASONS.has(error?.message) ? error.message : 'source-unreadable'

/** Export only the fixed seven original public bodies.
 * An unsafe/nonfresh destination receives no writes. Other failures retain only
 * bounded, sanitized fixed-record diagnostics whenever the destination is safe.
 */
function extract(options = {}) {
  let artifactReady = false
  const finish = status => ({ status, artifactReady })
  const { root, output = typeof root === 'string' ? join(root, OUTPUT) : null } = options
  try { freshOutput(root, output) } catch { return finish(1) }
  const [state, reason] = metadataState(options)
  const manifest = {
    schemaVersion: 1,
    cache: { requestedKey: safeKey(options.requestedKey), matchedKey: safeKey(options.matchedKey), cacheHit: safeHit(options.cacheHit), restoreOutcome: safeOutcome(options.restoreOutcome), state, ...(reason ? { reason } : {}) },
    extraction: { commit: typeof options.extractionCommit === 'string' && SHA.test(options.extractionCommit) ? options.extractionCommit : null, runId: typeof options.runId === 'string' && POSITIVE_ID.test(options.runId) ? options.runId : null, runAttempt: typeof options.runAttempt === 'string' && POSITIVE_ID.test(options.runAttempt) ? options.runAttempt : null },
    sourceCaptureCommit: null,
    sourceFetchTime: null,
    freshness: 'unverified-historical-cache',
    files: IDS.map(record),
  }
  const save = () => {
    // The output starts empty and only fixed filenames are ever written.
    inspect(output, true)
    writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    artifactReady = true
  }
  if (state !== 'available') {
    for (const file of manifest.files) file.reason = reason
    try { save() } catch { /* Cannot safely retain diagnostics. */ }
    return finish(1)
  }

  const selected = [], buffers = new Map()
  let invalid = false
  // Validate every member before opening/copying any body.
  for (const file of manifest.files) {
    try {
      const path = join(root, file.cachePath), stat = inspect(path)
      if (!stat) { file.status = 'missing'; continue }
      if (!stat.isFile()) fail('not-regular')
      if (stat.size > MAX_BYTES) fail('oversized')
      if (!Number.isFinite(stat.mtimeMs)) fail('source-unreadable')
      selected.push({ file, path, stat })
    } catch (error) { invalid = true; file.status = 'invalid'; file.reason = sourceReason(error) }
  }
  if (!invalid) for (const member of selected) {
    try { buffers.set(member.file.id, readOriginal(member.path, member.stat)) } catch (error) {
      invalid = true; member.file.status = 'invalid'; member.file.reason = sourceReason(error)
    }
  }
  if (invalid) {
    manifest.cache.state = 'invalid'; manifest.cache.reason = 'snapshot-invalid'
    for (const file of manifest.files) if (file.status === 'not-inspected') file.reason = 'snapshot-invalid'
    try { save() } catch { /* Cannot safely retain diagnostics. */ }
    return finish(1)
  }

  const written = []
  try {
    for (const { file, stat } of selected) {
      inspect(output, true)
      const bytes = buffers.get(file.id), artifactFile = `acta-${file.id}.html`
      written.push(artifactFile)
      writeFileSync(join(output, artifactFile), bytes, { flag: 'wx', mode: 0o600 })
      Object.assign(file, { status: 'found', artifactFile, byteCount: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), cachedMtime: stat.mtime.toISOString() })
    }
    save()
    return finish(0)
  } catch {
    // Remove only bodies this invocation created; never mutate the cache.
    let bodiesRemoved = true
    try {
      inspect(output, true)
      for (const name of written) {
        try { unlinkSync(join(output, name)) } catch (error) { if (error.code !== 'ENOENT') bodiesRemoved = false }
      }
    } catch { bodiesRemoved = false /* No recursive cleanup or traversal. */ }
    manifest.cache.state = 'error'; manifest.cache.reason = 'output-write-failed'
    manifest.files = IDS.map(id => ({ ...record(id), reason: 'output-write-failed' }))
    try { save() } catch { /* Cannot safely retain diagnostics. */ }
    artifactReady &&= bodiesRemoved
    return finish(1)
  }
}

export function izvozi(options = {}) { return extract(options).status }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const env = process.env
  const cliValid = process.argv.length === 2 && env.GITHUB_ACTIONS === 'true' &&
    env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' && env.GITHUB_REF === 'refs/heads/main'
  const result = extract({ root: process.cwd(), requestedKey: env.FCF_CACHE_KEY, matchedKey: env.FCF_CACHE_MATCHED_KEY,
    cacheHit: env.FCF_CACHE_HIT, restoreOutcome: env.FCF_RESTORE_OUTCOME, extractionCommit: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, cliValid })
  process.exitCode = result.status
  // Only this invocation's successfully written manifest authorizes upload.
  // In particular, an unsafe preexisting path must not become an artifact.
  if (result.artifactReady && env.GITHUB_OUTPUT) {
    try { appendFileSync(env.GITHUB_OUTPUT, 'evidence_ready=true\n') } catch { process.exitCode = 1 }
  }
}
