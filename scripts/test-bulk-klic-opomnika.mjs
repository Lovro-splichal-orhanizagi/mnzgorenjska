import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { klicSPonovitvami, ZAMIK_NEJASNO_MS } from './klic-opomnika.mjs'

const reset = () => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) })
const tih = { log: () => {}, zamiki: [0, 0], zamikNejasno: 0 }

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

test('ECONNRESET (nejasno): počakamo dlje od omejitve funkcije; ECONNREFUSED: kratek premor', async () => {
  const premori = []
  const log = (v) => premori.push(v)
  let n = 0
  await klicSPonovitvami(async () => { if (++n < 2) throw reset(); return {} }, 'u', {}, { log, zamiki: [2000, 6000], zamikNejasno: 0 })
  n = 0
  const zavrnjeno = () => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) })
  await klicSPonovitvami(async () => { if (++n < 2) throw zavrnjeno(); return {} }, 'u', {}, { log, zamiki: [0, 0], zamikNejasno: 65000 })
  assert.match(premori[0], /čez 0 s: ECONNRESET/)
  assert.match(premori[1], /čez 0 s: ECONNREFUSED/)
  // Privzeti premor po nejasni napaki mora presegati 60 s omejitve funkcije.
  assert.ok(ZAMIK_NEJASNO_MS > 60000)
})

test('503: klic ponovimo z dolgim premorom; po vseh poskusih vrnemo 503, ostali statusi se ne ponovijo', async () => {
  const premori = []
  let klici = 0
  const r = await klicSPonovitvami(async () => (++klici < 3 ? { status: 503 } : { status: 200 }), 'u', {}, { log: (v) => premori.push(v), zamiki: [2000, 6000], zamikNejasno: 0 })
  assert.equal(r.status, 200)
  assert.equal(klici, 3)
  assert.match(premori[0], /HTTP 503/)
  klici = 0
  const zadnji = await klicSPonovitvami(async () => { klici++; return { status: 503 } }, 'u', {}, tih)
  assert.equal(zadnji.status, 503)
  assert.equal(klici, 3)
  klici = 0
  for (const status of [500, 502, 504, 409]) await klicSPonovitvami(async () => { klici++; return { status } }, 'u', {}, tih)
  assert.equal(klici, 4)
})

test('500 brez telesa (upokojen delavec edge runtime) ponovimo; 500 z napako funkcije ne', async () => {
  const premori = []
  let klici = 0
  const r = await klicSPonovitvami(async () => (++klici < 2 ? new Response('', { status: 500 }) : new Response('{}', { status: 200 })), 'u', {}, { log: (v) => premori.push(v), zamiki: [2000, 6000], zamikNejasno: 0 })
  assert.equal(r.status, 200)
  assert.equal(klici, 2)
  assert.match(premori[0], /HTTP 500 brez telesa/)
  klici = 0
  const zadnji = await klicSPonovitvami(async () => { klici++; return new Response('', { status: 500 }) }, 'u', {}, tih)
  assert.equal(zadnji.status, 500)
  assert.equal(klici, 3)
  klici = 0
  const funkcija = await klicSPonovitvami(async () => { klici++; return new Response('{"error":"x"}', { status: 500 }) }, 'u', {}, tih)
  assert.equal(klici, 1)
  assert.deepEqual(await funkcija.json(), { error: 'x' })
})

// Skripta zares, proti lokalnemu strežniku, ki prvi klic funkcije prekine.
async function zazeni(vedenje, { resetLig = 0, lige = 2 } = {}) {
  const klici = []
  let branja = 0
  const streznik = http.createServer((req, res) => {
    if (req.url.startsWith('/rest/v1/competitions')) {
      if (++branja <= resetLig) return req.socket.resetAndDestroy()
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify(Array.from({ length: lige }, (_, i) => ({ id: i + 1, slug: `liga-${'abcdefghij'[i]}`, name: String(i) }))))
    }
    let telo = ''
    req.on('data', (d) => { telo += d })
    req.on('end', () => {
      const liga = JSON.parse(telo).competition_id
      klici.push(liga)
      const v = vedenje(liga, klici.filter((l) => l === liga).length)
      if (v === 503) { res.statusCode = 503; return res.end() }
      if (v) return req.socket.resetAndDestroy()
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

test('skripta: 5 lig zapored brez povezave ustavi korak (izpad povezave ne traja ur)', async () => {
  const r = await zazeni(() => true, { lige: 8 })
  assert.equal(r.koda, 1, r.out)
  assert.equal(r.klici.length, 5 * 3, r.out)
  assert.match(r.out, /5 lig zapored brez povezave/)
  assert.match(r.out, /Lig z napako: 5/)
})

test('skripta: 503 na prvem klicu, ponovitev uspe, korak je zelen', async () => {
  const r = await zazeni((liga, n) => (liga === 1 && n === 1 ? 503 : false))
  assert.equal(r.koda, 0, r.out)
  assert.deepEqual(r.klici, [1, 1, 2])
  assert.match(r.out, /ponovim klic \(2\/3\).*HTTP 503/)
})

test('skripta: 5 lig zapored s 503 ustavi korak', async () => {
  const r = await zazeni(() => 503, { lige: 8 })
  assert.equal(r.koda, 1, r.out)
  assert.equal(r.klici.length, 5 * 3, r.out)
  assert.match(r.out, /NAPAKA 503/)
  assert.match(r.out, /5 lig zapored brez povezave/)
})

test('skripta: prekinjeno branje seznama lig se ponovi', async () => {
  const r = await zazeni(() => false, { resetLig: 1 })
  assert.equal(r.koda, 0, r.out)
  assert.equal(r.branja, 2)
  assert.deepEqual(r.klici, [1, 2])
})

// SLF-439: opozorilo odsotnih po kosih. Lazna funkcija ravna kot prava: kandidati
// so tisti iz `email_log` brez uspesnega zapisa, `najvec_poslati` omeji kos,
// `najvec` (meja na ligo) preveri PRED posiljanjem.
async function zazeniOdsotne({ kandidatov = 32, suho = false, padlaPrvic = [], zeposlano = [] } = {}) {
  const cakajoci = new Set(Array.from({ length: kandidatov }, (_, i) => i + 1).filter((i) => !zeposlano.includes(i)))
  const poslanoKrat = new Map(zeposlano.map((i) => [i, 1]))
  const klici = []
  const streznik = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url.startsWith('/rest/v1/competitions')) return res.end(JSON.stringify([{ id: 1, slug: 'lj-1-liga', name: 'x' }]))
    let telo = ''
    req.on('data', (d) => { telo += d })
    req.on('end', () => {
      const v = JSON.parse(telo)
      klici.push(v)
      const n = cakajoci.size
      if (v.suho) return res.end(JSON.stringify({ suho: true, kandidati_stevilo: n }))
      if (typeof v.najvec === 'number' && n > v.najvec) { res.statusCode = 409; return res.end(JSON.stringify({ error: 'meja', kandidati_stevilo: n })) }
      const kos = [...cakajoci].slice(0, typeof v.najvec_poslati === 'number' ? v.najvec_poslati : n)
      let poslano = 0
      for (const i of kos) {
        poslanoKrat.set(i, (poslanoKrat.get(i) ?? 0) + 1)
        if (padlaPrvic.includes(i) && poslanoKrat.get(i) === 1) continue // napaka: v email_log z napako, ostane kandidat
        cakajoci.delete(i); poslano++
      }
      res.end(JSON.stringify({ kandidati_stevilo: n, poslano, preskoceno: kos.length - poslano }))
    })
  })
  await new Promise((r) => streznik.listen(0, '127.0.0.1', r))
  const izhod = await new Promise((resolve) => {
    let out = ''
    const p = spawn(process.execPath, ['scripts/posli-opomnike.mjs'], {
      env: {
        ...process.env,
        SUPABASE_URL: `http://127.0.0.1:${streznik.address().port}`,
        SUPABASE_SERVICE_ROLE_KEY: 'k', VRSTA: 'opozorilo-odsotni', SUHO: String(suho), OPOMNIK_ZAMIKI_MS: '0,0',
      },
    })
    p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
    p.on('close', (koda) => resolve({ koda, out }))
  })
  streznik.close()
  return { ...izhod, klici, cakajoci, poslanoKrat }
}

test('opozorilo odsotnih: 32 kandidatov gre v kosih po 10, vsak natanko enkrat', async () => {
  const r = await zazeniOdsotne()
  assert.equal(r.koda, 0, r.out)
  assert.deepEqual(r.klici.map((k) => k.najvec_poslati), [10, 10, 10, 10])
  assert.equal(r.cakajoci.size, 0)
  assert.equal(r.poslanoKrat.size, 32)
  assert.ok([...r.poslanoKrat.values()].every((n) => n === 1))
  assert.match(r.out, /lj-1-liga\s+kandidatov\s+32 · poslano 32/)
})

test('opozorilo odsotnih: ponovni zagon preskoci ze obvestene (email_log)', async () => {
  const r = await zazeniOdsotne({ zeposlano: Array.from({ length: 22 }, (_, i) => i + 1) })
  assert.equal(r.koda, 0, r.out)
  assert.deepEqual(r.klici.map((k) => k.najvec_poslati), [10])
  assert.ok([...r.poslanoKrat.values()].every((n) => n === 1))
  assert.match(r.out, /kandidatov\s+10 · poslano 10/)
})

test('opozorilo odsotnih: padli mail ne ustavi lige in drugim ne gre dvakrat', async () => {
  const r = await zazeniOdsotne({ padlaPrvic: [3] })
  assert.equal(r.koda, 0, r.out)
  assert.equal(r.poslanoKrat.get(3), 2) // padli ima en ponovni poskus v naslednjem kosu
  assert.ok([...r.poslanoKrat].filter(([i]) => i !== 3).every(([, n]) => n === 1))
  assert.equal(r.cakajoci.size, 0)
})

test('opozorilo odsotnih: suhi tek samo presteje; meja 300 se ne spremeni', async () => {
  const r = await zazeniOdsotne({ suho: true })
  assert.equal(r.koda, 0, r.out)
  assert.equal(r.klici.length, 1)
  assert.equal(r.klici[0].najvec_poslati, undefined)
  assert.equal(r.poslanoKrat.size, 0)
  const nad = await zazeniOdsotne({ kandidatov: 301 })
  assert.equal(nad.koda, 1, nad.out)
  assert.match(nad.out, /USTAVLJENO: 301 kandidatov \(meja 300\)/)
  assert.equal(nad.poslanoKrat.size, 0)
})
