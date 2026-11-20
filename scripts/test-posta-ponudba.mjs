// node --test scripts/test-posta-ponudba.mjs
// Opomnik za ročno poslane prve maile AT/HU (ROCNI_PRVI) in enkratna ponudba
// pokrovitelja klubom, ki so odgovorili ali sodelujejo (PONUDBA), 20. 11. 2026.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  kandidati, kandidatiPonudba, posiljateljPonudbe, besediloPonudbe, besedilo, sporocilo, PONUDBA, SPONZOR, POSILJATELJI,
} from './posta-klubom.mjs'

const LUKA = POSILJATELJI[0]
const zdaj = new Date('2026-11-23T10:00:00+01:00') // ponedeljek
const dni = (n) => new Date(zdaj.getTime() - n * 86400e3).toISOString()
const aktivne = new Set(['at-a', 'hu-a', 'sk-a', 'clani'])
const st = (id, o = {}) => ({ id, team_id: 100 + id, klub: `Klub ${id}`, drzava: 'AT', liga_slug: 'at-a', email: `k${id}@x.at`, stanje: 'poslano', v_vrsti: true, opomba: null, ...o })
const prvi = (id, poslal, o = {}) => ({ id: id * 10, stik_id: id, vrsta: 'prvi', poslal, poslano_at: dni(30), zadeva: 'x', ...o })

test('ročni prvi mail (info@, Gmail) dobi en opomnik iz luka@ z imenom kolega, najstarejši prvi', () => {
  const vrsta = [st(1), st(2, { drzava: 'HU', liga_slug: 'hu-a' }), st(3)]
  const posta = [prvi(1, 'Nejc (info@slff.eu)', { poslano_at: dni(30) }), prvi(2, 'Lovro (splih.94@gmail.com)', { poslano_at: dni(35) }), prvi(3, 'Nejc (nejcjen@gmail.com)', { poslano_at: dni(28) })]
  const k = kandidati(vrsta, posta, aktivne, zdaj)
  assert.deepEqual(k.map((x) => [x.s.id, x.vrsta, x.posiljatelj, x.kolega]), [[2, 'opomnik', 'luka', 'Lovro'], [1, 'opomnik', 'luka', 'Nejc'], [3, 'opomnik', 'luka', 'Nejc']])
})

test('ročni prvi: drug zapis poslal, drug kraj, dva prva, opomnik ali pošta drugega ne dobijo opomnika', () => {
  const ok = (s, posta) => kandidati([s], posta, aktivne, zdaj).length
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)')]), 1)
  assert.equal(ok(st(1), [prvi(1, 'Jernej (info@slff.eu)')]), 0) // ni v ROCNI_PRVI
  assert.equal(ok(st(1), [prvi(1, 'nekdo (info@slff.eu)')]), 0)
  assert.equal(ok(st(1, { drzava: 'SK', liga_slug: 'sk-a' }), [prvi(1, 'Nejc (info@slff.eu)')]), 0)
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)'), prvi(1, 'Lovro (splih.94@gmail.com)', { id: 11 })]), 0)
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)'), { stik_id: 1, vrsta: 'opomnik', poslal: 'Nejc (info@slff.eu)', poslano_at: dni(20) }]), 0)
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)'), { stik_id: 1, vrsta: 'odgovor', poslal: 'klub', poslano_at: dni(20) }]), 0)
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)'), { stik_id: 1, vrsta: 'drugo', poslal: 'SLFF (admin, prevzem profila)', poslano_at: dni(20) }]), 0)
  assert.equal(ok(st(1), [prvi(1, 'Nejc (info@slff.eu)', { poslano_at: dni(2) })]), 0)
  assert.equal(ok(st(1, { stanje: 'odgovoril' }), [prvi(1, 'Nejc (info@slff.eu)')]), 0)
})

test('opomnik s kolegom: ime kolega, oktober, brez "meine letzte"; HU enako', () => {
  const k = { drzava: 'AT', team_id: 7, liga_slug: 'at-a', ime_lige: 'Kärntner Liga', klub: 'SV A' }
  const p = { igralcev: 10, naj: 'Max M', tocke: 20, ekip: 7, kolega: 'Nejc' }
  const de = besedilo(k, p, 'opomnik', LUKA).telo
  assert.match(de, /zur Nachricht meines Kollegen Nejc aus dem Oktober: /)
  assert.match(de, /Das ist unsere letzte Nachricht/)
  assert.match(de, /\nLuka\nslff\.eu\n$/)
  const hu = besedilo({ ...k, drzava: 'HU' }, { ...p, kolega: 'Lovro' }, 'opomnik', LUKA).telo
  assert.match(hu, /Röviden jelentkezem kollégám, Lovro októberi levele kapcsán: /)
  assert.match(hu, /Ez az utolsó levelünk/)
  // brez kolega ostane po starem
  assert.match(besedilo(k, { ...p, kolega: null }, 'opomnik', LUKA).telo, /zu meiner letzten Nachricht/)
})

test('golo: le text/plain, brez HTML in slike', () => {
  const m = sporocilo({ na: 'a@x.at', zadeva: 'Z', telo: 'Hallo\n', odjava: 'Abmelden', jezik: 'de', po: LUKA, golo: true })
  assert.match(m, /\r\nContent-Type: text\/plain; charset=UTF-8\r\n/)
  assert.ok(!/multipart|text\/html/.test(m))
  assert.ok(/multipart\/alternative/.test(sporocilo({ na: 'a@x.at', zadeva: 'Z', telo: 'Hallo\n', odjava: 'x', po: LUKA })))
})

const ps = (id, o = {}) => st(id, { stanje: 'odgovoril', v_vrsti: false, ...o })

test('ponudba: odgovoril/sodeluje, ne SK/GB/DE/PL/DK/ES, ne ne_zeli, ne neaktivna liga', () => {
  const vsi = [ps(1), ps(2, { stanje: 'sodeluje' }), ps(3, { stanje: 'poslano' }), ps(4, { drzava: 'SK', liga_slug: 'sk-a' }), ps(5, { drzava: 'GB' }),
    ps(6, { drzava: 'ES' }), ps(7, { stanje: 'ne_zeli' }), ps(8, { liga_slug: 'at-neaktivna' }), ps(9, { email: null }), ps(10, { stanje: 'napacen_mail' })]
  assert.deepEqual(kandidatiPonudba(vsi, [], aktivne, zdaj).map((s) => s.id), [1, 2])
})

test('ponudba: enkrat na klub, ne po SPONZOR, ne ob ne_zeli drugega naslova, 7/3 dni, parkirana', () => {
  const ok = (vsi, posta) => kandidatiPonudba(vsi, posta, aktivne, zdaj).map((s) => s.id)
  assert.deepEqual(ok([ps(1), ps(2, { team_id: 101 })], []), [1]) // isti klub, en naslov
  assert.deepEqual(ok([ps(1), st(2, { team_id: 101, stanje: 'ne_zeli' })], []), [])
  assert.deepEqual(ok([ps(1)], [{ stik_id: 1, vrsta: 'drugo', opomba: PONUDBA.oznaka, poslano_at: dni(60), poslal: LUKA.poslal }]), [])
  assert.deepEqual(ok([ps(1, { drzava: 'SI', liga_slug: 'clani' })], [{ stik_id: 1, vrsta: 'drugo', zadeva: SPONZOR.zadeva, poslano_at: dni(30), poslal: 'Nejc (nejc@slff.eu)' }]), [])
  assert.deepEqual(ok([ps(1)], [{ stik_id: 1, vrsta: 'opomnik', poslano_at: dni(6), poslal: LUKA.poslal }]), [])
  assert.deepEqual(ok([ps(1)], [{ stik_id: 1, vrsta: 'opomnik', poslano_at: dni(8), poslal: LUKA.poslal }]), [1])
  assert.deepEqual(ok([ps(1)], [{ stik_id: 1, vrsta: 'odgovor', poslano_at: dni(2), poslal: 'klub' }]), [])
  assert.deepEqual(ok([ps(1)], [{ stik_id: 1, vrsta: 'odgovor', poslano_at: dni(4), poslal: 'klub' }]), [1])
  assert.deepEqual(ok([ps(1, { opomba: 'poslano? preveri ročno' })], []), [])
})

test('ponudba: mladinske lige ne (ni kartic in objav)', () => {
  const lige = ['lj-mladinci-2', 'hu-baz-u19-1', 'ro-u16-s8', 'hu-a']
  const vsi = lige.map((l, i) => ps(i + 1, { liga_slug: l, drzava: 'HU' }))
  assert.deepEqual(kandidatiPonudba(vsi, [], new Set(lige), zdaj).map((s) => s.liga_slug), ['hu-a'])
})

test('pošiljatelj ponudbe: zadnji osebni nabiralnik delavca, sicer klubi@ s človekom iz niti', () => {
  const r = (poslal, n, vrsta = 'prvi') => ({ stik_id: 1, vrsta, poslal, poslano_at: dni(n) })
  assert.deepEqual(posiljateljPonudbe([r('Luka (luka@slff.eu)', 30), r('Lovro (lovro@slff.eu)', 20, 'opomnik')], 1), { kljuc: 'lovro', ime: 'Lovro' })
  assert.deepEqual(posiljateljPonudbe([r('Nejc (info@slff.eu)', 30)], 1), { kljuc: 'klubi', ime: 'Nejc' })
  assert.deepEqual(posiljateljPonudbe([r('Lovro (splih.94@gmail.com)', 30)], 1), { kljuc: 'klubi', ime: 'Lovro' })
  assert.deepEqual(posiljateljPonudbe([r('Ekipa SLFF (klubi@slff.eu)', 30)], 1), { kljuc: 'klubi', ime: 'Nejc' })
  assert.deepEqual(posiljateljPonudbe([], 1), { kljuc: 'klubi', ime: 'Nejc' })
})

test('besedila ponudbe: vse države, 150 in 25 %, ena povezava, brez promocijskih besed in pomišljajev', () => {
  for (const d of Object.keys(PONUDBA.besedila)) {
    const b = besediloPonudbe(d, 'Liga X', 'Luka')
    const vse = `${b.zadeva}\n${b.telo}`
    assert.ok(!/[{}]|undefined|null|[—–]|!!|€|https?:/.test(vse), d)
    assert.ok(vse.includes('Liga X') && vse.includes('150') && vse.includes('25') && vse.includes('37'), d)
    assert.equal((b.telo.match(/slff\.eu/g) ?? []).length, 1, d)
    assert.ok(b.telo.endsWith('\nLuka\nslff.eu\n'), d)
    assert.ok(!/free|kostenlos|brezplač|ingyen|besplat|tasuta|δωρεάν|gratuit|offer|angebot|ponudb|rabatt|discount|popust/i.test(vse), d)
    assert.ok(b.zadeva.length <= 80 && !/\d/.test(b.zadeva.replace('Liga X', '')), d)
  }
  assert.equal(besediloPonudbe('SK', 'x', 'Luka'), null)
})
