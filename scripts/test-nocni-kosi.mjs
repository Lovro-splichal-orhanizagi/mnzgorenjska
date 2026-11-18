import test from 'node:test'
import assert from 'node:assert/strict'
import { IZKLOPLJENI_VIRI, ZAVRNJENA_SPLETISCA, ZNANE_NAPAKE, brezIzklopljenih, kljucVira, razdeli, znanaNapaka } from './nocni-kosi.mjs'

// Redesigned public routes were verified from hosted runners on 18 Nov.
test('current FCF leagues return to a single paced nightly source worker', () => {
  const leagues = [{slug:'es-ct-quarta-g1',source:'fcf'},{slug:'es-ct-tercera-g4',source:'fcf'}]
  const admitted=brezIzklopljenih(leagues)
  assert.deepEqual(admitted,leagues)
  const bins=razdeli(admitted.map(l=>({slug:l.slug,vir:l.source})),4)
  assert.equal(bins.filter(bin=>bin.length).length,1)
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
  assert.deepEqual(brezIzklopljenih(lige).map((t) => t.slug), ['gr-dod-a', 'gr-ath-a-1'])
})

// SLF-557: szpnkielce.pl (pzpn) vrača GitHubu 403 — ne obhajamo.
test('pzpn je med zavrnjenimi spletišči', () => {
  assert.ok(ZAVRNJENA_SPLETISCA.has('pzpn'))
  assert.deepEqual(brezIzklopljenih([{ slug: 'pl-sk-4-liga', source: 'pzpn', source_league_code: 'swietokrzyski/x' }]), [])
})

test('znana napaka velja do datuma, potem je liga spet navadna', () => {
  const pred = { ...ZNANE_NAPAKE }
  ZNANE_NAPAKE['de-test-liga'] = { naloga: 'SLF-1', do: '2026-12-01' }
  try {
    assert.equal(znanaNapaka('de-test-liga', '2026-11-17'), 'SLF-1')
    assert.equal(znanaNapaka('de-test-liga', '2026-12-01'), null)
    assert.equal(znanaNapaka('de-regionalliga-nord', '2026-11-17'), null)
  } finally {
    delete ZNANE_NAPAKE['de-test-liga']
  }
  assert.deepEqual(ZNANE_NAPAKE, pred)
})

test('de-verbandsliga-baden ni vec znana napaka (SLF-558 popravljen)', () => {
  assert.equal(znanaNapaka('de-verbandsliga-baden', '2026-11-17'), null)
})
