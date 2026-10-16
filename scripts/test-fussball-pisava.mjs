import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { preslikavaPisave, dekodirajIme } from './viri/fussball-pisava.mjs'

// Ročno sestavljeni binarni primeri metapodatkov (ne pisave za izris).
function primer({ delta = true, zasuk = false, postVersion = 0x20000, ime = 'uni00FC', compressed = true } = {}) {
  const sub = Buffer.alloc(delta ? 32 : 38)
  sub.writeUInt16BE(4, 0); sub.writeUInt16BE(sub.length, 2); sub.writeUInt16BE(4, 6)
  sub.writeUInt16BE(0xe003, 14); sub.writeUInt16BE(0xffff, 16)
  sub.writeUInt16BE(0xe001, 20); sub.writeUInt16BE(0xffff, 22)
  sub.writeUInt16BE(delta ? (1 - 0xe001) & 0xffff : 0, 24); sub.writeUInt16BE(1, 26)
  if (!delta) { sub.writeUInt16BE(4, 28); [3, 1, 2].forEach((x, i) => sub.writeUInt16BE(x, 32 + 2 * i)) }
  const cmap = Buffer.alloc(12 + sub.length)
  cmap.writeUInt16BE(1, 2); cmap.writeUInt16BE(3, 4); cmap.writeUInt16BE(1, 6); cmap.writeUInt32BE(12, 8); sub.copy(cmap, 12)
  const post = Buffer.alloc(43 + ime.length)
  post.writeUInt32BE(postVersion, 0); post.writeUInt16BE(4, 32)
  ;[0, zasuk ? 91 : 36, zasuk ? 36 : 91, 258].forEach((x, i) => post.writeUInt16BE(x, 34 + i * 2))
  post[42] = ime.length; post.write(ime, 43, 'ascii')
  const tables = [['cmap', cmap], ['post', post]].map(([tag, data]) => {
    const zipped = deflateSync(data)
    return { tag, data, stored: compressed && zipped.length < data.length ? zipped : data }
  })
  let offset = 84
  for (const t of tables) { t.offset = offset; offset += (t.stored.length + 3) & ~3 }
  const woff = Buffer.alloc(offset)
  woff.write('wOFF', 0); woff.writeUInt32BE(0x10000, 4); woff.writeUInt32BE(offset, 8); woff.writeUInt16BE(2, 12)
  tables.forEach((t, i) => {
    const o = 44 + i * 20
    woff.write(t.tag, o); woff.writeUInt32BE(t.offset, o + 4); woff.writeUInt32BE(t.stored.length, o + 8); woff.writeUInt32BE(t.data.length, o + 12); t.stored.copy(woff, t.offset)
  })
  return woff
}

test('fussball: zlib WOFF cmap + post vrneta ime z diakritiko', () => {
  assert.equal(dekodirajIme('\ue001\ue002\ue003', preslikavaPisave(primer())), 'Axü')
})
test('fussball: cmap idRangeOffset in nestisnjene tabele', () => {
  assert.equal(dekodirajIme('\ue001\ue002\ue003', preslikavaPisave(primer({ delta: false, compressed: false }))), 'üAx')
})
test('fussball: nova pisava zahteva svojo preslikavo', () => {
  const a = preslikavaPisave(primer()), b = preslikavaPisave(primer({ zasuk: true }))
  assert.notEqual(a.sha256, b.sha256)
  assert.equal(dekodirajIme('\ue001', a), 'A')
  assert.equal(dekodirajIme('\ue001', b), 'x')
})
test('fussball: neznan glif ali ime glifa se ne ugiba', () => {
  assert.throws(() => dekodirajIme('\ue004', preslikavaPisave(primer())), /glif/i)
  assert.throws(() => dekodirajIme('\ue003', preslikavaPisave(primer({ ime: 'scrambled' }))), /glif/i)
  assert.throws(() => dekodirajIme('\ue003', preslikavaPisave(primer({ ime: 'uni0000' }))), /glif/i)
})
test('fussball: post imena morajo biti veljaven ASCII', () => {
  assert.throws(() => preslikavaPisave(primer({ ime: '\u00c1' })), /post/i)
})
test('fussball: pisava brez imen in odrezane tabele se zavrneta', () => {
  assert.throws(() => preslikavaPisave(primer({ postVersion: 0x30000 })), /post/i)
  assert.throws(() => preslikavaPisave(primer().subarray(0, 90)), /WOFF|tabel/i)
})
test('fussball: nespremenjen presledek in navadno besedilo', () => {
  assert.equal(dekodirajIme('\ue001 - \ue002', preslikavaPisave(primer())), 'A - x')
})

test('fussball: 35 igralcev iz dejansko zajetih cmap/post tabel', () => {
  const fixture = JSON.parse(readFileSync(new URL('./vzorci/de-fussball-imena.json', import.meta.url), 'utf8'))
  const pisava = preslikavaPisave(readFileSync(new URL(`./vzorci/${fixture.provenance.fontFixture}`, import.meta.url)))
  assert.equal(fixture.players.length, 35)
  for (const igralec of fixture.players)
    assert.equal(igralec.encoded.map((s) => dekodirajIme(s, pisava)).join(' '), igralec.expected)
  assert.ok(fixture.players.some((p) => p.expected === 'Burak Bayrakal'))
  assert.ok(fixture.players.some((p) => p.expected === 'Julius Grossmann'))
})
