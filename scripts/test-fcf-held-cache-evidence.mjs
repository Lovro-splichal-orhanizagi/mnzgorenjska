import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { CACHE_KEY, exportHeldCache } from './fcf-held-cache-evidence.mjs'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const fixture = (id, type) => gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-${id}-${type}.html.gz`, import.meta.url))).toString()
function setup(t) {
  // Run-owned scratch is explicitly supplied by the operator/CI test invocation.
  assert.ok(process.env.PAPERCLIP_RUN_SCRATCH_DIR || process.env.RUNNER_TEMP, 'scratch root required')
  const root = mkdtempSync(join(process.env.PAPERCLIP_RUN_SCRATCH_DIR || process.env.RUNNER_TEMP, 'fcf-held-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  t.mock.method(globalThis, 'fetch', () => assert.fail('offline exporter must never fetch'))
  const cacheDir = join(root, 'cache'), outputDir = join(root, 'output')
  mkdirSync(cacheDir)
  const options = { cacheDir, outputDir, matchedKey: CACHE_KEY, cacheHit: 'true', runId: '123', commit: 'a'.repeat(40) }
  function seed(id = '4107024', held = true) {
    const original = fixture(id, 'report'), html = held ? original.replaceAll('FINALITZAT', 'SUSPÈS') : original
    const path = join(cacheDir, `acta-${id}.html`), proofPath = path.replace('.html', '.redirect.json')
    writeFileSync(path, html)
    writeFileSync(proofPath, JSON.stringify({ id: 'es' + id, url: `https://www.fcf.cat/ca/competicio/acta/${id}`, sha256: digest(html), redirectHtml: fixture(id, 'redirect') }))
    return { path, proofPath, html }
  }
  return { ...options, options, seed }
}
test('exports held originals and bound redirects; separates complete pages without fetching', t => {
  const s = setup(t), original = s.seed(); s.seed('4107032', false)
  writeFileSync(join(s.cacheDir, 'unrelated-secret.txt'), 'must not be copied')
  const m = exportHeldCache(s.options)
  assert.deepEqual(m.counts, { files: 2, current: 2, complete: 1, held: 1, invalid: 0, legacy: 0 })
  assert.equal(m.samples.length, 1)
  assert.equal(m.samples[0].reportSha256, digest(original.html))
  assert.equal(readFileSync(original.path, 'utf8'), original.html)
  assert.equal(readFileSync(join(s.outputDir, 'acta-4107024.html'), 'utf8'), original.html)
  assert.deepEqual(readdirSync(s.outputDir).sort(), ['acta-4107024.html', 'acta-4107024.redirect.json', 'manifest.json'])
})
for (const defect of ['missing', 'digest', 'identity', 'symlink', 'oversized']) test(`${defect} evidence stays invalid and is never exported`, t => {
  const s = setup(t), original = s.seed()
  if (defect === 'missing') rmSync(original.proofPath)
  if (defect === 'digest') writeFileSync(original.path, original.html + 'changed')
  if (defect === 'identity') writeFileSync(original.proofPath, JSON.stringify({ id: 'es1' }))
  if (defect === 'symlink') { rmSync(original.proofPath); symlinkSync(original.path, original.proofPath) }
  if (defect === 'oversized') writeFileSync(original.proofPath, 'x'.repeat(2 * 1024 * 1024 + 1))
  const m = exportHeldCache(s.options)
  assert.equal(m.counts.invalid, 1); assert.equal(m.counts.held, 0)
  assert.deepEqual(m.samples, [])
  assert.deepEqual(readdirSync(s.outputDir), ['manifest.json'])
})
test('cache miss, fallback and empty cache are errors, not success', t => {
  const s = setup(t)
  assert.throws(() => exportHeldCache({ ...s.options, cacheHit: 'false' }), /exact incident cache/)
  assert.throws(() => exportHeldCache({ ...s.options, matchedKey: 'different' }), /exact incident cache/)
  assert.throws(() => exportHeldCache(s.options), /missing or oversized/)
})
test('pre-existing output cannot be overwritten', t => {
  const s = setup(t); s.seed(); mkdirSync(s.outputDir)
  writeFileSync(join(s.outputDir, 'retained'), 'keep')
  assert.throws(() => exportHeldCache(s.options), /EEXIST/)
  assert.equal(readFileSync(join(s.outputDir, 'retained'), 'utf8'), 'keep')
})
