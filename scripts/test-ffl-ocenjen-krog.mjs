// Ocenjen naslednji krog vira ffl (ffl.org.ua): druga polovica je zrcalo prve.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vir, { ocenjenKrog, razporedZOceno, tekmeLige, zacetekKroga } from './viri/ffl.mjs'

const dodaj = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

/** Dvokrožna liga (krožna metoda), druga polovica zrcalo prve; `odigranih` krogov od sobote 2026-08-01. */
function liga(klubov, odigranih, { zacetek = '2026-08-01', ura = '13:00', zamenjaj = null } = {}) {
  const ids = Array.from({ length: klubov % 2 ? klubov + 1 : klubov }, (_, i) => i + 1)
  const polovica = ids.length - 1
  const prva = []
  let vrsta = [...ids]
  for (let k = 1; k <= polovica; k++) {
    const pari = []
    for (let i = 0; i < ids.length / 2; i++) {
      const [a, b] = [vrsta[i], vrsta[ids.length - 1 - i]]
      if (a > klubov || b > klubov) continue // prost krog pri lihem številu
      pari.push(k % 2 ? [a, b] : [b, a])
    }
    prva.push(pari)
    vrsta = [vrsta[0], vrsta.at(-1), ...vrsta.slice(1, -1)]
  }
  const vsi = [...prva, ...prva.map((p) => p.map(([a, b]) => [b, a]))]
  const tekme = []
  for (let k = 1; k <= odigranih; k++) {
    const datum = dodaj(zacetek, 7 * (k - 1))
    for (const [a, b] of zamenjaj?.krog === k ? zamenjaj.pari : vsi[k - 1]) {
      tekme.push({ krog: k, datum, ura, domaci: `K${a}`, domaciId: 100 + a, gostje: `K${b}`, gostjeId: 100 + b, izid: { domaci: 1, gostje: 0 } })
    }
  }
  return { tekme, vsi }
}

test('naslednji krog druge polovice: obrnjeni pari zrcala, +7 dni, ocenjen', () => {
  const { tekme, vsi } = liga(14, 14) // 14. krog = 1. obrnjen (kot Прем'єр 2026/27)
  const zadnji = dodaj('2026-08-01', 7 * 13)
  const { krog, razlog } = ocenjenKrog(tekme, { danes: dodaj(zadnji, 2) })
  assert.equal(razlog, null)
  assert.equal(krog.stevilka, 15)
  assert.equal(krog.ocenjen, true)
  assert.deepEqual(krog.tekme.map((t) => [t.domaci, t.gostje]), vsi[14].map(([a, b]) => [`K${a}`, `K${b}`]))
  assert.ok(krog.tekme.every((t) => t.datum === dodaj(zadnji, 7) && t.ura === '13:00' && !t.odigrana && !t.izid))
})

test('liho število klubov (prost krog): polovica ima N krogov', () => {
  const { tekme, vsi } = liga(13, 15)
  const { krog } = ocenjenKrog(tekme, { danes: dodaj('2026-08-01', 7 * 14 + 1) })
  assert.equal(krog.stevilka, 16)
  assert.equal(krog.tekme.length, 6)
  assert.deepEqual(krog.tekme.map((t) => [t.domaci, t.gostje]), vsi[15].map(([a, b]) => [`K${a}`, `K${b}`]))
})

test('brez ocene: prva polovica, ni zrcalo, liga miruje, datum mimo, zima, konec sezone', () => {
  const danes = (k) => dodaj('2026-08-01', 7 * (k - 1) + 2)
  assert.match(ocenjenKrog(liga(14, 13).tekme, { danes: danes(13) }).razlog, /druga polovica se še ni začela/)
  const tuj = liga(14, 14)
  const pari = tuj.vsi[13].map(([a, b]) => [b, a]) // 14. krog z istim domačinom kot 1.
  assert.match(ocenjenKrog(liga(14, 14, { zamenjaj: { krog: 14, pari } }).tekme, { danes: danes(14) }).razlog, /ni zrcalo/)
  assert.match(ocenjenKrog(liga(14, 14).tekme, { danes: dodaj(danes(14), 10) }).razlog, /miruje/)
  assert.match(ocenjenKrog(liga(14, 14).tekme, { danes: dodaj(danes(14), 6) }).razlog, /že mimo/)
  const zima = liga(14, 14, { zacetek: '2026-08-29' }) // 14. krog 28. 11. → ocena 5. 12.
  assert.match(ocenjenKrog(zima.tekme, { danes: '2026-11-30' }).razlog, /zimskem premoru/)
  assert.match(ocenjenKrog(liga(6, 10).tekme, { danes: danes(10) }).razlog, /odigrana/)
  const manjka = liga(14, 14).tekme.filter((t) => !(t.krog === 3 && t.domaciId === liga(14, 14).tekme.find((x) => x.krog === 3).domaciId))
  assert.match(ocenjenKrog(manjka, { danes: danes(14) }).razlog, /krog 3 nima 7 tekem/)
})

test('začetek kroga: zaostala tekma ga ne premakne, sobota pred nedeljo', () => {
  const t = (datum, ura) => ({ datum, ura })
  assert.deepEqual(zacetekKroga([t('2026-09-20', '14:00'), t('2026-09-20', '15:00'), t('2026-10-21', '14:00'), t('2026-09-19', '16:00')]), { datum: '2026-09-19', ura: '16:00' })
  assert.deepEqual(zacetekKroga([t('2026-10-25', null), t('2026-10-25', '13:00')]), { datum: '2026-10-25', ura: '13:00' })
})

test('dan in ura: najpogostejši dan začetka, najzgodnejša ura na tak dan', () => {
  const { tekme } = liga(14, 14)
  for (const x of tekme) if (x.krog === 14) x.datum = dodaj(x.datum, 1) // zadnji krog v nedeljo
  for (const x of tekme) if (x.krog === 2) x.ura = '11:30'
  const { krog } = ocenjenKrog(tekme, { danes: dodaj('2026-08-01', 7 * 13 + 2) })
  assert.equal(krog.tekme[0].datum, dodaj('2026-08-01', 7 * 14)) // nazaj na soboto
  assert.equal(krog.tekme[0].ura, '11:30')
})

test('vzorec Прем\'єр (15. 10., 11 krogov): prva polovica, brez ocene; razpored brez ocenjenih', () => {
  const { tekme } = tekmeLige(readFileSync(new URL('./vzorci/ua-ffl-liga-837.html', import.meta.url), 'utf8'))
  const { razpored, ocenjen, razlog } = razporedZOceno(tekme, { danes: '2026-10-15' })
  assert.equal(ocenjen, null)
  assert.match(razlog, /druga polovica/)
  assert.ok(razpored.length >= 11 && razpored.every((k) => k.ocenjen === false))
  assert.equal(vir.ocenjeniDatumi, true)
})

test('sobota ali nedelja (Прем\'єр pol-pol): ocena na soboto, rok raje prej', () => {
  const { tekme } = liga(14, 14)
  for (const x of tekme) if (x.krog % 3 !== 0) x.datum = dodaj(x.datum, 1) // večina v nedeljo
  const { krog } = ocenjenKrog(tekme, { danes: dodaj('2026-08-01', 7 * 13 + 2) })
  assert.equal(krog.tekme[0].datum, dodaj('2026-08-01', 7 * 14)) // sobota
})
