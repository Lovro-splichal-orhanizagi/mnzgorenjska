import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
export function baranyaDisposableTarget(env){
 const owned=env.SUPABASE_DB_CONTAINER==='supabase_db_slff_mlsz_history_20261022'&&env.SUPABASE_TEST_DB==='slff_hu615_20261024'
 const ci=env.SUPABASE_DB_CONTAINER==='supabase_db_mnzgorenjska'&&(!env.SUPABASE_TEST_DB||env.SUPABASE_TEST_DB==='postgres')&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(owned||ci,'exact owned Baranya database or disposable CI required')
 return {container:env.SUPABASE_DB_CONTAINER,database:owned?'slff_hu615_20261024':'postgres',project:owned?'slff_mlsz_history_20261022':'mnzgorenjska'}
}
test('Baranya native runner rejects shared and foreign databases',()=>{
 const owned={SUPABASE_DB_CONTAINER:'supabase_db_slff_mlsz_history_20261022',SUPABASE_TEST_DB:'slff_hu615_20261024'}
 assert.equal(baranyaDisposableTarget(owned).database,'slff_hu615_20261024')
 for(const key of Object.keys(owned))assert.throws(()=>baranyaDisposableTarget({...owned,[key]:'postgres'}))
 const ci={SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',SUPABASE_TEST_DB:'postgres',CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
 assert.equal(baranyaDisposableTarget(ci).database,'postgres')
 for(const key of Object.keys(ci))assert.throws(()=>baranyaDisposableTarget({...ci,[key]:'foreign'}))
 assert.throws(()=>baranyaDisposableTarget({}))
})
test('Baranya exact cleanup and fresh release gates run under the service importer role and roll back',{skip:process.env.MLSZ_BARANYA_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const t=baranyaDisposableTarget(process.env)
 const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024})
 const labels=JSON.parse(docker(['inspect',t.container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],t.project)
 const sql=q=>docker(['exec','-i',t.container,'psql','-U','postgres','-d',t.database,'-X','-qAt','-v','ON_ERROR_STOP=1'],`${q}\n;\n\\quit\n`).trim()
 const catalog=()=>sql("select encode(sha256(convert_to(jsonb_build_object('football',(select jsonb_agg(x order by x::text)from(select to_jsonb(c) x from competitions c union all select to_jsonb(t) from teams t union all select to_jsonb(r) from rounds r union all select to_jsonb(p) from players p union all select to_jsonb(m) from matches m union all select to_jsonb(a) from appearances a union all select to_jsonb(g) from goals g union all select to_jsonb(p) from player_scores p union all select to_jsonb(s) from statistika_igralcev s union all select to_jsonb(s) from tocke_krogov s)x),'historical',(select jsonb_agg(x order by x::text)from(select to_jsonb(p) x from private_historical_statistics.policies p union all select to_jsonb(b) from private_historical_statistics.source_club_bindings b union all select to_jsonb(i) from private_historical_statistics.installed_policies i union all select to_jsonb(m) from private_historical_statistics.markers m union all select to_jsonb(c) from private_reviewed_existing_history.cleanup_receipts c union all select to_jsonb(a) from private_reviewed_existing_history.price_attempts a union all select to_jsonb(p) from private_reviewed_existing_history.price_receipts p union all select to_jsonb(c) from private_mlsz_history.cleanup_receipt c)x))::text,'UTF8')),'hex')")
 const before=catalog()
 sql(readFileSync(new URL('../supabase/tests/mlsz-baranya-history.sql',import.meta.url),'utf8'))
 assert.equal(catalog(),before,'rollback restores all football data, policies, bindings, installed states and receipts')
})
