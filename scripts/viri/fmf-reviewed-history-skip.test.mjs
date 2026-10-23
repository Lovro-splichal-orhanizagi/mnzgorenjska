import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vir, { fmfZapisnikJeIzbran } from './fmf.mjs'

test('FMF excludes reviewed source/report IDs before reading a published PDF', () => {
  const preskoci = new Set(['50422', 'md50481'])
  assert.equal(fmfZapisnikJeIzbran('50422', { preskoci }), false)
  assert.equal(fmfZapisnikJeIzbran('md50422', { preskoci }), false)
  assert.equal(fmfZapisnikJeIzbran('50481', { preskoci }), false)
  assert.equal(fmfZapisnikJeIzbran('50423', { preskoci }), true)
})

test('FMF single-report selection accepts source or report namespace and excludes every other PDF', () => {
  assert.equal(fmfZapisnikJeIzbran('50422', { samoZapisnik: 'md50422' }), true)
  assert.equal(fmfZapisnikJeIzbran('50422', { samoZapisnik: '50422' }), true)
  assert.equal(fmfZapisnikJeIzbran('50423', { samoZapisnik: 'md50422' }), false)
  assert.equal(fmfZapisnikJeIzbran('50422', { preskoci: new Set(['50422']), samoZapisnik: '50422' }), false)
})

test('FMF adapter skips excluded targets before PDF reads and still parses an ordinary report', async () => {
  const base = new URL('../vzorci/', import.meta.url)
  const readFixture = name => readFileSync(new URL(name, base), 'utf8')
  const calendar = readFixture('md-fmf-reviewed-excluded-calendar.html')
  const calls = []
  const read = async (url, name) => {
    calls.push(name)
    if (name === 'tisk-877.html') return calendar
    if (name === 'tekmovanje-liga-2-1782306996.html') return readFixture('md-fmf-tekmovanje-liga-2.html')
    if (name === 'krog-8059.html') return readFixture('md-fmf-reviewed-excluded-round-4.html')
    if (name === 'krog-8066.html') return readFixture('md-fmf-reviewed-excluded-round-11.html')
    if (name === 'krog-8068.html') return readFixture('md-fmf-krog-8068.html')
    if (name === 'tekma-50492.html') return readFixture('md-fmf-tekma-50492.html')
    if (name === 'raport-50492.txt') return readFixture('md-fmf-raport-50492-a.txt')
    if (name === 'tekma-50422.html' || name === 'tekma-50481.html' || name === 'raport-50422.txt' || name === 'raport-50481.txt')
      throw new Error(`excluded report must not be fetched: ${name}`)
    throw new Error(`unexpected source read: ${name} (${url})`)
  }
  const reports = await vir.zapisniki('liga-2-1782306996/877', read, { preskoci: new Set(['50422', '50481']) })
  assert.deepEqual(reports.map(x => x.id), ['md50492'])
  assert.ok(reports[0].z.domaci.postava.length > 0)
  assert.ok(!calls.some(name => /(?:tekma|raport)-(?:50422|50481)/.test(name)))
})
