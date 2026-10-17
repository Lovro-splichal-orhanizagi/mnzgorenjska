import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createClient } from '@supabase/supabase-js'

// Execute the real importer function; replace only its external HTTP boundary.
const source = readFileSync(new URL('./uvoz-zapisnikov.mjs', import.meta.url), 'utf8')
const body = source.slice(source.indexOf('async function igralecId('), source.indexOf('\nasync function krogId('))
function importer({ registered = false, position = null, positionSource = 'neznano', failure = null } = {}) {
  const row = { id: 369399, position, position_source: positionSource, shirt_number: 1 }
  const cache = new Map([[registered ? 'reg|keeper-1' : '9930|Elias Höftmann#1', row.id]])
  const db = createClient('https://database.invalid', 'test-service-key', {
    auth: { persistSession: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input)
      assert.equal(url.pathname, '/rest/v1/players')
      assert.equal(url.searchParams.get('id'), 'eq.369399')
      const writing = init.method === 'PATCH'
      if (failure === (writing ? 'write' : 'read'))
        return new Response(JSON.stringify({ message: 'database unavailable', code: 'XX000' }), { status: 500 })
      if (writing) Object.assign(row, JSON.parse(init.body))
      return new Response(JSON.stringify(writing ? null : row), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const resolve = runInNewContext(`(${body})`, {
    db, igralci: cache, klubPoReg: new Map(), tekocaSezona: false,
    VRATAR_IZ_POLJA: 'v vratih, a vodimo ga v polju',
  })
  return { row, resolve: options => resolve(9930, 'Elias Höftmann', {
    st: 1, vratar: true, ...(registered ? { regSt: 'keeper-1' } : {}), ...options,
  }) }
}

for (const registered of [false, true]) {
  test(`cached ${registered ? 'registered' : 'named'} substitute becomes an official goalkeeper`, async () => {
    const { row, resolve } = importer({ registered })
    assert.equal(await resolve(), 369399)
    assert.equal(row.position, 'GK')
    assert.equal(row.position_source, 'zapisnik')
  })
}
test('official keeper evidence replaces an inferred outfield position', async () => {
  const { row, resolve } = importer({ position: 'MID', positionSource: 'ugibanje' })
  await resolve()
  assert.equal(row.position, 'GK')
  assert.equal(row.position_source, 'zapisnik')
})
for (const positionSource of ['admin', 'klub', 'glasovanje', 'zapisnik']) {
  test(`cached keeper evidence preserves a protected ${positionSource} position and warns`, async () => {
    const { row, resolve } = importer({ position: 'DEF', positionSource })
    const warnings = []
    await resolve({ opozorila: warnings })
    assert.equal(row.position, 'DEF')
    assert.equal(warnings.length, 1)
  })
}
for (const failure of ['read', 'write']) {
  test(`a cached goalkeeper ${failure} failure stops the import`, async () => {
    const { resolve } = importer({ failure })
    await assert.rejects(resolve(), /database unavailable/)
  })
}
test('an outfield cache hit does not access the database', async () => {
  const { row, resolve } = importer({ failure: 'read' })
  assert.equal(await resolve({ vratar: false }), 369399)
  assert.equal(row.position, null)
})
