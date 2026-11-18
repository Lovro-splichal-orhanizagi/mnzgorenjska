import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import * as migration from './viri/source-migration-captured.mjs'
const now = Date.parse('2026-11-18T12:00:00Z')
const read = name => fs.readFileSync(new URL(`./vzorci/${name}`, import.meta.url))
function evidence(t, source = 'epsdod') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'source-migration-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  fs.mkdirSync(path.join(directory, 'blobs'))
  const store = (body, url) => { const sha256 = createHash('sha256').update(body).digest('hex'); fs.writeFileSync(path.join(directory, 'blobs', `${sha256}.html`), body); return { url, sha256, capturedAt: new Date(now).toISOString() } }
  const eps = source === 'epsdod'
  const competition = { id: eps ? 1423 : 500, slug: eps ? 'gr-dod-b-2' : 'es-ct-elit', source: eps ? 'eps' : 'fcf', source_league_code: eps ? 'epsdod.gr:497' : '4107000-4107200', country_code: eps ? 'GR' : 'ES', active: true, source_policy: null, sezona_koledarska: false }
  const fixture = { id: 700, zapisnik_id: eps ? 'gr5-26804' : 'es4107024', imported_at: null, played_on: eps ? '2026-11-15' : '2026-11-08', home: { id: 800, name: eps ? 'ΑΣΤΕΡΑΣ ΜΑΣΣΑΡΩΝ' : 'VIC UNIÓ ESPORTIVA CLUB' }, away: { id: 801, name: eps ? 'ΚΛΕΟΒΟΥΛΟΣ' : 'ATLETIC SANT JUST . F. C.' }, rounds: { id: 900, number: eps ? 3 : 8, season: '2026/27', competition_id: competition.id } }
  const report = eps ? { id: fixture.zapisnik_id, fixture, capture: store(read('gr-epsdod-current-26804.html'), 'https://epsdod.gr/fyllo-agona/?game_id=26804') } : { id: fixture.zapisnik_id, fixture, capture: store(gunzipSync(read('es-fcf-current-4107024-report.html.gz')), 'https://www.fcf.cat/ca/partit/2026-2027/lliga-elit/grup-1/jornada-8/vic-unio-esportiva-club-a-elit-vs-atletic-sant-just-f-c-a-elit'), redirect: store(gunzipSync(read('es-fcf-current-4107024-redirect.html.gz')), 'https://www.fcf.cat/ca/competicio/acta/4107024') }
  const league = { id: competition.id, slug: competition.slug, code: competition.source_league_code, country: competition.country_code, reports: [report], ...(eps ? { schedule: store(read('gr-epsdod-current-b2-schedule.html'), 'https://epsdod.gr/diorganoseis/v-katigoria/?enosi_main_league_id=2&enosi_tab=schedule&enosi_league_id=497&enosi_scope=all&enosi_period=14') } : {}) }
  const manifest = { schema: 1, incident: 'es-gr-20261118', source, season: '2026/27', from: '2026-11-06', through: '2026-11-17', leagues: [league] }
  const save = () => fs.writeFileSync(path.join(directory, 'snapshot.json'), JSON.stringify(manifest))
  save()
  return { directory, competition, fixture, report, league, manifest, store, save }
}
// Only the external read boundary is doubled; the adapter, parsers and fixture guards are real.
function database(row) {
  const state = { row: structuredClone(row), calls: [] }
  const db = { from(table) {
    assert.equal(table, 'matches')
    const query = []
    return {
      select() { return this },
      eq(k, v) { query.push([k, v]); return this },
      async maybeSingle() { state.calls.push(query); return { data: structuredClone(state.row), error: null } },
      async in(k, v) { state.calls.push([[k, v]]); return { data: state.row ? [structuredClone(state.row)] : [], error: null } },
    }
  } }
  return { db, state }
}
for (const source of ['epsdod', 'fcf']) test(`authentic ${source} originals replay without a source reader and bind the exact live fixture`, async t => {
  assert.equal(typeof migration.createMigrationCapturedSource, 'function')
  const f = evidence(t, source), live = database(f.fixture)
  const provider = migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, db: live.db, now })
  const records = await provider.zapisniki(f.league.code, () => assert.fail('source request'))
  assert.equal(records.length, 1)
  assert.equal(records[0].id, f.report.id)
  assert.equal(records[0].z.nepopoln, false)
  assert.deepEqual(provider.recoveryReportIds, [f.report.id])
  assert.deepEqual(provider.recoveryRounds, [source === 'epsdod' ? 3 : 8])
  assert.throws(() => provider.fetch('https://example.test'), /network/)
  assert.equal(await provider.assertNativeFixture({ id: f.report.id, roundId: 900, homeTeamId: 800, awayTeamId: 801 }), true)
  live.state.row.imported_at = new Date(now).toISOString()
  assert.deepEqual(await provider.zapisniki(f.league.code), [])
  assert.equal(await provider.assertNativeFixture({ id: f.report.id, roundId: 900, homeTeamId: 800, awayTeamId: 801 }), false)
})
test('capture and competition tampering fail before any write', t => {
  const f = evidence(t)
  for (const patch of [{ active: false }, { source_policy: 'historical' }, { country_code: 'ES' }, { id: 999 }, { source_league_code: 'epsdod.gr:496' }]) assert.throws(() => migration.createMigrationCapturedSource({ competition: { ...f.competition, ...patch }, directory: f.directory, now }))
  const entry = f.report.capture
  fs.appendFileSync(path.join(f.directory, 'blobs', `${entry.sha256}.html`), 'changed')
  assert.throws(() => migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, now }), /hash/)
})
test('live missing/reassigned fixtures cannot be created or overwritten', async t => {
  const f = evidence(t), live = database(f.fixture), provider = migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, db: live.db, now })
  const scope = { id: f.report.id, roundId: 900, homeTeamId: 800, awayTeamId: 801 }
  for (const row of [null, { ...f.fixture, id: 701 }, { ...f.fixture, zapisnik_id: 'gr5-26805' }, { ...f.fixture, home: { ...f.fixture.home, id: 802 } }]) {
    live.state.row = row
    await assert.rejects(provider.zapisniki(f.league.code))
    await assert.rejects(provider.assertNativeFixture(scope))
  }
  live.state.row = f.fixture
  await assert.rejects(provider.assertNativeFixture({ ...scope, roundId: 901 }))
  await assert.rejects(provider.assertNativeFixture({ ...scope, id: 'gr5-26805' }))
})
test('migration env routes through captured adapter and country loader without bypassing ordinary source policy', async t => {
  t.mock.method(Date, 'now', () => now)
  const f = evidence(t), live = database(f.fixture)
  const { viraZa } = await import('./viri/index.mjs')
  const { tekmovanje } = await import('./tekmovanje.mjs')
  const before = process.env.SLFF_MIGRATION_CAPTURE
  process.env.SLFF_MIGRATION_CAPTURE = f.directory
  t.after(() => { if (before === undefined) delete process.env.SLFF_MIGRATION_CAPTURE; else process.env.SLFF_MIGRATION_CAPTURE = before })
  const provider = viraZa(f.competition, { db: live.db })
  assert.equal(provider.recoveryCaptured, true)
  assert.throws(() => viraZa({ ...f.competition, source_policy: 'history' }, { db: live.db }), /historical policy/)
  const countryDb = { from(table) { let columns; return { select(value) { columns = value; return this }, eq() { return this }, async maybeSingle() { return { data: table === 'countries' ? { code: 'GR' } : columns === 'sezona_koledarska' ? { sezona_koledarska: false } : { ...f.competition, country_code: undefined, country_id: 12 }, error: null } } } } }
  assert.equal((await tekmovanje(countryDb, f.competition.slug)).country_code, 'GR')
  delete process.env.SLFF_MIGRATION_CAPTURE
  assert.notEqual(viraZa(f.competition).recoveryCaptured, true)
})
test('expiry, source URL, partial data, captured fixture scope and duplicate claims are rejected', t => {
  const f = evidence(t)
  const initial = structuredClone(f.manifest)
  const changes = [
    s => s.leagues[0].reports[0].capture.capturedAt = '2026-11-10T00:00:00Z',
    s => s.leagues[0].reports[0].capture.url = 'https://evil.test/fyllo-agona/?game_id=26804',
    s => s.leagues[0].reports[0].capture.path = '../../outside.html',
    s => s.leagues[0].reports[0].fixture.rounds.number = 4,
    s => s.leagues[0].reports[0].fixture.played_on = '2026-11-14',
    s => s.leagues[0].reports[0].fixture.home.name = 'ΑΛΛΗ ΟΜΑΔΑ',
    s => s.leagues[0].reports[0].fixture.imported_at = '2026-11-17',
    s => s.leagues[0].reports.push(structuredClone(s.leagues[0].reports[0])),
    s => s.leagues[0].reports[0].capture = f.store(read('gr-epsdod-current-26804.html').toString().replace('Τελικό', 'Σε εξέλιξη'), 'https://epsdod.gr/fyllo-agona/?game_id=26804'),
  ]
  for (const change of changes) { const manifest = structuredClone(initial); change(manifest); fs.writeFileSync(path.join(f.directory, 'snapshot.json'), JSON.stringify(manifest)); assert.throws(() => migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, now })) }
})
test('FCF numeric redirect and block cannot be replaced with another report', t => {
  const f = evidence(t, 'fcf')
  f.report.redirect.url = 'https://www.fcf.cat/ca/competicio/acta/4107025'; f.save()
  assert.throws(() => migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, now }))
  f.report.redirect.url = 'https://www.fcf.cat/ca/competicio/acta/4107024'; f.league.code = '4107030-4107200'; f.save()
  assert.throws(() => migration.createMigrationCapturedSource({ competition: { ...f.competition, source_league_code: f.league.code }, directory: f.directory, now }), /bloka/)
})
test('unassigned existing fixture can receive its proven report but no other identity', async t => {
  const f = evidence(t, 'fcf'); f.fixture.zapisnik_id = null; f.save()
  const live = database(f.fixture), p = migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, db: live.db, now })
  assert.equal((await p.zapisniki(f.league.code)).length, 1)
  assert.equal(await p.assertNativeFixture({ id: f.report.id, roundId: 900, homeTeamId: 800, awayTeamId: 801 }), true)
  live.state.row.imported_at = '2026-11-18'
  await assert.rejects(p.zapisniki(f.league.code), /complete.*identity/)
})
test('retained scored schedule proves an unlinked public report but never relaxes DB fixture dates', t => {
  const f = evidence(t)
  Object.assign(f.competition, { id: 913, slug: 'gr-dod-a', source_league_code: 'epsdod.gr:495' })
  Object.assign(f.league, { id: 913, slug: 'gr-dod-a', code: 'epsdod.gr:495' })
  Object.assign(f.fixture, { zapisnik_id: 'gr5-26570', played_on: '2026-11-17' })
  Object.assign(f.fixture.rounds, { number: 9, competition_id: 913 })
  f.fixture.home.name = 'ΑΡΗΣ ΑΡΧΑΓΓΕΛΟΥ'; f.fixture.away.name = 'ΑΝΑΓΕΝΝΗΣΗ ΑΣΦΕΝΔΙΟΥ'
  f.report.id = 'gr5-26570'
  f.report.capture = f.store(read('gr-epsdod-current-26570.html'), 'https://epsdod.gr/fyllo-agona/?game_id=26570')
  f.league.schedule = f.store(read('gr-epsdod-current-a-round9-schedule.html'), 'https://epsdod.gr/diorganoseis/a-katigoria/?enosi_main_league_id=1&enosi_tab=schedule&enosi_league_id=495&enosi_scope=all&enosi_period=14')
  f.save()
  const provider = migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, now })
  assert.equal(provider.capturedRecords().length, 1)
  assert.deepEqual(provider.capturedRecords()[0].z.rezultat, { domaci: 1, gostje: 1 })
  f.fixture.played_on = '2026-11-14'; f.save()
  assert.throws(() => migration.createMigrationCapturedSource({ competition: f.competition, directory: f.directory, now }), /fixture date mismatch/)
})
