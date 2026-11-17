import test from 'node:test'
import assert from 'node:assert/strict'
import { dovoljenUvoz } from './nocni-urnik.mjs'

const scheduled = (drzava, hour, overrides = {}) => dovoljenUvoz({ drzava, dogodek: 'schedule', urnik: '17 * * * 5,6,0', zacetek: `2026-11-15T${hour}:17:00Z`, ...overrides })
test('Croatia runs morning and two evening windows, not overnight or every hour', () => {
  for (const h of ['05', '17', '21']) assert.equal(scheduled('HR', h), true)
  for (const h of ['00', '04', '06', '16', '18', '22', '23']) assert.equal(scheduled('HR', h), false)
  assert.equal(scheduled('HR', '05', { zacetek: 'invalid' }), false)
})
test('weekday morning and fallback stay available; other countries keep hourly cadence', () => {
  for (const urnik of ['17 5 * * 1-4', '47 6 * * 1-4']) assert.equal(scheduled('HR', '06', { urnik }), true)
  assert.equal(scheduled('HR', '05', { urnik: 'unexpected' }), false)
  for (const h of ['00', '05', '17', '22']) assert.equal(scheduled('SI', h), true)
})
test('manual country filter admits only requested country; empty means all', () => {
  assert.equal(dovoljenUvoz({ drzava: 'HR', dogodek: 'workflow_dispatch', izbranaDrzava: 'HR' }), true)
  assert.equal(dovoljenUvoz({ drzava: 'SI', dogodek: 'workflow_dispatch', izbranaDrzava: 'HR' }), false)
  assert.equal(dovoljenUvoz({ drzava: 'HR', dogodek: 'workflow_dispatch' }), true)
  assert.equal(dovoljenUvoz({ drzava: 'SI', dogodek: 'workflow_dispatch' }), true)
  assert.equal(dovoljenUvoz({ drzava: 'HR', dogodek: 'push' }), false)
})
