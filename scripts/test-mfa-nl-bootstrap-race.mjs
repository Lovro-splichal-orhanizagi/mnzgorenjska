// Two connections to the unique owned fresh DB; never defaults to a user DB.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawn}from'node:child_process'
import {readFileSync}from'node:fs'

const enabled=process.env.MFA_NL_BOOTSTRAP_RACE_TEST==='1'
test('MFA NL concurrent installs and current writers cannot bypass the reviewed snapshot',{skip:!enabled,timeout:30000},async()=>{
 const container=process.env.SUPABASE_DB_CONTAINER
 assert.equal(container,'supabase_db_slff_mfa_nl_bootstrap_20261021')
 const docker=args=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024})
 const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],'slff_mfa_nl_bootstrap_20261021')
 const args=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1']
 const sql=q=>execFileSync('docker',args,{input:q,encoding:'utf8',maxBuffer:16*1024*1024}).trim()
 assert.equal(sql("select not exists(select 1 from private_mfa_nl_history.bootstrap_receipt)and not exists(select 1 from private_historical_statistics.policies where id like'mt-nl%-reviewed-history-%');"),'t','fresh row-free owned baseline required')
 const fixture=readFileSync(new URL('../supabase/tests/mfa-nl-bootstrap-fixture.sql',import.meta.url),'utf8')
 sql(`begin;${fixture}\ninsert into private_historical_statistics.policies select id,sha,document from nl_test_policies;commit;`)
 const prepared=new Map([973,974].map(cid=>[cid,JSON.parse(sql(`select public.prepare_mfa_nl_reviewed_bootstrap(${cid},repeat('e',40),repeat('${cid===973?'a':'b'}',64));`))]))
 const literal=value=>`'${value.replaceAll("'","''")}'`
 const apply=cid=>`select public.apply_mfa_nl_reviewed_bootstrap(${cid},repeat('e',40),repeat('${cid===973?'a':'b'}',64),${literal(prepared.get(cid).beforeSha256)},${literal(prepared.get(cid).beforeImageText)});`
 function start(text,signal){
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='',signaled=false
  let resolveReady
  const ready=new Promise(resolve=>{resolveReady=resolve})
  child.stdout.on('data',chunk=>{stdout+=chunk;if(signal&&!signaled&&stdout.includes(signal)){signaled=true;resolveReady()}})
  child.stderr.on('data',chunk=>{stderr+=chunk})
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{if(signal&&!signaled)reject(Error(`lock signal missing: ${stderr}`));else resolve({code,stdout,stderr})})})
  child.stdin.end(text)
  return{ready,done}
 }
 async function blocked(name){
  for(let i=0;i<100;i++){
   if(sql(`select exists(select 1 from pg_stat_activity where application_name=${literal(name)}and wait_event_type='Lock');`)==='t')return
   await new Promise(resolve=>setTimeout(resolve,20))
  }
  assert.fail(`second connection did not block on ${name}`)
 }
 // Both callers have one reviewed preimage; only the first install may commit.
 const first=start(`begin;set application_name='slff_nl_install_a';select private_mfa_nl_history.lock_scope(974,repeat('e',40));\n\\echo INSTALL_LOCKED\nselect pg_sleep(3);${apply(974)}commit;`,'INSTALL_LOCKED')
 await first.ready
 const second=start(`set application_name='slff_nl_install_b';${apply(974)}`)
 await blocked('slff_nl_install_b')
 assert.equal((await first.done).code,0)
 const denied=await second.done;assert.notEqual(denied.code,0);assert.match(denied.stderr,/MFA_NL_BOOTSTRAP:/)
 assert.equal(sql('select count(*)from private_mfa_nl_history.bootstrap_receipt where competition_id=974;'),'1')
 assert.equal(sql("select count(*)from matches where zapisnik_id='mt51962893'and statistics_status='unavailable_historical'and imported_at is null;"),'1')
 const current=JSON.parse(sql('select private_mfa_nl_history.protected_current(974);'))
 assert.deepEqual(current,JSON.parse(prepared.get(974).beforeImageText).current)
 // A current writer commits first: the blocked install must then reject drift.
 const writer=start("begin;set application_name='slff_nl_writer_a';update players set full_name='Concurrent source update'where id=(select min(id)from players where competition_id=973);\n\\echo WRITER_LOCKED\nselect pg_sleep(3);commit;",'WRITER_LOCKED')
 await writer.ready
 const stale=start(`set application_name='slff_nl_install_stale';${apply(973)}`)
 await blocked('slff_nl_install_stale')
 assert.equal((await writer.done).code,0)
 const drift=await stale.done;assert.notEqual(drift.code,0);assert.match(drift.stderr,/beforeimage drift/)
 assert.equal(sql("select not exists(select 1 from private_historical_statistics.installed_policies where competition_id=973)and not exists(select 1 from rounds where competition_id=973 and season='2025/26')and(select source_policy is null from competitions where id=973);"),'t')
})
