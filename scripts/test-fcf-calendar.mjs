import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vir, { preberiBlok, glavaStrani, vZapisnik, vrsticeRsc, tokRsc, FcfZavrnitev } from './viri/fcf.mjs'

const fixture = name => readFileSync(new URL(`./vzorci/${name}`, import.meta.url), 'utf8')
const oldHome = fixture('es-fcf-calendar-old-4115262.html')
const newHome = fixture('es-fcf-calendar-new-4115262.html')
const oldAway = fixture('es-fcf-calendar-old-4115382.html')
const FIRST = 4115228, HOME = 4115262, AWAY = 4115382, CODE = '4115228-4115467'
const DAY = 86400000, today = Date.parse('2026-10-18T12:00:00Z')
const names = ['CALLDETENES, C.F.', 'SANT QUIRZE BESORA, U.D.', ...Array.from({ length: 14 }, (_, i) => `SYNTHETIC CLUB ${i + 2}, C.F.`)]
const links = ['/ca/clubs/1630/categories/28509104', '/ca/clubs/1089/categories/15545551', ...Array.from({ length: 14 }, (_, i) => `/ca/clubs/${80000 + i}/categories/${90000 + i}`)]
const el = (type, children, props = {}) => ['$', type, null, { ...props, children }]
const htmlFor = root => `<!doctype html><title>Acta: SYNTHETIC calendar control | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:' + JSON.stringify(root) + '\n')}])</script>`
// These generated opponents and the R5 response are TEST-ONLY, never primary evidence.
function synthetic(id, home, away, round, { group = 'GRUP 4', season = '2026 / 27', score = '- - -' } = {}) {
  return htmlFor({ c: ['', 'ca', 'competicio', 'acta', String(id)], headers: [
    el('section', el('div', [el('a', names[home], { href: links[home] }), el('div', [el('span', 'Pendent'), el('span', score)]), el('a', names[away], { href: links[away] })]), { title: 'Acta del partit' }),
    el('div', ['COMPETICIÓ', '/', 'TERCERA CATALANA', '/', group, '/', `Jornada ${round}`].map(x => el('span', x))),
    el('span', ['Temporada', ': ', season]), el('span', ['Data', ': ', '27.02.2030']), el('span', ['Hora', ': ', '16.00 H']),
  ] })
}
function variant(html, replace) {
  const root = vrsticeRsc(tokRsc(html)).get('0')
  const walk = value => {
    if (typeof value === 'string') return replace(value)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    return value
  }
  return htmlFor(walk(root))
}
const syntheticNewAway = variant(oldAway, s => s === '20' ? '5' : s)
function withScore(html) {
  let dash = 0
  return variant(html, s => s === '-' && ++dash !== 2 ? '1' : s)
}
// Circle-method double round robin: 16 clubs, 30 rounds, 240 unique directed pairs.
// First pairing is clubs0/1 in R5 and R20. Assign real IDs only to the two excerpts.
function calendar() {
  const ring = [0, ...Array.from({ length: 14 }, (_, i) => i + 2), 1]
  const rounds = [5, ...Array.from({ length: 15 }, (_, i) => i + 1).filter(x => x !== 5)]
  const rows = []
  let next = FIRST
  for (const round of rounds) {
    for (let i = 0; i < 8; i++) {
      const home = ring[i], away = ring[15 - i]
      for (const [h, a, r] of [[home, away, round], [away, home, round + 15]]) {
        while ([HOME, AWAY].includes(next)) next++
        const id = home === 0 && away === 1 ? (r === 5 ? HOME : AWAY) : next++
        rows.push([id, synthetic(id, h, a, r)])
      }
    }
    ring.splice(1, 0, ring.pop())
  }
  const out = new Map(rows)
  out.set(HOME, newHome); out.set(AWAY, oldAway)
  return out
}
function setup(t, { pages = calendar(), fresh = [], response = new Map([[HOME, newHome], [AWAY, syntheticNewAway]]) } = {}) {
  const before = process.cwd(), dir = mkdtempSync(join(tmpdir(), 'slff-fcf-calendar-'))
  process.chdir(dir)
  mkdirSync('scripts/.predpomnilnik/fcf', { recursive: true })
  const cache = id => `scripts/.predpomnilnik/fcf/acta-${id}.html`
  for (const [id, html] of pages) {
    writeFileSync(cache(id), html)
    if (fresh.includes(id)) utimesSync(cache(id), new Date(0), new Date(0))
  }
  t.mock.method(globalThis, 'fetch', () => { throw Error('Real network forbidden in calendar tests') })
  t.after(() => { process.chdir(before); rmSync(dir, { recursive: true, force: true }); t.mock.restoreAll() })
  const calls = [], filenames = []
  const prenesi = async (url, filename, force) => {
    const id = Number(url.split('/').at(-1)); calls.push(id)
    assert.equal(url, `https://www.fcf.cat/ca/competicio/acta/${id}`); assert.equal(force, true)
    filenames.push(filename)
    if (filename.startsWith('.paired-')) {
      assert.match(filename, new RegExp(`^\\.paired-${id}-[0-9a-f-]{36}\\.html$`))
      assert.equal(existsSync(`scripts/.predpomnilnik/fcf/${filename}`), false, 'new private filename has no stale fallback')
    }
    const body = response.get(id)
    if (body instanceof Error) throw body
    assert.equal(typeof body, 'string', `unexpected provider read ${id}`)
    // Both ordinary importer callbacks write their requested cache file before returning.
    writeFileSync(`scripts/.predpomnilnik/fcf/${filename}`, body)
    return body
  }
  return { calls, filenames, cache, read: (code = CODE, options = {}) => preberiBlok(code, prenesi, { danes: today, ...options }) }
}
function assertComplete(block) {
  assert.equal(block.tekme.length, 240)
  for (let round = 1; round <= 30; round++) {
    const games = block.tekme.filter(x => x.g.krog === round)
    assert.equal(games.length, 8, `R${round} needs eight fixtures`)
    assert.equal(new Set(games.flatMap(x => [x.g.domaci, x.g.gostje])).size, 16)
  }
  assert.equal(new Set(block.tekme.map(x => `${x.g.domaci}|${x.g.gostje}`)).size, 240)
}

test('authentic receipts prove old R5 became R20 while reciprocal stayed pending R20', () => {
  assert.deepEqual([oldHome, newHome, oldAway].map(h => glavaStrani(h).krog), [5, 20, 20])
  assert.deepEqual([oldHome, newHome, oldAway].map(h => glavaStrani(h).izid), [null, null, null])
  assert.equal(glavaStrani(newHome).domaci, glavaStrani(oldAway).gostje)
  assert.equal(glavaStrani(newHome).gostje, glavaStrani(oldAway).domaci)
  assert.equal(vZapisnik(newHome), null)
})

// RED regression: without recovery the source block returns both directions in R20.
test('mixed authentic R20 pair refreshes only two reused cache members and returns a coherent calendar', async t => {
  const f = setup(t), b = await f.read()
  assert.deepEqual(f.calls, [HOME, AWAY], 'mixed cached R20 pair must trigger the two targeted reads')
  assertComplete(b)
  assert.equal(b.tekme.find(x => x.id === HOME).g.krog, 20)
  assert.equal(b.tekme.find(x => x.id === AWAY).g.krog, 5, 'SYNTHETIC response only; actual new reciprocal round remains unknown')
  assert.deepEqual(Object.keys(b).sort(), ['ni', 'skupina', 'tekme', 'tujih'])
  assert.deepEqual(Object.keys(b.tekme[0]).sort(), ['g', 'html', 'id'])
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf').sort(), [...calendar().keys()].map(id => `acta-${id}.html`).sort())
})

for (const fresh of [[HOME], [AWAY]]) test(`already provider-fresh member ${fresh[0]} is not read again`, async t => {
  const response = new Map([[HOME, newHome], [AWAY, oldAway]])
  // The one targeted cached member supplies a coherent source correction.
  if (fresh[0] === HOME) response.set(AWAY, syntheticNewAway)
  else response.set(HOME, oldHome)
  const f = setup(t, { fresh, response }), b = await f.read()
  assert.deepEqual(f.calls, fresh[0] === HOME ? [HOME, AWAY] : [AWAY, HOME]); assertComplete(b)
})

test('healthy complete calendar uses cache without provider reads', async t => {
  const pages = calendar(); pages.set(HOME, oldHome)
  const f = setup(t, { pages }); assertComplete(await f.read()); assert.deepEqual(f.calls, [])
})

test('both initial members already fetched fail closed without a third read', async t => {
  const f = setup(t, { fresh: [HOME, AWAY], response: new Map([[HOME, newHome], [AWAY, oldAway]]) })
  await assert.rejects(f.read(), /fcf:.*koledar/i); assert.deepEqual(f.calls, [HOME, AWAY])
})

for (const [label, mutate] of [
  ['multiple opposed pending pairs', pages => {
    const rows = [...pages].filter(([id]) => ![HOME, AWAY].includes(id))
    const [id, h] = rows[0], g = glavaStrani(h)
    const opposite = rows.find(([, p]) => glavaStrani(p).domaci === g.gostje && glavaStrani(p).gostje === g.domaci)
    pages.set(id, variant(h, s => s === `Jornada ${g.krog}` ? `Jornada ${glavaStrani(opposite[1]).krog}` : s))
  }],
  ['unrelated moved fixture', pages => {
    const [id, h] = [...pages].find(([id]) => ![HOME, AWAY].includes(id))
    pages.set(id, variant(h, s => /^Jornada /.test(s) ? 'Jornada 30' : s))
  }],
  ['duplicate directed opponent', pages => {
    const rows = [...pages].filter(([id]) => ![HOME, AWAY].includes(id)), [id] = rows[0]
    pages.set(id, variant(rows[1][1], s => s === String(rows[1][0]) ? String(id) : s))
  }],
  ['invalid round', pages => {
    const [id, h] = [...pages].find(([id]) => ![HOME, AWAY].includes(id))
    pages.set(id, variant(h, s => /^Jornada /.test(s) ? 'Jornada 31' : s))
  }],
]) test(`${label} fails without speculative provider reads`, async t => {
  const pages = calendar(); mutate(pages); const f = setup(t, { pages })
  await assert.rejects(f.read(), /fcf:.*koledar/i); assert.deepEqual(f.calls, [])
})

for (const [label, body] of [
  ['still same round', oldAway],
  ['distinct target rounds but global overfull round', variant(oldAway, s => s === '20' ? '6' : s)],
  ['out-of-range round', variant(oldAway, s => s === '20' ? '31' : s)],
]) test(`${label} fails after bounded recovery`, async t => {
  const f = setup(t, { response: new Map([[HOME, newHome], [AWAY, body]]) })
  await assert.rejects(f.read(), /fcf:.*koledar/i); assert.deepEqual(f.calls, [HOME, AWAY])
})

for (const [label, body] of [
  ['wrong embedded acta route', variant(newHome, s => s === String(HOME) ? String(AWAY) : s)],
  ['wrong group', variant(newHome, s => s === 'GRUP 4' ? 'GRUP 13' : s)],
  ['wrong season', variant(newHome, s => s === '2026 / 27' ? '2025 / 26' : s)],
  ['wrong competition', variant(newHome, s => s === 'TERCERA CATALANA' ? 'QUARTA CATALANA' : s)],
  ['wrong opponent', variant(newHome, s => s === names[1] ? 'OTHER CLUB, U.D.' : s)],
  ['same short name different full club', variant(newHome, s => s === names[1] ? 'SANT QUIRZE BESORA, C.F.' : s)],
  ['wrong official club side binding', variant(newHome, s => s === links[1] ? links[0] : s)],
  ['missing report', '<title>Acta no trobada</title>'],
]) test(`${label} is rejected before replacing canonical cache and stops before next member`, async t => {
  const f = setup(t, { response: new Map([[HOME, body], [AWAY, syntheticNewAway]]) })
  const before = readFileSync(f.cache(HOME), 'utf8')
  await assert.rejects(f.read(), /fcf:/)
  assert.deepEqual(f.calls, [HOME]); assert.equal(readFileSync(f.cache(HOME), 'utf8'), before)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
})

for (const [label, failure] of [
  ['403', Object.assign(Error('blocked'), { status: 403 })],
  ['429', Object.assign(Error('rate limited'), { status: 429 })],
  ['timeout', new DOMException('source timeout', 'TimeoutError')],
  ['empty response', ''], ['unknown response', '<title>Maintenance</title>'],
  ['challenge', '<title>Just a moment</title>cf_chl_opt'],
]) test(`first refresh ${label} stops with no next read or stale fallback`, async t => {
  const f = setup(t, { response: new Map([[HOME, failure], [AWAY, syntheticNewAway]]) })
  await assert.rejects(f.read(), e => {
    if (['403', '429', 'challenge'].includes(label)) assert.ok(e instanceof FcfZavrnitev)
    if (label === 'timeout') assert.equal(e.name, 'TimeoutError')
    return true
  })
  assert.deepEqual(f.calls, [HOME]); assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
})

test('successive failed recovery calls use unique private filenames and leave unrelated staging untouched', async t => {
  const f = setup(t, { response: new Map([[HOME, '<title>Maintenance</title>']]) })
  const prior = 'scripts/.predpomnilnik/fcf/.paired-previous-run.html'
  writeFileSync(prior, 'unrelated prior staging receipt')
  await assert.rejects(f.read(), /fcf:/)
  await assert.rejects(f.read(), /fcf:/)
  assert.equal(new Set(f.filenames).size, 2)
  assert.deepEqual(f.calls, [HOME, HOME])
  assert.equal(readFileSync(prior, 'utf8'), 'unrelated prior staging receipt')
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 241)
})

for (const label of ['partial', '15 clubs', 'scored pair']) test(`${label} retains ordinary block behavior without recovery`, async t => {
  const pages = calendar()
  if (label === 'partial') pages.delete(FIRST)
  if (label === '15 clubs') for (const [id, html] of pages) pages.set(id, variant(html, s => s === names[15] ? names[14] : s))
  if (label === 'scored pair') pages.set(HOME, withScore(newHome))
  const f = setup(t, { pages, response: new Map([[FIRST, '<title>Acta no trobada</title>']]) })
  const block = await f.read()
  assert.equal(block.tekme.length, label === 'partial' ? 239 : 240)
  assert.deepEqual(f.calls, label === 'partial' ? [FIRST] : [])
})

test('real source-supplied score is accepted through the normal parser during targeted refresh', async t => {
  const scored = withScore(syntheticNewAway)
  const f = setup(t, { response: new Map([[HOME, newHome], [AWAY, scored]]) }), b = await f.read()
  assertComplete(b)
  const target = b.tekme.find(x => x.id === AWAY)
  assert.deepEqual(target.g.izid, { domaci: 1, gostje: 1 })
  assert.deepEqual(vZapisnik(target.html).rezultat, { domaci: 1, gostje: 1 })
  assert.equal(vZapisnik(target.html).prazen, true, 'header score cannot invent lineups')
  assert.equal(vir.fetch.name, 'fcfFetch')
})
