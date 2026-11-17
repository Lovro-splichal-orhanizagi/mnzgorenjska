// Odtis zapisnika, ki ga shranimo, mora biti enak tistemu, ki ga naslednji
// zagon izračuna iz sveže razčlenjenega zapisnika. Uvoz dopisuje z.opozorila
// (vratar, strelci, igralci); odtis po uvozu se zato ni nikoli ujemal in AT, HU
// ter RS so vsako noč znova uvažali vse zapisnike 21 dni (SLF-528).
// node --test scripts/test-odtis-pred-uvozom.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const vir = readFileSync(new URL('./uvoz-zapisnikov.mjs', import.meta.url), 'utf8')
const zanka = vir.slice(vir.indexOf('for (const report of zapisniki) {'), vir.indexOf('// --- preračun točk po krogih'))

test('odtis se izračuna pred prvim korakom uvoza, ki lahko spremeni zapisnik', () => {
  assert.ok(zanka.length > 0)
  const odtis = zanka.indexOf('const odtis = odtisZapisnika(z, cardEnvelope)')
  assert.ok(odtis >= 0, 'zanka mora izračunati odtis sveže razčlenjenega zapisnika')
  for (const korak of ['await klubId(', 'igralecId(', 'vir.nastopi(z)', 'z.opozorila.push(', 'dodajStrelceSKlopi('])
    assert.ok(odtis < zanka.indexOf(korak), `odtis mora biti pred ${korak}`)
})

test('shranjen odtis je tisti iz začetka zanke, ne odtis spremenjenega zapisnika', () => {
  const shranjeni = [...zanka.matchAll(/noviOdtisi\[id\]\s*=\s*([^\n]+)/g)].map((m) => m[1].trim())
  assert.ok(shranjeni.length >= 2)
  for (const s of shranjeni) assert.equal(s, 'odtis')
})
