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

test('NPL no-op price recovery migration pins the failed one-use claim and never rewrites player prices',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261023140000_npl_noop_price_recovery.sql',import.meta.url),'utf8')
 for(const exact of [
  '39963835822','3cd01f8882bbc388e771dd328ac46f070c052468b54d232f0205bc371db82f7a',
  'gb-npl-midlands','979','ac1cc5a2dd363088a3e7f309cba67214ddcc5187',
  '5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924',
  'b068d8e6a00c1926c9eebe31b92edf68828dfb40278cbccf26a3f374ff457e23',
  '07752073ec77a5c542871c417b19fc39a00edac2fb9a1c6552ad28a0ae0e9393',
  '9003de1ec831a83e68cdc92c50db7afeeee8f2f514bbf5ef452c0d5a101847ce',
  '401885','401972','402068','record_reviewed_existing_prices',
 ])assert.ok(migration.includes(exact),`missing exact recovery pin ${exact}`)
 assert.match(migration,/c\.source_policy='reviewed-existing-history-20261023-v1'/)
 assert.match(migration,/count\(\*\).*1021/)
 assert.match(migration,/max\(.*minutes.*\).*810/s)
 for(const guard of [
  /cleanup\.main_sha=expected_main[\s\S]*cleanup\.before_sha=expected_cleanup[\s\S]*attempt\.main_sha=expected_main[\s\S]*attempt\.football_state_sha=expected_state/,
  /state_sha\('gb-npl-midlands'\)=expected_state[\s\S]*price_sha\('gb-npl-midlands'\)=expected_prices/,
  /recorded\.price_vector_sha=expected_prices/,
  /p\.value is distinct from 4\.5 or p\.value_start is not null or p\.value_locked is not false/,
  /source_match_id not in\('6a590670ce9ef452b61f386d','6896abc31c6f4c56212c7ac5'\)/,
  /no post-claim user activity required/,
 ])assert.match(migration,guard,`missing no-op recovery guard ${guard}`)
 assert.doesNotMatch(migration,/update\s+players\b/i)
 assert.doesNotMatch(migration,/begin_reviewed_existing_prices/)
 assert.equal((migration.match(/record_reviewed_existing_prices\(/g)??[]).length,1,'original claim can be recorded only once')
})

test('native compatibility migration pins the reported Romanian and NPL evidence',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261023111000_reviewed_native_compatibility.sql',import.meta.url),'utf8')
 for(const exact of ['652686','652688','561922','6896abc31c6f4c56212c7ac5','133334','f43d55c1-6530-49dc-a02e-4d7e578d6205','3016','Club Sportiv USV-CSM Iași 2020','Club Sportiv USV-CSM Iaşi 2020','https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1/club-sportiv-usv-csm-iasi-2020-kse-targu-secuiesc'])assert.ok(migration.includes(exact),`native compatibility pin missing ${exact}`)
 assert.match(migration,/active_goal_identity_valid/)
 assert.match(migration,/exact_npl_unattributed_goal\(/)
 assert.match(migration,/g\.team_id is null/)
 assert.match(migration,/coalesce\(p_cid=979/)
 assert.match(migration,/native_binding_audits/)
 assert.match(migration,/bind_ro_native_home_if_present/)
 assert.doesNotMatch(migration,/create function private_reviewed_existing_history\.release_core/i)
})

test('reviewed-existing native SQL rollback and service-only ACL contract',{skip:process.env.REVIEWED_EXISTING_DISPOSABLE_TEST!=='1'},()=>{
 console.log('Reviewed history SQL: verify disposable container and RPCs')
 const target=disposableTarget(process.env)
 const container=target.container
 const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',timeout:300_000,maxBuffer:32*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],target.project)
 assert.ok(!process.env.SUPABASE_TEST_DB||process.env.SUPABASE_TEST_DB==='postgres','only owned postgres fixture database is allowed')
 const sql=q=>docker(['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:`${q}\n;\n\\quit\n`}).trim()
 const catalogHash=()=>sql("select encode(sha256(convert_to(jsonb_build_object('competitions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.competitions x),'teams',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.teams x),'rounds',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.rounds x),'players',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.players x),'matches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.matches x),'appearances',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.appearances x),'goals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from public.goals x),'player_scores',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.player_scores x),'player_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.statistika_igralcev x),'round_stats',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from public.tocke_krogov x),'policies',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]')from private_historical_statistics.policies x),'bindings',(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')from private_historical_statistics.source_club_bindings x),'reviewed_cleanup',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.cleanup_receipts x),'reviewed_price_claims',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_attempts x),'reviewed_prices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.slug),'[]')from private_reviewed_existing_history.price_receipts x))::text,'UTF8')),'hex')")
 assert.equal(sql("select to_regprocedure('public.prepare_reviewed_existing_cleanup(text,text,text)') is not null and to_regprocedure('public.apply_reviewed_existing_cleanup(text,text,text,text,text)') is not null and to_regprocedure('public.begin_reviewed_existing_prices(text,text,text)') is not null and to_regprocedure('public.record_reviewed_existing_prices(text,text,text)') is not null and to_regprocedure('public.check_reviewed_existing_release(text,text,text,text,boolean)') is not null"),'t')
 console.log('Reviewed history SQL: capture pre-fixture catalog hash')
 const before=catalogHash()
 console.log('Reviewed history SQL: start rollback fixture')
 let fixture=readFileSync(new URL('../supabase/tests/reviewed-existing-history.sql',import.meta.url),'utf8')
 const recovery=readFileSync(new URL('../supabase/migrations/20261023140000_npl_noop_price_recovery.sql',import.meta.url),'utf8')
 const body=recovery.match(/do \$\$([\s\S]*?)end\$\$;/i)?.[1]
 assert.ok(body,'one-off production DO body must be available for native fixture execution')
 let recoveryFunction=body
 for(const [pinned,setting] of [
  ['b068d8e6a00c1926c9eebe31b92edf68828dfb40278cbccf26a3f374ff457e23','slff.test.expected_cleanup'],
  ['07752073ec77a5c542871c417b19fc39a00edac2fb9a1c6552ad28a0ae0e9393','slff.test.expected_state'],
  ['9003de1ec831a83e68cdc92c50db7afeeee8f2f514bbf5ef452c0d5a101847ce','slff.test.expected_prices'],
 ]) {
  assert.equal(recoveryFunction.split(pinned).length-1,1,`fixture may replace only the unique production pin ${pinned}`)
  recoveryFunction=recoveryFunction.replace(`'${pinned}'`,`current_setting('${setting}',true)`)
 }
 recoveryFunction='create function pg_temp.run_npl_noop_recovery() returns void language plpgsql as $$'+recoveryFunction+'end; $$;\nselect pg_temp.run_npl_noop_recovery();'
 assert.equal(fixture.split('-- NPL_RECOVERY_TEST_FUNCTION').length-1,1,'native fixture must contain one recovery function marker')
 fixture=fixture.replace('-- NPL_RECOVERY_TEST_FUNCTION',()=>recoveryFunction)
 sql(fixture)
 console.log('Reviewed history SQL: verify post-rollback catalog hash')
 assert.equal(catalogHash(),before,'fixture cleanup and activation roll back every native row and receipt')
})
