import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createClient } from '@supabase/supabase-js'
import { prestopSkladen } from './prestop.mjs'

// Run the real identity/transfer/importer code. Only the external PostgREST
// boundary is replaced; projections matter so omitted status fields are caught.
const source = readFileSync(new URL('./uvoz-zapisnikov.mjs', import.meta.url), 'utf8')
const body = source.slice(source.indexOf('async function igralecId('), source.indexOf('\nasync function krogId('))
const helpers = source.slice(source.indexOf('function vrnjenoIme('), source.indexOf('// Ugovor velja za osebo'))
const fields = 'id, position, position_source, team_id, active, odsel_at, izstopil_at, anonimiziran_razlog'
function importer({ team = 10404, current = true, overrides = {}, extraRows = [], history,
  anonymous = false, writeFailure = false, transferOnlyFailure = false, zeroActiveRows = false, zeroIdentityRows = false } = {}) {
  const row = { id: 383528, competition_id: 1114, team_id: team, full_name: 'Benedikt Grawe',
    position: 'GK', position_source: 'zapisnik', shirt_number: 1, reg_st: null,
    active: false, odsel_at: null, izstopil_at: null, anonimiziran_razlog: null, ...overrides }
  const rows = [row, ...extraRows]
  let inserts = 0
  let failing = writeFailure
  let transferFails = transferOnlyFailure
  let refuseActive = zeroActiveRows
  let refuseIdentity = zeroIdentityRows
  const db = createClient('https://database.invalid', 'test-service-key', {
    auth: { persistSession: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input)
      if (url.pathname === '/rest/v1/anonimizirani_igralci' && init.method === 'DELETE') return new Response(null, { status: 204 })
      assert.equal(url.pathname, '/rest/v1/players')
      let matching = rows.filter(p => [...url.searchParams].every(([field, value]) => {
        if (['select', 'order', 'limit'].includes(field)) return true
        const [op, ...rest] = value.split('.'), wanted = rest.join('.')
        if (op === 'eq') return String(p[field]) === wanted
        if (op === 'is' && wanted === 'null') return p[field] == null
        throw Error(`Unexpected filter ${field}=${value}`)
      }))
      if (init.method === 'PATCH') {
        const patch = JSON.parse(init.body)
        if ((refuseActive && patch.active === true) || (refuseIdentity && patch.full_name != null)) matching = []
        if (failing || (transferFails && patch.team_id != null)) return new Response(JSON.stringify({ message: 'reactivation unavailable', code: 'XX000' }), { status: 500 })
        for (const p of matching) Object.assign(p, JSON.parse(init.body))
        return new Response(null, { status: 204, headers: { 'Content-Range': `*/${matching.length}` } })
      }
      if (init.method === 'POST') {
        const p = { id: 900001 + inserts++, active: true, ...JSON.parse(init.body) }
        rows.push(p)
        return new Response(JSON.stringify(p), { headers: { 'Content-Type': 'application/json' } })
      }
      const selected = (url.searchParams.get('select') ?? '*').split(/,(?![^()]*\))/).map(v => v.trim())
      const result = matching.slice(0, Number(url.searchParams.get('limit') ?? Infinity)).map(p =>
        Object.fromEntries(selected.map(k => k === 'teams(name)' ? ['teams', { name: 'SGV Freiberg' }] : [k, p[k]])))
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const resolve = runInNewContext(`${helpers}
(${body})`, {
    db, igralci: new Map(), klubPoReg: new Map(), tekocaSezona: current,
    tekmovanje: { id: 1114, country_id: 44 }, POLJA_IGRALCA: fields,
    VRATAR_IZ_POLJA: 'v vratih, a vodimo ga v polju', prestopSkladen,
    nastopiIgralca: async () => history ?? [{ klub: 10404, tekma: 123, sezona: '2025/26', krog: 34, datum: '2026-05-16' }],
    anonimiziranVLigi: async () => anonymous ? { ...row } : null,
    imeHash: () => 'verified-anonymous-key',
    razdeliIme: () => ({ priimek: 'Grawe', ime: 'Benedikt' }),
    preveriUgovor: async () => {}, console: { log() {} },
  })
  return { row, rows, failWrites: value => { failing = value }, failTransfer: value => { transferFails = value }, refuseActive: value => { refuseActive = value }, refuseIdentity: value => { refuseIdentity = value }, resolve: options => resolve(10412, 'Benedikt Grawe', {
    st: 1, vratar: true, datum: '2026-08-08',
    tekma: { id: 431607, sezona: current ? '2026/27' : '2025/26', krog: 1, datum: '2026-08-08' }, ...options,
  }) }
}

test('current unregistered transfer restores the inactive player removed with his archive club', async () => {
  const { row, resolve } = importer()
  assert.equal(await resolve(), 383528)
  assert.equal(row.team_id, 10412)
  assert.equal(row.active, true)
  assert.equal(row.position, 'GK')
  assert.equal(row.position_source, 'zapisnik')
})
test('retry restores an inactive player already mapped to the current club', async () => {
  const { row, resolve } = importer({ team: 10412 })
  assert.equal(await resolve(), 383528)
  assert.equal(row.active, true)
  assert.equal(await resolve(), 383528)
  assert.equal(row.active, true)
})
test('current outfield appearances restore the same identified inactive player', async () => {
  const { row, resolve } = importer({ team: 10412, overrides: { position: 'MID', position_source: 'admin' } })
  await resolve({ vratar: false })
  assert.equal(row.active, true)
  assert.equal(row.position, 'MID')
})
for (const [label, options] of [
  ['archive', { current: false }],
  ['departed', { overrides: { odsel_at: '2026-07-01T00:00:00Z' } }],
  ['withdrawn club', { overrides: { izstopil_at: '2026-07-01T00:00:00Z' } }],
  ['privacy objection', { overrides: { anonimiziran_razlog: 'ugovor' } }],
  ['anonymized objection identity', { anonymous: true, overrides: { full_name: '#383528', anonimiziran_razlog: 'ugovor' } }],
]) test(`${label} does not reactivate the existing player`, async () => {
  const { row, resolve } = importer(options)
  await resolve()
  assert.equal(row.active, false)
})
test('same-round conflicting identities remain separate and do not revive the other club player', async () => {
  const { row, rows, resolve } = importer({ history: [{ klub: 10404, tekma: 12, sezona: '2026/27', krog: 1, datum: '2026-08-08' }] })
  assert.equal(await resolve(), 900001)
  assert.equal(row.active, false)
  assert.equal(row.team_id, 10404)
  assert.equal(rows.length, 2)
})
test('ambiguous same-name identities at other clubs are not guessed or reactivated', async () => {
  const { row, rows, resolve } = importer({ extraRows: [{ id: 383529, competition_id: 1114, team_id: 10405,
    full_name: 'Benedikt Grawe', position: 'GK', position_source: 'zapisnik', active: false, reg_st: null }] })
  assert.equal(await resolve(), 900001)
  assert.equal(row.active, false)
  assert.equal(rows[1].active, false)
  assert.equal(row.team_id, 10404)
})
test('reactivation database errors stop the import instead of retaining stale market state', async () => {
  const { row, resolve } = importer({ team: 10412, writeFailure: true })
  await assert.rejects(resolve(), /reactivation unavailable/)
  assert.equal(row.active, false)
})

test('shirt disambiguation restores only the already identified same-club player', async () => {
  const { row, rows, resolve } = importer({ team: 10412, extraRows: [{ id: 383529, competition_id: 1114,
    team_id: 10412, full_name: 'Benedikt Grawe', shirt_number: 2, position: 'GK',
    position_source: 'zapisnik', active: false, reg_st: null }] })
  assert.equal(await resolve(), 383528)
  assert.equal(row.active, true)
  assert.equal(rows[1].active, false)
})
test('a free same-name identity on an ambiguous lineup retains reactivation eligibility', async () => {
  const { row, rows, resolve } = importer({ team: 10412, extraRows: [{ id: 383529, competition_id: 1114,
    team_id: 10412, full_name: 'Benedikt Grawe', shirt_number: 2, position: 'GK',
    position_source: 'zapisnik', active: false, reg_st: null }] })
  assert.equal(await resolve({ st: 9, dvoumno: true, zasedeni: new Set([383528]) }), 383529)
  assert.equal(row.active, false)
  assert.equal(rows[1].active, true)
})
test('a failed reactivation does not populate the cache and bypass a later retry', async () => {
  const { row, resolve, failWrites } = importer({ team: 10412, writeFailure: true })
  await assert.rejects(resolve({ vratar: false }), /reactivation unavailable/)
  failWrites(false)
  assert.equal(await resolve({ vratar: false }), 383528)
  assert.equal(row.active, true)
})

test('a transfer-only database failure is propagated before cache and can be retried', async () => {
  const { row, resolve, failTransfer } = importer({ transferOnlyFailure: true })
  await assert.rejects(resolve(), /reactivation unavailable/)
  assert.equal(row.team_id, 10404)
  assert.equal(row.active, false)
  failTransfer(false)
  assert.equal(await resolve(), 383528)
  assert.equal(row.team_id, 10412)
  assert.equal(row.active, true)
})
test('a guarded reactivation matching zero rows refuses and does not poison the cache', async () => {
  const { row, resolve, refuseActive } = importer({ team: 10412, zeroActiveRows: true })
  await assert.rejects(resolve({ vratar: false }), /reactivation.*one player|natanko enega igralca/i)
  assert.equal(row.active, false)
  refuseActive(false)
  assert.equal(await resolve({ vratar: false }), 383528)
  assert.equal(row.active, true)
})
test('current inactivity anonymization is restored before detached status is used for reactivation', async () => {
  const { row, resolve } = importer({ anonymous: true, overrides: {
    full_name: '#383528', anonimiziran_razlog: 'neaktiven', anonimiziran_at: '2026-07-01T00:00:00Z' } })
  assert.equal(await resolve(), 383528)
  assert.equal(row.full_name, 'Benedikt Grawe')
  assert.equal(row.anonimiziran_razlog, null)
  assert.equal(row.anonimiziran_at, null)
  assert.equal(row.active, true)
  assert.equal(await resolve(), 383528)
  assert.equal(row.active, true)
})
test('an archive appearance preserves inactivity-anonymized identity and inactive status', async () => {
  const { row, resolve } = importer({ current: false, anonymous: true, overrides: {
    full_name: '#383528', anonimiziran_razlog: 'neaktiven' } })
  await resolve()
  assert.equal(row.full_name, '#383528')
  assert.equal(row.anonimiziran_razlog, 'neaktiven')
  assert.equal(row.active, false)
})
test('failed identity restoration cannot clear privacy state or cache an active resolution', async () => {
  const { row, resolve, failWrites } = importer({ anonymous: true, writeFailure: true, overrides: {
    full_name: '#383528', anonimiziran_razlog: 'neaktiven' } })
  await assert.rejects(resolve(), /reactivation unavailable/)
  assert.equal(row.full_name, '#383528')
  assert.equal(row.anonimiziran_razlog, 'neaktiven')
  assert.equal(row.active, false)
  failWrites(false)
  assert.equal(await resolve(), 383528)
  assert.equal(row.full_name, 'Benedikt Grawe')
  assert.equal(row.active, true)
})

test('an unconfirmed identity-restoration PATCH refuses without caching and supports a later retry', async () => {
  const { row, resolve, refuseIdentity } = importer({ anonymous: true, zeroIdentityRows: true, overrides: {
    full_name: '#383528', anonimiziran_razlog: 'neaktiven' } })
  await assert.rejects(resolve(), /vrnitev identitete ni potrjena/)
  assert.equal(row.full_name, '#383528')
  assert.equal(row.anonimiziran_razlog, 'neaktiven')
  assert.equal(row.active, false)
  refuseIdentity(false)
  assert.equal(await resolve(), 383528)
  assert.equal(row.full_name, 'Benedikt Grawe')
  assert.equal(row.active, true)
})
