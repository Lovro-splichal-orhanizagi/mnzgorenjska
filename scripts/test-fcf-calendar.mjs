import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vir, { preberiBlok, glavaStrani, vZapisnik, vrsticeRsc, tokRsc, FcfZavrnitev, uskladiMesaniPar } from './viri/fcf.mjs'

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
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome)
  assert.equal(readFileSync(f.cache(AWAY), 'utf8'), syntheticNewAway)
  assertComplete(await f.read())
  assert.deepEqual(f.calls, [HOME, AWAY], 'a successful recovery persists the coherent pair')
  assert.deepEqual(readdirSync('scripts/.predpomnilnik/fcf').sort(), [...calendar().keys()].map(id => `acta-${id}.html`).sort())
})

// A restored cache timestamp may be ahead of the local clock. Negative cache
// age must never satisfy the forced targeted read's -1 sentinel.
for (const future of [[HOME], [AWAY], [HOME, AWAY]]) test(`future cache mtime for ${future.join('/')} cannot skip targeted source reads`, async t => {
  const f = setup(t), timestamp = new Date(Date.now() + DAY)
  for (const id of future) utimesSync(f.cache(id), timestamp, timestamp)
  const b = await f.read()
  assert.deepEqual(f.calls, [HOME, AWAY], 'both cache-reused targets require source revalidation even with future mtime')
  assertComplete(b)
  assert.equal(f.filenames.every(name => name.startsWith('.paired-')), true)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
})

test('future cache mtime cannot bypass refreshed route identity validation', async t => {
  const invalid = variant(newHome, s => s === String(HOME) ? String(AWAY) : s)
  const f = setup(t, { response: new Map([[HOME, invalid], [AWAY, syntheticNewAway]]) })
  const timestamp = new Date(Date.now() + DAY)
  utimesSync(f.cache(HOME), timestamp, timestamp)
  await assert.rejects(f.read(), /fcf:.*koledar/i)
  assert.deepEqual(f.calls, [HOME], 'invalid first target must stop before reading the reciprocal')
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
})

test('future cache mtime in a healthy calendar retains ordinary cached behavior', async t => {
  const pages = calendar(); pages.set(HOME, oldHome)
  const f = setup(t, { pages }), timestamp = new Date(Date.now() + DAY)
  for (const id of [HOME, AWAY]) utimesSync(f.cache(id), timestamp, timestamp)
  assertComplete(await f.read()); assert.deepEqual(f.calls, [])
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

test('two successive globally rejected recoveries preserve the original pair and cannot erase their own trigger', async t => {
  const overfull = variant(oldAway, s => s === '20' ? '6' : s)
  const f = setup(t, { response: new Map([[HOME, newHome], [AWAY, overfull]]) })
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(f.read(), /fcf:.*koledar/i)
  assert.deepEqual(f.calls, [HOME, AWAY, HOME, AWAY], 'each rejected attempt must still require the two original cached targets')
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome)
  assert.equal(readFileSync(f.cache(AWAY), 'utf8'), oldAway)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
})

for (const [label, failure] of [
  ['wrong embedded route', variant(syntheticNewAway, s => s === String(AWAY) ? String(HOME) : s)],
  ['403', Object.assign(Error('blocked'), { status: 403 })],
  ['429', Object.assign(Error('rate limited'), { status: 429 })],
  ['timeout', new DOMException('source timeout', 'TimeoutError')],
  ['empty response', ''], ['unknown response', '<title>Maintenance</title>'],
  ['challenge', '<title>Just a moment</title>cf_chl_opt'],
  ['missing report', '<title>Acta no trobada</title>'],
]) test(`accepted first response followed by second-member ${label} preserves both original targets`, async t => {
  const acceptedHome = variant(newHome, s => s === '27.02.2027' ? '28.02.2027' : s)
  const f = setup(t, { response: new Map([[HOME, acceptedHome], [AWAY, failure]]) })
  await assert.rejects(f.read(), e => {
    if (['403', '429', 'challenge'].includes(label)) assert.ok(e instanceof FcfZavrnitev)
    if (label === 'timeout') assert.equal(e.name, 'TimeoutError')
    return true
  })
  assert.deepEqual(f.calls, [HOME, AWAY])
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), newHome, 'accepted first body must remain private until full success')
  assert.equal(readFileSync(f.cache(AWAY), 'utf8'), oldAway)
  assert.equal(readdirSync('scripts/.predpomnilnik/fcf').length, 240)
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

// Canonical database aliases must not weaken exact source-header revalidation.
for (const [cachedName, changedName] of [
  ['VILANOVA ATLETIC', 'FUTBOL CLUB ATLETIC VNG PASIFAE'],
  ['FUTBOL CLUB ATLETIC VNG PASIFAE', 'VILANOVA ATLETIC'],
]) test(`canonical alias ${cachedName} still rejects a changed full source name with the same official link`, async t => {
  const rename = (html, name) => variant(html, s => s === names[0] ? name : s)
  const pages = new Map([...calendar()].map(([id, html]) => [id, rename(html, cachedName)]))
  const f = setup(t, { pages, response: new Map([
    [HOME, rename(newHome, changedName)], [AWAY, rename(syntheticNewAway, cachedName)],
  ]) })
  const before = readFileSync(f.cache(HOME), 'utf8')
  await assert.rejects(f.read(), /fcf:.*koledar/i)
  assert.deepEqual(f.calls, [HOME], 'changed source identity stops before the reciprocal read')
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), before)
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

// TEST-ONLY header projections exercise complete calendar invariants, not policy approval.
// The runtime wrapper supplies the equivalent identities only from validated installed DB markers.
function historicalCalendarOptions(pages,ids) {
 return {preskoci:new Set(ids.map(id=>`es${id}`)),historicalFixtures:ids.map(id=>{
  const g={...glavaStrani(pages.get(id)),datum:'2026-09-20',izid:{domaci:0,gostje:0}}
  const historicalMarker={sourceMatchId:String(id),reportId:`es${id}`,fixture:{sourceMatchId:String(id),sourceRound:g.krog,playedOn:g.datum,season:g.sezona,observedHomeScore:0,observedAwayScore:0}}
  return{id,g,historicalMarker}
 })}
}
for(const ids of [[FIRST],[FIRST,FIRST+1]])test(`header-only historical${ids.length} preserves all240 calendar identities and ordinary two-read return-pair recovery`,async t=>{
 const pages=calendar(),options=historicalCalendarOptions(pages,ids),f=setup(t,{pages})
 // Excluded cached content must never be read/parsed to fill calendar identities.
 for(const id of ids)writeFileSync(f.cache(id),'excluded raw must stay unread')
 const block=await f.read(CODE,options)
 assertComplete(block);assert.deepEqual(f.calls,[HOME,AWAY]);assert.equal(block.tekme.filter(t=>t.historicalMarker).length,ids.length)
 for(const id of ids){assert.equal(block.tekme.find(t=>t.id===id).html,null);assert.equal(readFileSync(f.cache(id),'utf8'),'excluded raw must stay unread')}
})
test('header-only history preserves bounded refusal when unrelated future return-pair source stays inconsistent',async t=>{
 const pages=calendar(),f=setup(t,{pages,response:new Map([[HOME,newHome],[AWAY,oldAway]])})
 await assert.rejects(f.read(CODE,historicalCalendarOptions(pages,[FIRST])),/fcf:.*koledar/i)
 assert.deepEqual(f.calls,[HOME,AWAY])
})
test('header-only history preserves refusal for additional unrelated future calendar corruption before any repair reads',async t=>{
 const pages=calendar(),options=historicalCalendarOptions(pages,[FIRST])
 const [id,html]=[...pages].find(([id])=>![FIRST,HOME,AWAY].includes(id))
 pages.set(id,variant(html,s=>/^Jornada /.test(s)?'Jornada 30':s))
 const f=setup(t,{pages})
 await assert.rejects(f.read(CODE,options),/fcf:.*koledar/i);assert.deepEqual(f.calls,[])
})
test('historical skip without a matching authoritative calendar identity fails rather than reducing239fixtures',async t=>{
 const f=setup(t)
 await assert.rejects(f.read(CODE,{preskoci:new Set([`es${FIRST}`])}),/fcf:.*koledar/i)
 assert.deepEqual(f.calls,[])
})

// Mešan povratni par kot stanje vira (Quarta g5/g7/g22 2026/27): krog ima obe
// smeri para, zrcalni krog mu manjka; zastareli prvotni zapisnik je brez izida
// s preteklim datumom pred datumom drugega člana.
test('both members already fetched with an earlier stale pending date reconcile without a third read', async t => {
  const stale = variant(newHome, s => s === '27.02.2027' ? '10.10.2026' : s)
  const f = setup(t, { fresh: [HOME, AWAY], response: new Map([[HOME, stale], [AWAY, oldAway]]) }), b = await f.read()
  assert.deepEqual(f.calls, [HOME, AWAY], 'source state: no repeated targeted read')
  assertComplete(b)
  assert.equal(b.tekme.find(x => x.id === HOME).g.krog, 5); assert.equal(b.tekme.find(x => x.id === HOME).g.datum, '2030-02-27')
  assert.equal(b.tekme.find(x => x.id === AWAY).g.krog, 20)
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), stale, 'cached page keeps the original source header')
})
test('refreshed pair still in one round reconciles and only then replaces both cached members', async t => {
  const stale = variant(newHome, s => s === '27.02.2027' ? '10.10.2026' : s)
  const f = setup(t, { response: new Map([[HOME, stale], [AWAY, oldAway]]) }), b = await f.read()
  assert.deepEqual(f.calls, [HOME, AWAY]); assertComplete(b)
  assert.equal(b.tekme.find(x => x.id === HOME).g.krog, 5)
  assert.equal(readFileSync(f.cache(HOME), 'utf8'), stale); assert.equal(readFileSync(f.cache(AWAY), 'utf8'), oldAway)
})
test('refreshed pair with equal future dates stays refused and keeps the original cache', async t => {
  const f = setup(t, { response: new Map([[HOME, newHome], [AWAY, oldAway]]) })
  await assert.rejects(f.read(), /fcf: neskladen koledar — povratni par ostaja neskladen/)
  assert.equal(readFileSync(f.cache(AWAY), 'utf8'), oldAway); assert.deepEqual(f.calls, [HOME, AWAY])
})

// Čisti koledar: n klubov, krožna metoda, prvi del 1..R/2, povratni R/2+1..R.
function koledar(n, { danes = '2026-11-01' } = {}) {
  const size = n + n % 2, ring = Array.from({ length: size }, (_, i) => i), half = size - 1, out = []
  for (let r = 0; r < half; r++) {
    for (let i = 0; i < size / 2; i++) {
      const [h, a] = [ring[i], ring[size - 1 - i]]
      if (h >= n || a >= n) continue
      for (const [d, g, k] of [[h, a, r + 1], [a, h, r + 1 + half]]) {
        const datum = `${k + 1 <= half ? '2026' : '2027'}-${String((k % 12) + 1).padStart(2, '0')}-1${k % 9}`
        out.push({ id: 1000 + out.length, g: { domaci: `KLUB ${d}, C.F.`, gostje: `KLUB ${g}, C.F.`, krog: k, datum, ura: '12:00', izid: datum < danes ? { domaci: 1, gostje: 0 } : null } })
      }
    }
    ring.splice(1, 0, ring.pop())
  }
  return out
}
const najdi = (ts, d, g, k) => ts.find(t => t.g.domaci === `KLUB ${d}, C.F.` && t.g.gostje === `KLUB ${g}, C.F.` && (k === undefined || t.g.krog === k))
// g7: B–A iz zrcalnega kroga odigran v krogu A–B; A–B ostane brez izida, prej.
function mesan(n, round, { stale = '2026-10-04', moved = { datum: '2026-10-07', izid: { domaci: 7, gostje: 1 } } } = {}) {
  const ts = koledar(n), first = ts.find(t => t.g.krog === round), [d, g] = [first.g.domaci, first.g.gostje]
  const back = ts.find(t => t.g.domaci === g && t.g.gostje === d)
  Object.assign(first.g, { datum: stale, izid: null })
  back.g = { ...back.g, krog: round, ...moved }
  return { ts, first, back, mirror: ts.filter(t => t.g.krog !== round && t !== back).find(t => t.g.krog === round + (n + n % 2 - 1)).g.krog }
}
const popoln = (ts, n) => {
  const per = Math.floor(n / 2), R = n % 2 ? 2 * n : 2 * (n - 1)
  for (let k = 1; k <= R; k++) {
    const r = ts.filter(t => t.g.krog === k)
    assert.equal(r.length, per, `krog ${k}`); assert.equal(new Set(r.flatMap(t => [t.g.domaci, t.g.gostje])).size, 2 * per)
  }
}
for (const [label, n, round, opts, today] of [
  ['g7: played reversed member stays, stale original goes to round 18', 16, 3, {}, '2026-11-01'],
  ['g5: rescheduled future reversed member stays, stale original goes to round 14', 14, 1, { stale: '2026-10-03', moved: { datum: '2026-11-10', izid: null } }, '2026-11-01'],
  ['g22 (11-02): both past and pending, the earlier original moves', 16, 1, { stale: '2026-10-20', moved: { datum: '2026-10-29', izid: null } }, '2026-11-02'],
  ['odd club count with byes', 15, 2, {}, '2026-11-01'],
]) test(`uskladiMesaniPar ${label}`, () => {
  const { ts, first, back, mirror } = mesan(n, round, opts), date = ts.find(t => t.g.krog === mirror && t !== first).g.datum
  const u = uskladiMesaniPar(ts, { danes: Date.parse(`${today}T12:00:00Z`) })
  assert.deepEqual(u, { premaknjen: first.id, ostane: back.id, izKroga: round, vKrog: mirror, datum: date })
  assert.equal(first.g.krog, mirror); assert.equal(first.g.datum, date); assert.equal(first.g.ura, null); assert.equal(first.g.izid, null)
  assert.equal(back.g.krog, round); popoln(ts, n)
  assert.equal(new Set(ts.map(t => `${t.g.domaci}|${t.g.gostje}`)).size, n * (n - 1))
})
test('uskladiMesaniPar leaves a healthy calendar untouched', () => {
  const ts = koledar(16), before = structuredClone(ts)
  assert.equal(uskladiMesaniPar(ts, { danes: Date.parse('2026-11-01') }), null); assert.deepEqual(ts, before)
})
for (const [label, build, expected] of [
  ['equal future dates (authentic tercera-g4 R20)', () => mesan(16, 5, { stale: '2027-02-27', moved: { datum: '2027-02-27', izid: null } }).ts, 'nejasen'],
  ['stale date after the played member', () => mesan(16, 3, { stale: '2026-10-09' }).ts, 'nejasen'],
  ['both members played', () => { const m = mesan(16, 3); m.first.g.izid = { domaci: 0, gostje: 0 }; return m.ts }, 'nejasen'],
  ['earlier member not yet past', () => mesan(16, 3, { stale: '2026-11-05', moved: { datum: '2026-11-10', izid: null } }).ts, 'nejasen'],
  ['missing date', () => { const m = mesan(16, 3); m.first.g.datum = null; return m.ts }, 'nejasen'],
  ['deficient round is not the mirror', () => { const m = mesan(16, 3); for (const t of m.ts) if (t.g.krog === 18 && t !== m.first) t.g.krog = 99; for (const t of m.ts) if (t.g.krog === 17) t.g.krog = 18; for (const t of m.ts) if (t.g.krog === 99) t.g.krog = 17; return m.ts }, null],
  ['a second short round', () => { const m = mesan(16, 3); m.ts.find(t => t.g.krog === 10).g.krog = 11; return m.ts }, null],
  ['a duplicated directed pair', () => { const m = mesan(16, 3); const x = m.ts.find(t => t.g.krog === 10); x.g = { ...m.ts.find(t => t.g.krog === 11).g, krog: 10 }; return m.ts }, null],
  ['one fixture missing', () => { const m = mesan(16, 3); m.ts.splice(m.ts.findIndex(t => t.g.krog === 25), 1); return m.ts }, null],
  ['historical member', () => { const m = mesan(16, 3); m.first.historicalMarker = {}; return m.ts }, null],
]) test(`uskladiMesaniPar refuses ${label}`, () => {
  const ts = build(), before = structuredClone(ts), u = uskladiMesaniPar(ts, { danes: Date.parse('2026-11-01T12:00:00Z') })
  if (expected === 'nejasen') assert.equal(u?.nejasen, true); else assert.equal(u, null)
  assert.deepEqual(ts, before, 'no mutation without an exact unique reconciliation')
})
