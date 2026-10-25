import test from 'node:test'
import assert from 'node:assert/strict'
import { datumPredPrejsnjimi, krogiZDatumomNazaj, krogiPredPrejsnjim } from './razpored.mjs'
import { razberiKodo, sestaviBlok, razporedBloka } from './viri/fssid.mjs'

// Zona Centar 2026/27 (fssid): fsris je 14. kolu dal datum 1. kola, ocena pa je
// iz njega naredila še osem minulih pomladnih krogov.

test('datum pred večino prejšnjih krogov', () => {
  const jesen = ['2026-08-22', '2026-08-30', '2026-09-05', '2026-09-13', '2026-09-19', '2026-10-24', '2026-11-08', '2026-11-14']
  assert.equal(datumPredPrejsnjimi('2026-08-22', jesen), true)
  assert.equal(datumPredPrejsnjimi('2026-11-21', jesen), false)
  // V celoti prestavljen krog (v maj) ne naredi sumljivega naslednjega.
  assert.equal(datumPredPrejsnjimi('2027-03-27', ['2026-08-08', '2026-08-15', '2026-08-22', '2027-05-27']), false)
  // Teden nazaj je še zamenjan vrstni red krogov, ne napačen datum.
  assert.equal(datumPredPrejsnjimi('2026-09-05', ['2026-09-12']), false)
  assert.equal(datumPredPrejsnjimi(null, jesen), false)
  assert.equal(datumPredPrejsnjimi('2026-08-22', []), false)
})

test('preverba: krogi z datumom pred prejšnjimi, po ligi in sezoni', () => {
  const kr = (competition_id, season, number, played_on) => ({ id: competition_id * 100 + number, competition_id, season, number, played_on })
  const krogi = [
    kr(1, '2026/27', 12, '2026-11-08'), kr(1, '2026/27', 13, '2026-11-14'),
    kr(1, '2026/27', 14, '2026-08-22'), kr(1, '2026/27', 15, '2026-08-29'),
    // Druga liga, druga sezona: primerjata se le sama s sabo.
    kr(2, '2026/27', 1, '2026-08-01'), kr(2, '2025/26', 30, '2026-05-30'),
    kr(1, '2026/27', 16, null),
  ]
  const najdeni = krogiPredPrejsnjim(krogi)
  assert.deepEqual(najdeni.map((r) => r.number), [14, 15])
  assert.equal(najdeni[0].prejsnji, '2026-11-14')
})

test('uvoz razporeda: počisti le krog, ki ga razpored nima, brez uvoza in zaklepa', () => {
  const razpored = [
    { stevilka: 12, tekme: [{ datum: '2026-11-08' }] },
    { stevilka: 13, tekme: [{ datum: '2026-11-15' }, { datum: '2026-11-14' }] },
  ]
  const obstojeci = new Map([
    [12, { id: 12, played_on: '2026-11-08', lineups_locked_at: null }],
    [14, { id: 14, played_on: '2026-08-22', lineups_locked_at: null }],
    [15, { id: 15, played_on: '2026-08-29', lineups_locked_at: null }],
    [16, { id: 16, played_on: '2026-09-05', lineups_locked_at: '2026-09-05T03:00:00Z' }],
    [17, { id: 17, played_on: '2026-09-12', lineups_locked_at: null }],
    [18, { id: 18, played_on: '2026-11-21', lineups_locked_at: null }],
  ])
  const izid = krogiZDatumomNazaj(obstojeci, razpored, new Set([17]))
  assert.deepEqual(izid.map((r) => r.stevilka), [14, 15])
  // Krog, ki ga razpored ima, ostane, kot ga je razpored zapisal.
  assert.deepEqual(krogiZDatumomNazaj(new Map([[13, { id: 13, played_on: '2026-08-01' }]]), razpored, new Set()), [])
})

// Blok s 4 klubi: 12 šifer, 6 krogov po 2; 1.–3. odigrani, 4.–6. (druga
// polovica) le z datumi vira.
const tekma = (d, g, izid, krog, datum) => `<h1 class="fss-rez__title"><span>${d}</span><span>${g}</span></h1>` +
  (izid ? `<div class="row fss-rez__rez"><div class="col-6"><span>${izid[0]}</span></div><div class="col-6"><span>${izid[1]}</span></div></div>` +
    `<div class="col-12 fss-rez__info"><div>${krog}. kolo</div><div>${datum} 17:00</div></div>` : '<div>Utakmica nije odigrana ili podaci nisu uneti.</div>')
const blok = razberiKodo('1000-1011')
const strani = new Map([
  [1000, tekma('A', 'B', [1, 0], 1, '12.09.2026.')], [1001, tekma('C', 'D', [0, 0], 1, '12.09.2026.')],
  [1002, tekma('A', 'C', [2, 1], 2, '26.09.2026.')], [1003, tekma('B', 'D', [0, 1], 2, '26.09.2026.')],
  [1004, tekma('A', 'D', [3, 1], 3, '10.10.2026.')], [1005, tekma('B', 'C', [1, 1], 3, '10.10.2026.')],
  [1006, tekma('B', 'A')], [1007, tekma('D', 'C')],
  [1008, tekma('C', 'A')], [1009, tekma('D', 'B')],
  [1010, tekma('D', 'A')], [1011, tekma('C', 'B')],
])
const danes = Date.parse('2026-10-12T12:00:00Z')

test('fssid: datum vira pred prejšnjimi krogi je zavrnjen, krogi za njim niso ocenjeni', () => {
  const vrstice = [
    { krog: 4, domaci: 'B', gostje: 'A', datum: '2026-08-15', ura: '11:00' },
    { krog: 4, domaci: 'D', gostje: 'C', datum: '2026-08-15', ura: '11:00' },
  ]
  const b = sestaviBlok(blok, strani, vrstice, { danes })
  assert.deepEqual(b.zavrnjeniKrogi, [4])
  assert.equal(b.datumVira, 0)
  assert.deepEqual(b.krogi.filter((k) => k.datum).map((k) => k.stevilka), [1, 2, 3])
  assert.deepEqual(razporedBloka(b, { danes }).map((k) => k.stevilka), [1, 2, 3])
})

test('fssid: datum vira za prejšnjimi krogi ostane, naslednji krog je ocenjen', () => {
  const vrstice = [
    { krog: 4, domaci: 'B', gostje: 'A', datum: '2026-10-17', ura: '17:00' },
    { krog: 4, domaci: 'D', gostje: 'C', datum: '2026-10-17', ura: '17:00' },
  ]
  const b = sestaviBlok(blok, strani, vrstice, { danes })
  assert.deepEqual(b.zavrnjeniKrogi, [])
  assert.equal(b.krogi[3].datum, '2026-10-17')
  assert.equal(b.krogi[3].ocenjen, false)
  assert.equal(b.krogi[4].datum, '2026-10-24')
  assert.equal(b.krogi[4].ocenjen, true)
})
