import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCacheReader, copyVerifiedCacheFile, soZakljuceneStrani } from './analiziraj-mfa-challenge-cache.mjs'

assert.equal(soZakljuceneStrani([50, 38]), true, 'full 50+38 pagination is complete')
assert.equal(soZakljuceneStrani([50]), false, 'a full first page without a captured short final page is incomplete')
assert.equal(soZakljuceneStrani([]), false, 'missing pages cannot prove completeness')

const root = mkdtempSync(join(tmpdir(), 'mfa-cache-audit-test-'))
try {
  let fetchCalls = 0
  const oldFetch = globalThis.fetch
  globalThis.fetch = () => { fetchCalls++; throw new Error('network access forbidden in test') }
  const cache = join(root, 'cache')
  const output = join(root, 'output')
  mkdirSync(cache)
  writeFileSync(join(cache, 'present.json'), '{"ok":true}')
  const reader = createCacheReader({ cacheRoot: cache, outputRoot: output })
  assert.equal(await reader('https://offline.invalid/present', 'present.json'), '{"ok":true}')
  await assert.rejects(reader('https://offline.invalid/missing', 'missing.json'), /required cached MFA response missing/)
  assert.deepEqual(reader.requests.map(x => x.file), ['present.json', 'missing.json'])
  assert.equal(reader.requests[0].sha256, reader.requests[0].copiedSha256)

  const copied = copyVerifiedCacheFile({ cacheRoot: cache, outputRoot: output, file: 'present.json' })
  assert.equal(readFileSync(copied.path, 'utf8'), '{"ok":true}')
  assert.equal(copied.sha256, copied.copiedSha256)
  assert.throws(() => copyVerifiedCacheFile({ cacheRoot: cache, outputRoot: output, file: '../escape' }), /unsafe cache filename/)
  assert.equal(fetchCalls, 0)
  globalThis.fetch = oldFetch
  console.log('MFA Challenge cache helper: cache-only callback, missing-file failure, and copied-byte/hash verification passed')
} finally {
  rmSync(root, { recursive: true, force: true })
}
