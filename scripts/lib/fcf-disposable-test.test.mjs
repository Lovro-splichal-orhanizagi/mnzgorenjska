import test from 'node:test'
import assert from 'node:assert/strict'
const helper=await import('./fcf-disposable-test.mjs').catch(()=>({}))
function check(env){assert.equal(typeof helper.assertFcfDisposableTest,'function','explicit FCF disposable-test guard must exist');return helper.assertFcfDisposableTest(env)}
const local={FCF_HISTORY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'slff_fcf_historical_test_20261018'}
const ci={FCF_HISTORY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska'}
test('owned local containers retain explicit opt-in and closed naming requirements',()=>{
 assert.equal(check(local),'slff_fcf_historical_test_20261018')
 assert.equal(check({...local,SUPABASE_DB_CONTAINER:'supabase_db_slff_fcf_historical_test_20261018_fresh'}),'supabase_db_slff_fcf_historical_test_20261018_fresh')
 for(const patch of [{FCF_HISTORY_DISPOSABLE_TEST:''},{FCF_HISTORY_DISPOSABLE_TEST:'true'},{SUPABASE_DB_CONTAINER:'supabase_db_production'},{SUPABASE_DB_CONTAINER:'slff_fcf_historical_test_20261018;bad'},{SUPABASE_DB_CONTAINER:''}])assert.throws(()=>check({...local,...patch}),/disposable/)
})
test('default CI container requires actual Actions, exact repository and explicit opt-in together',()=>{
 assert.equal(check(ci),'supabase_db_mnzgorenjska')
 for(const patch of [{GITHUB_ACTIONS:undefined},{GITHUB_ACTIONS:'false'},{GITHUB_REPOSITORY:'fork/mnzgorenjska'},{GITHUB_REPOSITORY:undefined},{FCF_HISTORY_DISPOSABLE_TEST:undefined},{SUPABASE_DB_CONTAINER:'supabase_db_other'}])assert.throws(()=>check({...ci,...patch}),/disposable/)
 assert.throws(()=>check({...local,SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}),/disposable/)
})
test('clone dump excludes only managed schemas that cannot safely restore and preserves product schema',()=>{
 assert.equal(typeof helper.fcfDisposableCloneDumpArgs,'function')
 const args=helper.fcfDisposableCloneDumpArgs(ci)
 assert.equal(args[1],'supabase_db_mnzgorenjska');assert.ok(args.includes('--no-owner'));assert.ok(args.includes('--no-privileges'))
 assert.deepEqual(args.filter(x=>x.startsWith('--exclude-schema=')),['--exclude-schema=cron','--exclude-schema=vault','--exclude-schema=realtime'])
 assert.throws(()=>helper.fcfDisposableCloneDumpArgs({...ci,GITHUB_REPOSITORY:'wrong/repo'}),/disposable/)
})
test('HTTP readiness refuses observed PostgREST schema-cache error JSON until both actual RPC paths exist',()=>{
 assert.equal(typeof helper.fcfPostgrestSchemaReady,'function')
 const error='{"code":"PGRST002","details":null,"hint":null,"message":"Could not query the database for the schema cache. Retrying."}'
 for(const body of [error,'','not JSON','{}',JSON.stringify({swagger:'2.0',paths:{'/rpc/prepare_fcf_historical_cleanup':{}}})])assert.equal(helper.fcfPostgrestSchemaReady(body),false)
 assert.equal(helper.fcfPostgrestSchemaReady(JSON.stringify({swagger:'2.0',paths:{'/rpc/prepare_fcf_historical_cleanup':{post:{}},'/rpc/apply_fcf_historical_cleanup':{post:{}}}})),true)
})
