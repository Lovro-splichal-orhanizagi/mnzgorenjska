import { test } from 'node:test'
import assert from 'node:assert/strict'
import { odstotek, proti, stopnice } from './porocilo-lijaka.mjs'

test('odstotek in sprememba brez deljenja z nič', () => {
  assert.equal(odstotek(1, 0), '—')
  assert.equal(odstotek(54, 100), '54 %')
  assert.equal(proti(5, 0), '')
  assert.equal(proti(102, 100), '≈')
  assert.equal(proti(60, 100), '▼ 40 %')
})

test('najšibkejši prehod lijaka dobi ⚠', () => {
  const v = stopnice({ registriranih: 100, z_ekipo: 50, krog_1: 45, krog_2: 10 })
  assert.match(v[3], /^⚠ Igral 2\. krog/)
  assert.equal(v.filter((s) => s.startsWith('⚠')).length, 1)
})

test('grafa se narišeta kot PNG, tudi brez podatkov', async () => {
  const { grafLijaka, grafTrendov } = await import('./lijak-grafi.mjs')
  const s = { od: '2026-10-01', do: '2026-10-07', registriranih: 0, z_ekipo: 0, krog_1: 0, krog_2: 0, vrnjenih: 0 }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
  assert.ok(grafLijaka(s).subarray(0, 4).equals(png))
  assert.ok(grafTrendov([{ dan: '2026-10-07', registracije: 3, koraki: {}, obiski: {}, skupina: s }]).subarray(0, 4).equals(png))
})
