import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'

test('BiH prelaunch cutoff is pinned to its reviewed native schedule and before image',()=>{
 const migrationPath=new URL('../supabase/migrations/20261023110000_ba_prelaunch_deadline.sql',import.meta.url)
 const fixturePath=new URL('../supabase/tests/ba-prelaunch-deadline.sql',import.meta.url)
 assert.ok(existsSync(migrationPath),'reviewed BiH deadline migration is required')
 assert.ok(existsSync(fixturePath),'rollback SQL fixture is required')
 const migration=readFileSync(migrationPath,'utf8')
 const fixture=readFileSync(fixturePath,'utf8')
 for(const value of ['ba-wwin-liga-bih','998','nfsbih','wwin-liga-bih/54152223','35415','54152327','576419','576420','576421','576422','576423','46bfd442846cb92162e9c24e105f72c0e2f25b8c37775bcb0d71200fe810ba84'])assert.ok(migration.includes(value),`migration must pin ${value}`)
 assert.match(migration,/set rok_pomak_ur=2[^\n]*rok_pomak_ur=6/)
 assert.ok(migration.includes("timestamptz '2026-10-23 12:00:00+00'"))
 assert.ok(migration.includes("timestamptz '2026-10-23 16:00:00+00'"))
 assert.match(migration,/source_policy is not null/)
 assert.match(migration,/price_attempts/)
 assert.match(migration,/p_clock is null/)
 assert.match(migration,/lineups_locked_at<r\.deadline_at/)
 assert.match(migration,/assert_migration_applied_if_populated\(outcome\)/)
 assert.match(migration,/position_votes_deleted/)
 assert.match(migration,/fantasy_lineups/)
 assert.match(migration,/immutable/)
 assert.match(fixture,/expired/i)
 assert.match(fixture,/drift/i)
 assert.match(fixture,/deleted user vote/i)
 assert.match(fixture,/rollback/i)
})

function disposableTarget(env){
 const container=env.SUPABASE_DB_CONTAINER
 const owned=container==='supabase_db_slff_mlsz_history_20261022'
 const ci=container==='supabase_db_mnzgorenjska'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(owned||ci,'explicit owned database or exact disposable CI job required')
 assert.ok(!env.SUPABASE_TEST_DB||env.SUPABASE_TEST_DB==='postgres','only the owned postgres fixture database is allowed')
 return {container,project:owned?'slff_mlsz_history_20261022':'mnzgorenjska'}
}

test('BiH prelaunch cutoff SQL is narrow, auditable, immutable and rolls back in the disposable database',{skip:process.env.BA_PRELAUNCH_DEADLINE_DISPOSABLE_TEST!=='1'},()=>{
 const target=disposableTarget(process.env)
 const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',timeout:300_000,maxBuffer:16*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',target.container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],target.project)
 const sql=q=>docker(['exec','-i',target.container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:`${q}\n;\n\\quit\n`}).trim()
 const hasMigration=sql("select to_regprocedure('private_ba_prelaunch_deadline.apply(timestamp with time zone)') is not null")==='t'
 const catalogHash=()=>{
  const receipts=hasMigration?",'receipts',(select coalesce(jsonb_agg(to_jsonb(x) order by slug),'[]') from private_ba_prelaunch_deadline.adjustments x where slug='ba-wwin-liga-bih')":""
  return sql(`select encode(sha256(convert_to(jsonb_build_object('competitions',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from competitions x where id=998 or slug='ba-wwin-liga-bih' or slug like 'BA-DEADLINE-DISPLACED-%'),'round',(select to_jsonb(x) from rounds x where id=35415),'teams',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from teams x where id between 10870 and 10879),'matches',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from matches x where id between 576419 and 576423),'players',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from players x where competition_id=998),'deletedVotes',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from position_votes_deleted x where player_id in(select id from players where competition_id=998))${receipts})::text,'UTF8')),'hex')`)
 }
 const before=catalogHash()
 const migration=hasMigration?'':readFileSync(new URL('../supabase/migrations/20261023110000_ba_prelaunch_deadline.sql',import.meta.url),'utf8')
 const fixture=readFileSync(new URL('../supabase/tests/ba-prelaunch-deadline.sql',import.meta.url),'utf8').replace(/^begin;\s*/,'').replace(/\s*rollback;\s*$/,'')
 sql(`begin;\n${migration}\n${fixture}\nrollback;`)
 const after=catalogHash()
 assert.equal(after,before,'the disposable SQL fixture must roll back every native row and audit receipt')
})
