// node --test scripts/test-posta-sponzor.mjs
// Enkratni mail sponzor 1. GNL (SLF-491): kdo ga sme dobiti in kdaj, besedilo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SPONZOR, kandidatiSponzor, vOknu, sporocilo, POSILJATELJI } from './posta-klubom.mjs'

const NEJC = POSILJATELJI.find((p) => p.kljuc === 'nejc')
const zdaj = new Date('2026-11-16T10:00:00+01:00') // ponedeljek
const dni = (n) => new Date(zdaj.getTime() - n * 86400e3).toISOString()
const klub = (id, o = {}) => ({ id, team_id: 100 + id, klub: `NK ${id}`, drzava: 'SI', liga_slug: 'clani', email: `k${id}@primer.si`, stanje: 'opomnik', v_vrsti: true, opomba: null, ...o })
const vsi = SPONZOR.ids.map((id) => klub(id))
const posta = (id, o = {}) => ({ id: id * 10, stik_id: id, vrsta: 'opomnik', poslal: 'Luka (luka@slff.eu)', poslano_at: dni(30), zadeva: 'x', ...o })

test('vseh sedem klubov brez nedavne pošte je kandidatov', () => {
  assert.deepEqual(kandidatiSponzor(vsi, vsi.map((s) => posta(s.id)), zdaj).map((s) => s.id), SPONZOR.ids)
})

test('klub z odgovorom, ne_zeli, napacen_mail ali zunaj vrste ne dobi maila', () => {
  for (const o of [{ stanje: 'odgovoril' }, { stanje: 'ne_zeli' }, { stanje: 'napacen_mail' }, { v_vrsti: false }, { email: null }, { liga_slug: 'mladinci' }]) {
    const v = vsi.map((s) => (s.id === 12 ? { ...s, ...o } : s))
    assert.ok(!kandidatiSponzor(v, [], zdaj).some((s) => s.id === 12), JSON.stringify(o))
  }
})

test('drug klub ali drug id ni v seznamu', () => {
  assert.deepEqual(kandidatiSponzor([klub(99)], [], zdaj), [])
  assert.deepEqual(kandidatiSponzor([klub(12, { drzava: 'AT' })], [], zdaj), [])
})

test('pravilo kluba: 3 dni od kogarkoli, 7 dni od drugega pošiljatelja, parkirana vrstica', () => {
  const kand = (r, o = {}) => kandidatiSponzor(vsi.map((s) => (s.id === 15 ? { ...s, ...o } : s)), r, zdaj).some((s) => s.id === 15)
  assert.equal(kand([posta(15, { poslal: NEJC.poslal, poslano_at: dni(2) })]), false)
  assert.equal(kand([posta(15, { poslal: NEJC.poslal, poslano_at: dni(4) })]), true)
  assert.equal(kand([posta(15, { poslal: 'Luka (luka@slff.eu)', poslano_at: dni(5) })]), false)
  assert.equal(kand([posta(15, { poslal: 'Luka (luka@slff.eu)', poslano_at: dni(8) })]), true)
  assert.equal(kand([], { opomba: 'poslano? preveri ročno' }), false)
})

test('klub, ki je zadevo že dobil, je ne dobi znova (tudi po čakanju)', () => {
  const poslano = posta(16, { vrsta: 'drugo', poslal: NEJC.poslal, poslano_at: dni(30), zadeva: SPONZOR.zadeva })
  assert.ok(!kandidatiSponzor(vsi, [poslano], zdaj).some((s) => s.id === 16))
  assert.equal(kandidatiSponzor(vsi, [poslano], zdaj).length, 6)
})

test('okno SI: pon–sob 08–18 krajevno', () => {
  assert.equal(vOknu('SI', new Date('2026-11-16T10:00:00+01:00')), true)
  assert.equal(vOknu('SI', new Date('2026-11-21T10:00:00+01:00')), true) // sobota
  assert.equal(vOknu('SI', new Date('2026-11-22T10:00:00+01:00')), false) // nedelja
  assert.equal(vOknu('SI', new Date('2026-11-16T07:59:00+01:00')), false)
  assert.equal(vOknu('SI', new Date('2026-11-16T18:00:00+01:00')), false)
})

test('besedilo je potrjeno, podpisano Nejc in brez pomišljajev', () => {
  assert.equal(SPONZOR.zadeva, 'Pokrovitelj 1. GNL na SLFF: 37,50 EUR za klub')
  assert.ok(SPONZOR.telo.startsWith('Pozdravljeni,\n\npišem iz SLFF (slff.eu)'))
  assert.ok(SPONZOR.telo.endsWith('Lep pozdrav,\nNejc\nSLFF\n'))
  assert.ok(!/[—–]/.test(SPONZOR.zadeva + SPONZOR.telo))
  const m = sporocilo({ na: 'k@primer.si', zadeva: SPONZOR.zadeva, telo: SPONZOR.telo, odjava: 'Odjava', jezik: 'sl', po: NEJC, zdaj })
  assert.match(m, /^From: "Nejc \(SLFF\)" <nejc@slff\.eu>\r\nTo: <k@primer\.si>\r\n/)
})
