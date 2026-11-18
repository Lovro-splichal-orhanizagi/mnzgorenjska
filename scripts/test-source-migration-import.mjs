import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createMigrationCapturedSource } from './viri/source-migration-captured.mjs'
const now = Date.parse('2026-11-18T12:00:00Z')
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-import-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  fs.mkdirSync(path.join(directory, 'blobs'))
  const capture = (name, url) => { const body = fs.readFileSync(new URL(`./vzorci/${name}`, import.meta.url)), sha256 = createHash('sha256').update(body).digest('hex'); fs.writeFileSync(path.join(directory, 'blobs', `${sha256}.html`), body); return { url, sha256, capturedAt: new Date(now).toISOString() } }
  const original = { id: 700, zapisnik_id: 'gr5-26804', imported_at: null, played_on: '2026-11-15', home: { id: 800, name: 'ΑΣΤΕΡΑΣ ΜΑΣΣΑΡΩΝ' }, away: { id: 801, name: 'ΚΛΕΟΒΟΥΛΟΣ' }, rounds: { id: 900, number: 3, season: '2026/27', competition_id: 1423 } }
  const league = { id: 1423, slug: 'gr-dod-b-2', code: 'epsdod.gr:497', country: 'GR', reports: [{ id: 'gr5-26804', fixture: original, capture: capture('gr-epsdod-current-26804.html', 'https://epsdod.gr/fyllo-agona/?game_id=26804') }], schedule: capture('gr-epsdod-current-b2-schedule.html', 'https://epsdod.gr/diorganoseis/v-katigoria/?enosi_main_league_id=2&enosi_tab=schedule&enosi_league_id=497&enosi_scope=all&enosi_period=14') }
  fs.writeFileSync(path.join(directory, 'snapshot.json'), JSON.stringify({ schema: 1, incident: 'es-gr-20261118', source: 'epsdod', season: '2026/27', from: '2026-11-06', through: '2026-11-17', leagues: [league] }))
  const competition = { id: 1423, slug: league.slug, source: 'eps', source_league_code: league.code, country_code: 'GR', active: true, source_policy: null }
  const state = { nativeCalls: 0, rpcCalls: [], failRecompute: false, matches: { ...original, round_id: 900, home_team_id: 800, away_team_id: 801, home_goals: 0, away_goals: 2, import_warnings: [], imported_at: new Date(now).toISOString() }, appearances: [], goals: [] }
  const db = {
    from(table) { return { select() { return this }, eq() { return this }, async maybeSingle() { return { data: structuredClone(state.matches), error: null } }, async single() { return { data: structuredClone(state.matches), error: null } }, then(resolve) { return Promise.resolve({ data: structuredClone(state[table]), error: null }).then(resolve) } } },
    async rpc(name, args) { state.rpcCalls.push([name, args]); return { error: state.failRecompute && name === 'recompute_round_scores' ? { message: 'temporary RPC failure' } : null } },
  }
  const provider = createMigrationCapturedSource({ competition, directory, db, now })
  return { league, provider, state, db }
}
function storedRows(f) {
  const z = f.provider.capturedRecords()[0].z
  // Reproduce the existing writer's boundary projection, then corrupt individual
  // persisted values to ensure verification catches same-count wrong data.
  const rows = f.provider.nastopi(z)
  f.state.appearances = rows.map((p, i) => ({ player_id: i + 1000, player: { id: i + 1000, reg_st: String(p.regSt) }, team_id: p.ekipaIdx === 0 ? 800 : 801, started: p.zacetnik, minute_on: p.minutaOd, minute_off: p.minutaDo, minutes_played: p.minute, goals: p.goli, own_goals: p.avtogoli, penalties_scored: p.goliIzEnajstmetrovke, penalties_missed: p.zgreseneEnajstmetrovke, yellow_cards: p.rumeni, red_cards: p.rdeci, goals_conceded: p.prejetiGoli, clean_sheet: p.cleanSheet, is_goalkeeper: !!p.vratar }))
  f.state.goals = z.goli.map(g => { const p = f.state.appearances.find(p => p.player.reg_st === String(g.regSt)); return { scorer_id: p.player_id, scorer: { ...p.player }, team_id: g.ekipaIdx === 0 ? 800 : 801, minute: g.minuta, is_own_goal: !!g.avtogol, is_penalty: !!g.enajstmetrovka } })
}
test('import runner can be imported without executing CLI or reading credentials', async () => {
  const module = await import('./source-migration-import.mjs')
  assert.equal(typeof module.replayMigrationLeague, 'function')
  assert.equal(typeof module.verifyMigrationReports, 'function')
})
test('all-complete retry verifies every report and retries round RPC without another native import', async t => {
  const { replayMigrationLeague } = await import('./source-migration-import.mjs')
  const f = fixture(t); storedRows(f)
  const runNative = async () => { f.state.nativeCalls++; return { status: 0 } }
  f.state.failRecompute = true
  await assert.rejects(replayMigrationLeague({ ...f, preview: false, runNative }), /temporary RPC failure/)
  assert.equal(f.state.nativeCalls, 0)
  f.state.failRecompute = false
  const result = await replayMigrationLeague({ ...f, preview: false, runNative })
  assert.equal(result.verified, 1)
  assert.equal(f.state.nativeCalls, 0)
  assert.equal(f.state.rpcCalls.filter(([name]) => name === 'recompute_round_scores').length, 2)
  assert.ok(f.state.rpcCalls.every(([, args]) => args.p_round_id === 900))
})
test('same-count wrong appearance statistics and scorer identity cannot pass readback', async t => {
  const { verifyMigrationReports } = await import('./source-migration-import.mjs')
  const f = fixture(t); storedRows(f)
  await verifyMigrationReports(f)
  const good = structuredClone(f.state)
  for (const field of ['team_id', 'started', 'minute_on', 'minute_off', 'minutes_played', 'goals', 'own_goals', 'penalties_scored', 'penalties_missed', 'yellow_cards', 'red_cards', 'goals_conceded', 'clean_sheet', 'is_goalkeeper']) {
    Object.assign(f.state, structuredClone(good)); const p = f.state.appearances[0]; p[field] = typeof p[field] === 'boolean' ? !p[field] : p[field] + 1
    await assert.rejects(verifyMigrationReports(f), /appearance/)
  }
  for (const change of [s => s.appearances[0].player.reg_st = '999', s => s.appearances[0].player.id++, s => s.goals[0].scorer.reg_st = '999', s => s.goals[0].scorer_id++, s => s.goals[0].minute++, s => s.goals[0].is_penalty = false, s => s.goals[0].is_own_goal = true, s => s.goals[0].team_id = 800, s => s.matches.import_warnings = ['unproven player']]) {
    Object.assign(f.state, structuredClone(good)); change(f.state)
    await assert.rejects(verifyMigrationReports(f))
  }
})

test('native success followed by failed recompute resumes verification without rewriting completed data', async t => {
  const { replayMigrationLeague } = await import('./source-migration-import.mjs')
  const f = fixture(t); storedRows(f)
  f.state.matches.imported_at = null
  f.state.failRecompute = true
  const runNative = async () => { f.state.nativeCalls++; f.state.matches.imported_at = new Date(now).toISOString(); return { status: 0 } }
  await assert.rejects(replayMigrationLeague({ ...f, preview: false, runNative }), /temporary RPC failure/)
  assert.equal(f.state.nativeCalls, 1)
  f.state.failRecompute = false
  const result = await replayMigrationLeague({ ...f, preview: false, runNative })
  assert.equal(result.imported, 0)
  assert.equal(result.verified, 1)
  assert.equal(result.recomputedRounds, 1)
  assert.equal(f.state.nativeCalls, 1)
  const clone = f.provider.capturedRecords(); clone[0].z.rezultat.gostje = 99
  assert.equal(f.provider.capturedRecords()[0].z.rezultat.gostje, 2)
})
test('preview performs neither native writes nor round RPCs', async t => {
  const { replayMigrationLeague } = await import('./source-migration-import.mjs')
  const f = fixture(t)
  f.state.matches.imported_at = null
  const result = await replayMigrationLeague({ ...f, preview: true, runNative: () => assert.fail('preview imported') })
  assert.equal(result.pending, 1)
  assert.equal(result.verified, 0)
  assert.deepEqual(f.state.rpcCalls, [])
})
