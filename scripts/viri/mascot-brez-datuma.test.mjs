import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vir, { datumSezoneLige, imeTekme, tekmeRazporeda } from './mascot.mjs'

const vzorec = (ime) => readFileSync(new URL(`../vzorci/${ime}`, import.meta.url), 'utf8')
const KODA = 'epsl.gr:Α ΕΡΑΣΙΤΕΧΝΙΚΗ (ΟΜΙΛΟΣ ΛΕΣΒΟΥ)'

// Lezbos B: odigrana tekma brez datuma v razporedu (SLF-455).
const razporedBrezDatuma = () =>
  vzorec('gr-mascot-razpored-epsl-a-lesvos.html')
    .replace("game_number=1001&match_date=10.10.2026", 'game_number=1001')
    .replace('ΗΜ: 10.10.2026 16.00', '')

test('mascot: razpored v testu ima odigrano tekmo brez datuma', () => {
  const t = tekmeRazporeda(razporedBrezDatuma()).find((x) => x.igra === 1001)
  assert.ok(t.izid)
  assert.equal(t.datum, null)
})

test("mascot: imeTekme brez datuma še vedno vrže, sezona lige pa ga reši", () => {
  assert.throws(() => imeTekme('epsl.gr', 1001, null), /brez datuma sezone/)
  const tekme = tekmeRazporeda(razporedBrezDatuma())
  assert.equal(datumSezoneLige(tekme), tekme.find((t) => t.datum).datum)
  assert.match(imeTekme('epsl.gr', 1001, datumSezoneLige(tekme)), /^mascot-tekma-.+-2026-1001\.html$/)
})

test('mascot: zapisniki ne padejo na tekmi brez datuma, ostale tekme se uvozijo', async () => {
  const razpored = razporedBrezDatuma()
  const prebrano = []
  const prenesi = async (url, ime) => {
    prebrano.push(ime)
    return ime.startsWith('mascot-razpored-') ? razpored : vzorec('gr-mascot-tekma-epsm-2018.html')
  }
  await vir.zapisniki(KODA, prenesi, { danes: Date.parse('2026-11-15T12:00:00Z') })
  assert.ok(prebrano.some((i) => /^mascot-tekma-.+-2026-1001\.html$/.test(i)), `tekma 1001 prebrana: ${prebrano}`)
  assert.ok(prebrano.filter((i) => i.startsWith('mascot-tekma-')).length >= 4)
})
