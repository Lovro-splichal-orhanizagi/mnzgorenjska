import { constants, lstatSync, openSync, fstatSync, readSync, closeSync, mkdirSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import { glavaStrani, drevoRsc, elementi, jeElement, besedilo, jeIzziv, kljucKlubaEs } from './viri/fcf.mjs'

const KEYS = Object.freeze(['zapisniki-ES-k1od1-39053159080-1', 'zapisniki-ES-k1od1-39078000693-1'])
const PROFILES = Object.freeze([
  { group: 'GRUP 13', first: 4119076, last: 4119315, rounds: [8, 23], pair: ['BASE ESPIRALL-LES CLOTES,CF', 'Pª JOVE DE LES ROQUETES'] },
  { group: 'GRUP 4', first: 4115228, last: 4115467, rounds: [5, 20], pair: ['CALLDETENES, C.F.', 'SANT QUIRZE BESORA, U.D.'] },
])
const IDS = Object.freeze(PROFILES.flatMap(profile => Array.from({ length: 240 }, (_, i) => String(profile.first + i))))
const profileFor = id => PROFILES.find(profile => Number(id) >= profile.first && Number(id) <= profile.last)
const FIXED = Object.freeze(['4119076', '4119085', '4119093', '4119222', '4119110'])
const OUTPUT = 'fcf-g13-predpomnjeni-dokazi'
const MAX_BYTES = 2 * 1024 * 1024
const OPTIONS = new Set(['root', 'output', 'requestedKey', 'matchedKey', 'cacheHit', 'restoreOutcome', 'extractionCommit', 'runId', 'runAttempt', 'cliValid'])
const SHA = /^[a-f0-9]{40}$/
const POSITIVE_ID = /^[1-9][0-9]{0,19}$/
const safeKey = key => KEYS.includes(key) ? key : null
const safeHit = hit => ['true', 'false', ''].includes(hit) ? hit : null
const safeOutcome = value => ['success', 'failure', 'cancelled', 'skipped'].includes(value) ? value : null
const valid = (value, pattern) => typeof value === 'string' && pattern.test(value) ? value : null
function fail(reason) { throw new Error(reason) }

// Deliberately local safety protocol copied from the seven-report exporter:
// this bounded diagnostic must not change that existing audit or its interface.
// Both refuse symlink ancestors, preflight regular bounded files, then compare
// descriptor identity and metadata before/after the single bounded read.
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
    if (stat.dev !== expected.dev || stat.ino !== expected.ino || stat.size !== expected.size || stat.mtimeMs !== expected.mtimeMs || stat.ctimeMs !== expected.ctimeMs) fail('source-changed')
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


function metadataState(options) {
  if (Object.keys(options).some(key => !OPTIONS.has(key)) || options.cliValid === false ||
      !safeKey(options.requestedKey) || safeHit(options.cacheHit) === null || !safeOutcome(options.restoreOutcome) ||
      !valid(options.extractionCommit, SHA) || !valid(options.runId, POSITIVE_ID) || !valid(options.runAttempt, POSITIVE_ID)) return ['invalid', 'invalid-metadata']
  if (options.restoreOutcome !== 'success') return ['error', 'restore-not-successful']
  if (options.matchedKey !== '' && options.matchedKey !== options.requestedKey) return ['mismatch', 'cache-key-mismatch']
  if (options.cacheHit !== 'true') return ['unavailable', 'exact-cache-hit-required']
  if (options.matchedKey !== options.requestedKey) return ['mismatch', 'cache-key-mismatch']
  return ['available', null]
}
function record(id) {
  return { id, url: `https://www.fcf.cat/ca/competicio/acta/${id}`, cachePath: `scripts/.predpomnilnik/fcf/acta-${id}.html`, status: 'not-inspected' }
}

// Next's embedded route c is the page route, unlike arbitrary acta hrefs or
// IDs appearing in another part of the page. Accept only a single acta ID.
function routeId(roots) {
  const ids = new Set(), stack = [...roots]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue
    if (!Array.isArray(node) && Array.isArray(node.c)) {
      const route = node.c
      if (route.length === 5 && route[0] === '' && route[1] === 'ca' && route[2] === 'competicio' && route[3] === 'acta') ids.add(String(route[4]))
    }
    stack.push(...Object.values(node).filter(x => x && typeof x === 'object'))
  }
  return ids.size === 1 ? [...ids][0] : null
}
function sideIdentity(side) {
  const links = [...new Set([...elementi(side)].map(x => x.props?.href).filter(x => typeof x === 'string' && /^\/ca\/clubs\/[1-9][0-9]*\/categories\/[1-9][0-9]*$/.test(x)))]
  if (links.length !== 1) return { link: null, clubId: null, categoryId: null, reason: links.length ? 'conflicting-side-links' : 'missing-side-link' }
  const [, clubId, categoryId] = links[0].match(/^\/ca\/clubs\/([0-9]+)\/categories\/([0-9]+)$/)
  return { link: links[0], clubId, categoryId }
}
function derive(bytes, id) {
  const profile = profileFor(id)
  const html = bytes.toString('utf8')
  if (!bytes.length) fail('empty-body')
  if (jeIzziv(html)) fail('challenge-body')
  const header = glavaStrani(html)
  if (!header) fail('unknown-body')
  const roots = drevoRsc(html)
  if (routeId(roots) !== id) fail('missing-conflicting-or-mismatched-route')
  if (header.tekmovanje !== 'TERCERA CATALANA' || header.skupina !== profile.group || header.sezona !== '2026/27') fail('wrong-group-competition-or-season')
  if (!header.domaci || !header.gostje || /^(undefined|null)$/i.test(header.domaci) || /^(undefined|null)$/i.test(header.gostje) || !Number.isInteger(header.krog) || header.krog < 1 || header.krog > 30) fail('invalid-header')
  // Locate exactly the header side columns used by glavaStrani. Links in
  // lineups, navigation, staff or unrelated page sections cannot prove a side.
  const wrappers = [...elementi(roots)].filter(x => x.props?.title === 'Acta del partit')
  if (wrappers.length !== 1) fail('ambiguous-header')
  const row = [...elementi(wrappers[0])].find(x => x.tip === 'div' && x.otroci.filter(jeElement).length === 3 && /^\s*\S/.test(besedilo(x.otroci.filter(jeElement)[1])) && /-/.test(besedilo(x.otroci.filter(jeElement)[1])))
  if (!row) fail('invalid-header')
  const sides = row.otroci.filter(jeElement)
  const home = sideIdentity(sides[0]), away = sideIdentity(sides[2])
  return { derived: true, group: profile.group, block: `${profile.first}-${profile.last}`, header, home, away, identityValid: !home.reason && !away.reason }
}
function target(head, id) {
  const { header, identityValid } = head, profile = profileFor(id)
  const pair = profile.pair.map(kljucKlubaEs).sort()
  return identityValid && profile.rounds.includes(header.krog) && [header.domaci, header.gostje].map(kljucKlubaEs).sort().every((name, i) => name === pair[i])
}

/** Only fixed historical cache keys/block, no provider transport or DB work.
 * Missing/invalid source gets a complete sanitized diagnostic. Only a newly
 * completed, allowlisted output can authorize an Actions artifact upload.
 */
export function izvozi(options = {}) {
  const { root, output = typeof root === 'string' ? join(root, OUTPUT) : null } = options
  const result = (status, artifactReady = false) => ({ status, artifactReady })
  try { freshOutput(root, output) } catch { return result(1) }
  const outputStat = inspect(output, true)
  const checkOutput = () => {
    const current = inspect(output, true)
    if (!current || current.dev !== outputStat.dev || current.ino !== outputStat.ino) fail('output-changed')
  }
  const [state, reason] = metadataState(options)
  const manifest = {
    schemaVersion: 1,
    cache: { requestedKey: safeKey(options.requestedKey), matchedKey: safeKey(options.matchedKey), cacheHit: safeHit(options.cacheHit), restoreOutcome: safeOutcome(options.restoreOutcome), state, ...(reason ? { reason } : {}) },
    extraction: { commit: valid(options.extractionCommit, SHA), runId: valid(options.runId, POSITIVE_ID), runAttempt: valid(options.runAttempt, POSITIVE_ID) },
    sourceCaptureCommit: null, sourceFetchTime: null, freshness: 'unverified-historical-cache',
    block: { profiles: PROFILES.map(p => ({ group: p.group, first: String(p.first), last: String(p.last) })), maxFiles: 480, maxFileBytes: MAX_BYTES, maxReadBytes: 480 * MAX_BYTES, maxRawFiles: 13, maxRawBytes: 13 * MAX_BYTES },
    selection: { state: 'unavailable', ambiguous: [] }, selectedRaw: [], files: IDS.map(record),
  }
  const inventory = { derived: true, freshness: 'unverified-historical-cache', sourceFetchTime: null, sourceCaptureCommit: null, heads: [] }
  const buffers = new Map(), extras = new Map()
  let status = state === 'available' ? 0 : 1, unsafeSource = false
  if (state !== 'available') for (const file of manifest.files) file.reason = reason
  else {
    const members = []
    // Inspect the entire bounded set before opening a source or copying raw.
    for (const file of manifest.files) {
      try {
        const path = join(root, file.cachePath), stat = inspect(path)
        if (!stat) { file.status = 'missing'; continue }
        if (!stat.isFile()) fail('not-regular')
        if (stat.size > MAX_BYTES) fail('oversized')
        if (!Number.isFinite(stat.mtimeMs)) fail('source-unreadable')
        members.push({ file, path, stat })
      } catch (error) { unsafeSource = true; status = 1; file.status = 'invalid'; file.reason = sourceReason(error) }
    }
    if (!unsafeSource) for (const { file, path, stat } of members) {
      let bytes
      try { bytes = readOriginal(path, stat) }
      catch (error) { unsafeSource = true; status = 1; file.status = 'invalid'; file.reason = sourceReason(error); break }
      Object.assign(file, { byteCount: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), cachedMtime: stat.mtime.toISOString() })
      let derived
      try { derived = derive(bytes, file.id) }
      catch (error) {
        status = 1; file.status = 'invalid'
        file.reason = ['empty-body','challenge-body','unknown-body','missing-conflicting-or-mismatched-route','wrong-group-competition-or-season','invalid-header','ambiguous-header'].includes(error.message) ? error.message : 'parse-failed'
        continue
      }
      file.status = 'valid'; file.identityValid = derived.identityValid
      if (!derived.identityValid) status = 1
      inventory.heads.push({ id: file.id, byteCount: file.byteCount, sha256: file.sha256, cachedMtime: file.cachedMtime, ...derived })
      if (FIXED.includes(file.id)) buffers.set(file.id, bytes)
      if (target(derived, file.id)) {
        const direction = `${derived.group}:${derived.header.krog}:${kljucKlubaEs(derived.header.domaci)}`
        const candidates = extras.get(direction) ?? []; candidates.push(file.id); extras.set(direction, candidates)
        // Retain at most eight extras across the two profiles; a duplicate marks global ambiguity so
        // its body is never needed. All other source buffers can be released.
        if (candidates.length === 1 && extras.size <= 8) buffers.set(file.id, bytes)
      }
    }
    manifest.selection = { state: 'complete', ambiguous: [...extras.values()].filter(ids => ids.length > 1) }
    if (manifest.selection.ambiguous.length || extras.size > 8) { manifest.selection.state = 'ambiguous'; status = 1 }
    if (unsafeSource) {
      manifest.cache.state = 'invalid'; manifest.cache.reason = 'snapshot-unsafe'
      manifest.selection.state = 'unavailable'; buffers.clear()
      for (const file of manifest.files) if (file.status === 'not-inspected') file.reason = 'snapshot-unsafe'
    } else {
      const selected = new Set(FIXED.filter(id => buffers.has(id)))
      if (manifest.selection.state === 'complete') for (const ids of extras.values()) selected.add(ids[0])
      if (selected.size > 13) return result(1)
      manifest.selectedRaw = [...selected]
      for (const id of buffers.keys()) if (!selected.has(id)) buffers.delete(id)
    }
  }
  try {
    let rawBytes = 0
    for (const id of manifest.selectedRaw) {
      const bytes = buffers.get(id); rawBytes += bytes.length
      if (rawBytes > 13 * MAX_BYTES) fail('raw-limit')
      checkOutput()
      const artifactFile = `acta-${id}.html`
      writeFileSync(join(output, artifactFile), bytes, { flag: 'wx', mode: 0o600 })
      manifest.files.find(x => x.id === id).artifactFile = artifactFile
      buffers.delete(id)
    }
    for (const [name, data] of [['heads.json', inventory], ['manifest.json', manifest]]) {
      checkOutput(); writeFileSync(join(output, name), `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    }
    checkOutput()
    const allowed = ['manifest.json', 'heads.json', ...manifest.selectedRaw.map(id => `acta-${id}.html`)].sort()
    const actual = readdirSync(output).sort()
    if (JSON.stringify(actual) !== JSON.stringify(allowed) || actual.some(name => !inspect(join(output, name))?.isFile())) fail('unexpected-output')
    return result(status, true)
  } catch { return result(1) /* Incomplete output can never authorize upload. */ }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const env = process.env
  const cliValid = process.argv.length === 2 && env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' && env.GITHUB_REF === 'refs/heads/main'
  const result = izvozi({ root: process.cwd(), requestedKey: env.FCF_CACHE_KEY, matchedKey: env.FCF_CACHE_MATCHED_KEY, cacheHit: env.FCF_CACHE_HIT, restoreOutcome: env.FCF_RESTORE_OUTCOME, extractionCommit: env.GITHUB_SHA, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, cliValid })
  process.exitCode = result.status
  if (result.artifactReady && env.GITHUB_OUTPUT) {
    try { appendFileSync(env.GITHUB_OUTPUT, 'evidence_ready=true\n') } catch { process.exitCode = 1 }
  }
}
