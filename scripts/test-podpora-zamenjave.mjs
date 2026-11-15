// HelpStack `pokazi`: zamenjava cilja, ko prvi ni viden (telefon: trg -> dodaj; Asistence: goli -> tekme -> krogi).
import test from 'node:test'
import assert from 'node:assert/strict'
import { najdiZZamenjavo, ZAMENJAVE } from '../src/lib/podporaZamenjave.ts'

const viden = (...imena) => (c) => (imena.includes(c) ? { c } : null)

test('visible target is used as is', () => {
  assert.deepEqual(najdiZZamenjavo('trg', viden('trg', 'dodaj')), { el: { c: 'trg' }, prikazan: 'trg' })
})

test('phone: hidden market falls back to dodaj', () => {
  assert.equal(najdiZZamenjavo('trg', viden('dodaj'))?.prikazan, 'dodaj')
})

test('desktop: missing dodaj falls back to trg', () => {
  assert.equal(najdiZZamenjavo('dodaj', viden('trg'))?.prikazan, 'trg')
})

test('goli falls back to tekme, then krogi', () => {
  assert.equal(najdiZZamenjavo('goli', viden('tekme', 'krogi'))?.prikazan, 'tekme')
  assert.equal(najdiZZamenjavo('goli', viden('krogi'))?.prikazan, 'krogi')
})

test('nothing visible gives null; targets without fallback do not borrow', () => {
  assert.equal(najdiZZamenjavo('trg', viden()), null)
  assert.equal(najdiZZamenjavo('shrani', viden('trg', 'dodaj')), null)
  assert.equal(ZAMENJAVE.shrani, undefined)
})
