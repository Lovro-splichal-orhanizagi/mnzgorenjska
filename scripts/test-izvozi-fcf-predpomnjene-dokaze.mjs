import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync, existsSync, rmSync, symlinkSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'

// Dynamic import produces an explicit feature assertion during the initial RED.
const helper = await import('./izvozi-fcf-predpomnjene-dokaze.mjs').catch(() => ({}))
const script = new URL('./izvozi-fcf-predpomnjene-dokaze.mjs', import.meta.url).pathname
const workflowPath = new URL('../.github/workflows/fcf-predpomnjeni-dokazi.yml', import.meta.url)
const keys = ['zapisniki-ES-k1od1-39053159080-1', 'zapisniki-es-ct-elit-39067015141']
const ids = ['4109388', '4109643', '4109649', '4116202', '4116215', '4118352', '4118358']
const sha = 'a'.repeat(40), mtime = new Date('2026-09-01T10:20:30Z')
function fixture(t, key = keys[0]) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fcf-evidence-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cache = join(root, 'scripts/.predpomnilnik/fcf'); mkdirSync(cache, { recursive: true })
  const put = (id, bytes = Buffer.from('original\r\nč\0bytes')) => {
    const path = join(cache, `acta-${id}.html`); writeFileSync(path, bytes); utimesSync(path, mtime, mtime); return path
  }
  const selected = put(ids[0]), other = put('9999999', 'private unselected marker')
  const output = join(root, 'fcf-predpomnjeni-dokazi')
  return { root, cache, output, put, selected, other, options: { root, output, requestedKey: key, matchedKey: key, cacheHit: 'true', restoreOutcome: 'success', extractionCommit: sha, runId: '123', runAttempt: '2' } }
}
const snapshot = path => ({ bytes: readFileSync(path).toString('hex'), mtime: statSync(path).mtimeMs })
const manifest = f => JSON.parse(readFileSync(join(f.output, 'manifest.json'), 'utf8'))
function run(f, patch = {}) {
  assert.equal(typeof helper.izvozi, 'function', 'finite evidence extractor must exist')
  return helper.izvozi({ ...f.options, ...patch })
}
function noBodies(f) { assert.deepEqual(readdirSync(f.output), ['manifest.json']) }

for (const key of keys) test(`exports original bytes with hash/mtime and exact provenance for ${key}`, t => {
  const f = fixture(t, key), before = [f.selected, f.other].map(snapshot)
  const oldFetch = globalThis.fetch; globalThis.fetch = () => { throw new Error('provider transport forbidden') }; t.after(() => { globalThis.fetch = oldFetch })
  assert.equal(run(f), 0)
  const m = manifest(f), body = readFileSync(join(f.output, 'acta-4109388.html'))
  assert.deepEqual(body, Buffer.from('original\r\nč\0bytes'))
  assert.equal(m.cache.state, 'available'); assert.equal(m.cache.requestedKey, key); assert.equal(m.cache.matchedKey, key)
  assert.equal(m.extraction.commit, sha); assert.equal(m.sourceCaptureCommit, null)
  assert.equal(m.files.length, 7); assert.deepEqual(m.files.map(x => x.id), ids)
  assert.deepEqual(m.files[0], { id: '4109388', url: 'https://www.fcf.cat/ca/competicio/acta/4109388', cachePath: 'scripts/.predpomnilnik/fcf/acta-4109388.html', status: 'found', artifactFile: 'acta-4109388.html', byteCount: body.length, sha256: createHash('sha256').update(body).digest('hex'), cachedMtime: mtime.toISOString() })
  assert.ok(m.files.slice(1).every(x => x.status === 'missing'))
  assert.deepEqual(readdirSync(f.output).sort(), ['acta-4109388.html', 'manifest.json'])
  assert.deepEqual([f.selected, f.other].map(snapshot), before)
})
for (const level of ['fcf', 'predpomnilnik', 'scripts']) test(`exact restored cache can report all missing with absent ${level}`, t => {
  const f = fixture(t); rmSync(level === 'fcf' ? f.cache : join(f.root, level === 'scripts' ? 'scripts' : 'scripts/.predpomnilnik'), { recursive: true })
  assert.equal(run(f), 0); assert.ok(manifest(f).files.every(x => x.status === 'missing')); noBodies(f)
})
for (const [name, patch, state] of [
  ['miss', { cacheHit: 'false', matchedKey: '' }, 'unavailable'],
  ['empty hit', { cacheHit: '', matchedKey: '' }, 'unavailable'],
  ['nonexact boolean', { cacheHit: true }, 'invalid'],
  ['wrong hit casing', { cacheHit: 'True' }, 'invalid'],
  ['prefix match', { cacheHit: 'false', matchedKey: `${keys[0]}-suffix` }, 'mismatch'],
  ['false hit with exact key', { cacheHit: 'false' }, 'unavailable'],
  ['other allowed key', { matchedKey: keys[1] }, 'mismatch'],
  ['unknown requested key', { requestedKey: 'arbitrary-key-SECRET' }, 'invalid'],
  ['restore failure', { restoreOutcome: 'failure' }, 'error'],
  ['restore cancelled', { restoreOutcome: 'cancelled' }, 'error'],
  ['invalid commit', { extractionCommit: 'SECRET' }, 'invalid'],
  ['invalid run', { runId: '../SECRET' }, 'invalid'],
  ['invalid attempt', { runAttempt: '0' }, 'invalid'],
  ['arbitrary option', { ids: '9999999' }, 'invalid'],
]) test(`fails closed on ${name} without inspecting cache members`, t => {
  const f = fixture(t)
  // If the metadata gate is bypassed this directory would be reported invalid.
  rmSync(f.selected); mkdirSync(f.selected)
  assert.equal(run(f, patch), 1); const m = manifest(f)
  assert.equal(m.cache.state, state); assert.ok(m.files.every(x => x.status === 'not-inspected'))
  assert.equal(JSON.stringify(m).includes('SECRET'), false); noBodies(f)
})
for (const kind of ['target symlink', 'target directory', 'parent symlink missing leaf', 'cache symlink', 'nondirectory ancestor', 'oversized', 'fifo']) test(`preflights the whole selected set and rejects ${kind} before copying`, t => {
  const f = fixture(t), target = join(f.cache, 'acta-4109643.html'), outside = join(f.root, 'outside'); mkdirSync(outside)
  const marker = join(outside, 'marker'); writeFileSync(marker, 'outside marker'); const before = snapshot(marker)
  if (kind === 'target symlink') symlinkSync(marker, target)
  if (kind === 'target directory') mkdirSync(target)
  if (kind === 'parent symlink missing leaf') { rmSync(join(f.root, 'scripts'), { recursive: true }); symlinkSync(outside, join(f.root, 'scripts')) }
  if (kind === 'cache symlink') { rmSync(f.cache, { recursive: true }); symlinkSync(outside, f.cache) }
  if (kind === 'nondirectory ancestor') { rmSync(f.cache, { recursive: true }); writeFileSync(f.cache, 'not a directory') }
  if (kind === 'oversized') writeFileSync(target, Buffer.alloc(2 * 1024 * 1024 + 1))
  if (kind === 'fifo') assert.equal(spawnSync('mkfifo', [target]).status, 0)
  assert.equal(run(f), 1); const m = manifest(f)
  assert.equal(m.cache.state, 'invalid'); assert.ok(m.files.some(x => x.status === 'invalid'))
  assert.ok(m.files.every(x => !('artifactFile' in x))); noBodies(f); assert.deepEqual(snapshot(marker), before)
})
test('accepts exactly 2MiB and preserves all source bytes and mtime', t => {
  const f = fixture(t), path = f.put(ids[1], Buffer.alloc(2 * 1024 * 1024, 255)), before = snapshot(path)
  assert.equal(run(f), 0); assert.deepEqual(snapshot(path), before)
  assert.equal(readFileSync(join(f.output, 'acta-4109643.html')).length, 2097152)
})
test('a partially written body on output IO failure is removed before the diagnostic manifest is eligible', t => {
  const f = fixture(t), before = snapshot(f.selected), write = fs.writeFileSync
  // Simulate a disk write failing after real bytes reached the real filesystem.
  // Only that IO boundary is replaced; extraction, cleanup and manifest are real.
  fs.writeFileSync = (path, data, options) => {
    if (path === join(f.output, 'acta-4109388.html')) {
      write(path, Buffer.from(data).subarray(0, 3), options)
      throw Object.assign(new Error('simulated private error detail'), { code: 'ENOSPC' })
    }
    return write(path, data, options)
  }
  syncBuiltinESMExports()
  try {
    assert.equal(run(f), 1); noBodies(f)
    const m = manifest(f); assert.equal(m.cache.reason, 'output-write-failed')
    assert.ok(m.files.every(x => x.status === 'not-inspected' && !x.artifactFile))
    assert.equal(JSON.stringify(m).includes('private error'), false)
    assert.deepEqual(snapshot(f.selected), before)
  } finally { fs.writeFileSync = write; syncBuiltinESMExports() }
})
for (const kind of ['existing directory', 'existing file', 'output symlink', 'overlap', 'outside', 'root ancestor symlink']) test(`unsafe output ${kind} receives no writes`, t => {
  const f = fixture(t), outside = join(f.root, 'outside'); mkdirSync(outside); const marker = join(outside, 'marker'); writeFileSync(marker, 'untouched')
  let patch = {}
  if (kind === 'existing directory') mkdirSync(f.output)
  if (kind === 'existing file') writeFileSync(f.output, 'untouched')
  if (kind === 'output symlink') symlinkSync(outside, f.output)
  if (kind === 'overlap') patch = { output: f.cache }
  if (kind === 'outside') patch = { output: join(outside, 'evidence') }
  if (kind === 'root ancestor symlink') { const link = join(f.root, 'linked'); symlinkSync(outside, link); patch = { root: link, output: join(link, 'fcf-predpomnjeni-dokazi') } }
  const before = [f.selected, f.other, marker].map(snapshot)
  assert.equal(run(f, patch), 1); assert.equal(existsSync(join(f.output, 'manifest.json')), false)
  assert.deepEqual([f.selected, f.other, marker].map(snapshot), before); assert.deepEqual(readdirSync(outside), ['marker'])
})

function cliEnv(f, patch = {}) {
  return { PATH: process.env.PATH, GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', FCF_CACHE_KEY: f.options.requestedKey, FCF_CACHE_MATCHED_KEY: f.options.matchedKey, FCF_CACHE_HIT: 'true', FCF_RESTORE_OUTCOME: 'success', ...patch }
}
test('actual CLI uses only fixed destination/selection and fails closed outside Actions or with extra arguments', t => {
  for (const scenario of ['ok', 'outside Actions', 'extra argument', 'wrong repository', 'wrong ref']) {
    const f = fixture(t), env = cliEnv(f)
    if (scenario === 'outside Actions') env.GITHUB_ACTIONS = 'false'
    if (scenario === 'wrong repository') env.GITHUB_REPOSITORY = 'wrong/repo'
    if (scenario === 'wrong ref') env.GITHUB_REF = 'refs/heads/other'
    const p = spawnSync(process.execPath, [script, ...(scenario === 'extra argument' ? ['--id=9999999'] : [])], { cwd: f.root, env, encoding: 'utf8', timeout: 5000 })
    assert.equal(p.status, scenario === 'ok' ? 0 : 1, p.stderr)
    assert.equal(manifest(f).files[0].status, scenario === 'ok' ? 'found' : 'not-inspected')
    if (scenario !== 'ok') noBodies(f)
  }
})
test('CLI marks only its newly created manifest eligible for upload, including failures', t => {
  for (const scenario of ['found', 'restore failure', 'unsafe output']) {
    const f = fixture(t), actionOutput = join(f.root, 'action-output')
    writeFileSync(actionOutput, '')
    if (scenario === 'unsafe output') { mkdirSync(f.output); writeFileSync(join(f.output, 'manifest.json'), 'preexisting unapproved data') }
    const env = cliEnv(f, { GITHUB_OUTPUT: actionOutput, ...(scenario === 'restore failure' ? { FCF_RESTORE_OUTCOME: 'failure' } : {}) })
    const p = spawnSync(process.execPath, [script], { cwd: f.root, env, encoding: 'utf8', timeout: 5000 })
    assert.equal(p.status, scenario === 'found' ? 0 : 1)
    assert.equal(readFileSync(actionOutput, 'utf8'), scenario === 'unsafe output' ? '' : 'evidence_ready=true\n')
  }
})

function workflowSteps(text) {
  return text.split(/^      - /m).slice(1).map(block => {
    const line = block.match(/^        run: (.*)$/m)
    const run = !line ? null : line[1] === '|' ? block.slice(line.index + line[0].length + 1).split('\n').filter(x => x.startsWith('          ')).map(x => x.slice(10)).join('\n') : line[1]
    return { block, run, condition: block.match(/^        if: (.*)$/m)?.[1], uses: block.match(/uses: (.*)/)?.[1], id: block.match(/^        id: (.*)$/m)?.[1] }
  })
}
function evaluate(value, context) {
  // Actions permits hyphens in dotted property names; JavaScript requires []
  // for cache-hit/cache-matched-key. Keep the actual workflow expressions.
  return value.replace(/\$\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
    const js = expr.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (_, name) => `[${JSON.stringify(name)}]`)
    return String(Function('matrix', 'steps', 'github', `return (${js})`)(context.matrix, context.steps, context.github))
  })
}
test('manual restore-only workflow has a finite two-key/read-only/bounded upload contract', () => {
  assert.equal(existsSync(workflowPath), true, 'manual evidence workflow must exist')
  const text = readFileSync(workflowPath, 'utf8'), steps = workflowSteps(text)
  assert.match(text, /on:\n  workflow_dispatch:\s*\n/); assert.doesNotMatch(text, /inputs:|schedule:|restore-keys:|cache\/save|secrets\.|npm |curl |wget /)
  assert.match(text, /permissions:\n  contents: read/); assert.match(text, /timeout-minutes: (?:[1-9]|1[0-5])\n/)
  assert.match(text, /if: github.ref == 'refs\/heads\/main'/)
  assert.deepEqual([...text.matchAll(/^          - (zapisniki-.*)$/gm)].map(x => x[1]), keys)
  const restore = steps.filter(s => s.uses?.startsWith('actions/cache/restore@')); assert.equal(restore.length, 1)
  assert.match(restore[0].block, /path: scripts\/\.predpomnilnik\n/); assert.match(restore[0].block, /key: \$\{\{ matrix.cache_key \}\}/)
  const checkout = steps.find(s => s.uses?.startsWith('actions/checkout@')); assert.match(checkout.block, /persist-credentials: false/)
  const upload = steps.find(s => s.uses?.startsWith('actions/upload-artifact@')); assert.equal(upload.condition, "always() && steps.export.outputs.evidence_ready == 'true'")
  assert.match(upload.block, /path: fcf-predpomnjeni-dokazi\n/); assert.match(upload.block, /retention-days: 90/)
  assert.match(upload.block, /name: .*matrix.cache_key.*github.run_id.*github.run_attempt/)
})
for (const key of keys) for (const [name, outcome, hit, matched, expected] of [
  ['exact hit', 'success', 'true', key, 0], ['miss', 'success', '', '', 1],
  ['partial match', 'success', 'false', `${key}-suffix`, 1], ['restore failure', 'failure', 'true', key, 1],
  ['unsafe output', 'success', 'true', key, 1],
]) test(`actual workflow shell/env ${name} ${key} preserves bounded upload eligibility`, t => {
  assert.equal(existsSync(workflowPath), true, 'manual evidence workflow must exist')
  const f = fixture(t, key), text = readFileSync(workflowPath, 'utf8'), steps = workflowSteps(text)
  // Only the external Actions restore/upload boundaries are simulated; the
  // checked-in shell and its environment expressions invoke the real CLI.
  const restore = steps.find(s => s.uses?.startsWith('actions/cache/restore@'))
  const context = { matrix: { cache_key: key }, steps: { [restore.id]: { outcome, outputs: { 'cache-hit': hit, 'cache-matched-key': matched } } }, github: { sha, run_id: '123', run_attempt: '2' } }
  let failed = outcome === 'failure', uploaded = false, invoked = false
  const actionOutput = join(f.root, 'action-output'); writeFileSync(actionOutput, '')
  if (name === 'unsafe output') { mkdirSync(f.output); writeFileSync(join(f.output, 'unapproved'), 'never upload') }
  writeFileSync(join(f.root, 'scripts/izvozi-fcf-predpomnjene-dokaze.mjs'), readFileSync(script))
  for (const step of steps) {
    if (!step.run && !step.uses?.startsWith('actions/upload-artifact@')) continue
    const condition = step.condition?.replaceAll('always()', 'true').replace(/steps\.export\.outputs\.evidence_ready/g, JSON.stringify(context.steps.export?.outputs.evidence_ready ?? ''))
    if (condition ? !Function(`return (${condition})`)() : failed) continue
    if (step.run) {
      const stepEnv = Object.fromEntries([...step.block.matchAll(/^          ([A-Z_]+): (.+)$/gm)].map(([, k, v]) => [k, evaluate(v, context)]))
      const p = spawnSync('bash', ['-euo', 'pipefail', '-c', step.run], { cwd: f.root, env: { ...cliEnv(f), ...stepEnv, GITHUB_OUTPUT: actionOutput }, timeout: 5000, encoding: 'utf8' })
      invoked = true; assert.equal(p.status, expected, p.stderr); failed ||= p.status !== 0
      context.steps[step.id] = { outcome: p.status ? 'failure' : 'success', outputs: Object.fromEntries(readFileSync(actionOutput, 'utf8').trim().split('\n').filter(Boolean).map(line => line.split('='))) }
    } else { uploaded = true; assert.ok(existsSync(join(f.output, 'manifest.json'))) }
  }
  assert.equal(invoked, true); assert.equal(uploaded, name !== 'unsafe output')
  if (name === 'unsafe output') { assert.deepEqual(readdirSync(f.output), ['unapproved']); return }
  assert.equal(manifest(f).files[0].status, expected === 0 ? 'found' : 'not-inspected')
  if (expected) noBodies(f)
})
