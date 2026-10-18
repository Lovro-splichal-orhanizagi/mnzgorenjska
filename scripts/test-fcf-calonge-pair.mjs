import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { nastopi, vZapisnik } from './viri/fcf.mjs'
import { doplniCalongeMenjavo } from './viri/fcf-calonge-pair.mjs'
const html = readFileSync(new URL('./vzorci/es-fcf-calonge-4116202.html', import.meta.url), 'utf8')
const proof = () => ({ sourcePath: ['', 'ca', 'competicio', 'acta', '4116202'], sourceSha256: 'ffe7a5e9dd542b92f2050e7357acf8d16a7f788acef3485ed8d193b2001a87f1' })
const ordinary = () => vZapisnik(html)

test('authentic Calonge pair: club-primary75 replaces the inferred87 and missing exit', () => {
  const z = doplniCalongeMenjavo(ordinary(), proof())
  const appearances = nastopi(z)
  const entry = appearances.find(a => a.regSt === 31287135)
  const exit = appearances.find(a => a.regSt === 48680949)
  assert.deepEqual([entry.minutaOd, entry.minutaDo, entry.minute], [75, 90, 15])
  assert.deepEqual([exit.minutaOd, exit.minutaDo, exit.minute], [0, 75, 75])
  assert.deepEqual(z.domaci.rezerve.find(a => a.regSt === 31287135).preklopi, [75])
  assert.deepEqual(z.domaci.postava.find(a => a.regSt === 48680949).preklopi, [75])
  assert.equal(appearances.filter(a => a.ekipaIdx === 0).reduce((sum, a) => sum + a.minute, 0), 990)
  assert.deepEqual(z.opozorila, [])
  assert.equal(z.dopolnitveMenjav[0].dokazi[0].sha256, proof().sourceSha256)
  assert.equal(z.dopolnitveMenjav[0].dokazi[1].url, 'https://uecalonge.com/partits/ue-calonge-vs-fc-vilablareix/')
})

test('all unrelated canonical facts and appearances remain identical, including goals13 and87', () => {
  const before = ordinary(), after = doplniCalongeMenjavo(structuredClone(before), proof())
  const originalAppearances = nastopi(structuredClone(before))
  const correctedAppearances = nastopi(structuredClone(after))
  for (const p of originalAppearances.filter(p => ![31287135, 48680949].includes(p.regSt))) {
    assert.deepEqual(correctedAppearances.find(a => a.regSt === p.regSt), p)
  }
  const restored = structuredClone(after)
  delete restored.dopolnitveMenjav
  restored.domaci.rezerve.find(p => p.regSt === 31287135).preklopi = []
  restored.domaci.postava.find(p => p.regSt === 48680949).preklopi = []
  assert.deepEqual(restored, before)
  assert.deepEqual(after.goli.map(g => [g.regSt, g.minuta]), [
    [18906291, 13], [18681786, 38], [18486849, 79], [31287135, 87],
  ])
})

for (const [name, change] of [
  ['changed raw bytes', (z, p) => { p.sourceSha256 = '0'.repeat(64) }],
  ['wrong route', (z, p) => { p.sourcePath[4] = '4116203'; z.zapisnikId = 'es4116202' }],
  ['wrong route prefix', (z, p) => { p.sourcePath[2] = 'other' }],
  ['mismatched importer id', z => { z.zapisnikId = 'es4116203' }],
  ['mismatched importer url', z => { z.url = 'https://www.fcf.cat/ca/competicio/acta/4116203' }],
  ['different full registration', z => { z.domaci.rezerve.find(p => p.regSt === 31287135).regSt = 31287136 }],
  ['different full name', z => { z.domaci.postava.find(p => p.regSt === 48680949).ime = 'Mohamed Adairak' }],
  ['wrong side', z => { z.gostje.rezerve.push(z.domaci.rezerve.splice(z.domaci.rezerve.findIndex(p => p.regSt === 31287135), 1)[0]) }],
  ['wrong starter role', z => { z.domaci.rezerve.find(p => p.regSt === 31287135).zacetnik = true }],
  ['competing same registration', z => { z.gostje.rezerve.push(structuredClone(z.domaci.rezerve.find(p => p.regSt === 31287135))) }],
  ['competing same full name', z => { z.domaci.rezerve[0].ime = 'Bouhmara Boulhout Mohamed' }],
  ['source gains an entry', z => { z.domaci.rezerve.find(p => p.regSt === 31287135).preklopi = [75] }],
  ['source gains an exit', z => { z.domaci.postava.find(p => p.regSt === 48680949).preklopi = [75] }],
  ['changed goal clock', z => { z.goli[0].minuta = 12 }],
  ['changed result', z => { z.rezultat.domaci = 3 }],
  ['changed unrelated player', z => { z.gostje.postava[0].st = 99 }],
  ['changed round', z => { z.krog = 3 }],
]) {
  test(`changed candidate fails before mutation: ${name}`, () => {
    const z = ordinary(), p = proof()
    change(z, p)
    const before = structuredClone(z)
    assert.throws(() => doplniCalongeMenjavo(z, p), /fcf: spremenjen zapisnik4116202/)
    assert.deepEqual(z, before)
  })
}

test('unrelated genuine report remains the ordinary parser output without correction metadata', () => {
  const other = vZapisnik(readFileSync(new URL('./vzorci/es-fcf-acta-quarta-4139543.html', import.meta.url), 'utf8'))
  const before = structuredClone(other)
  assert.strictEqual(doplniCalongeMenjavo(other, { sourcePath: ['', 'ca', 'competicio', 'acta', '4139543'] }), other)
  assert.deepEqual(other, before)
  assert.equal(other.dopolnitveMenjav, undefined)
})

test('trimmed extraction is never accepted as a captured official candidate', () => {
  assert.throws(() => vZapisnik(html, { id: 'es4116202' }), /fcf: spremenjen zapisnik4116202/)
})
