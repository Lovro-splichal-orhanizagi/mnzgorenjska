import test from 'node:test'
import assert from 'node:assert/strict'
import { kljucKlubaHu } from './viri/mlsz.mjs'

test('MLSZ: preimenovan klub dobi ključ obstoječega kluba', () => {
  assert.equal(kljucKlubaHu('Vácrátót KSE'), kljucKlubaHu('Vácrátóti KSE'))
  assert.equal(kljucKlubaHu('VÁCRÁTÓT KSE'), kljucKlubaHu('Vácrátóti KSE'))
  assert.equal(kljucKlubaHu('ZVFC'), kljucKlubaHu('Zalaszentgróti VFC'))
})
