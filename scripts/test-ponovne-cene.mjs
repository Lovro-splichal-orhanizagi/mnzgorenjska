import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { obdelaj } from './ponovne-cene.mjs'
import { isoTeden } from './cas.mjs'

// Nadomestni PostgREST: vrne tabele kot so, filter le po id/player_id/competition_id;
// vsak zapis (PATCH, POST) se zabeleži, ker ponovno vrednotenje ne sme pisati.
function streznik({ igralci, statistika, zgodovina = [] }) {
  const zapisi = []
  const tabele = {
    competitions: [{ id: 7, slug: 'test-liga', name: 'Test liga', active: true, source: 'test', country_id: null }],
    players: igralci,
    player_season_stats: statistika,
    price_changes: zgodovina,
    federations: [],
  }
  const srv = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (req.method !== 'GET') {
      zapisi.push(`${req.method} ${url.pathname}`)
      res.writeHead(204).end()
      return
    }
    const ime = url.pathname.replace('/rest/v1/', '')
    let vrstice = tabele[ime] ?? []
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'offset', 'limit'].includes(k)) continue
      if (v.startsWith('eq.')) vrstice = vrstice.filter((r) => String(r[k]) === v.slice(3))
      if (v.startsWith('in.(')) {
        const mn = v.slice(4, -1).split(',')
        vrstice = vrstice.filter((r) => mn.includes(String(r[k])))
      }
    }
    const en = (req.headers.accept ?? '').includes('vnd.pgrst.object')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(en ? (vrstice[0] ?? null) : vrstice))
  })
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, zapisi, url: `http://127.0.0.1:${srv.address().port}` })))
}

// Deset vezistov z različno statistiko; igralec 5 je najboljši in stoji pri 4.5.
function liga({ repricedWeek = null, locked = false } = {}) {
  const igralci = []
  const statistika = []
  for (let i = 1; i <= 10; i++) {
    igralci.push({
      id: i, competition_id: 7, full_name: `Igralec ${i}`, position: 'MID', position_source: 'admin',
      value: i === 5 ? 4.5 : 6.0, value_start: i === 5 ? 4.5 : 6.0, value_locked: i === 5 && locked,
      nzs_top_league: null, nzs_top_league_minutes: null,
      repriced_week: i === 5 ? repricedWeek : null, reg_st: null,
    })
    statistika.push({
      player_id: i, competition_id: 7, season: '2026/27', minutes: 900, goals: i === 5 ? 15 : i, points: 0,
      matches: 10, clean_sheets: 0, yellow_cards: 0, red_cards: 0,
    })
  }
  return { igralci, statistika }
}

async function ovrednoti(podatki, igralec = 5) {
  const { srv, zapisi, url } = await streznik(podatki)
  const mapa = mkdtempSync(join(tmpdir(), 'test-ponovna-cena-'))
  const pot = join(mapa, 'izid.json')
  try {
    const koda = await new Promise((r) => {
      const p = spawn(process.execPath, [
        fileURLToPath(new URL('./ovrednoti-igralce.mjs', import.meta.url)),
        '--tekmovanje', 'test-liga', '--tedensko', '--igralec', String(igralec), '--izid', pot,
      ], { env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'test' }, stdio: ['ignore', process.env.DEBUG_PC ? 'inherit' : 'ignore', 'inherit'] })
      p.on('close', r)
    })
    assert.equal(koda, 0)
    return { izid: JSON.parse(readFileSync(pot, 'utf8')), zapisi }
  } finally {
    srv.close()
    rmSync(mapa, { recursive: true, force: true })
  }
}

test('predlog premakne ceno proti izračunani, največ 1.0, in nič ne zapiše', async () => {
  const { izid, zapisi } = await ovrednoti(liga())
  assert.equal(izid.izid, 'premaknjena')
  assert.equal(izid.stara, 4.5)
  assert.equal(izid.nova, 5.5)
  assert.ok(izid.podlaga.ciljna > 5.5, 'ciljna cena je višja od meje premika')
  assert.equal(izid.podlaga.minute, 900)
  assert.deepEqual(zapisi, [])
})

test('igralec z borzno zgodovino ostane borzi', async () => {
  const p = liga()
  p.zgodovina = [{ player_id: 5, round_id: 1, old_value: 4.5, new_value: 4.6 }]
  const { izid, zapisi } = await ovrednoti(p)
  assert.equal(izid.izid, 'borza')
  assert.deepEqual(zapisi, [])
})

test('ta teden že prevrednoten in zaklenjen igralec se ne premakneta', async () => {
  assert.equal((await ovrednoti(liga({ repricedWeek: isoTeden() }))).izid.izid, 'ta_teden')
  assert.equal((await ovrednoti(liga({ locked: true }))).izid.izid, 'zaklenjena')
})

test('neznan igralec', async () => {
  assert.equal((await ovrednoti(liga(), 999)).izid.izid, 'ni_igralca')
})

test('obdelaj: uspel izračun gre v zapis, padel ostane za naslednji zagon', async () => {
  const zapisano = []
  const r = await obdelaj(
    [{ zahtevek: 1, player_id: 5, liga: 'a' }, { zahtevek: 2, player_id: 6, liga: 'a' }, { zahtevek: 3, player_id: 7, liga: 'a' }],
    {
      izracun: (_l, id) => (id === 5 ? { izid: 'premaknjena', stara: 4.5, nova: 5.5 } : id === 6 ? null : { izid: 'čudno' }),
      zapisi: async (z, izid) => zapisano.push([z, izid.izid]),
    },
  )
  assert.deepEqual(r, { zapisanih: 1, padlih: 2 })
  assert.deepEqual(zapisano, [[1, 'premaknjena']])
})
