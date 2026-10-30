import test from 'node:test'
import assert from 'node:assert/strict'
import { koda, kartica, preveri, preveriZahtevo, razcleniPrenos } from './odobritev.mjs'

const LOVRO = '111111111111111111'
const TUJEC = '999999999999999999'
const DESK = 'uporabnik-desk'
const zahteva = {
  zadeva: 'SLF-211',
  akcija: 'merge-deploy',
  cilj: 'PR #607 (anketa), namestitev posli-opomnik in spletne strani',
  verzija: 'a760cfae0123456789abcdef0123456789abcdef',
  prejemniki: 'do 20 uporabnikov, ki jih izbere Lovro (le število)',
  tveganje: 'nova pot za pošiljanje; pošiljanje ostane ločen korak',
  potece: '2026-10-31T20:00:00Z',
}
const zdaj = new Date('2026-10-30T12:00:00Z')
const prenos = (k, { odl = 'ODOBRIM', discord = LOVRO, sporocilo = '1300000000000000001', cas = '2026-10-30T11:00:00Z' } = {}) =>
  `[odobritev] ${odl} ${k}\nodobril: Lovro, discord ${discord}\nsporocilo: ${sporocilo}\ncas: ${cas}`
const kom = (body, extra = {}) => ({ id: `c${Math.random()}`, body, authorUserId: DESK, authorAgentId: null, createdAt: '2026-10-30T11:01:00Z', ...extra })
const opt = { odobritelji: [LOVRO], zdaj }

test('koda je vezana na zadevo, akcijo in vsako polje', () => {
  const k = koda(zahteva)
  assert.match(k, /^SLF-211-merge-deploy-[0-9a-f]{8}$/)
  assert.notEqual(koda({ ...zahteva, verzija: 'b'.repeat(40) }), k)
  assert.notEqual(koda({ ...zahteva, prejemniki: 'do 21' }), k)
  assert.equal(koda({ ...zahteva }), k)
})

test('kartica vsebuje točen odgovor in kdo sme odobriti', () => {
  const { besedilo, koda: k } = kartica(zahteva)
  assert.ok(besedilo.includes(`ODOBRIM ${k}`))
  assert.ok(besedilo.includes('samo Luka, Lovro ali Nejc'))
  assert.ok(kartica({ ...zahteva, akcija: 'zgodba' }).besedilo.includes('kdorkoli'))
})

test('zahteva z naslovom ali žetonom ne gre v Discord', () => {
  assert.ok(preveriZahtevo({ ...zahteva, prejemniki: 'ana@primer.si' }).some((n) => n.includes('e-poštni')))
  assert.ok(preveriZahtevo({ ...zahteva, tveganje: 'ghp_abcdefghijklmnopqrstuvwxyz' }).some((n) => n.includes('žeton')))
  assert.deepEqual(preveriZahtevo({ ...zahteva, cilj: 'https://github.com/Lovro-splichal-orhanizagi/mnzgorenjska/pull/607' }), [])
  assert.ok(preveriZahtevo({ ...zahteva, akcija: 'go' }).length)
})

test('veljavna odobritev Lovra', () => {
  const r = preveri(zahteva, [kom(prenos(koda(zahteva)))], opt)
  assert.equal(r.ok, true)
  assert.equal(r.odlocitev, 'ODOBRIM')
  assert.equal(r.sporocilo, '1300000000000000001')
})

test('zavrnitev je veljavna, a ni odobritev', () => {
  const r = preveri(zahteva, [kom(prenos(koda(zahteva), { odl: 'ZAVRNEM' }))], opt)
  assert.equal(r.ok, true)
  assert.equal(r.odlocitev, 'ZAVRNEM')
})

test('nepooblaščen uporabnik ne sme odobriti občutljive akcije, pri zgodbi lahko', () => {
  assert.equal(preveri(zahteva, [kom(prenos(koda(zahteva), { discord: TUJEC }))], opt).ok, false)
  const zgodba = { ...zahteva, akcija: 'zgodba', prejemniki: undefined, platforme: 'ig+fb' }
  assert.equal(preveri(zgodba, [kom(prenos(koda(zgodba), { discord: TUJEC }))], opt).ok, true)
})

test('stara kartica (nova verzija) ne velja', () => {
  const stara = koda(zahteva)
  const nova = { ...zahteva, verzija: 'c'.repeat(40) }
  const r = preveri(nova, [kom(prenos(stara))], opt)
  assert.equal(r.ok, false)
  assert.match(r.razlog, /ne ustreza/)
})

test('tuja zadeva ali nejasen "go" ne veljata', () => {
  const tuja = { ...zahteva, zadeva: 'SLF-184' }
  assert.equal(preveri(zahteva, [kom(prenos(koda(tuja)))], opt).ok, false)
  assert.equal(preveri(zahteva, [kom('[desk] Lovro: go')], opt).ok, false)
  assert.equal(razcleniPrenos('go send the mails'), null)
})

test('agent ne more zapisati odobritve', () => {
  const r = preveri(zahteva, [kom(prenos(koda(zahteva)), { authorUserId: null, authorAgentId: 'agent' })], opt)
  assert.equal(r.ok, false)
})

test('porabljena koda se ne ponovi', () => {
  const k = koda(zahteva)
  const r = preveri(zahteva, [kom(prenos(k)), kom(`[odobritev-porabljena] ${k}`, { authorUserId: null, authorAgentId: 'a' })], opt)
  assert.equal(r.ok, false)
  assert.match(r.razlog, /porabljena/)
})

test('isto Discord sporočilo ne more odobriti dveh kod', () => {
  const druga = { ...zahteva, akcija: 'email' }
  const r = preveri(zahteva, [kom(prenos(koda(zahteva))), kom(prenos(koda(druga)))], opt)
  assert.equal(r.ok, false)
})

test('potekla kartica ne velja', () => {
  assert.equal(preveri(zahteva, [kom(prenos(koda(zahteva)))], { ...opt, zdaj: new Date('2026-11-01T00:00:00Z') }).ok, false)
  assert.equal(preveri(zahteva, [kom(prenos(koda(zahteva), { cas: '2026-11-01T00:00:00Z' }))], opt).ok, false)
})

test('brez ID sporočila ni odobritve', () => {
  const body = `[odobritev] ODOBRIM ${koda(zahteva)}\nodobril: Lovro, discord ${LOVRO}\ncas: 2026-10-30T11:00:00Z`
  assert.equal(preveri(zahteva, [kom(body)], opt).ok, false)
})
