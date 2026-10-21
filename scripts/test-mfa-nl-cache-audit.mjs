import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createCacheReader, audit, validateSourceRun, validateAuditInputs } from './analiziraj-mfa-nl-cache.mjs'

function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), 'mfa-nl-audit-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cacheRoot = join(root, 'cache'); mkdirSync(cacheRoot)
  return { root, cacheRoot, outputRoot: join(root, 'output') }
}
function put(root, name, data) { writeFileSync(join(root, name), typeof data === 'string' ? data : JSON.stringify(data)) }
function seed(root) {
  const match = { id: 53185943, competitionId: 123, competitionTypeId: 2601267, status: 'PLAYED', startDate: '2026-10-10T10:00:00Z', homeTeam: { id: 1, name: 'Home' }, awayTeam: { id: 2, name: 'Away' } }
  for (const year of [2026, 2027]) {
    put(root, `standings-2601267-${year}.json`, { phases: [{ groups: [{ id: 123 }] }] })
    put(root, `pastMatches-2601267-${year}-1.json`, year === 2026 ? [match] : [])
    put(root, `upcomingMatches-2601267-${year}-1.json`, year === 2027 ? [{ ...match, id: 99999999, status: 'SCHEDULED' }] : [])
  }
  for (const kind of ['izid', 'postava']) writeFileSync(join(root, `tekma-${match.id}-${kind}.json`), readFileSync(new URL(`./vzorci/mt-mfa-tekma-${match.id}-${kind}.json`, import.meta.url)))
  return match
}
test('audit inputs and source run require an exact supported league and completed first-attempt main import', () => {
  assert.deepEqual(validateAuditInputs('mt-nl1', '123'), { league: 'mt-nl1', sourceRunId: '123' })
  for (const [slug, id] of [['mt-premier', '123'], ['mt-nl2', '../1'], ['mt-nl1', '']]) assert.throws(() => validateAuditInputs(slug, id))
  const run = { id: 123, path: '.github/workflows/uvoz-lige.yml', head_branch: 'main', event: 'workflow_dispatch', status: 'completed', run_attempt: 1, head_repository: { full_name: 'owner/repo' }, repository: { full_name: 'owner/repo' } }
  assert.equal(validateSourceRun(run, '123', 'owner/repo'), run)
  for (const patch of [{ id: 124 }, { path: '.github/workflows/other.yml' }, { head_branch: 'feature' }, { status: 'in_progress' }, { run_attempt: 2 }, { event: 'pull_request' }, { head_repository: { full_name: 'fork/repo' } }]) assert.throws(() => validateSourceRun({ ...run, ...patch }, '123', 'owner/repo'))
})
test('cache reader copies original JSON bytes once with SHA and mtime, including backfill sentinels', async t => {
  const dirs = sandbox(t); const raw = '{"ni":404}\n'; put(dirs.cacheRoot, 'po-sifri-123.json', raw)
  const reader = createCacheReader(dirs)
  assert.equal(await reader('https://api.mfa.com.mt/api/matches/123', 'tekma-123.json', true), raw)
  assert.equal(await reader('https://api.mfa.com.mt/api/matches/123', 'tekma-123.json', true), raw)
  assert.equal(reader.catalog.size, 1)
  const row = [...reader.catalog.values()][0]; assert.equal(row.file, 'po-sifri-123.json'); assert.match(row.sha256, /^[a-f0-9]{64}$/); assert.ok(row.mtime)
  assert.equal(readFileSync(join(dirs.outputRoot, 'cache', row.file), 'utf8'), raw)
})
test('cache reader fails missing, unsafe, symlinked, invalid JSON and oversized bodies without a transport', async t => {
  const dirs = sandbox(t); put(dirs.cacheRoot, 'ok.json', '{}'); put(dirs.cacheRoot, 'bad.json', '<html>')
  symlinkSync(join(dirs.cacheRoot, 'ok.json'), join(dirs.cacheRoot, 'link.json'))
  const reader = createCacheReader(dirs)
  for (const file of ['missing.json', '../ok.json', 'link.json', 'bad.json']) await assert.rejects(reader('offline', file))
  await assert.rejects(createCacheReader({ ...dirs, maxBytes: 1 })('offline', 'ok.json'), /bound/)
})
test('audit inventories both seasons and saves exact-ID report issues instead of aborting evidence', async t => {
  const dirs = sandbox(t); const match = seed(dirs.cacheRoot)
  const lineup = JSON.parse(readFileSync(join(dirs.cacheRoot, `tekma-${match.id}-postava.json`)))
  const player = lineup.homeTeam.players.find(p => p.startingLineup)
  player.events.push({ id: 99999999, type: 'RED', playerId: player.id, time: null })
  put(dirs.cacheRoot, `tekma-${match.id}-postava.json`, lineup)
  const old = globalThis.fetch; globalThis.fetch = () => { throw Error('network forbidden') }; t.after(() => { globalThis.fetch = old })
  const out = await audit({ ...dirs, league: 'mt-nl1', sourceRunId: '123' })
  assert.equal(out.issues, true); assert.equal(out.reports.length, 1)
  assert.equal(out.reports[0].id, `mt${match.id}`); assert.match(out.reports[0].issues.join(' '), /dismissal minute/)
  assert.deepEqual(out.inventory.map(x => x.kind), ['archive', 'current'])
  for (const name of ['fixture-inventory.json', 'report-analysis.json', 'cache-manifest.json']) assert.ok(JSON.parse(readFileSync(join(dirs.outputRoot, name))))
  assert.equal(readdirSync(join(dirs.outputRoot, 'cache')).length, 8)
  const artifact = JSON.parse(readFileSync(join(dirs.outputRoot, 'fixture-inventory.json')))
  assert.equal(artifact.league.id, 973); assert.equal(artifact.reports[0].sourceId, String(match.id)); assert.ok(artifact.reports[0].players[0].sourcePlayerId)
})
test('missing inventory or report bytes fail clearly', async t => {
  const dirs = sandbox(t)
  await assert.rejects(audit({ ...dirs, league: 'mt-nl1', sourceRunId: '123' }), /missing/)
  rmSync(dirs.outputRoot, { recursive: true, force: true }); seed(dirs.cacheRoot)
  rmSync(join(dirs.cacheRoot, 'tekma-53185943-postava.json'))
  await assert.rejects(audit({ ...dirs, league: 'mt-nl1', sourceRunId: '123' }), /missing/)
})
test('audit workflow isolates mutating jobs and verifies metadata before an exact cache restore', () => {
  const yaml = readFileSync(new URL('../.github/workflows/razdeli-zlite-igralce.yml', import.meta.url), 'utf8')
  assert.match(yaml, /if: \$\{\{ !inputs.fscg_cache_audit && !inputs.mfa_nl_cache_audit && inputs.vir != 'mfa-nl2-public-capture' \}\}/)
  const job = yaml.split('\n  mfa-nl-cache-audit:')[1].split('\n  mfa-nl2-public-capture:')[0]; assert.ok(job)
  assert.doesNotMatch(job, /secrets\.|SUPABASE|restore-keys/)
  assert.ok(job.indexOf('Verify source import run') < job.indexOf('actions/cache/restore'))
  assert.match(job, /cache-hit != 'true'/); assert.match(job, /source_run_id/); assert.match(job, /github.run_attempt/)
})

test('empty archive and unterminated source pagination cannot produce an inventory', async t => {
  const dirs = sandbox(t); seed(dirs.cacheRoot)
  put(dirs.cacheRoot, 'pastMatches-2601267-2026-1.json', [])
  await assert.rejects(audit({ ...dirs, league: 'mt-nl1', sourceRunId: '123' }), /missing fixture inventory/)
  rmSync(dirs.outputRoot, { recursive: true, force: true })
  const match = seed(dirs.cacheRoot)
  put(dirs.cacheRoot, 'pastMatches-2601267-2026-1.json', Array.from({ length: 50 }, (_, n) => ({ ...match, id: match.id + n })))
  await assert.rejects(audit({ ...dirs, league: 'mt-nl1', sourceRunId: '123' }), /pastMatches-2601267-2026-2.json/)
})
