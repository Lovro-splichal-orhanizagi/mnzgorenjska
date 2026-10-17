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

test('coordination reads German leagues beyond the 1000-row boundary in stable pages', async () => {
  const { vseVrstice } = await import('./strani.mjs')
  const rows = Array.from({ length: 1079 }, (_, id) => ({ id, slug: id === 1078 ? 'de-regionalliga-bayern' : `league-${id}` }))
  const calls = []
  const db = { from(table) {
    assert.equal(table, 'competitions')
    return { select() {
      return { then(resolve) { resolve({ data: rows.slice(0, 1000), error: null }) },
        order(column) { assert.equal(column, 'id'); return {
          range(start, end) { calls.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1), error: null }) },
        } },
      }
    } }
  } }
  const block = source.slice(source.indexOf('let lige\n'), source.indexOf('const ligaPoSlugu'))
  const result = await vm.runInNewContext(`(async () => { ${block}\n return lige })()`, { db, vseVrstice, console, process })
  assert.equal(result.length, 1079)
  assert.equal(result.at(-1).slug, 'de-regionalliga-bayern')
  assert.deepEqual(calls, [[0, 999], [1000, 1999]])
})
