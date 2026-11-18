// Incident-only, source-free replay. The manifest pins original DB fixture IDs;
// immutable public-page bodies prove the report, never authorize a new fixture.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fcf, { vZapisnik as fcfReport, validateFcfSingleReportSource, fcfPublicRedirect } from './fcf.mjs'
import eps, { vZapisnik as epsReport, razporedStrani } from './eps.mjs'
import { getHistoricalStatisticsPolicy } from '../lib/historical-statistics-policy.mjs'
const DAY = 86400000
const MAX_BYTES = 8 * 1024 * 1024
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const noNetwork = () => { throw Error('migration capture: source network access is disabled') }
const positive = n => Number.isSafeInteger(n) && n > 0
const date = s => /^\d{4}-\d\d-\d\d$/.test(s ?? '') && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
const COLUMNS = 'id,zapisnik_id,imported_at,played_on,home:teams!home_team_id(id,name),away:teams!away_team_id(id,name),rounds!inner(id,competition_id,season,number)'
function readBounded(file, max = MAX_BYTES) {
  const stat = fs.lstatSync(file)
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= max, 'migration capture: invalid or oversized original')
  const bytes = fs.readFileSync(file)
  assert.ok(bytes.length > 0 && bytes.length <= max, 'migration capture: oversized original')
  return bytes
}
export function loadMigrationCapture(directory, { source = null } = {}) {
  const s = JSON.parse(readBounded(path.join(directory, 'snapshot.json')).toString('utf8'))
  assert.equal(s.schema, 1); assert.equal(s.incident, 'es-gr-20261118')
  assert.ok(['fcf', 'epsdod'].includes(s.source)); if (source) assert.equal(s.source, source)
  assert.equal(s.season, '2026/27'); assert.equal(s.from, '2026-11-06'); assert.equal(s.through, '2026-11-17')
  assert.ok(Array.isArray(s.leagues) && s.leagues.length <= 60)
  const ids = new Set(), slugs = new Set(), reports = new Set(), fixtures = new Set()
  for (const l of s.leagues) {
    assert.ok(positive(l.id) && typeof l.slug === 'string' && typeof l.code === 'string' && !ids.has(l.id) && !slugs.has(l.slug), 'migration capture: duplicate or invalid league')
    ids.add(l.id); slugs.add(l.slug)
    assert.equal(l.country, s.source === 'fcf' ? 'ES' : 'GR')
    assert.ok(Array.isArray(l.reports) && l.reports.length <= 1000)
    for (const r of l.reports) {
      assert.ok(typeof r.id === 'string' && !reports.has(r.id) && positive(r.fixture?.id) && !fixtures.has(r.fixture.id), 'migration capture: duplicate report/fixture identity')
      reports.add(r.id); fixtures.add(r.fixture.id)
    }
  }
  return s
}
function capturedBody(directory, entry, now) {
  assert.match(entry?.sha256 ?? '', /^[a-f0-9]{64}$/)
  assert.ok(typeof entry.url === 'string')
  const age = now - Date.parse(entry.capturedAt)
  assert.ok(Number.isFinite(age) && age >= -60000 && age <= 7 * DAY, 'migration capture: capture expired or future dated')
  const relative = `blobs/${entry.sha256}.html`
  if (entry.path != null) assert.equal(entry.path, relative, 'migration capture: path must derive from body hash')
  const file = path.join(directory, relative), root = fs.realpathSync(directory)
  assert.equal(fs.realpathSync(path.dirname(file)), path.join(root, 'blobs'), 'migration capture: blob directory escapes capture')
  const bytes = readBounded(file)
  assert.equal(hash(bytes), entry.sha256, 'migration capture: body hash mismatch')
  return bytes.toString('utf8')
}
function fixtureBinding(f, record, competition, key) {
  assert.ok(f && positive(f.id) && positive(f.home?.id) && positive(f.away?.id) && f.home.id !== f.away.id && positive(f.rounds?.id), 'migration capture: existing fixture identity required')
  assert.ok(f.zapisnik_id === null || f.zapisnik_id === record.id, 'migration capture: fixture owns another report')
  assert.ok(!f.imported_at || f.zapisnik_id === record.id, 'migration capture: complete fixture has no proven report identity')
  assert.equal(f.rounds.competition_id, competition.id, 'migration capture: fixture belongs to another league')
  assert.equal(f.rounds.season, '2026/27')
  assert.equal(f.rounds.number, record.z.krog, 'migration capture: fixture round mismatch')
  assert.equal(f.played_on, record.z.datum, 'migration capture: fixture date mismatch')
  assert.equal(key(f.home.name), key(record.z.domaci.ime), 'migration capture: fixture home club mismatch')
  assert.equal(key(f.away.name), key(record.z.gostje.ime), 'migration capture: fixture away club mismatch')
}
function quality(z, provider, source) {
  assert.ok(z && z.nepopoln === false && !z.prazen && !z.kontumacija && Array.isArray(z.opozorila) && z.opozorila.length === 0, 'migration capture: incomplete or contradictory report')
  assert.equal(z.sezona, '2026/27'); assert.ok(positive(z.krog) && date(z.datum))
  if (source === 'fcf') assert.equal(z.zaprt, true, 'migration capture: report is not final')
  assert.ok([z.rezultat?.domaci, z.rezultat?.gostje].every(n => Number.isSafeInteger(n) && n >= 0), 'migration capture: missing score')
  const players = new Set()
  for (const team of [z.domaci, z.gostje]) {
    assert.equal(team.postava.length, 11, 'migration capture: incomplete starting lineup')
    assert.equal(team.postava.filter(p => p.vratar).length, 1, 'migration capture: unproven goalkeeper')
    for (const p of [...team.postava, ...team.rezerve]) {
      assert.ok(positive(p.regSt) && !players.has(p.regSt), 'migration capture: duplicate or missing player ID')
      players.add(p.regSt)
      assert.ok(p.preklopi.every((n, i, all) => Number.isInteger(n) && n >= 0 && n <= 90 && (!i || n >= all[i - 1])), 'migration capture: invalid substitution interval')
    }
  }
  for (const list of [z.goli, z.rumeni, z.rdeci]) for (const event of list) assert.ok(players.has(event.regSt) && [0, 1].includes(event.ekipaIdx) && Number.isInteger(event.minuta) && event.minuta >= 0 && event.minuta <= 90, 'migration capture: invalid event identity/minute')
  for (const idx of [0, 1]) assert.equal(z.goli.filter(g => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length, idx ? z.rezultat.gostje : z.rezultat.domaci, 'migration capture: goal score mismatch')
  const copy = structuredClone(z), appearances = provider.nastopi(copy)
  assert.ok(copy.opozorila.length === 0 && appearances.length >= 22, 'migration capture: inferred appearances')
  assert.ok(appearances.every(p => positive(p.regSt) && Number.isInteger(p.minute) && p.minute >= 0 && p.minute <= 90), 'migration capture: invalid appearance minutes')
  for (const idx of [0, 1]) { const minutes = appearances.filter(p => p.ekipaIdx === idx).reduce((sum, p) => sum + p.minute, 0); assert.ok(minutes > 0 && minutes <= 990, 'migration capture: impossible team minutes') }
}
export function createMigrationCapturedSource({ competition: c, directory, db = null, now = Date.now() }) {
  assert.ok(c && c.active === true && c.source_policy == null && !getHistoricalStatisticsPolicy(c.slug), 'migration capture: active source without historical policy required')
  const source = c.source === 'fcf' ? 'fcf' : c.source === 'eps' ? 'epsdod' : null
  assert.ok(source, 'migration capture: unsupported source')
  const s = loadMigrationCapture(directory, { source }), l = s.leagues.find(x => x.id === c.id)
  assert.ok(l && l.slug === c.slug && l.code === c.source_league_code, 'migration capture: live competition tuple differs')
  assert.equal(c.country_code ?? c.countries?.code, l.country, 'migration capture: wrong live country')
  if (source === 'epsdod') assert.ok([[913, 'gr-dod-a', 'epsdod.gr:495'], [1423, 'gr-dod-b-2', 'epsdod.gr:497']].some(([id, slug, code]) => l.id === id && l.slug === slug && l.code === code), 'migration capture: EPS league outside exact active scope')
  const base = source === 'fcf' ? fcf : eps
  const body = entry => capturedBody(directory, entry, now)
  let schedule = null
  if (source === 'epsdod') { assert.equal(l.schedule?.url, eps.naslovRazporeda(l.code)); schedule = razporedStrani(body(l.schedule), { koda: l.code }) }
  const originals = new Map(), records = []
  for (const r of l.reports) {
    assert.equal(r.fixture.imported_at, null, 'migration capture: original fixture was already complete')
    const html = body(r.capture)
    let z, url
    if (source === 'fcf') {
      assert.match(r.id, /^es[1-9]\d*$/)
      url = `https://www.fcf.cat/ca/competicio/acta/${r.id.slice(2)}`
      assert.equal(r.redirect?.url, url)
      const redirectHtml = body(r.redirect)
      assert.equal(fcfPublicRedirect(redirectHtml, { id: r.id, url }), r.capture.url, 'migration capture: redirect target differs from captured report')
      validateFcfSingleReportSource(html, l.code, { id: r.id, tekmovanje: c, sezona: s.season, danes: now, redirectHtml })
      z = fcfReport(html, { id: r.id, url, redirectHtml })
    } else {
      assert.match(r.id, /^gr5-[1-9]\d*$/)
      const gameId = Number(r.id.slice(4)); url = `https://epsdod.gr/fyllo-agona/?game_id=${gameId}`
      assert.equal(r.capture.url, url)
      z = epsReport(html, { domena: 'epsdod.gr', gameId, url, koda: l.code })
      const matches = schedule.krogi.flatMap(k => k.tekme.filter(t => t.gameId === gameId).map(t => ({ ...t, krog: k.stevilka })))
      assert.equal(matches.length, 1, 'migration capture: report not in exact schedule')
      const f = matches[0]
      assert.ok(f.izid && !f.kontumacija && !f.neBo, 'migration capture: schedule has no scored nonforfeit fixture')
      assert.ok(z && z.krog === f.krog && z.datum === f.datum && z.ura === f.ura && z.sezona === schedule.sezona && base.kljucKluba(z.domaci.ime) === base.kljucKluba(f.domaci) && base.kljucKluba(z.gostje.ime) === base.kljucKluba(f.gostje), 'migration capture: report differs from schedule fixture')
      assert.deepEqual(z.rezultat, f.izid, 'migration capture: report score differs from schedule')
    }
    quality(z, base, source)
    assert.equal(z.zapisnikId, r.id); assert.ok(z.datum >= s.from && z.datum <= s.through, 'migration capture: report outside incident window')
    const record = { id: r.id, z, url }
    fixtureBinding(r.fixture, record, c, base.kljucKluba)
    originals.set(r.id, structuredClone(r.fixture)); records.push(record)
  }
  const liveRecord = async record => {
    assert.ok(db, 'migration capture: live fixture database required')
    const original = originals.get(record.id)
    const { data, error } = await db.from('matches').select(COLUMNS).eq('id', original.id).maybeSingle()
    if (error) throw Error(`migration capture: live fixture lookup failed: ${error.message}`)
    fixtureBinding(data, record, c, base.kljucKluba)
    assert.equal(data.id, original.id, 'migration capture: fixture ID changed')
    assert.equal(data.rounds.id, original.rounds.id, 'migration capture: fixture round ID changed')
    assert.equal(data.home.id, original.home.id, 'migration capture: fixture home ID changed')
    assert.equal(data.away.id, original.away.id, 'migration capture: fixture away ID changed')
    return !data.imported_at
  }
  return { ...base, recoveryCaptured: true, recoveryReportIds: records.map(r => r.id), recoveryRounds: [...new Set(records.map(r => r.z.krog))],
    capturedRecords: () => structuredClone(records),
    fetch: noNetwork, razporedVseStrani: noNetwork, posamezniZapisnik: noNetwork,
    async zapisniki(code, _read, { preskoci = new Set(), samoZapisnik = null } = {}) {
      assert.equal(code, l.code, 'migration capture: replay league code differs')
      const out = []
      for (const record of records) if ((!samoZapisnik || record.id === samoZapisnik) && !preskoci.has(record.id) && await liveRecord(record)) out.push(structuredClone(record))
      return out
    },
    async assertNativeFixture({ id, roundId, homeTeamId, awayTeamId }) {
      const record = records.find(r => r.id === id), original = originals.get(id)
      assert.ok(record && original, 'migration capture: unselected native report')
      assert.equal(roundId, original.rounds.id, 'migration capture: writer round ID differs')
      assert.equal(homeTeamId, original.home.id, 'migration capture: writer home ID differs')
      assert.equal(awayTeamId, original.away.id, 'migration capture: writer away ID differs')
      return liveRecord(record)
    },
  }
}
