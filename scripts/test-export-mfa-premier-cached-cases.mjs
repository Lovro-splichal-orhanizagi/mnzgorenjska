import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportCached } from './export-mfa-premier-cached-cases.mjs'

const ids = ['51309025', '52581524', '51718561', '52072685', '53142122', '53142546', '53142793']
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mfa-cache-export-'))
  const cache = join(root, 'scripts/.predpomnilnik/mfa')
  const output = join(root, 'out')
  mkdirSync(cache, { recursive: true })
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const [i, id] of ids.entries()) for (const kind of ['izid', 'postava']) {
    const value = kind === 'izid' ? { id: Number(id), events: i === 0 ? [{ type: 'RED', time: null }] : [] } : { id: Number(id), home: null, away: [] }
    writeFileSync(join(cache, `tekma-${id}-${kind}.json`), JSON.stringify(value))
  }
  return { root, cache, output }
}

test('exports only the 14 fixed report JSON files with exact byte hashes and null source fields', t => {
  const f = fixture(t)
  const previousFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('network forbidden') }
  t.after(() => { globalThis.fetch = previousFetch })
  const manifest = exportCached({ cacheRoot: f.root, outputDir: f.output })
  assert.equal(manifest.files.length, 14)
  assert.deepEqual(manifest.files.map(x => `${x.match.slice(2)}:${x.kind}`), ids.flatMap(id => [`${id}:izid`, `${id}:postava`]))
  for (const row of manifest.files) {
    const bytes = readFileSync(join(f.output, row.artifactFile))
    assert.equal(row.sha256, createHash('sha256').update(bytes).digest('hex'))
    assert.equal(row.bytes, bytes.length)
  }
  const red = JSON.parse(readFileSync(join(f.output, 'mt51309025-izid.json'), 'utf8'))
  assert.equal(red.events[0].time, null)
  assert.equal(JSON.parse(readFileSync(join(f.output, 'mt51309025-postava.json'), 'utf8')).home, null)
  assert.equal(readdirSync(f.output).length, 15)
})

test('a missing member fails before creating any output', t => {
  const f = fixture(t)
  rmSync(join(f.cache, 'tekma-53142793-postava.json'))
  assert.throws(() => exportCached({ cacheRoot: f.root, outputDir: f.output }))
  assert.throws(() => readdirSync(f.output), { code: 'ENOENT' })
})
