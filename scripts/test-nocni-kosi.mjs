import test from 'node:test'
import assert from 'node:assert/strict'
import { IZKLOPLJENI_VIRI, ZAVRNJENA_SPLETISCA, ZNANE_NAPAKE, brezIzklopljenih, kljucVira, razdeli, znanaNapaka } from './nocni-kosi.mjs'

// fcf.cat je na seznamu virov, ki jih ne uporabljamo (SLF-452).
test('lige iz izklopljenih virov ne pridejo v nočni koš', () => {
  assert.ok(IZKLOPLJENI_VIRI.has('fcf'))
  const lige = [
    { slug: 'es-ct-quarta-g1', source: 'fcf' },
    { slug: 'es-ct-tercera-g4', source: 'fcf' },
    { slug: 'es-rfef-1', source: 'rfef' },
  ]
  assert.deepEqual(brezIzklopljenih(lige).map((t) => t.slug), ['es-rfef-1'])
  const kosi = razdeli(brezIzklopljenih(lige).map((t) => ({ slug: t.slug, vir: t.source })), 1)
  assert.deepEqual(kosi[0].map((l) => l.slug), ['es-rfef-1'])
})

// SLF-500: eps je več spletišč; zavrnitev enega ne sme ustaviti ostalih.
test('ključ vira: eps po domeni, drugi viri po imenu', () => {
  assert.equal(kljucVira('eps', 'epsdod.gr:495'), 'eps:epsdod.gr')
  assert.equal(kljucVira('eps', 'epsath.gr:12'), 'eps:epsath.gr')
  assert.equal(kljucVira('eps', null), 'eps')
  assert.equal(kljucVira('hns', '115235266'), 'hns')
})

test('zavrnjena spletišča ne pridejo v nočni koš, ostale zveze eps pridejo', () => {
  assert.ok(ZAVRNJENA_SPLETISCA.has('hns'))
  const lige = [
    { slug: 'gr-dod-a', source: 'eps', source_league_code: 'epsdod.gr:495' },
    { slug: 'gr-ath-a-1', source: 'eps', source_league_code: 'epsath.gr:12' },
    { slug: 'hr-zd-1-znl', source: 'hns', source_league_code: '115235266' },
  ]
  assert.deepEqual(brezIzklopljenih(lige).map((t) => t.slug), ['gr-ath-a-1'])
})

// SLF-557: szpnkielce.pl (pzpn) vrača GitHubu 403 — ne obhajamo.
test('pzpn je med zavrnjenimi spletišči', () => {
  assert.ok(ZAVRNJENA_SPLETISCA.has('pzpn'))
  assert.deepEqual(brezIzklopljenih([{ slug: 'pl-sk-4-liga', source: 'pzpn', source_league_code: 'swietokrzyski/x' }]), [])
})

test('znana napaka velja do datuma, potem je liga spet navadna', () => {
  const { naloga, do: rok } = ZNANE_NAPAKE['de-verbandsliga-baden']
  assert.match(naloga, /^SLF-\d+$/)
  assert.equal(znanaNapaka('de-verbandsliga-baden', '2026-11-17'), naloga)
  assert.equal(znanaNapaka('de-verbandsliga-baden', rok), null)
  assert.equal(znanaNapaka('de-regionalliga-nord', '2026-11-17'), null)
})
