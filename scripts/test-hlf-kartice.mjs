import test from 'node:test'
import assert from 'node:assert/strict'
import { karticaJeTekma } from './viri/hlf.mjs'

const tekma = { homeClub: { name: 'CSM Alexandria' }, awayClub: { name: 'Progresul Mogoşoaia' } }

test('kartica z domačim pred gosti je tekma', () => {
  assert.equal(karticaJeTekma('csmalexandria2211progresulmogosoaia1800stadiummunicipal', tekma), true)
})

test('obratni dvoboj istih klubov (kartice prejšnjega kroga) ni tekma', () => {
  assert.equal(karticaJeTekma('progresulmogosoaia0000csmalexandria1400stadiumcnafbuftea', tekma), false)
})

test('kartica druge tekme ni tekma', () => {
  assert.equal(karticaJeTekma('scdinamo19480302fcfcsbsa1400stadium', tekma), false)
})
