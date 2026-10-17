import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { locenaHkrati } from './hkratnost.mjs'

const source = readFileSync(new URL('./cakaj-na-uvoze.mjs', import.meta.url), 'utf8')
// Execute the actual crossing decision with isolated GitHub job responses.
function crossing(drzava, jobs) {
  const context = vm.createContext({
    mojaDrzava: drzava, mojaLiga: 'candidate', mojaJeAktivna: false,
    mojaZveza: null, popravek: false, locenaHkrati,
    ligaPoSlugu: new Map(), drzavaPopravka: () => ({ pise: true, drzava }),
    gh: () => JSON.stringify({ jobs }),
  })
  vm.runInContext(source.match(/const SKUPEN_VIR = [^\n]+/)[0] + '\n' +
    source.slice(source.indexOf('function seKrize('), source.indexOf('\nif (samoTece)')), context)
  return vm.runInContext("seKrize('uvoz-zapisnikov.yml', 'Nightly import', 123)", context)
}

test('inactive German import waits for the older German nightly job only', () => {
  assert.equal(crossing('DE', [{ name: 'uvoz DE', status: 'in_progress' }]), true)
  assert.equal(crossing('DE', [{ name: 'uvoz DE', status: 'completed' }, { name: 'uvoz AT', status: 'in_progress' }]), false)
  assert.equal(crossing('DE', []), true)
})

test('inactive Slovenian and unknown-country imports retain their nightly isolation', () => {
  for (const country of ['SI', null]) {
    assert.equal(crossing(country, [{ name: `uvoz ${country}`, status: 'in_progress' }]), false)
  }
})
