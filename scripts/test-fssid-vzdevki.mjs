import test from 'node:test'
import assert from 'node:assert/strict'
import { imeKluba } from './viri/fssid.mjs'

test('fssid MFL Mlava: gol TRGOVAČKI je TRGOVAČKI (Petrovac)', () => {
  assert.equal(imeKluba('TRGOVAČKI', '76155052-76155233'), 'TRGOVAČKI (Petrovac)')
  assert.equal(imeKluba('TRGOVAČKI (Petrovac)', '76155052-76155233'), 'TRGOVAČKI (Petrovac)')
})

test('fssid: gol TRGOVAČKI v drugih blokih se ne preimenuje', () => {
  assert.equal(imeKluba('TRGOVAČKI', '76146941-76147122'), 'TRGOVAČKI')
})
