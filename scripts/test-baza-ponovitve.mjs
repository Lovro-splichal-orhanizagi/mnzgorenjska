import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Tedensko prevrednotenje piše ceno z enim PATCH na igralca. Nadomestni
// PostgREST ob prvem PATCH prekine povezavo (ECONNRESET), kot 3. 11. 2026.
function streznik({ prekiniPatch }) {
  const igralci = []
  const statistika = []
  for (let i = 1; i <= 10; i++) {
    igralci.push({
      id: i, competition_id: 7, full_name: `Igralec ${i}`, position: 'MID', position_source: 'admin',
      value: i === 5 ? 4.5 : 6.0, value_start: i === 5 ? 4.5 : 6.0, value_locked: false,
      nzs_top_league: null, nzs_top_league_minutes: null, repriced_week: null, reg_st: null,
    })
    statistika.push({
      player_id: i, competition_id: 7, season: '2026/27', minutes: 900, goals: i === 5 ? 15 : i, points: 0,
      matches: 10, clean_sheets: 0, yellow_cards: 0, red_cards: 0,
    })
  }
  const tabele = {
    competitions: [{ id: 7, slug: 'test-liga', name: 'Test liga', active: true, source: 'test', country_id: null }],
    players: igralci, player_season_stats: statistika, price_changes: [], federations: [],
  }
  const patchi = []
  let prekinjenih = 0
  const srv = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (req.method === 'PATCH') {
      if (prekiniPatch && prekinjenih < prekiniPatch) {
        prekinjenih++
        req.socket.destroy()
        return
      }
      patchi.push(url.searchParams.get('id'))
      res.writeHead(204).end()
      return
    }
    let vrstice = tabele[url.pathname.replace('/rest/v1/', '')] ?? []
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'offset', 'limit'].includes(k)) continue
      if (v.startsWith('eq.')) vrstice = vrstice.filter((r) => String(r[k]) === v.slice(3))
      if (v.startsWith('in.(')) vrstice = vrstice.filter((r) => v.slice(4, -1).split(',').includes(String(r[k])))
    }
    const en = (req.headers.accept ?? '').includes('vnd.pgrst.object')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(en ? (vrstice[0] ?? null) : vrstice))
  })
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({
    srv, patchi, prekinjenih: () => prekinjenih, url: `http://127.0.0.1:${srv.address().port}`,
  })))
}

const VSI = Array.from({ length: 10 }, (_, i) => `eq.${i + 1}`)

async function zaganjaj({ predmodul, prekiniPatch }) {
  const s = await streznik({ prekiniPatch })
  const args = [
    ...(predmodul ? ['--import', fileURLToPath(new URL('./baza-ponovitve.mjs', import.meta.url))] : []),
    fileURLToPath(new URL('./ovrednoti-igralce.mjs', import.meta.url)),
    '--tekmovanje', 'test-liga', '--tedensko', '--pisi',
  ]
  try {
    let izhod = ''
    const koda = await new Promise((r) => {
      const p = spawn(process.execPath, args, {
        env: { ...process.env, SUPABASE_URL: s.url, SUPABASE_SERVICE_ROLE_KEY: 'test' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      p.stdout.on('data', (d) => { izhod += d })
      p.stderr.on('data', (d) => { izhod += d })
      p.on('close', r)
    })
    return { koda, izhod, patchi: s.patchi, prekinjenih: s.prekinjenih() }
  } finally {
    s.srv.close()
  }
}

test('brez predmodula izgubljen PATCH pusti ceno nezapisano', async () => {
  const r = await zaganjaj({ predmodul: false, prekiniPatch: 1 })
  assert.equal(r.prekinjenih, 1)
  assert.match(r.izhod, /fetch failed/)
  assert.deepEqual(r.patchi, VSI.slice(1))
})

test('s predmodulom se ECONNRESET na PATCH igralca ponovi in cena se zapiše', async () => {
  const r = await zaganjaj({ predmodul: true, prekiniPatch: 1 })
  assert.equal(r.prekinjenih, 1)
  assert.doesNotMatch(r.izhod, /fetch failed/)
  assert.match(r.izhod, /baza: ponovim/)
  assert.equal(r.koda, 0)
  assert.deepEqual([...r.patchi].sort((a, b) => a.length - b.length || a.localeCompare(b)), VSI)
})

test('predmodul brez napak ne spremeni zapisa', async () => {
  const r = await zaganjaj({ predmodul: true, prekiniPatch: 0 })
  assert.doesNotMatch(r.izhod, /ponovim/)
  assert.deepEqual([...r.patchi].sort((a, b) => a.length - b.length || a.localeCompare(b)), VSI)
})
