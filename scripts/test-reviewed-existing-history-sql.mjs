import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'

function disposableTarget(env){
 const container=env.SUPABASE_DB_CONTAINER
 const owned=container==='supabase_db_slff_mlsz_history_20261022'
 const ci=container==='supabase_db_mnzgorenjska'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(owned||ci,'explicit owned database or exact disposable CI job required')
 return {container,project:owned?'slff_mlsz_history_20261022':'mnzgorenjska'}
}

test('SQL fixture runner permits only the owned database or exact disposable CI job',()=>{
 assert.equal(disposableTarget({SUPABASE_DB_CONTAINER:'supabase_db_slff_mlsz_history_20261022'}).project,'slff_mlsz_history_20261022')
 const ci={SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
 assert.equal(disposableTarget(ci).project,'mnzgorenjska')
 for(const key of Object.keys(ci))assert.throws(()=>disposableTarget({...ci,[key]:'wrong'}),/disposable/)
 assert.throws(()=>disposableTarget({}),/disposable/)
})

test('reviewed-existing SQL route pins the six approved reports and keeps generic history APIs narrow',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261023103000_reviewed_existing_history.sql',import.meta.url),'utf8')
 for(const fn of ['prepare_reviewed_existing_cleanup','apply_reviewed_existing_cleanup','get_reviewed_existing_cleanup_receipt','begin_reviewed_existing_prices','record_reviewed_existing_prices','check_reviewed_existing_release'])assert.match(migration,new RegExp(`function public\\.${fn}\\(`))
 for(const target of [['979::bigint','gb-npl-midlands','562344::bigint','gb6a590670ce9ef452b61f386d'],['979::bigint','6896abc31c6f4c56212c7ac5','561922::bigint','gb6896abc31c6f4c56212c7ac5'],['984::bigint','gb-sfl-d1-south','509795::bigint','gb6a5a1b79ce9ef452b61f4398'],['497::bigint','ro-liga3-s1','133334::bigint','f43d55c1-6530-49dc-a02e-4d7e578d6205'],['998::bigint','ba-wwin-liga-bih','576391::bigint','ba54152295'],['998::bigint','576399::bigint','ba54152303']])for(const exact of target)assert.ok(migration.includes(exact),`missing exact target token ${exact}`)
 assert.match(migration,/previewSha256/)
 assert.match(migration,/p_expected_preview_sha~'\^\[a-f0-9\]\{64\}\$'/)
 assert.match(migration,/authorize_release\(/)
 assert.match(migration,/deadline_at\s*>/)
 assert.match(migration,/priceSha256/)
 assert.match(migration,/revoke all on function public\.prepare_reviewed_existing_cleanup/)
 assert.match(migration,/grant execute on function public\.prepare_reviewed_existing_cleanup/)
 assert.doesNotMatch(migration,/disable trigger|session_replication_role/i)
})

test('reviewed-existing native SQL rollback and service-only ACL contract',{skip:process.env.REVIEWED_EXISTING_DISPOSABLE_TEST!=='1'},()=>{
 const target=disposableTarget(process.env)
 const container=target.container
 const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],target.project)
 assert.ok(!process.env.SUPABASE_TEST_DB||process.env.SUPABASE_TEST_DB==='postgres','only owned postgres fixture database is allowed')
 const sql=q=>docker(['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q}).trim()
 const catalogHash=()=>sql("select encode(sha256(convert_to(jsonb_build_object('competitions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.competitions x),'teams',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.teams x),'rounds',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.rounds x),'players',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.players x),'matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.matches x),'appearances',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.appearances x),'goals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.goals x),'player_scores',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.player_scores x),'player_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.statistika_igralcev x),'round_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.tocke_krogov x),'policies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from private_historical_statistics.policies x),'bindings',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from private_historical_statistics.source_club_bindings x),'reviewed_cleanup',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.cleanup_receipts x),'reviewed_price_claims',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_attempts x),'reviewed_prices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_receipts x))::text,'UTF8')),'hex')")
 assert.equal(sql("select to_regprocedure('public.prepare_reviewed_existing_cleanup(text,text,text)') is not null and to_regprocedure('public.apply_reviewed_existing_cleanup(text,text,text,text,text)') is not null and to_regprocedure('public.begin_reviewed_existing_prices(text,text,text)') is not null and to_regprocedure('public.record_reviewed_existing_prices(text,text,text)') is not null and to_regprocedure('public.check_reviewed_existing_release(text,text,text,text,boolean)') is not null"),'t')
 const before=catalogHash()
 sql(readFileSync(new URL('../supabase/tests/reviewed-existing-history.sql',import.meta.url),'utf8'))
 assert.equal(catalogHash(),before,'fixture cleanup and activation roll back every native row and receipt')
})
