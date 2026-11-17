import test from 'node:test'
import assert from 'node:assert/strict'
import { dovoljenUvoz } from './nocni-urnik.mjs'

const allowed = (drzava, urnik, overrides = {}) => dovoljenUvoz({ drzava, dogodek: 'schedule', urnik, ...overrides })
test('Croatian windows come from cron identity, even when runs are delayed or retried', () => {
  for (const urnik of ['17 5 * * 5,6,0', '17 17,21 * * 5,6,0', '17 5 * * 1-4', '47 6 * * 1-4']) {
    for (const zacetek of ['2026-11-15T06:02:00Z', '2026-11-16T00:02:00Z', 'invalid']) {
      assert.equal(allowed('HR', urnik, { zacetek }), true)
    }
  }
})
test('other weekend hours do not read HNS, but other countries retain hourly cadence', () => {
  const urnik = '17 0-4,6-16,18-20,22-23 * * 5,6,0'
  assert.equal(allowed('HR', urnik, { zacetek: '2026-11-15T05:02:00Z' }), false)
  assert.equal(allowed('SI', urnik), true)
  assert.equal(allowed('HR', 'unexpected'), false)
})
test('manual imports remain admitted; unrelated events fail closed', () => {
  assert.equal(dovoljenUvoz({ drzava: 'HR', dogodek: 'workflow_dispatch' }), true)
  assert.equal(dovoljenUvoz({ drzava: 'SI', dogodek: 'workflow_dispatch' }), true)
  assert.equal(dovoljenUvoz({ drzava: 'HR', dogodek: 'push' }), false)
})

test('workflow weekend cron partition preserves 24 other-country slots and exactly 3 HR slots', async () => {
  const { readFileSync } = await import('node:fs')
  const workflow = readFileSync(new URL('../.github/workflows/uvoz-zapisnikov.yml', import.meta.url), 'utf8')
  const crons = [...workflow.matchAll(/cron: '([^']+)'/g)].map(m => m[1]).filter(c => c.endsWith(' 5,6,0'))
  const slots = crons.flatMap(cron => cron.split(' ')[1].split(',').flatMap(part => {
    const [lo, hi = lo] = part.split('-').map(Number)
    return Array.from({ length: hi - lo + 1 }, (_, i) => ({ hour: lo + i, cron }))
  }))
  assert.deepEqual(slots.map(s => s.hour).sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i))
  assert.deepEqual(slots.filter(s => allowed('HR', s.cron)).map(s => s.hour).sort((a, b) => a - b), [5, 17, 21])
})
