import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync}from'node:child_process'
import {fileURLToPath}from'node:url'

// No default developer container: only our owned local project or the exact
// repository's fresh CI security job may run the rollback contract.
function ownedTarget(env){
 const container=env.SUPABASE_DB_CONTAINER
 const local=container==='supabase_db_slff_mfa_nl_bootstrap_20261021'
 const ci=container==='supabase_db_mnzgorenjska'&&env.GITHUB_ACTIONS==='true'&&env.CI==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(local||ci,'explicit owned local project or exact disposable CI job required')
 return{container,project:local?'slff_mfa_nl_bootstrap_20261021':'mnzgorenjska'}
}
test('native SQL runner refuses a developer container or incomplete CI authority',()=>{
 assert.equal(ownedTarget({SUPABASE_DB_CONTAINER:'supabase_db_slff_mfa_nl_bootstrap_20261021'}).project,'slff_mfa_nl_bootstrap_20261021')
 const ci={SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',GITHUB_ACTIONS:'true',CI:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost'}
 assert.equal(ownedTarget(ci).project,'mnzgorenjska')
 for(const key of Object.keys(ci))assert.throws(()=>ownedTarget({...ci,[key]:'wrong'}),/owned|disposable/)
 assert.throws(()=>ownedTarget({SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}),/owned|disposable/)
})
test('MFA NL bootstrap actual fresh owned SQL contract',{
 skip:process.env.MFA_NL_BOOTSTRAP_DISPOSABLE_TEST!=='1',
},()=>{
 const{container,project}=ownedTarget(process.env)
 const docker=(args,options={})=>execFileSync('docker',args,{maxBuffer:16*1024*1024,...options})
 const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],project)
 docker(['exec',container,'mkdir','-p','/tmp/slff-mfa-nl-tests'])
 for(const name of ['mfa-nl-bootstrap.sql','mfa-nl-bootstrap-fixture.sql'])docker(['cp',fileURLToPath(new URL(`../supabase/tests/${name}`,import.meta.url)),`${container}:/tmp/slff-mfa-nl-tests/${name}`])
 docker(['exec',container,'psql','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-f','/tmp/slff-mfa-nl-tests/mfa-nl-bootstrap.sql'],{stdio:['pipe','inherit','inherit']})
})
