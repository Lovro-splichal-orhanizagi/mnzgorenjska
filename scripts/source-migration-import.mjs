// Validated immutable backfill through the existing writer; no source fetches.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { loadMigrationCapture, createMigrationCapturedSource } from './viri/source-migration-captured.mjs'

const APPEARANCE_FIELDS = ['team_id', 'started', 'minute_on', 'minute_off', 'minutes_played', 'goals', 'own_goals', 'penalties_scored', 'penalties_missed', 'yellow_cards', 'red_cards', 'goals_conceded', 'clean_sheet', 'is_goalkeeper']
const positive = n => Number.isSafeInteger(n) && n > 0
const stableId = n => { assert.match(String(n ?? ''), /^[1-9]\d*$/, 'missing stable player identity'); return String(n) }
const sorted = rows => rows.map(row => JSON.stringify(row)).sort()
const projection = (player, fixture) => ({
  reg_st: stableId(player.regSt), team_id: player.ekipaIdx === 0 ? fixture.home.id : fixture.away.id,
  started: player.zacetnik, minute_on: player.minutaOd, minute_off: player.minutaDo, minutes_played: player.minute,
  goals: player.goli, own_goals: player.avtogoli, penalties_scored: player.goliIzEnajstmetrovke,
  penalties_missed: player.zgreseneEnajstmetrovke, yellow_cards: player.rumeni, red_cards: player.rdeci,
  goals_conceded: player.prejetiGoli, clean_sheet: player.cleanSheet, is_goalkeeper: Boolean(player.vratar),
})

/** Read back every admitted record, including records completed by a prior attempt.
 * Counts alone cannot prove that the writer attributed minutes/goals to the right
 * person. Stable registration IDs are joined through the actual native player ID. */
export async function verifyMigrationReports({ db, league, provider }) {
  const records = provider.capturedRecords()
  assert.deepEqual(records.map(r => r.id).sort(), league.reports.map(r => r.id).sort(), 'captured report inventory differs')
  for (const r of records) {
    const fixture = league.reports.find(x => x.id === r.id).fixture
    const { data: match, error } = await db.from('matches').select('id,zapisnik_id,round_id,home_team_id,away_team_id,played_on,home_goals,away_goals,imported_at,import_warnings').eq('id', fixture.id).single()
    if (error) throw Error(error.message)
    assert.ok(match && match.imported_at, 'captured report is not completely imported')
    assert.equal(match.id, fixture.id); assert.equal(match.zapisnik_id, r.id)
    assert.equal(match.round_id, fixture.rounds.id); assert.equal(match.home_team_id, fixture.home.id); assert.equal(match.away_team_id, fixture.away.id)
    assert.equal(match.played_on, r.z.datum); assert.equal(match.home_goals, r.z.rezultat.domaci); assert.equal(match.away_goals, r.z.rezultat.gostje)
    assert.deepEqual(match.import_warnings ?? [], r.z.opozorila, 'unexpected native import warnings')
    const { data: appearances, error: appearanceError } = await db.from('appearances').select(`player_id,player:players!appearances_player_id_fkey(id,reg_st),${APPEARANCE_FIELDS.join(',')}`).eq('match_id', match.id)
    if (appearanceError) throw Error(appearanceError.message)
    assert.ok(Array.isArray(appearances), 'appearance readback missing')
    const nativeIds = new Map(), seen = new Set()
    const actual = appearances.map(row => {
      assert.ok(positive(row.player_id) && row.player?.id === row.player_id && !seen.has(row.player_id), 'appearance native player identity mismatch')
      seen.add(row.player_id)
      const reg_st = stableId(row.player.reg_st)
      assert.ok(!nativeIds.has(reg_st), 'appearance stable player identity duplicated')
      nativeIds.set(reg_st, row.player_id)
      return { reg_st, ...Object.fromEntries(APPEARANCE_FIELDS.map(field => [field, row[field]])) }
    })
    const z = structuredClone(r.z), expected = provider.nastopi(z).map(player => projection(player, fixture))
    assert.deepEqual(z.opozorila, r.z.opozorila, 'source appearance computation introduced warnings')
    assert.deepEqual(sorted(actual), sorted(expected), `appearance readback differs from source for ${r.id}`)
    const { data: goals, error: goalError } = await db.from('goals').select('scorer_id,scorer:players!goals_scorer_id_fkey(id,reg_st),team_id,minute,is_own_goal,is_penalty').eq('match_id', match.id)
    if (goalError) throw Error(goalError.message)
    assert.ok(Array.isArray(goals), 'goal readback missing')
    const actualGoals = goals.map(goal => {
      const reg_st = stableId(goal.scorer?.reg_st)
      assert.ok(positive(goal.scorer_id) && goal.scorer?.id === goal.scorer_id && nativeIds.get(reg_st) === goal.scorer_id, 'goal scorer native identity differs from appearance')
      return [reg_st, goal.team_id, goal.minute, goal.is_own_goal, goal.is_penalty]
    })
    const expectedGoals = r.z.goli.map(goal => [stableId(goal.regSt), goal.ekipaIdx === 0 ? fixture.home.id : fixture.away.id, goal.minuta, Boolean(goal.avtogol), Boolean(goal.enajstmetrovka)])
    assert.deepEqual(sorted(actualGoals), sorted(expectedGoals), `goal readback differs from source for ${r.id}`)
  }
  return records.length
}

/** Native writes may already have succeeded when a later verification/RPC failed.
 * Only the writer is skipped on retry; verification and both RPCs remain required. */
export async function replayMigrationLeague({ db, league, provider, preview, runNative, log = () => {} }) {
  assert.equal(typeof preview, 'boolean')
  const pending = await provider.zapisniki(league.code)
  log({ league: league.slug, pending: pending.length, captured: league.reports.length, preview })
  if (preview) return { imported: 0, verified: 0, recomputedRounds: 0, pending: pending.length }
  if (pending.length) {
    assert.equal(typeof runNative, 'function')
    const result = await runNative(league)
    assert.equal(result?.status, 0, 'native import failed')
  }
  const verified = await verifyMigrationReports({ db, league, provider })
  const roundIds = [...new Set(league.reports.map(r => r.fixture.rounds.id))]
  for (const roundId of roundIds) for (const name of ['pripisi_obranjene_enajstmetrovke', 'recompute_round_scores']) {
    const { error } = await db.rpc(name, { p_round_id: roundId })
    if (error) throw Error(error.message)
  }
  return { imported: pending.length, verified, recomputedRounds: roundIds.length, pending: pending.length }
}

export async function runMigrationImport({ source, directory, db, preview, shard = 1, runNative, log = console.log, errorLog = console.error }) {
  assert.ok(['fcf', 'epsdod'].includes(source)); assert.equal(typeof preview, 'boolean')
  const count = source === 'fcf' ? 3 : 1
  assert.ok([1, 2, 3].includes(shard))
  if (shard > count) return { source, shard, importedReports: 0, verifiedReports: 0, failedLeagues: 0 }
  const snapshot = loadMigrationCapture(directory, { source })
  let failures = 0, imported = 0, verified = 0
  for (const league of snapshot.leagues.filter((_, i) => i % count === shard - 1)) {
    if (!league.reports.length) continue
    try {
      const { data: competition, error } = await db.from('competitions').select('*,countries!inner(code)').eq('id', league.id).single()
      if (error) throw Error(error.message)
      const provider = createMigrationCapturedSource({ competition, directory, db })
      const result = await replayMigrationLeague({ db, league, provider, preview, runNative, log: row => log(JSON.stringify(row)) })
      imported += result.imported; verified += result.verified
    } catch (error) { failures++; errorLog(`Migration ${league.slug}: ${error.message}`) }
  }
  const result = { source, shard, importedReports: imported, verifiedReports: verified, failedLeagues: failures }
  log(JSON.stringify(result))
  return result
}

async function main() {
  const { RECOVERY_SOURCE: source, SLFF_MIGRATION_CAPTURE: directory, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  assert.ok(['true', 'false'].includes(process.env.RECOVERY_PREVIEW))
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const result = await runMigrationImport({ source, directory, db, preview: process.env.RECOVERY_PREVIEW === 'true', shard: Number(process.env.RECOVERY_SHARD ?? 1),
    runNative: league => spawnSync(process.execPath, ['scripts/uvoz-zapisnikov.mjs', '--tekmovanje', league.slug, '--samo-dotaknjene'], { env: process.env, stdio: 'inherit', timeout: 30 * 60 * 1000 }),
  })
  if (result.failedLeagues) process.exitCode = 1
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
