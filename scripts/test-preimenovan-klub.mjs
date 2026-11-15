import test from 'node:test'
import assert from 'node:assert/strict'
import { podobnoIme, preimenovanKlub } from './klubi.mjs'

// 1. Klasse West (SLF-275): razpored je SV SW Lieboch (2249) preimenoval.
const LIEBOCH = 2249
const kljuciKlubov = new Map([
  [LIEBOCH, 'sv sw lieboch'],
  [10, 'sv lannach'],
  [11, 'usv st johann'],
  [12, 'sv lieboch 1b'],
])
const tekmeBaze = [
  { krog: 1, home: LIEBOCH, away: 10 },
  { krog: 2, home: 11, away: LIEBOCH },
  { krog: 1, home: 11, away: 12 },
]

test('preimenovan klub: novo ime, ista tekma kroga → obstoječi klub', () => {
  const kljuc = 'sv schwarz weiß remax lieboch'
  const tekme = [
    { krog: 1, nasprotnik: 10, doma: true },
    { krog: 2, nasprotnik: 11, doma: false },
  ]
  assert.equal(preimenovanKlub({ kljuc, tekme, tekmeBaze, kljuciKlubov }), LIEBOCH)
})

test('preimenovan klub: brez skupne tekme ostane nov klub', () => {
  const tekme = [{ krog: 3, nasprotnik: 10, doma: true }]
  assert.equal(preimenovanKlub({ kljuc: 'sv schwarz weiß remax lieboch', tekme, tekmeBaze, kljuciKlubov }), null)
})

test('preimenovan klub: klub, ki ga vir še piše, ni kandidat', () => {
  const tekme = [{ krog: 1, nasprotnik: 10, doma: true }]
  const vViru = new Set([LIEBOCH])
  assert.equal(preimenovanKlub({ kljuc: 'sv schwarz weiß remax lieboch', tekme, tekmeBaze, kljuciKlubov, vViru }), null)
})

test('preimenovan klub: drugo ime na isti tekmi ni isti klub', () => {
  const tekme = [{ krog: 1, nasprotnik: 10, doma: true }]
  assert.equal(preimenovanKlub({ kljuc: 'sc kalsdorf', tekme, tekmeBaze, kljuciKlubov }), null)
})

test('podobno ime: znani primeri', () => {
  assert.ok(podobnoIme('sv schwarz weiß remax lieboch', 'sv sw lieboch'))
  assert.ok(podobnoIme('trgovački', 'trgovački petrovac'))
  assert.ok(podobnoIme('st valentin ask 1b', 'st valent ask 1b'))
})

test('podobno ime: druga ekipa ali splošna beseda ni isti klub', () => {
  assert.ok(!podobnoIme('sv lieboch 1b', 'sv sw lieboch'))
  assert.ok(!podobnoIme('fk mladost lučani', 'fk mladost'))
  assert.ok(!podobnoIme('union graz', 'union lieboch'))
})

