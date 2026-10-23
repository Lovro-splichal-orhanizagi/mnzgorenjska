import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const migrationPath = new URL('../supabase/migrations/20261023200000_reviewed_ro_md_admission.sql', import.meta.url)
const migration = readFileSync(migrationPath, 'utf8')
const registry = JSON.parse(readFileSync(new URL('../scripts/policies/historical-statistics-exclusions.json', import.meta.url), 'utf8'))
const bindings = JSON.parse(readFileSync(new URL('../scripts/policies/historical-statistics-club-bindings.json', import.meta.url), 'utf8')).bindings
const targets = JSON.parse(readFileSync(new URL('../scripts/policies/reviewed-existing-cleanup-targets-20261023.json', import.meta.url), 'utf8'))
const sha = value => createHash('sha256').update(JSON.stringify(value, (_key, child) => child && !Array.isArray(child) && typeof child === 'object' ? Object.fromEntries(Object.keys(child).sort().map(k => [k, child[k]])) : child)).digest('hex')

test('reviewed RO/MD SQL pins the approved policy bytes and exact native tuples', () => {
  const exact = [
    ['ro-ab-l4-s2-historical-unavailable-2026-10-23-v1', '0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b'],
    ['md-liga-2-historical-unavailable-2026-10-23-v1', '95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e'],
  ]
  for (const [id, digest] of exact) {
    const policy = registry.policies.find(row => row.id === id)
    assert.ok(policy, `registry is missing ${id}`)
    assert.equal(sha(policy), digest, `${id} policy digest drifted`)
    assert.ok(migration.includes(`'${id}'`))
    assert.ok(migration.includes(`'${digest}'`))
  }
  const ro = targets.competitions.find(row => row.slug === 'ro-ab-l4-s2')
  const md = targets.competitions.find(row => row.slug === 'md-liga-2')
  assert.deepEqual(ro.targets.map(row => [row.nativeMatchId, row.round, row.homeTeamId, row.awayTeamId, row.score, row.apps, row.goals, row.admissionKind]), [[202353, 1, 5068, 5069, [3, 0], 13, 3, 'incomplete_report']])
  assert.deepEqual(md.targets.map(row => [row.nativeMatchId, row.round, row.homeTeamId, row.awayTeamId, row.score, row.initialScore, row.apps, row.goals, row.admissionKind]), [[560748, 4, 10842, 10836, [11, 0], [0, 0], 0, 0, 'schedule_only_official_result'], [560803, 11, 10833, 10842, [2, 3], [0, 0], 0, 0, 'schedule_only_official_result']])
  for (const token of ['target_admission', 'is_exact_md_schedule_placeholder', '50422', '50481', '202353', '560748', '560803', 'md50422', 'md50481', '0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b']) assert.ok(migration.includes(token), `migration is missing exact guard token ${token}`)
  assert.match(migration, /oldj->>'provider' in\('isthmian','hlf','nfsbih','fmf'\)/)
  assert.match(migration, /'Sheriff-2' then 10842.*'CF Maiak' then 10836.*'CMF Cahul' then 10833/)
  assert.match(migration, /rt\.mid=mm\.id/)
  assert.doesNotMatch(migration, /disable trigger|session_replication_role/i)
})

test('reviewed RO/MD SQL rollback fixture is limited to the owned database or exact CI job', () => {
  const resolve = env => {
    const container = env.SUPABASE_DB_CONTAINER
    const owned = container === 'supabase_db_slff_mlsz_history_20261022'
    const ci = container === 'supabase_db_mnzgorenjska' && env.CI === 'true' && env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' && env.GITHUB_JOB === 'varnost'
    assert.ok(owned || ci, 'explicit owned database or exact disposable CI job required')
    return { container, project: owned ? 'slff_mlsz_history_20261022' : 'mnzgorenjska' }
  }
  assert.equal(resolve({ SUPABASE_DB_CONTAINER: 'supabase_db_slff_mlsz_history_20261022' }).project, 'slff_mlsz_history_20261022')
  const ci = { SUPABASE_DB_CONTAINER: 'supabase_db_mnzgorenjska', CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_JOB: 'varnost' }
  assert.equal(resolve(ci).project, 'mnzgorenjska')
  for (const key of Object.keys(ci)) assert.throws(() => resolve({ ...ci, [key]: 'wrong' }), /disposable/)
  assert.throws(() => resolve({}), /disposable/)
})

test('reviewed RO/MD SQL native rollback and release path', { skip: process.env.REVIEWED_RO_MD_DISPOSABLE_TEST !== '1' }, () => {
  const container = process.env.SUPABASE_DB_CONTAINER
  const owned = container === 'supabase_db_slff_mlsz_history_20261022'
  const ci = container === 'supabase_db_mnzgorenjska' && process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY === 'Lovro-splichal-orhanizagi/mnzgorenjska' && process.env.GITHUB_JOB === 'varnost'
  assert.ok(owned || ci, 'explicit owned database or exact disposable CI job required')
  const project = owned ? 'slff_mlsz_history_20261022' : 'mnzgorenjska'
  const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 })
  const labels = JSON.parse(docker(['inspect', container, '--format', '{{json .Config.Labels}}']))
  assert.equal(labels['com.supabase.cli.project'], project)
  assert.ok(!process.env.SUPABASE_TEST_DB || process.env.SUPABASE_TEST_DB === 'postgres', 'only owned postgres fixture database is allowed')
  const sql = query => docker(['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', query]).trim()
  const catalogHash = () => sql("select encode(sha256(convert_to(jsonb_build_object('competitions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.competitions x),'teams',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.teams x),'rounds',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.rounds x),'players',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.players x),'matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.matches x),'appearances',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.appearances x),'goals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.goals x),'player_scores',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.player_scores x),'player_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.statistika_igralcev x),'round_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.tocke_krogov x),'policies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from private_historical_statistics.policies x),'bindings',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from private_historical_statistics.source_club_bindings x),'reviewed_cleanup',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.cleanup_receipts x),'reviewed_price_claims',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_attempts x),'reviewed_prices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_receipts x))::text,'UTF8')),'hex')")
  for (const signature of [
    'private_reviewed_existing_history.target_admission(text,text)',
    'private_reviewed_existing_history.is_exact_md_schedule_placeholder(bigint,text,text,text,matches)',
    'public.prepare_reviewed_existing_cleanup(text,text,text)',
    'public.apply_reviewed_existing_cleanup(text,text,text,text,text)',
  ]) assert.equal(sql(`select to_regprocedure('${signature}') is not null`), 't', `missing ${signature}`)
  const before = catalogHash()
  const fixture = readFileSync(new URL('../supabase/tests/reviewed-ro-md.sql', import.meta.url), 'utf8')
  execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1'], { input: `${fixture}\n;\n\\quit\n`, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 })
  assert.equal(catalogHash(), before, 'RO/MD native fixture rolls back all native rows and receipts')
})
