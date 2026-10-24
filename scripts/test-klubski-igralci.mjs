import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { normaliziranoIme, najdiKlubskega } from './klubski-igralci.mjs'

// PostgREST je nadomeščen; filtri so preverjeni, da poizvedba ne izgubi pogoja.
function baza(igralci, nastopi = []) {
  return createClient('https://database.invalid', 'test-service-key', {
    auth: { persistSession: false },
    global: { fetch: async (input) => {
      const url = new URL(input)
      if (url.pathname === '/rest/v1/appearances') {
        const ids = url.searchParams.get('player_id').replace(/^in\.\(|\)$/g, '').split(',').map(Number)
        return Response.json(nastopi.filter((a) => ids.includes(a.player_id)))
      }
      assert.equal(url.pathname, '/rest/v1/players')
      assert.equal(url.searchParams.get('dodal_klub_at'), 'not.is.null')
      assert.equal(url.searchParams.get('reg_st'), 'is.null')
      const comp = Number(url.searchParams.get('competition_id').slice(3))
      const team = Number(url.searchParams.get('team_id').slice(3))
      return Response.json(igralci.filter((p) => p.competition_id === comp && p.team_id === team))
    } },
  })
}
const isci = (db, polnoIme, opozorila) =>
  najdiKlubskega(db, { competitionId: 1, teamId: 7, polnoIme, polja: 'id', opozorila })

test('ime brez šumnikov, velikosti črk in vrstnega reda', () => {
  assert.equal(normaliziranoIme('Novák  Péter'), normaliziranoIme('peter NOVAK'))
  assert.equal(normaliziranoIme('Potočnik Matic'), 'matic potocnik')
  assert.notEqual(normaliziranoIme('Novak Peter'), normaliziranoIme('Novak Pavel'))
})

test('klubskega igralca najde po drugače zapisanem imenu', async () => {
  const db = baza([{ id: 5, competition_id: 1, team_id: 7, full_name: 'Novak Peter' }])
  assert.equal((await isci(db, 'Novák Péter'))?.id, 5)
})

test('igralec drugega kluba ali z nastopom ni posvojen', async () => {
  const db = baza(
    [{ id: 5, competition_id: 1, team_id: 8, full_name: 'Novak Peter' },
     { id: 6, competition_id: 1, team_id: 7, full_name: 'Kos Jan' }],
    [{ player_id: 6 }],
  )
  assert.equal(await isci(db, 'Novak Peter'), null)
  assert.equal(await isci(db, 'Kos Jan'), null)
})

test('dva enaka klubska igralca: nobeden, z opozorilom', async () => {
  const db = baza([
    { id: 5, competition_id: 1, team_id: 7, full_name: 'Novak Peter' },
    { id: 9, competition_id: 1, team_id: 7, full_name: 'Peter Novak' },
  ])
  const opozorila = []
  assert.equal(await isci(db, 'Novak Peter', opozorila), null)
  assert.match(opozorila[0], /5, 9/)
})
