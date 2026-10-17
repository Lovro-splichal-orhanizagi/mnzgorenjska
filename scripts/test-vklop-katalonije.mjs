import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { preveriLigo, izberiPrviKrog, pripraviBatch, aktivirajBatch, preberiPosnetek, preberiVse, kanonicno, sha256, KATALONSKE_LIGE } from './vklopi-katalonijo.mjs'

const NOW = Date.parse('2026-10-17T12:00:00Z')
const COMMIT = 'a'.repeat(40)
const ACTIONS = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_SHA: COMMIT, GITHUB_RUN_ID: '123' }
export function liga(slug = 'es-ct-primera-g1') {
  const competition = { id: 9, slug, source: 'fcf', source_league_code: '4108646-4108885', active: false, country_code: 'ES', sezona_koledarska: false, prvi_fantasy_krog: 1 }
  const players = Array.from({ length: 240 }, (_, i) => ({ id: i + 1, competition_id: 9, team_id: Math.floor(i / 15) + 1, active: true, position: i % 15 === 0 || i % 15 === 14 ? 'GK' : i % 15 <= 5 ? 'DEF' : i % 15 <= 10 ? 'MID' : 'FWD', value: i === 0 ? 12 : 5 + i % 2 }))
  const rounds = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, number: i + 1, competition_id: 9, season: '2026/27', deadline_at: i < 6 ? `2026-10-0${i + 1}T12:00:00Z` : `2026-10-25T12:00:00Z` }))
  const matches = [], appearances = [], goals = [], ring = Array.from({ length: 16 }, (_, i) => i + 1)
  for (let leg = 0; leg < 2; leg++) for (let k = 0; k < 15; k++) {
    const round = leg * 15 + k + 1
    for (let i = 0; i < 8; i++) {
      let [home, away] = [ring[i], ring[15 - i]]; if (leg) [home, away] = [away, home]
      const id = matches.length + 1, imported = round <= 6
      matches.push({ id, round_id: round, home_team_id: home, away_team_id: away, home_goals: 0, away_goals: 0, played_on: imported ? `2026-10-0${round}` : '2026-10-25', imported_at: imported ? '2026-10-07T12:00:00Z' : null, zapisnik_id: `es${4108646 + id - 1}`, kontumacija: false, vir_brez_izida: false, import_warnings: [] })
      if (imported) for (const team of [home, away]) for (let j = 0; j < 12; j++) appearances.push({ id: appearances.length + 1, match_id: id, player_id: (team - 1) * 15 + j + 1, team_id: team, started: j < 11, is_goalkeeper: j === 0, minute_on: j === 11 ? 60 : 0, minute_off: j === 1 ? 60 : 90, minutes_played: j === 11 ? 30 : j === 1 ? 60 : 90, goals: 0, own_goals: 0, penalties_scored: 0, penalties_missed: 0, penalties_saved: 0, yellow_cards: 0, red_cards: 0, goals_conceded: 0, clean_sheet: true })
    }
    ring.splice(1, 0, ring.pop())
  }
  const state = { aktivnih: 240, privzetih: 0, klubov: 16, najvisja_cena: 12, po_pozicijah: { GK: 32, DEF: 80, MID: 80, FWD: 48 }, nastopov_s_klopi: 96, golov_brez_nastopa: 0, krogov_tekoce: 30, igralci: players.map(({ id, team_id, position, value }) => ({ id, team_id, position, value })) }
  return { competition, season: '2026/27', rounds, matches, appearances, goals, players, state }
}
const check = s => preveriLigo(s, NOW)
test('real-shaped complete 16-club league passes actual roster readiness and selects future round', () => {
  const r = check(liga()); assert.equal(r.pripravljena, true, JSON.stringify(r.tezave)); assert.equal(r.prviKrog.number, 7); assert.equal(KATALONSKE_LIGE.length, 27)
})
for (const [name, mutate, reason] of [
  ['wrong source', s => s.competition.source = 'fas', /obseg/],
  ['wrong country', s => s.competition.country_code = 'DE', /obseg/],
  ['Quarta', s => s.competition.slug = 'es-ct-quarta-g1', /obseg/],
  ['wrong season', s => s.season = '2025/26', /sezon/],
  ['already active', s => s.competition.active = true, /aktivna/],
  ['239 fixtures', s => s.matches.pop(), /240|krog/],
  ['duplicate directed pair', s => { s.matches[8].home_team_id = s.matches[0].home_team_id; s.matches[8].away_team_id = s.matches[0].away_team_id }, /par|krog/],
  ['duplicate row', s => s.appearances[1].id = s.appearances[0].id, /identitet/],
  ['10 starters', s => s.appearances[1].started = false, /XI/],
  ['2 starting goalkeepers', s => s.appearances[1].is_goalkeeper = true, /vratar/],
  ['unknown minutes', s => s.appearances[1].minutes_played = null, /minut/],
  ['invalid interval', s => s.appearances[1].minute_off = 40, /minut/],
  ['unknown statistic', s => s.appearances[1].goals = null, /statistik/],
  ['wrong appearance club', s => s.appearances[1].team_id = 999, /klub/],
  ['wrong competition player', s => s.players[1].competition_id = 999, /igralec/],
  ['warning', s => s.matches[0].import_warnings = ['goal mismatch'], /opozoril/],
  ['overdue missing report', s => { s.matches[48].played_on = '2026-10-13' }, /zamud/],
  ['missing goal', s => s.matches[0].home_goals = 1, /goli/],
  ['missing deadline', s => s.rounds[0].deadline_at = null, /rok/],
  ['today date only future deadline', s => s.matches[48].played_on = '2026-10-17', /datum/i],
  ['unaffordable roster', s => { for (const p of s.state.igralci) p.value = 12; for (const p of s.players) p.value = 12 }, /kader/],
  ['illegal club-concentrated roster', s => { for (const p of s.state.igralci) p.team_id = 1; for (const p of s.players) p.team_id = 1 }, /kader|klub/],
]) test(`blocks ${name}`, () => { const s = liga(); mutate(s); const r = check(s); assert.equal(r.pripravljena, false); assert.match(r.tezave.join(' '), reason) })

test('own goal credits opposing beneficiary; same total with wrong side fails', () => {
  const s = liga(), a = s.appearances[0], m = s.matches[0]
  m.away_goals = 1; a.own_goals = 1
  s.goals.push({ id: 1, match_id: m.id, scorer_id: a.player_id, team_id: a.team_id, minute: 20, is_own_goal: true, is_penalty: false, score_home: 0, score_away: 1 })
  assert.equal(check(s).pripravljena, true)
  s.goals[0].is_own_goal = false
  assert.match(check(s).tezave.join(' '), /goli/)
  s.goals[0].scorer_id = 9999
  assert.match(check(s).tezave.join(' '), /nastop/)
})
test('historical player club differs legitimately; source-pending and <48h date-end rows remain pending', () => {
  const s = liga(); s.players[1].team_id = 2; s.state.igralci[1].team_id = 2
  s.matches[48].played_on = '2026-10-01'; s.matches[48].vir_brez_izida = true
  // Use a later round so the selected round still has strictly future match dates.
  s.matches[56].played_on = '2026-10-15'
  // The selected round must never have a pending past game, regardless of its flag.
  assert.match(check(s).tezave.join(' '), /datum/i)
  s.matches[48].played_on = '2026-10-25'
  assert.equal(check(s).pripravljena, true, check(s).tezave.join(' '))
})
test('RPC parity counts distinct played rounds including appearances on unimported games', () => {
  const s = liga()
  const add = round => s.appearances.push({ ...s.appearances[0], id: s.appearances.length + 1, match_id: s.matches[(round - 1) * 8].id })
  add(20); add(21)
  assert.equal(izberiPrviKrog(s, NOW).number, 7)
  // Many appearances in one round do not consume the second exception.
  add(20); assert.equal(izberiPrviKrog(s, NOW).number, 7)
  add(22); assert.equal(izberiPrviKrog(s, NOW).number, 23)
})
test('pagination reads tail beyond 1000 and reconciles exact count, duplicate ids and errors', async () => {
  const rows = liga().appearances, calls = []
  const result = await preberiVse((start, end) => { calls.push(start); return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length, error: null }) }, 'appearances')
  assert.equal(result.length, 1152); assert.deepEqual(calls, [0, 1000])
  await assert.rejects(preberiVse((start, end) => Promise.resolve({ data: rows.slice(start, Math.min(end + 1, 1000)), count: rows.length }), 'appearances'), /count|štev|stran/)
  await assert.rejects(preberiVse(() => Promise.resolve({ data: [{ id: 1 }, { id: 1 }], count: 2 }), 'goals'), /identitet/)
  await assert.rejects(preberiVse(() => Promise.resolve({ error: { message: 'read failed' } }), 'matches'), /read failed/)
})

// The real reader queries by current match ids (not imported_at or player ids),
// uses exact counts on every page, and does not filter away invalid references.
function database(snapshot) {
  const queries = [], mutations = []
  const db = { queries, mutations, rpc: async (name, args) => {
    if (name === 'sezona_lige') return { data: snapshot.season }
    if (name === 'stanje_lige') return { data: snapshot.state }
    mutations.push({ name, args }); snapshot.competition.active = true; snapshot.competition.prvi_fantasy_krog = 7
    return { data: { vklopljena: true, prvi_krog: 7 } }
  }, from(table) {
    let filters = [], selection
    const q = { select(cols, options) { selection = { cols, options }; return q }, eq(k, v) { filters.push([k, v]); return q }, in(k, v) { filters.push([k, v]); return q }, order() { return q },
      single() { return Promise.resolve({ data: snapshot.competition }) },
      range(start, end) { queries.push({ table, selection, filters, start, end }); const rows = snapshot[table]; return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length, error: null }) },
    }; return q
  } }; return db
}
test('actual snapshot reader includes pagination-tail and unimported-row appearances/goals', async () => {
  const s = liga(); s.appearances.push({ ...s.appearances[0], id: 9999, match_id: 49 })
  const db = database(s), read = await preberiPosnetek(db, s.competition.slug)
  assert.equal(read.appearances.length, 1153)
  const qs = db.queries.filter(q => ['appearances', 'goals'].includes(q.table))
  for (const q of qs) { assert.equal(q.selection.options.count, 'exact'); assert.equal(q.filters[0][0], 'match_id'); assert.equal(q.filters[0][1].length, 240); assert.equal(q.filters.length, 1) }
})
test('canonical manifests stable across read order and bind prices/statistics/source commit', async () => {
  const s = liga(), opts = { slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), now: () => NOW }
  const a = await pripraviBatch(opts); s.appearances.reverse(); s.players.reverse(); const b = await pripraviBatch(opts)
  assert.equal(a.sha256, b.sha256)
  s.appearances[0].yellow_cards++
  assert.notEqual((await pripraviBatch(opts)).sha256, a.sha256)
  assert.notEqual((await pripraviBatch({ ...opts, sourceCommit: 'b'.repeat(40) })).sha256, a.sha256)
})
test('activation validates whole batch before any mutation; missing SHA/non-Actions/stale state never call RPC', async () => {
  const s = liga(), db = database(s), opts = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), now: () => NOW, env: ACTIONS }
  const approved = await pripraviBatch(opts)
  for (const approvedSha of ['', 'x', '0'.repeat(64)]) await assert.rejects(aktivirajBatch({ ...opts, approvedSha }), /SHA/)
  await assert.rejects(aktivirajBatch({ ...opts, approvedSha: approved.sha256, env: {} }), /Actions/)
  s.players[0].value = 11; s.state.igralci[0].value = 11
  await assert.rejects(aktivirajBatch({ ...opts, approvedSha: approved.sha256 }), /SHA|spremen/)
  assert.equal(db.mutations.length, 0)
})
test('immediate per-league full reread blocks a mutation after complete batch validation', async () => {
  const s = liga(), db = database(s), base = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, now: () => NOW, env: ACTIONS }
  const approved = await pripraviBatch({ ...base, read: async () => structuredClone(s) })
  let reads = 0
  await assert.rejects(aktivirajBatch({ ...base, approvedSha: approved.sha256, read: async () => { if (++reads === 2) s.appearances[0].yellow_cards++; return structuredClone(s) } }), /spremen|SHA/)
  assert.equal(db.mutations.length, 0)
})
test('time is checked again immediately before RPC and date-only selected round cannot start today', async () => {
  const s = liga(), db = database(s), base = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), env: ACTIONS }
  const approved = await pripraviBatch({ ...base, now: () => NOW }); let times = 0
  await assert.rejects(aktivirajBatch({ ...base, approvedSha: approved.sha256, now: () => ++times < 3 ? NOW : Date.parse('2026-10-25T11:00:00Z') }), /datum|rok|spremen/)
  assert.equal(db.mutations.length, 0)
})
test('valid approved operation uses only existing activation RPC and verifies returned/readback first future round', async () => {
  const s = liga(), db = database(s), opts = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), now: () => NOW, env: ACTIONS }
  const approved = await pripraviBatch(opts), result = await aktivirajBatch({ ...opts, approvedSha: approved.sha256 })
  assert.equal(result.results[0].active, true)
  assert.deepEqual(db.mutations, [{ name: 'vklopi_ligo_sredi_sezone', args: { p_slug: s.competition.slug } }])
})

test('every club needs bench evidence, and goal times must lie within the scorer appearance', () => {
  const s = liga(); s.appearances = s.appearances.filter(a => !(a.team_id === 1 && !a.started))
  assert.match(check(s).tezave.join(' '), /Klub 1: ni dokaza/)
  const g = liga(), a = g.appearances.find(a => !a.started), m = g.matches.find(m => m.id === a.match_id)
  m.home_goals = a.team_id === m.home_team_id ? 1 : 0; m.away_goals = a.team_id === m.away_team_id ? 1 : 0; a.goals = 1
  g.goals.push({ id: 1, match_id: m.id, scorer_id: a.player_id, team_id: a.team_id, minute: 20, is_own_goal: false, is_penalty: false, score_home: m.home_goals, score_away: m.away_goals })
  assert.match(check(g).tezave.join(' '), /minut/)
})

test('readiness scalar counts cannot disagree with the actual active roster', () => {
  const s = liga(); s.state.najvisja_cena = 99
  assert.match(check(s).tezave.join(' '), /pripravljenosti/)
})

function batchDatabase() {
  const first = liga('es-ct-primera-g1'), second = liga('es-ct-tercera-g1')
  second.competition.id = 10; second.rounds.forEach(r => r.competition_id = 10); second.players.forEach(p => p.competition_id = 10)
  const snapshots = new Map([first, second].map(s => [s.competition.slug, s])), mutations = []
  const read = async slug => structuredClone(snapshots.get(slug))
  const db = { rpc: async (name, { p_slug }) => {
    mutations.push(p_slug); const s = snapshots.get(p_slug); s.competition.active = true; s.competition.prvi_fantasy_krog = 7
    return { data: { vklopljena: true, prvi_krog: 7 } }
  } }
  return { snapshots, mutations, read, db, opts: { db, read, slugs: [...snapshots.keys()], sourceCommit: COMMIT, now: () => NOW, env: ACTIONS } }
}
test('whole approved batch is checked before the first RPC, including changed later candidates', async () => {
  const f = batchDatabase(), approved = await pripraviBatch(f.opts)
  f.snapshots.get(f.opts.slugs[1]).appearances.at(-1).yellow_cards++
  await assert.rejects(aktivirajBatch({ ...f.opts, approvedSha: approved.sha256 }), /SHA/)
  assert.equal(f.mutations.length, 0)
})
test('earlier activated leagues do not invalidate later league hashes', async () => {
  const f = batchDatabase(), approved = await pripraviBatch(f.opts)
  const r = await aktivirajBatch({ ...f.opts, approvedSha: approved.sha256 })
  assert.equal(r.results.length, 2); assert.deepEqual(f.mutations, f.opts.slugs)
})
test('per-league reread stops after partial success; no later RPC or replacement candidate', async () => {
  const f = batchDatabase(), approved = await pripraviBatch(f.opts), progress = []; let calls = 0
  const read = async slug => { if (++calls === 5) f.snapshots.get(slug).appearances.at(-1).red_cards++; return f.read(slug) }
  await assert.rejects(aktivirajBatch({ ...f.opts, read, approvedSha: approved.sha256, onProgress: p => progress.push(structuredClone(p.results)) }), /spremen/)
  assert.deepEqual(f.mutations, [f.opts.slugs[0]])
  assert.equal(progress.at(-1)[0].active, true); assert.match(progress.at(-1)[1].error, /spremen/)
})
test('wrong RPC response and wrong active/readback first round fail visibly', async () => {
  for (const failure of ['response', 'readback']) {
    const s = liga(), db = database(s), opts = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), now: () => NOW, env: ACTIONS }
    const approved = await pripraviBatch(opts), original = db.rpc
    db.rpc = async (...args) => { const r = await original(...args); if (failure === 'response') r.data.prvi_krog = 8; else s.competition.prvi_fantasy_krog = 8; return r }
    await assert.rejects(aktivirajBatch({ ...opts, approvedSha: approved.sha256 }), /RPC|readback/)
    assert.equal(db.mutations.length, 1)
  }
})
test('blocked and already-active candidates can be reviewed without making any activation call', async () => {
  for (const mutate of [s => s.matches.pop(), s => s.competition.active = true]) {
    const s = liga(); mutate(s); const db = database(s), opts = { db, slugs: [s.competition.slug], sourceCommit: COMMIT, read: async () => structuredClone(s), now: () => NOW, env: ACTIONS }
    const approved = await pripraviBatch(opts), r = await aktivirajBatch({ ...opts, approvedSha: approved.sha256 })
    assert.equal(r.results.length, 0); assert.equal(db.mutations.length, 0)
  }
})
// Run the checked-in shell, replacing only the external node process boundary.
function runReleaseShell(t, activate, failWait = false) {
  const workflow = readFileSync(new URL('../.github/workflows/vklop-katalonije.yml', import.meta.url), 'utf8')
  const steps = workflow.split(/^      - /m).slice(1).map(step => {
    const line = step.match(/^        run: (.*)$/m)
    return !line ? '' : line[1] === '|' ? step.slice(line.index + line[0].length + 1).split('\n').filter(l => l.startsWith('          ')).map(l => l.slice(10)).join('\n') : line[1]
  })
  const wait = steps.filter(s => s.includes('scripts/cakaj-na-uvoze.mjs'))
  const helper = steps.filter(s => s.includes('scripts/vklopi-katalonijo.mjs'))
  assert.equal(wait.length, 1)
  assert.equal(helper.length, 1)
  assert.ok(steps.indexOf(wait[0]) < steps.indexOf(helper[0]))
  const root = mkdtempSync(join(tmpdir(), 'katalonija-wait-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const log = join(root, 'calls')
  writeFileSync(log, '')
  writeFileSync(join(root, 'node'), `#!${process.execPath}\nconst fs = require('node:fs'), args = process.argv.slice(2); fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args) + '\\n'); if (process.env.FAIL_WAIT === 'true' && args[0] === 'scripts/cakaj-na-uvoze.mjs') process.exit(79);`, { mode: 0o755 })
  const result = spawnSync('bash', ['-euo', 'pipefail', '-c', `${wait[0]}\n${helper[0]}`], {
    cwd: root, encoding: 'utf8', timeout: 5000,
    env: { PATH: `${root}:${process.env.PATH}`, CALL_LOG: log, FAIL_WAIT: String(failWait), ACTIVATE: String(activate), LIGE: '', APPROVED_SHA: '' },
  })
  assert.ifError(result.error)
  return { status: result.status, stderr: result.stderr, commands: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) }
}

test('release workflow bounds the hosted job to six hours', () => {
  const workflow = readFileSync(new URL('../.github/workflows/vklop-katalonije.yml', import.meta.url), 'utf8')
  assert.equal(Number(workflow.match(/^    timeout-minutes: (.+)$/m)[1]), 360)
})
for (const activate of [false, true]) {
  test(`release workflow waits for ES with a fixed five-hour limit before ${activate ? 'activate' : 'prepare'}`, t => {
    const result = runReleaseShell(t, activate)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.commands, [
      ['scripts/cakaj-na-uvoze.mjs', '--drzava', 'ES', '--najvec', '300'],
      ['scripts/vklopi-katalonijo.mjs', activate ? 'activate' : 'prepare', '--output', 'release/katalonija'],
    ])
  })
  test(`failed release coordinator prevents the ${activate ? 'activate' : 'prepare'} helper`, t => {
    const result = runReleaseShell(t, activate, true)
    assert.equal(result.status, 79, result.stderr)
    assert.deepEqual(result.commands, [['scripts/cakaj-na-uvoze.mjs', '--drzava', 'ES', '--najvec', '300']])
  })
}

test('workflow prepares by default, runs one fixed ES coordinator and retains partial-failure evidence', async () => {
  const { readFileSync } = await import('node:fs')
  const text = readFileSync(new URL('../.github/workflows/vklop-katalonije.yml', import.meta.url), 'utf8')
  assert.match(text, /activate:[\s\S]*?default: false/)
  assert.match(text, /group: vklop-katalonije\n/)
  assert.match(text, /cakaj-na-uvoze\.mjs --drzava ES/)
  assert.match(text, /if: always\(\)[\s\S]*actions\/upload-artifact/)
  assert.match(readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'), /node --test scripts\/test-vklop-katalonije\.mjs/)
})

test('real schedule importer shape: unimported scheduled/pending matches may lack report identity', () => {
  // Derived from the read-only 2026-10-17 Primera G1 production snapshot:
  // generic schedule rows have DB fixture ids but zapisnik_id=null; a pending
  // row may retain the league seed URL rather than its own actual report URL.
  const s = liga()
  for (const m of s.matches.filter(m => !m.imported_at)) { m.zapisnik_id = null; m.source_url = null }
  s.matches[56].played_on = '2026-10-03'; s.matches[56].vir_brez_izida = true
  s.matches[56].source_url = 'https://www.fcf.cat/ca/competicio/acta/4108646'
  assert.equal(check(s).pripravljena, true, check(s).tezave.join(' '))
  s.matches[0].zapisnik_id = null
  assert.match(check(s).tezave.join(' '), /identitet/)
  s.matches[0].zapisnik_id = 'es4108647'; s.matches[1].zapisnik_id = 'es4108647'
  assert.match(check(s).tezave.join(' '), /identitet/)
  s.matches[0].zapisnik_id = 'foreign-id'
  assert.match(check(s).tezave.join(' '), /identitet/)
})


test('present report ids belong to the configured block; imported URLs identify that report', () => {
  const s = liga(); s.matches[100].zapisnik_id = 'es999999999'
  assert.match(check(s).tezave.join(' '), /identitet/)
  const t = liga(); t.matches[0].source_url = 'https://www.fcf.cat/ca/competicio/acta/9999999'
  assert.match(check(t).tezave.join(' '), /identitet/)
})
