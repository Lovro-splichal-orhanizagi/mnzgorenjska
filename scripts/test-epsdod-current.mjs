import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import eps, { vZapisnik, naslovTekme, razporedStrani } from './viri/eps.mjs'
const html = readFileSync(new URL('./vzorci/gr-epsdod-current-26804.html', import.meta.url), 'utf8')
const options = { domena: 'epsdod.gr', gameId: 26804, url: 'https://epsdod.gr/fyllo-agona/?game_id=26804', koda: 'epsdod.gr:497' }
const parse = (source = html, override = {}) => vZapisnik(source, { ...options, ...override })
test('new public report preserves match/player namespace, score, clock and substitution roles', () => {
  const z = parse()
  assert.ok(z)
  assert.equal(z.zapisnikId, 'gr5-26804')
  assert.equal(z.sezona, '2026/27')
  assert.equal(z.krog, 3)
  assert.equal(z.datum, '2026-11-15')
  assert.equal(z.ura, '17:30')
  assert.equal(z.domaci.ime, 'ΑΣΤΕΡΑΣ ΜΑΣΣΑΡΩΝ')
  assert.equal(z.gostje.ime, 'ΚΛΕΟΒΟΥΛΟΣ')
  assert.deepEqual(z.rezultat, { domaci: 0, gostje: 2 })
  assert.equal(z.domaci.postava.length, 11)
  assert.equal(z.gostje.postava.length, 11)
  assert.equal(z.domaci.postava[0].regSt, 50014966)
  assert.equal(z.domaci.postava[0].vratar, true)
  assert.deepEqual(z.goli.map(g => [g.regSt, g.minuta, g.enajstmetrovka]), [[50008933, 19, true], [50001184, 60, false]])
  assert.ok(z.domaci.postava.find(p => p.regSt === 50013318).preklopi.includes(71))
  assert.ok(z.domaci.rezerve.find(p => p.regSt === 50008488).preklopi.includes(71))
  assert.equal(z.nepopoln, false)
  assert.deepEqual(z.opozorila, [])
})
test('new report rejects foreign source and mismatched public report URL identity', () => {
  assert.equal(parse(html, { domena: 'epsana.gr' }), null)
  for (const url of ['https://epsdod.gr/fyllo-agona/?game_id=26805', 'https://evil.test/fyllo-agona/?game_id=26804', 'https://epsdod.gr/wp-admin/?game_id=26804']) assert.throws(() => parse(html, { url }), /identitet|naslov/i)
  assert.throws(() => parse(html, { koda: 'epsdod.gr:495' }), /lig|tekmovanj/i)
})
test('unfinished or contradictory new reports stay pending', () => {
  for (const bad of [
    html.replace('Τελικό', 'Σε εξέλιξη'),
    html.replace('>2</span></div><p class="enosi-bridge-match-sheet__status"', '>3</span></div><p class="enosi-bridge-match-sheet__status"'),
    html.replace('19&#039;', '—'),
    html.replace('Βασική ενδεκάδα', '???'),
    html.replace('lineup-slot">1</td>', 'lineup-slot">2</td>'),
    html.replace(/<section class="enosi-bridge-match-sheet__lineup-card[\s\S]*?<\/section>/, ''),
  ]) assert.equal(parse(bad).nepopoln, true)
})
test('only Dodecanese uses the new public report route', () => {
  assert.equal(eps.naslovZapisnika('epsdod.gr:497', 'gr5-26804'), options.url)
  assert.equal(naslovTekme('epsdod.gr', 24025), 'https://www.epsdod.gr/results/display_game.php?game_id=24025')
  assert.equal(naslovTekme('epsana.gr', 26804), 'https://www.epsana.gr/results/display_game.php?game_id=26804')
})
test('lineup identity and event minutes cannot invent appearances', () => {
  const bad = [
    html.replaceAll('player_id=1184', 'player_id=10751').replaceAll('ΓΙΑΤΣΙΑΤΣΟΣ ΣΥΜΕΩΝ', 'ΚΑΡΑΜΑΝΟΣ ΒΑΣΙΛΕΙΟΣ'),
    html.replace(/<li class="enosi-bridge-match-sheet__timeline-item[^>]*--substitution[\s\S]*?<\/li>/, ''),
    html.replace('player_id=14966', 'player_id=10144'),
    html.replace('19&#039;', 'abc19&#039;'),
    html.replace('19&#039;', '999&#039;'),
  ]
  for (const [i, source] of bad.entries()) { assert.notEqual(source, html); assert.equal(parse(source).nepopoln, true, `mutation ${i}`) }
})
test('event duplicates and omitted lineup substitution evidence stay pending', () => {
  const event = html.match(/<li class="enosi-bridge-match-sheet__timeline-item[^>]*--yellow[\s\S]*?<\/li>/)[0]
  const bad = [html.replace(event, event + event), html.replace('minute--out">71&#039;', 'minute--out">—')]
  for (const source of bad) assert.equal(parse(source).nepopoln, true)
})
const schedule = readFileSync(new URL('./vzorci/gr-epsdod-current-b2-schedule.html', import.meta.url), 'utf8')
const aSchedule = readFileSync(new URL('./vzorci/gr-epsdod-current-a-schedule.html', import.meta.url), 'utf8')
test('public schedule imports the selected B2 league and binds report identity to exact fixture', async () => {
  const calls = []
  const out = await eps.zapisniki('epsdod.gr:497', async url => {
    calls.push(url)
    if (url.includes('/diorganoseis/')) return schedule
    if (url === options.url) return html
    assert.fail(`unexpected source route ${url}`)
  }, { samoZapisnik: 'gr5-26804' })
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'gr5-26804')
  assert.equal(out[0].z.nepopoln, false)
  assert.equal(calls.length, 2)
  assert.equal(new URL(calls[0]).searchParams.get('enosi_league_id'), '497')
  assert.equal(new URL(calls[0]).searchParams.get('enosi_period'), '14')
})
test('public schedule refuses wrong league, duplicate identity and report link mismatch', async () => {
  const row = schedule.match(/<tr data-enosi-game-id="26804">[\s\S]*?<\/tr>/)[0]
  for (const body of [aSchedule, schedule.replace(row, row + row), schedule.replaceAll('game_id=26804', 'game_id=26805')]) {
    await assert.rejects(() => eps.zapisniki('epsdod.gr:497', async () => body, { samoZapisnik: 'gr5-26804' }), /epsdod/)
  }
})
test('native schedule keeps inactive and historical league routes unchanged', () => {
  for (const id of [496, 501, 419]) assert.equal(eps.naslovRazporeda(`epsdod.gr:${id}`), `https://www.epsdod.gr/results/display_schedule.php?league_id=${id}`)
  assert.match(eps.naslovRazporeda('epsdod.gr:495'), /^https:\/\/epsdod.gr\/diorganoseis\/a-katigoria\//)
})

test('unscored walkover is preserved without inventing a score or report', () => {
  const r = razporedStrani(schedule, { koda: 'epsdod.gr:497' })
  const t = r.krogi.find(k => k.stevilka === 4).tekme.find(t => t.gameId === 26808)
  assert.equal(t.neBo, true)
  assert.equal(t.izid, null)
  assert.equal(t.reportAvailable, false)
})
test('completed reports are skipped before reading and partial reports never reach native writer', async () => {
  const calls = [], warnings = []
  const warn = console.warn
  console.warn = message => warnings.push(message)
  try {
    const read = async url => { calls.push(url); return url.includes('/diorganoseis/') ? schedule : html.replace('Τελικό', 'Σε εξέλιξη') }
    assert.deepEqual(await eps.zapisniki('epsdod.gr:497', read, { samoZapisnik: 'gr5-26804', preskoci: new Set(['gr5-26804']) }), [])
    assert.equal(calls.length, 1)
    calls.length = 0
    assert.deepEqual(await eps.zapisniki('epsdod.gr:497', read, { samoZapisnik: 'gr5-26804' }), [])
    assert.equal(calls.length, 2)
    assert.ok(warnings.some(w => w.includes('gr5-26804 HOLD')))
  } finally { console.warn = warn }
})
test('valid public report cannot be rebound to another round, day, club or score', async () => {
  for (const bad of [html.replaceAll('3η Αγωνιστική', '4η Αγωνιστική'), html.replaceAll('15/11/2026', '14/11/2026'), html.replaceAll('ΑΣΤΕΡΑΣ ΜΑΣΣΑΡΩΝ', 'ΑΛΛΗ ΟΜΑΔΑ'), html.replace('>2</span></div><p class="enosi-bridge-match-sheet__status"', '>3</span></div><p class="enosi-bridge-match-sheet__status"')]) {
    await assert.rejects(() => eps.zapisniki('epsdod.gr:497', async url => url.includes('/diorganoseis/') ? schedule : bad, { samoZapisnik: 'gr5-26804' }), /ne ujema z razporedom/)
  }
})
test('schedule cannot substitute a different season or page route', () => {
  assert.throws(() => razporedStrani(schedule.replace('2026-2027', '2025-2026'), { koda: 'epsdod.gr:497' }), /sezone/)
  assert.throws(() => razporedStrani(schedule.replaceAll('enosi_period=14', 'enosi_period=13'), { koda: 'epsdod.gr:497' }), /obdobja/)
  assert.equal(eps.naslovZapisnika('epsdod.gr:419', 'gr5-24025'), 'https://www.epsdod.gr/results/display_game.php?game_id=24025')
})
test('legacy association report retains its complete boolean and source IDs', () => {
  const old = readFileSync(new URL('./vzorci/gr-eps-tekma-epspeir-27822.html', import.meta.url), 'utf8')
  const z = vZapisnik(old, { domena: 'epspeir.gr', gameId: 27822 })
  assert.equal(z.nepopoln, false)
  assert.equal(z.zapisnikId, 'gr1-27822')
})
const sponsoredAReport = readFileSync(new URL('./vzorci/gr-epsdod-current-26556.html', import.meta.url), 'utf8')
test('observed A sponsor title binds only to league 495 and retains actual goalless report', () => {
  const options = { domena: 'epsdod.gr', gameId: 26556, url: 'https://epsdod.gr/fyllo-agona/?game_id=26556', koda: 'epsdod.gr:495' }
  const z = vZapisnik(sponsoredAReport, options)
  assert.equal(z.liga, 'Α Κατηγορία Blue Star Ferries')
  assert.deepEqual(z.rumeni.map(p => [p.regSt, p.minuta]), [[50014652, 23], [50004382, 62], [50012971, 80], [50002063, 90]])
  assert.deepEqual(z.menjave.map(m => m.minuta), [46, 53, 70, 71, 85, 86, 90])
  assert.equal(z.krog, 8)
  assert.equal(z.domaci.ime, 'ΓΑΣ ΠΑΝΘΗΡΕΣ ΡΟΔΟΥ')
  assert.equal(z.gostje.ime, 'ΑΡΗΣ ΑΡΧΑΓΓΕΛΟΥ')
  assert.deepEqual(z.rezultat, { domaci: 0, gostje: 0 })
  assert.equal(z.domaci.postava.length, 11)
  assert.equal(z.gostje.postava.length, 11)
  assert.equal(z.nepopoln, false)
  assert.deepEqual(z.opozorila, [])
  assert.throws(() => vZapisnik(sponsoredAReport, { ...options, koda: 'epsdod.gr:497' }), /tekmovanje/)
  assert.throws(() => vZapisnik(sponsoredAReport.replaceAll('Blue Star Ferries', 'Another Competition'), options), /tekmovanje/)
})
test('timeline card type and minute must match the independent lineup badges', () => {
  for (const source of [html.replace('timeline-item--yellow', 'timeline-item--red'), html.replace('3&#039;', '4&#039;')]) {
    assert.notEqual(source, html)
    assert.equal(parse(source).nepopoln, true)
  }
})
test('timeline penalty attribution must match lineup goal badge type', () => {
  assert.equal(parse(html.replace('timeline-item--penalty', 'timeline-item--goal')).nepopoln, true)
})
const unlinkedReport = readFileSync(new URL('./vzorci/gr-epsdod-current-26570.html', import.meta.url), 'utf8')
const unlinkedSchedule = readFileSync(new URL('./vzorci/gr-epsdod-current-a-round9-schedule.html', import.meta.url), 'utf8')
test('scored schedule ID with no report link still admits its proven complete public report', async () => {
  const schedule = razporedStrani(unlinkedSchedule, { koda: 'epsdod.gr:495' })
  const fixture = schedule.krogi[0].tekme.find(t => t.gameId === 26570)
  assert.equal(fixture.reportAvailable, false)
  assert.deepEqual(fixture.izid, { domaci: 1, gostje: 1 })
  const calls = []
  const records = await eps.zapisniki('epsdod.gr:495', async url => {
    calls.push(url)
    if (url.includes('/diorganoseis/')) return unlinkedSchedule
    assert.equal(url, 'https://epsdod.gr/fyllo-agona/?game_id=26570')
    return unlinkedReport
  }, { samoZapisnik: 'gr5-26570' })
  assert.equal(records.length, 1)
  assert.equal(records[0].id, 'gr5-26570')
  assert.equal(records[0].z.datum, '2026-11-17')
  assert.deepEqual(records[0].z.rezultat, { domaci: 1, gostje: 1 })
  assert.deepEqual(records[0].z.opozorila, [])
  assert.equal(calls.length, 2)
})
test('unlinked unavailable or incomplete reports stay pending and refusals still stop', async t => {
  const warnings = []; t.mock.method(console, 'warn', warning => warnings.push(warning))
  for (const reply of [() => unlinkedReport.replace('Τελικό', 'Σε εξέλιξη'), () => { throw Object.assign(new Error('Not Found'), { status: 404 }) }]) {
    let reads = 0
    const records = await eps.zapisniki('epsdod.gr:495', async url => {
      if (url.includes('/diorganoseis/')) return unlinkedSchedule
      reads++; return reply()
    }, { samoZapisnik: 'gr5-26570' })
    assert.deepEqual(records, [])
    assert.equal(reads, 1)
  }
  assert.equal(warnings.filter(w => w.includes('gr5-26570 HOLD')).length, 2)
  await assert.rejects(eps.zapisniki('epsdod.gr:495', async url => {
    if (url.includes('/diorganoseis/')) return unlinkedSchedule
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }, { samoZapisnik: 'gr5-26570' }), error => error.zavrnitev === true)
})
