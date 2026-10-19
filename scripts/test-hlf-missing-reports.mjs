import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('./viri/hlf.mjs', import.meta.url), 'utf8')
const method = source.match(/  async zapisniki\(koda,[^\n]*\) \{[\s\S]*?\n  \},\n\n  nastopi/)
assert.ok(method, 'find the real HLF zapisniki method')
const realMethod = method[0].replace(/,\n\n  nastopi$/, '')

async function run(options) {
  const cacheReads = [], reportReads = []
  const matches = [
    { matchId: 'ro-done', startDate: '2026-10-01T10:00:00Z', homeClub: { name: 'A' }, awayClub: { name: 'B' }, result: { home: 1, away: 0 } },
    { matchId: 'ro-missing', startDate: '2026-10-02T10:00:00Z', homeClub: { name: 'C' }, awayClub: { name: 'D' }, result: { home: 2, away: 1 } },
  ]
  const context = {
    Date,
    razbijKodo: () => ({ judet: 'cluj' }),
    sezonaIzKode: () => '2026/27',
    zSejo: async (_code, work) => work({ zapisnik: async (_round, match) => { reportReads.push(match.matchId); return { players: [] } } }),
    vsiKrogi: async () => [{ stevilka: 1, odgovor: { matches } }],
    tekmeKroga: (round) => round.matches,
    izid: (match) => match.result,
    casTekme: (date) => ({ datum: date.slice(0, 10) }),
    starostDni: () => 1,
    beriJson: (name) => { cacheReads.push(name); return null },
    imeLista: (id) => `${id}.json`,
    listVeljaven: () => false,
    imaZapisnik: () => false,
    brezSlik: (value) => value,
    pisiJson: () => {},
    jeKontumacija: () => false,
    vZapisnik: (match) => ({ id: match.matchId }),
    naslovKroga: (_code, round) => `https://example.test/${round}`,
    slug: (name) => name.toLowerCase(),
  }
  const script = `(async () => ({ ${realMethod} }).zapisniki('league', null, options))()`
  const results = await vm.runInNewContext(script, { ...context, options })
  return { results, cacheReads, reportReads }
}

test('completed HLF reports are skipped before cache and browser report reads', async () => {
  const { results, cacheReads, reportReads } = await run({ preskoci: new Set(['ro-done']) })
  assert.deepEqual([...cacheReads], ['ro-missing.json'])
  assert.deepEqual([...reportReads], ['ro-missing'])
  assert.deepEqual([...results.map(({ id }) => id)], ['ro-missing'])
})

test('without options HLF still checks and fetches completed candidates', async () => {
  const { cacheReads, reportReads } = await run(undefined)
  assert.deepEqual([...cacheReads], ['ro-done.json', 'ro-missing.json'])
  assert.deepEqual([...reportReads], ['ro-done', 'ro-missing'])
})

test('single report selection is applied before HLF cache and report reads', async () => {
  const { results, cacheReads, reportReads } = await run({ samoZapisnik: 'ro-missing' })
  assert.deepEqual([...cacheReads], ['ro-missing.json'])
  assert.deepEqual([...reportReads], ['ro-missing'])
  assert.deepEqual([...results.map(({ id }) => id)], ['ro-missing'])
})
