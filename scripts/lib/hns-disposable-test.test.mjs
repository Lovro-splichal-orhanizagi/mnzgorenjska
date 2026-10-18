import test from 'node:test'
import assert from 'node:assert/strict'
const helper=await import('./hns-disposable-test.mjs').catch(()=>({}))
const local={HNS_WOMEN_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'slff_hr_historical_test_20261018'}
const ci={HNS_WOMEN_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',GITHUB_ACTIONS:'true',CI:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
const target=env=>{assert.equal(typeof helper.assertHnsDisposableTarget,'function');return helper.assertHnsDisposableTarget(env)}
test('HNS disposable launcher refuses baseline targets, foreign containers and incomplete CI identity',()=>{
 assert.deepEqual(target(local),{container:local.SUPABASE_DB_CONTAINER,source:'postgres'})
 assert.equal(target(ci).container,ci.SUPABASE_DB_CONTAINER)
 for(const patch of [{HNS_WOMEN_DISPOSABLE_TEST:undefined},{SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'},{SUPABASE_DB_CONTAINER:'production'},{SUPABASE_TEST_DB:'postgres'},{SUPABASE_TEST_DB:'some_existing_db'},{HNS_WOMEN_BASE_DB:'user_database'}])assert.throws(()=>target({...local,...patch}),/owned HNS/)
 for(const patch of [{GITHUB_ACTIONS:undefined},{CI:undefined},{GITHUB_REPOSITORY:'fork/repo'},{GITHUB_JOB:'migracije'},{HNS_WOMEN_BASE_DB:'hns_ci_baseline_0123456789abcdef'}])assert.throws(()=>target({...ci,...patch}),/owned HNS/)
 assert.equal(target({...local,HNS_WOMEN_BASE_DB:'hns_ci_baseline_0123456789abcdef'}).source,'hns_ci_baseline_0123456789abcdef')
})
test('HNS restore retains explicit target ACLs and excludes managed extension/default ACL entries',()=>{
 assert.equal(typeof helper.hnsRestoreToc,'function')
 const rows=['1; 0 0 ACL public FUNCTION guarded() postgres','2; 0 0 ACL private_historical_statistics TABLE policies postgres','3; 0 0 ACL - SCHEMA private_hns_women_release postgres','4; 0 0 ACL auth TABLE users postgres','5; 3079 1 EXTENSION - pg_cron','6; 0 0 COMMENT - EXTENSION pg_cron','7; 0 0 ACL extensions FUNCTION extension_function() supabase_admin','8; 0 0 DEFAULT ACL public DEFAULT PRIVILEGES FOR TABLES postgres','9; 1 2 TABLE public matches postgres']
 const result=helper.hnsRestoreToc(rows.join('\n'))
 for(const n of [1,2,3,4,9])assert.ok(result.includes(rows[n-1]))
 for(const n of [5,6,7,8])assert.ok(!result.includes(rows[n-1]))
})
function dockerFake({collision=false,wrongIdentity=false}={}){
 const calls=[]
 const run=(cmd,args)=>{assert.equal(cmd,'docker');calls.push(args)
  if(args[0]==='inspect')return Buffer.from(JSON.stringify({name:wrongIdentity?'/user_database':'/slff_hr_historical_test_20261018',image:'public.ecr.aws/supabase/postgres:17.11.0.004'}))
  if(args.includes('pg_dump')){assert.equal(args[args.indexOf('-U')+1],'supabase_admin');assert.ok(!args.includes('--no-privileges'));return Buffer.from('CUSTOM DUMP')}
  if(args.includes('pg_restore')&&args.includes('-l'))return Buffer.from('1; 0 0 ACL public TABLE players postgres\n')
  if(args.includes('psql')&&args.includes('-At'))return Buffer.from('t\n')
  if(collision&&args.includes('createdb'))throw Error('database already exists')
  return Buffer.alloc(0)
 };return{calls,run}
}
test('HNS clone drops only its successfully created random database even if a child fails or mutates its environment',async()=>{
 assert.equal(typeof helper.withHnsDisposableDatabase,'function');const fake=dockerFake()
 await assert.rejects(()=>helper.withHnsDisposableDatabase(local,env=>{assert.match(env.SUPABASE_TEST_DB,/^hns_ci_[1-9][0-9]*_[a-f0-9]{16}$/);assert.equal(env.HISTORICAL_STATISTICS_DISPOSABLE_TEST,'1');env.SUPABASE_TEST_DB='postgres';throw Error('injected child failure')},{run:fake.run}),/injected child failure/)
 const create=fake.calls.find(args=>args.includes('createdb')),drop=fake.calls.find(args=>args.includes('dropdb'))
 assert.ok(create);assert.ok(drop);assert.equal(drop.at(-1),create.at(-1));assert.notEqual(drop.at(-1),'postgres')
 assert.ok(!fake.calls.some(args=>args.includes('reset')||args.includes('--no-privileges')))
})
test('HNS clone cannot drop a pre-existing collision or operate in a mismatched container',async()=>{
 for(const options of [{collision:true},{wrongIdentity:true}]){const fake=dockerFake(options);await assert.rejects(()=>helper.withHnsDisposableDatabase(local,()=>assert.fail('must not run child'),{run:fake.run}));assert.ok(!fake.calls.some(args=>args.includes('dropdb')))}
})
