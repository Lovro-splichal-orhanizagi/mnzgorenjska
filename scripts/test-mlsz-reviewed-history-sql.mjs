import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'

export function disposableTarget(env){
 const container=env.SUPABASE_DB_CONTAINER
 const owned=container==='supabase_db_slff_mlsz_history_20261022'
 const ci=container==='supabase_db_mnzgorenjska'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(owned||ci,'explicit owned MLSZ database or exact disposable CI job required')
 return {container,project:owned?'slff_mlsz_history_20261022':'mnzgorenjska'}
}
test('MLSZ SQL test runner refuses default developer and incomplete CI authority',()=>{
 assert.equal(disposableTarget({SUPABASE_DB_CONTAINER:'supabase_db_slff_mlsz_history_20261022'}).project,'slff_mlsz_history_20261022')
 const ci={SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
 assert.equal(disposableTarget(ci).project,'mnzgorenjska')
 for(const k of Object.keys(ci))assert.throws(()=>disposableTarget({...ci,[k]:'wrong'}),/disposable/)
 assert.throws(()=>disposableTarget({SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}),/disposable/)
})
test('MLSZ reviewed cleanup migration exists',()=>{
 assert.ok(readFileSync(new URL('../supabase/migrations/20261022121000_mlsz_reviewed_history.sql',import.meta.url),'utf8').length)
})
test('MLSZ exact cleanup, rollback, release and ACL SQL contract',{skip:process.env.MLSZ_HISTORY_DISPOSABLE_TEST!=='1'},t=>{
 const target=disposableTarget(process.env)
 const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',target.container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],target.project)
 assert.ok(!process.env.SUPABASE_TEST_DB||process.env.SUPABASE_TEST_DB==='postgres','only owned postgres fixture database is allowed')
 const sql=q=>docker(['exec','-i',target.container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q}).trim()
 assert.equal(sql("select to_regprocedure('public.prepare_mlsz_historical_cleanup(text,jsonb)') is not null"),'t')
 if(sql("select clock_timestamp()>='2026-10-24T07:00:00Z'::timestamptz")==='t'){
  const hold=sql("do $$begin begin perform public.prepare_mlsz_historical_cleanup(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='mlsz'));exception when others then if sqlerrm like 'MLSZ_HISTORY: exact future unlocked%'then return;end if;raise;end;raise exception 'expired opening incorrectly accepted';end$$;")
  assert.equal(hold,'')
  t.skip('Pinned October24 opening expired: real SQL HOLD verified; positive cleanup/activation fixture requires a reviewed future opening')
  return
 }
 const before=sql("select md5(coalesce(jsonb_agg(to_jsonb(p)order by id)::text,'[]'))from private_historical_statistics.policies p")
 sql(readFileSync(new URL('../supabase/tests/mlsz-reviewed-history.sql',import.meta.url),'utf8'))
 assert.equal(sql("select md5(coalesce(jsonb_agg(to_jsonb(p)order by id)::text,'[]'))from private_historical_statistics.policies p"),before,'SQL fixture rolls back catalog mutations')
})
