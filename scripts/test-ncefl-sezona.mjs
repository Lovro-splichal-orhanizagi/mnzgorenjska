import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { izbranaSezona, tekmeLige } from './viri/ncefl.mjs'

const pot = '/matches/nceldivisionone/2026/'
test('izbranaSezona: vrstni red atributov, narekovaji, absolutni naslov', () => {
  assert.equal(izbranaSezona(`<option value="${pot}" SELECTED>x</option>`), pot)
  assert.equal(izbranaSezona(`<option SELECTED value="${pot}">x</option>`), pot)
  assert.equal(izbranaSezona(`<option value='${pot}' selected="selected">x`), pot)
  assert.equal(izbranaSezona(`<option value="https://www.ncefl.org.uk/matches/nceldivisionone/2026">x`.replace('>x', ' selected>x')), pot)
})
test('izbranaSezona: brez izbrane možnosti null, druga sezona ni ista', () => {
  assert.equal(izbranaSezona(`<option value="${pot}">x</option>`), null)
  assert.equal(izbranaSezona('<option value="/matches/nceldivisionone/2025/" SELECTED>'), '/matches/nceldivisionone/2025/')
})
test('tekmeLige: varovalka sezone ostane', () => {
  const html = readFileSync(new URL('./vzorci/gb-ncefl-liga-nceldivisionone-2026.html', import.meta.url), 'utf8')
  assert.ok(tekmeLige('nceldivisionone/2026', html).length > 0)
  assert.throws(() => tekmeLige('nceldivisionone/2026', html.replace(/ SELECTED/i, '')), /sezono \?/)
  assert.throws(() => tekmeLige('nceldivisionone/2025', html), /sezono/)
})
