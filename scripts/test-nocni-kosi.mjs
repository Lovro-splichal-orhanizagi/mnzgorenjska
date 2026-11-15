import test from 'node:test'
import assert from 'node:assert/strict'
import { IZKLOPLJENI_VIRI, brezIzklopljenih, razdeli } from './nocni-kosi.mjs'

// fcf.cat je na seznamu virov, ki jih ne uporabljamo (SLF-452).
test('lige iz izklopljenih virov ne pridejo v nočni koš', () => {
  assert.ok(IZKLOPLJENI_VIRI.has('fcf'))
  const lige = [
    { slug: 'es-ct-quarta-g1', source: 'fcf' },
    { slug: 'es-ct-tercera-g4', source: 'fcf' },
    { slug: 'es-rfef-1', source: 'rfef' },
  ]
  assert.deepEqual(brezIzklopljenih(lige).map((t) => t.slug), ['es-rfef-1'])
  const kosi = razdeli(brezIzklopljenih(lige).map((t) => ({ slug: t.slug, vir: t.source })), 1)
  assert.deepEqual(kosi[0].map((l) => l.slug), ['es-rfef-1'])
})
