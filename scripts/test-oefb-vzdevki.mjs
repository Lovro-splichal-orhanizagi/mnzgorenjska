import test from 'node:test'
import assert from 'node:assert/strict'
import { kljucKlubaAt } from './viri/oefb.mjs'

test('ÖFB 2. Klasse 1b OÖ: "St. Valentin ASK 1b" je "St. Valent.ASK 1b"', () => {
  assert.equal(kljucKlubaAt('St. Valentin ASK 1b'), kljucKlubaAt('St. Valent.ASK 1b'))
})
