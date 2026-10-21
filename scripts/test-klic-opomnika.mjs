import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { klicSPonovitvami, bralniFetch } from './klic-opomnika.mjs'

const reset = () => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) })
const tih = { log: () => {}, zamiki: [0, 0] }

test('ECONNRESET: klic ponovimo in vrnemo odgovor', async () => {
  let klici = 0
  const odgovor = await klicSPonovitvami(async () => { if (++klici < 3) throw reset(); return { ok: true } }, 'u', {}, tih)
  assert.equal(klici, 3)
  assert.deepEqual(odgovor, { ok: true })
})

test('ECONNRESET po vseh poskusih: napaka gre klicatelju', async () => {
  let klici = 0
  await assert.rejects(klicSPonovitvami(async () => { klici++; throw reset() }, 'u', {}, tih), /fetch failed/)
  assert.equal(klici, 3)
})

test('HTTP odgovor (tudi 409/500) in neomrežna napaka se ne ponovita', async () => {
  let klici = 0
  const r = await klicSPonovitvami(async () => { klici++; return { status: 409 } }, 'u', {}, tih)
  assert.equal(r.status, 409)
  await assert.rejects(klicSPonovitvami(async () => { klici++; throw new TypeError('Invalid URL') }, 'u', {}, tih), /Invalid URL/)
  assert.equal(klici, 2)
})

// Skripta zares, proti lokalnemu strežniku, ki prvi klic funkcije prekine.
async function zazeni(vedenje, { resetLig = 0 } = {}) {
  const klici = []
  let branja = 0
  const streznik = http.createServer((req, res) => {
    if (req.url.startsWith('/rest/v1/competitions')) {
      if (++branja <= resetLig) return req.socket.resetAndDestroy()
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify([{ id: 1, slug: 'liga-a', name: 'A' }, { id: 2, slug: 'liga-b', name: 'B' }]))
    }
    let telo = ''
    req.on('data', (d) => { telo += d })
    req.on('end', () => {
      const liga = JSON.parse(telo).competition_id
      klici.push(liga)
      if (vedenje(liga, klici.filter((l) => l === liga).length)) return req.socket.resetAndDestroy()
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ kandidati_stevilo: 2, poslano: 2, preskoceno: 0 }))
    })
  })
  await new Promise((r) => streznik.listen(0, '127.0.0.1', r))
  const izhod = await new Promise((resolve) => {
    let out = ''
    const p = spawn(process.execPath, ['scripts/posli-opomnike.mjs'], {
      env: {
        ...process.env,
        SUPABASE_URL: `http://127.0.0.1:${streznik.address().port}`,
        SUPABASE_SERVICE_ROLE_KEY: 'k', VRSTA: 'opomnik-push', SUHO: 'false', OPOMNIK_ZAMIKI_MS: '0,0',
      },
    })
    p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
    p.on('close', (koda) => resolve({ koda, out }))
  })
  streznik.close()
  return { ...izhod, klici, branja }
}

test('skripta: prekinjena povezava na prvem klicu, ponovitev uspe, korak je zelen', async () => {
  const r = await zazeni((liga, n) => liga === 1 && n === 1)
  assert.equal(r.koda, 0, r.out)
  assert.deepEqual(r.klici, [1, 1, 2])
  assert.match(r.out, /liga-a\s+kandidatov\s+2 · poslano 2/)
})

test('skripta: liga, ki pada ves cas, ne ustavi drugih, korak pa konca z napako', async () => {
  const r = await zazeni((liga) => liga === 1)
  assert.equal(r.koda, 1, r.out)
  assert.deepEqual(r.klici, [1, 1, 1, 2])
  assert.match(r.out, /liga-a\s+NAPAKA KLICA: fetch failed \(ECONNRESET\)/)
  assert.match(r.out, /liga-b\s+kandidatov\s+2 · poslano 2/)
  assert.match(r.out, /Lig z napako: 1/)
})

test('skripta: prekinjeno branje seznama lig se ponovi', async () => {
  const r = await zazeni(() => false, { resetLig: 1 })
  assert.equal(r.koda, 0, r.out)
  assert.equal(r.branja, 2)
  assert.deepEqual(r.klici, [1, 2])
})

test('bralniFetch: GET se ponovi, POST ne', async () => {
  const og = globalThis.fetch
  let klici = 0
  globalThis.fetch = async () => { if (++klici < 2) throw reset(); return { ok: true } }
  try {
    const f = bralniFetch({ log: () => {}, zamiki: [0, 0] })
    assert.deepEqual(await f('u', { method: 'GET' }), { ok: true })
    assert.equal(klici, 2)
    klici = 0
    await assert.rejects(f('u', { method: 'POST' }), /fetch failed/)
    assert.equal(klici, 1)
  } finally { globalThis.fetch = og }
})
