import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createFcfG1ReadOnlyDatabase} from './fcf-future-target-db.mjs'
import {verifyFcfG1NativePreflightIdentity} from './fcf-g1-native-preflight.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),sha=s=>createHash('sha256').update(s).digest('hex')
const migration='supabase/migrations/20261029130000_fcf_g1_readonly_projection.sql'
test('exact deployed chain and new body differ only by quiet-G9 precondition; legacy remains untouched',()=>{
 const original=read('supabase/migrations/20261028170000_fcf_g1_supplement_native.sql').split('$projection$')[1],forward=read('supabase/migrations/20261028183000_baden_fcf_projection_compat.sql')
 assert.equal(sha(original),'1d7d488ebaa2e871b04e87978ab8549864b2e8e09e4d0bfc97800007ea8fbfb1')
 const deployed=original.replace('\nbegin\n',()=> '\nbegin\n'+forward.split('$addition$')[1]).replace(' -- Removed cleanup goal identities retain target/match association for deleted',()=>forward.split('$guard$')[1]+' -- Removed cleanup goal identities retain target/match association for deleted'),sql=read(migration),line=' if cid=783 then perform private_fcf_future_target_release.quiet_g9();end if;\n'
 assert.equal(sha(deployed),'ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f');assert.equal(deployed.split(line).length,2)
 assert.equal(sha(deployed.replace(line,'')),'a55fa3e6380782cac0640e5d82dcb74f789a978ec9fc6d9790b1e830a30063b5')
 assert.ok(sql.indexOf('ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f')<sql.indexOf('create schema'))
 assert.match(sql,/a55fa3e6380782cac0640e5d82dcb74f789a978ec9fc6d9790b1e830a30063b5/);assert.match(sql,/transaction_read_only/);assert.match(sql,/capture\('es-ct-segona-g1',p_privacy_keys\)/)
 assert.match(sql,/revoke all on schema private_fcf_g1_readonly from public,anon,authenticated,service_role/);assert.match(sql,/grant execute on function public\.fcf_g1_readonly_projection\(text\[\]\)to service_role/)
 assert.doesNotMatch(sql,/create or replace function private_fcf_future_projection|grant usage|\b(?:insert|update|delete|truncate)\b/i)
})
test('fixed G1 readonly facade exposes no mutation and uses only new observer plus legacy reads',()=>{
 const calls=[],db=createFcfG1ReadOnlyDatabase({env:{SUPABASE_DB_URL:'postgresql://TEST:ONLY@127.0.0.1:5432/postgres'},execute:(f,a,o)=>{calls.push({f,a,o});return Buffer.from('{"players":[]}')}})
 assert.deepEqual(Object.keys(db),['inventory','projection','pricingSnapshot']);db.projection('es-ct-segona-g1',['a'.repeat(64)])
 assert.equal(calls.length,1);assert.match(calls[0].o.input,/BEGIN READ ONLY;\nSET LOCAL ROLE service_role;/);assert.match(calls[0].o.input,/SELECT public\.fcf_g1_readonly_projection\(ARRAY\['a{64}'\]::text\[\]\);\nROLLBACK;/)
 assert.ok(calls[0].a.includes('VERBOSITY=verbose'));assert.throws(()=>db.projection('es-ct-tercera-g9',[]));assert.throws(()=>db.projection('es-ct-segona-g1',['bad']));assert.equal(calls.length,1)
})
test('diagnostics retain only SQLSTATE and exact known guard enums, never raw errors or credentials',()=>{
 for(const [stderr,expected] of [
  ['ERROR:  P0001: FCF_TARGET: unknown/missing relevant FK definition, validation or deferrability\n',{sqlState:'P0001',guard:'FK_CATALOG_DRIFT'}],
  ['ERROR:  42501: permission denied for function capture\n',{sqlState:'42501',guard:'UNKNOWN'}],
  ['ERROR:  P0001: SECRET postgres://user:password@host\n',{sqlState:'P0001',guard:'UNKNOWN'}],
  ['SECRET raw unknown\n',{sqlState:'UNKNOWN',guard:'UNKNOWN'}],
  ['ERROR:  TOKEN: SECRET\n',{sqlState:'UNKNOWN',guard:'UNKNOWN'}]
 ]){const db=createFcfG1ReadOnlyDatabase({env:{SUPABASE_DB_URL:'postgresql://TEST:SECRET@127.0.0.1:5432/postgres'},execute:()=>{throw Object.assign(Error('SECRET'),{stderr:Buffer.from(stderr)})}});let caught;try{db.projection('es-ct-segona-g1',[])}catch(e){caught=e}assert.deepEqual(caught.readonlyDiagnostic,expected);assert.doesNotMatch(JSON.stringify(caught)+caught.message,/SECRET|password|postgres:\/\//)}
})
function mainIdentity(){
 const head='a'.repeat(40),owner={id:25134229,login:'nejcar20',type:'User'},repo='Lovro-splichal-orhanizagi/mnzgorenjska',run={id:9001,head_sha:head,head_branch:'main',path:'.github/workflows/ci.yml',event:'workflow_dispatch',run_attempt:1,status:'in_progress',conclusion:null,repository:{full_name:repo},head_repository:{full_name:repo},actor:owner,triggering_actor:owner},names=['Set up job','Checkout fixed reviewed consumer','Set up Node22','Install locked dependencies','Checkout immutable failed G1 verifier','Check fixed writer before DB setup','Existing database tunnel decision','Tunel do baze na VM','Capture fixed G1 native inventory read-only','Retain fixed G1 native preflight'],job={id:9100,run_id:9001,run_attempt:1,head_sha:head,name:'diagnostika-virov / preflight-g1-native',status:'in_progress',conclusion:null,steps:names.map((name,i)=>({name,number:i+1,status:i<8?'completed':i===8?'in_progress':'pending',conclusion:i<8?'success':null}))},normal=['novi-viri','Tipi, build, izris','Pravice in roki v svezi bazi','Migracije baze','Objava na Vercel','Objava na Hetzner VM','Je nova različica res v zraku?','Objava Club na Hetzner VM','Objava Trgovine na Hetzner VM','diagnostika-virov / dokument'],ci={...run,id:9002,event:'push',status:'completed',conclusion:'success'},ciJobs={total_count:10,jobs:Array.from({length:10},(_,i)=>({id:9400+i,run_id:9002,run_attempt:1,head_sha:head,status:'completed',conclusion:i<8?'success':'skipped'}))}
 return{head,runId:'9001',ciRunId:'9002',mainCiRunId:'9002',phase:'snapshot',run,jobs:{total_count:11,jobs:[job,...normal.map((name,i)=>({...job,id:9200+i,name,status:'completed',conclusion:'skipped',steps:[]}))]},main:{sha:head},ci,ciJobs,mainCi:structuredClone(ci),mainCiJobs:structuredClone(ciJobs),servedHead:head}
}
test('separate main-only diagnostic binds same deployed head/push CI and closed skipped graph',()=>{
 const x=mainIdentity(),r=verifyFcfG1NativePreflightIdentity(x);assert.equal(r.consumerHead,r.productionMainHead)
 for(const edit of [y=>y.main.sha='b'.repeat(40),y=>y.servedHead='b'.repeat(40),y=>y.run.head_branch='other',y=>y.ci.event='pull_request',y=>y.ciRunId='9003',y=>y.run.actor.id++,y=>y.jobs.jobs[1].steps.push({name:'source',status:'completed',conclusion:'success'}),y=>y.jobs.jobs.pop(),y=>y.jobs.jobs[0].steps[8].status='completed']){const bad=structuredClone(x);edit(bad);assert.throws(()=>verifyFcfG1NativePreflightIdentity(bad))}
})
test('both diagnostic modes skip public source job and default ten-job CI stays intact',()=>{
 const ci=read('.github/workflows/ci.yml'),child=read('.github/workflows/diagnostika-javnih-virov.yml');assert.match(ci,/g1-native-readonly-main/);assert.match(child,/inputs\.vir != 'g1-native-readonly-main'/);assert.match(child,/inputs\.vir == 'g1-native-readonly-main'.*github\.ref == 'refs\/heads\/main'/);assert.match(child,/G1_PREFLIGHT_MODE:/);assert.match(ci,/test-fcf-g1-readonly-projection\.mjs/);assert.match(ci,/test-fcf-g1-readonly-projection-sql\.mjs/)
})
