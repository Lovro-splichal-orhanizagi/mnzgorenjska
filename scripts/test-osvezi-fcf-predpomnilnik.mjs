import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, existsSync, symlinkSync, rmSync, utimesSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
// Dynamic import allows a useful RED assertion before the new helper exists.
const helper = await import('./osvezi-fcf-predpomnilnik.mjs').catch(() => ({}))
const SHA = 'a'.repeat(40)
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_SHA: SHA, GITHUB_RUN_ID: '123' }
const now = Date.parse('2026-10-17T12:00:00Z')
const competition = () => ({ id: 1, slug: 'es-ct-elit', source: 'fcf', source_league_code: '4106968-4107207', active: false, country_code: 'ES', sezona_koledarska: false })
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fcf-refresh-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cache = join(root, 'scripts/.predpomnilnik/fcf'); mkdirSync(cache, { recursive: true })
  const put = (name, body = 'old pending future page') => { const p = join(cache, name); writeFileSync(p, body); utimesSync(p, new Date(now - 86400000), new Date(now - 86400000)); return p }
  const selected = put('acta-4106977.html'), other = put('acta-4106978.html'), foreign = join(root, 'scripts/.predpomnilnik/foreign.html'); writeFileSync(foreign, 'foreign')
  const options = { root, ids: 'es4106977', competition: competition(), season: '2026/27', now, env, sourceCommit: SHA, tekoca: true }
  return { root, cache, selected, other, foreign, put, options }
}
const snapshot = p => ({ bytes: readFileSync(p).toString('hex'), mtime: statSync(p).mtimeMs })
test('evicts the selected one-day-old pending page still held by seven-day TTL; preserves all other bytes and mtimes', t => {
  assert.equal(typeof helper.osvezi, 'function', 'bounded refresh helper must exist')
  const f = fixture(t), others = [f.other, f.foreign].map(snapshot), old = statSync(f.selected), bytes = readFileSync(f.selected), audits = []
  const r = helper.osvezi({ ...f.options, onAudit: a => audits.push(structuredClone(a)) })
  assert.equal(existsSync(f.selected), false)
  assert.deepEqual([f.other, f.foreign].map(snapshot), others)
  assert.deepEqual(r.selected, ['es4106977']); assert.equal(r.phase, 'complete')
  assert.deepEqual(r.files, [{ id: 'es4106977', path: 'scripts/.predpomnilnik/fcf/acta-4106977.html', status: 'removed', oldSha256: createHash('sha256').update(bytes).digest('hex'), oldMtimeMs: old.mtimeMs }])
  assert.equal(audits[0].phase, 'validated'); assert.equal(audits.at(-1).phase, 'complete')
})
for (const [name, patch] of [
  ['active', { competition: { active: true } }], ['country', { competition: { country_code: 'DE' } }],
  ['source', { competition: { source: 'fas' } }], ['Quarta', { competition: { slug: 'es-ct-quarta-g1' } }],
  ['calendar season', { competition: { sezona_koledarska: true } }], ['old season', { season: '2025/26' }], ['unreviewed future season', { season: '2027/28', now: Date.parse('2027-07-02T12:00:00Z') }],
  ['wrong configured block', { competition: { source_league_code: '4106969-4107208' } }],
  ['foreign block matching id', { competition: { source_league_code: '4110110-4110349' }, ids: 'es4110261' }],
  ['out of block late item', { ids: 'es4106977,es4110261' }], ['duplicate', { ids: 'es4106977,es4106977' }],
  ['bare id', { ids: '4106977' }], ['path', { ids: 'es4106977,../acta-1' }], ['empty item', { ids: 'es4106977,' }],
  ['nine ids', { ids: 'es4106977,es4106978,es4106979,es4106980,es4106981,es4106982,es4106983,es4106984,es4106985' }],
  ['archive', { arhiv: 'old' }], ['single report', { zapisnik: 'es4106977' }], ['disabled current', { tekoca: false }],
  ['club override', { dovoliManjKlubov: true }], ['active override', { prepisiAktivno: true }],
  ['outside Actions', { env: {} }], ['wrong repository', { env: { ...env, GITHUB_REPOSITORY: 'other/repo' } }], ['wrong checkout', { sourceCommit: 'b'.repeat(40) }],
]) test(`rejects ${name} with zero partial deletion and retains failure audit`, t => {
  const f = fixture(t), before = [f.selected, f.other, f.foreign].map(snapshot), audits = []
  const opts = { ...f.options, ...patch, competition: { ...f.options.competition, ...patch.competition }, onAudit: a => audits.push(structuredClone(a)) }
  assert.throws(() => helper.osvezi(opts))
  assert.deepEqual([f.selected, f.other, f.foreign].map(snapshot), before)
  assert.equal(audits.at(-1)?.phase, 'failed')
})
test('accepts eight unique IDs and missing regular targets as no-op', t => {
  const f = fixture(t)
  const r = helper.osvezi({ ...f.options, ids: 'es4106977,es4106978,es4106979,es4106980,es4106981,es4106982,es4106983,es4106984' })
  assert.equal(r.files.filter(x => x.status === 'removed').length, 2); assert.equal(r.files.filter(x => x.status === 'missing').length, 6)
})
for (const kind of ['target symlink', 'target directory', 'cache symlink', 'missing cache under scripts symlink', 'missing cache', 'missing scripts']) test(`prevalidates all paths: ${kind}`, t => {
  const f = fixture(t), outside = join(f.root, 'outside'); mkdirSync(outside); const external = join(outside, 'acta-4106978.html'); writeFileSync(external, 'outside')
  const before = snapshot(external)
  if (kind === 'target symlink') { rmSync(f.other); symlinkSync(external, f.other) }
  if (kind === 'target directory') { rmSync(f.other); mkdirSync(f.other) }
  if (kind === 'cache symlink') { rmSync(f.cache, { recursive: true }); symlinkSync(outside, f.cache) }
  if (kind === 'missing cache under scripts symlink') { rmSync(join(f.root, 'scripts'), { recursive: true }); symlinkSync(outside, join(f.root, 'scripts')) }
  if (kind === 'missing cache') rmSync(join(f.root, 'scripts/.predpomnilnik'), { recursive: true })
  if (kind === 'missing scripts') rmSync(join(f.root, 'scripts'), { recursive: true })
  if (kind.startsWith('missing ') && !kind.includes('symlink')) {
    const r = helper.osvezi({ ...f.options, ids: 'es4106977,es4106978' }); assert.ok(r.files.every(x => x.status === 'missing'))
  } else {
    const selected = existsSync(f.selected) ? snapshot(f.selected) : null
    assert.throws(() => helper.osvezi({ ...f.options, ids: 'es4106977,es4106978' }), /symlink|regular|directory|mapa/i)
    if (selected) assert.deepEqual(snapshot(f.selected), selected)
  }
  assert.deepEqual(snapshot(external), before)
})
test('metadata reader uses only competition select and real season RPC, failing closed on DB errors', async () => {
  const calls = [], c = { ...competition(), countries: { code: 'ES' } }; delete c.country_code
  const db = { from(table) { assert.equal(table, 'competitions'); return { select(columns) { calls.push(columns); return { eq(k, slug) { assert.equal(k, 'slug'); assert.equal(slug, 'es-ct-elit'); return { single: async () => ({ data: c }) } } } } } }, rpc: async (name, args) => { calls.push([name, args]); return { data: '2026/27' } } }
  const r = await helper.preberiCilj(db, 'es-ct-elit')
  assert.equal(r.competition.country_code, 'ES'); assert.equal(r.season, '2026/27')
  assert.deepEqual(calls.at(-1), ['sezona_lige', { p_competition_id: 1 }])
  db.rpc = async () => ({ error: { message: 'season read failed' } })
  await assert.rejects(helper.preberiCilj(db, 'es-ct-elit'), /season read failed/)
})

// Execute the checked-in workflow's actual shell bodies and conditions. Replace
// only Actions cache and node process boundaries; no provider or DB is contacted.
function workflowSteps() {
  const text = readFileSync(new URL('../.github/workflows/uvoz-lige.yml', import.meta.url), 'utf8')
  return text.split(/^      - /m).slice(1).map(s => {
    const line = s.match(/^        run: (.*)$/m)
    const run = !line ? null : line[1] === '|' ? s.slice(line.index + line[0].length + 1).split('\n').filter(l => l.startsWith('          ')).map(l => l.slice(10)).join('\n') : line[1]
    return { name: s.match(/^name: (.*)/)?.[1], id: s.match(/^        id: (.*)$/m)?.[1], condition: s.match(/^        if: (.*)$/m)?.[1], uses: s.match(/uses: (.*)/)?.[1], run, text: s }
  })
}
function expression(body, context) {
  return Function('inputs', 'github', 'steps', 'success', 'always', 'startsWith', `return (${body})`)(context.inputs, context.github, context.steps, context.success, () => true, (s, p) => s.startsWith(p))
}
function condition(expr, context) {
  if (!expr) return context.success()
  const body = expr.replace(/^\$\{\{\s*|\s*\}\}$/g, '')
  if (!/success\(|always\(|failure\(|cancelled\(/.test(body) && !context.success()) return false
  return Boolean(expression(body, context))
}
function runWorkflow(t, { refresh = 'es4106977', branch = 'main', failure = '', patch = {} } = {}) {
  const f = fixture(t), bin = join(f.root, 'bin'); mkdirSync(bin)
  const untouched = [f.other, f.foreign].map(snapshot)
  const log = join(f.root, 'calls'), output = join(f.root, 'output')
  writeFileSync(join(bin, 'node'), `#!${process.execPath}\n` + `const fs=require('node:fs'),a=process.argv.slice(2);fs.appendFileSync(process.env.CALL_LOG,a[0]+'\\n');if(a[0]===process.env.FAIL_SCRIPT)process.exit(79);if(a[0]==='scripts/aktivna-tekmovanja.mjs')console.log(process.env.LIGA);
    if(a[0]==='scripts/osvezi-fcf-predpomnilnik.mjs')import(${JSON.stringify(new URL('./osvezi-fcf-predpomnilnik.mjs', import.meta.url).href)}).then(({osvezi})=>{
      osvezi({root:process.cwd(),competition:JSON.parse(process.env.TARGET_COMPETITION),season:'2026/27',now:${now},sourceCommit:${JSON.stringify(SHA)},env:JSON.parse(process.env.ACTIONS_FIXTURE),ids:process.env.FCF_OSVEZI,tekoca:process.env.TEKOCA==='true',arhiv:process.env.ARHIV,zapisnik:process.env.ZAPISNIK,dovoliManjKlubov:Boolean(process.env.DOVOLI_MANJ_KLUBOV),prepisiAktivno:Boolean(process.env.DOVOLI_AKTIVNO)});
    }).catch(e=>{console.error(e.message);process.exitCode=79});`, { mode: 0o755 })
  const inputs = { liga: 'es-ct-elit', fcf_osvezi: refresh, tekoca: true, cene: true, zapisnik: '', arhiv: '', dovoli_manj_klubov: false, prepisi_aktivno: false, ...patch }
  let failed = false
  const steps = {}, visited = [], restores = [], saves = []
  const context = { inputs, github: { ref: `refs/heads/${branch}` }, steps, success: () => !failed }
  // Consume actual job env expressions, so missing/incorrect input wiring fails.
  const workflow = readFileSync(new URL('../.github/workflows/uvoz-lige.yml', import.meta.url), 'utf8')
  const envBlock = workflow.split('    env:\n')[1].split('    steps:')[0]
  const jobEnv = Object.fromEntries([...envBlock.matchAll(/^      ([A-Z_]+): \$\{\{ (.*?) \}\}$/gm)].map(([, name, value]) => [name, String(expression(value, context))]))
  for (const step of workflowSteps()) {
    if (!condition(step.condition, context)) continue
    visited.push(step.name)
    let ok = true
    if (step.run && !/npm ci|npx playwright|pdftotext|gh workflow run/.test(step.run)) {
      const result = spawnSync('bash', ['-euo', 'pipefail', '-c', step.run.replaceAll('/tmp/', `${f.root}/`)], { cwd: f.root, encoding: 'utf8', timeout: 5000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALL_LOG: log, FAIL_SCRIPT: failure, TARGET_COMPETITION: JSON.stringify(competition()), ACTIONS_FIXTURE: JSON.stringify(env), ...jobEnv, GITHUB_OUTPUT: output } })
      ok = result.status === 0
    }
    if (step.uses?.includes('cache/restore')) {
      restores.push(step.text.split('restore-keys: |\n')[1]?.split('\n').filter(l => l.startsWith('            ')).map(l => l.trim()) ?? [])
    }
    if (step.uses?.includes('cache/save')) saves.push(step)
    if (step.id) steps[step.id] = { outcome: ok ? 'success' : 'failure' }
    if (!ok) failed = true
  }
  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []
  assert.deepEqual([f.other, f.foreign].map(snapshot), untouched, 'workflow must preserve unselected source bytes/mtimes')
  return { calls, visited, restores, saves, failed }
}
test('actual workflow path waits/restores/checks/refreshes before ordinary full import and stops after wait/helper/readiness failures', t => {
  const ok = runWorkflow(t)
  assert.deepEqual(ok.calls.slice(0, 5), ['scripts/cakaj-na-uvoze.mjs', 'scripts/aktivna-tekmovanja.mjs', 'scripts/osvezi-fcf-predpomnilnik.mjs', 'scripts/uvoz-razporeda.mjs', 'scripts/uvoz-delegiranja.mjs'])
  assert.ok(ok.visited.indexOf('Predpomnilnik FCF osvezitve') < ok.visited.indexOf('Osvezi izbrane FCF zapisnike'))
  for (const failure of ['scripts/cakaj-na-uvoze.mjs', 'scripts/osvezi-fcf-predpomnilnik.mjs', 'scripts/pripravljenost-lige.mjs']) {
    const r = runWorkflow(t, { failure }); assert.equal(r.failed, true)
    if (!failure.includes('pripravljenost')) assert.equal(r.calls.some(c => c === 'scripts/uvoz-razporeda.mjs'), false)
    assert.equal(r.saves.filter(s => s.name === 'Objavi FCF predpomnilnik za nocni ES uvoz').length, 0)
    assert.ok(r.visited.includes('Shrani revizijo FCF osvezitve'))
    assert.ok(r.visited.includes('Shrani predpomnilnik zapisnikov'))
  }
})
test('explicit restore uses latest uppercase ES country before slug/lowercase fallback; ordinary restore retains global fallback', t => {
  const bounded = runWorkflow(t), ordinary = runWorkflow(t, { refresh: '' })
  assert.deepEqual(bounded.restores, [['zapisniki-ES-k1od1-', 'zapisniki-ES-', 'zapisniki-${{ inputs.liga }}-', 'zapisniki-${{ steps.drzava.outputs.predpona }}']])
  assert.deepEqual(ordinary.restores, [['zapisniki-${{ inputs.liga }}-', 'zapisniki-${{ steps.drzava.outputs.predpona }}', 'zapisniki-']])
  assert.equal(ordinary.calls.includes('scripts/osvezi-fcf-predpomnilnik.mjs'), false)
})
test('promotion is explicit main success only and uses exact nightly key without touching cache mtimes', t => {
  for (const [options, expected] of [[{}, 1], [{ refresh: '' }, 0], [{ branch: 'feature' }, 0], [{ failure: 'scripts/uvoz-zapisnikov.mjs' }, 0], [{ failure: 'scripts/pripravljenost-lige.mjs' }, 0]]) {
    const r = runWorkflow(t, options), promoted = r.saves.filter(s => s.name === 'Objavi FCF predpomnilnik za nocni ES uvoz')
    assert.equal(promoted.length, expected)
    if (expected) {
      assert.match(promoted[0].text, /key: zapisniki-ES-k1od1-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/)
      assert.match(promoted[0].text, /path: scripts\/\.predpomnilnik/)
    }
  }
})

for (const patch of [{ arhiv: 'old' }, { zapisnik: 'es4106977' }, { tekoca: false }, { dovoli_manj_klubov: true }, { prepisi_aktivno: true }]) test(`actual workflow env rejects incompatible ${Object.keys(patch)[0]} before every mutator`, t => {
  const r = runWorkflow(t, { patch })
  assert.equal(r.failed, true)
  assert.ok(r.calls.includes('scripts/osvezi-fcf-predpomnilnik.mjs'))
  for (const mutator of ['scripts/uvoz-zapisnikov.mjs', 'scripts/uvoz-razporeda.mjs', 'scripts/lazni-vratarji.mjs']) assert.equal(r.calls.includes(mutator), false)
})
test('promotion refuses cancellation and skipped required steps despite successful other outcomes', () => {
  const step = workflowSteps().find(s => s.name === 'Objavi FCF predpomnilnik za nocni ES uvoz')
  for (const [success, outcome] of [[false, 'success'], [true, 'skipped'], [true, 'failure'], [true, 'cancelled']]) {
    const context = { inputs: { fcf_osvezi: 'es4106977' }, github: { ref: 'refs/heads/main' }, success: () => success, steps: { fcf_refresh: { outcome }, current_import: { outcome: 'success' }, readiness: { outcome: 'success' } } }
    assert.equal(condition(step.condition, context), false)
  }
})
test('failed target metadata validation keeps the canonical selected report IDs in the audit', t => {
  const f = fixture(t), audits = []
  assert.throws(() => helper.osvezi({ ...f.options, competition: { ...f.options.competition, active: true }, onAudit: a => audits.push(structuredClone(a)) }))
  assert.deepEqual(audits.at(-1).selected, ['es4106977'])
  assert.equal(existsSync(f.selected), true)
})
