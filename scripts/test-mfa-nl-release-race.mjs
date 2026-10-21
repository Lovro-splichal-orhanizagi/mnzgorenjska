import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {mfaNlDisposableDb} from './lib/mfa-nl-disposable-test.mjs'

test('NL concurrent release and football writer serialize with full state recheck',{skip:process.env.MFA_NL_RELEASE_RACE_TEST!=='1',timeout:30000},async()=>{
 const{container,docker,args,sql}=mfaNlDisposableDb(process.env)
 assert.equal(sql('select not exists(select 1 from private_mfa_nl_history.bootstrap_receipt)and not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(973,974));'),'t','row-free owned baseline required')
 docker(['exec',container,'mkdir','-p','/tmp/slff-mfa-nl-release-race'])
 for(const name of ['mfa-nl-release-fixture.sql','mfa-nl-bootstrap-fixture.sql'])docker(['cp',fileURLToPath(new URL(`../supabase/tests/${name}`,import.meta.url)),`${container}:/tmp/slff-mfa-nl-release-race/${name}`])
 sql(`begin;set local jit=off;set local slff.mfa_nl_owned_fixture='transaction';\n\\i /tmp/slff-mfa-nl-release-race/mfa-nl-release-fixture.sql\ninsert into private_mfa_nl_history.source_contract select cid,pg_temp.nl_contract_sha(cid),document from nl_release_contracts;
 select public.record_mfa_nl_reviewed_import(cid,repeat('e',40),pg_temp.nl_contract_sha(cid),public.get_mfa_nl_reviewed_source_state(cid,repeat('e',40),pg_temp.nl_contract_sha(cid))->>'footballSha256')from nl_release_contracts;
 update players set position=case when reg_st%100=1 then 'GK'when reg_st%100<=5 then 'DEF'when reg_st%100<=10 then 'MID'else 'FWD'end,position_source=case when reg_st%100=1 then 'zapisnik'else 'ugibanje'end,value=case when reg_st%100=2 then 8 else 4 end,value_start=case when reg_st%100=2 then 8 else 4 end where competition_id in(973,974);
 select public.record_mfa_nl_reviewed_prices(cid,repeat('e',40),pg_temp.nl_contract_sha(cid))from nl_release_contracts;commit;`)
 const literal=value=>`'${value.replaceAll("'","''")}'`
 const contracts=new Map([973,974].map(cid=>[cid,sql(`select contract_sha256 from private_mfa_nl_history.source_contract where competition_id=${cid};`)]))
 const previews=new Map([973,974].map(cid=>[cid,JSON.parse(sql(`select public.check_mfa_nl_reviewed_release(${cid},repeat('e',40),${literal(contracts.get(cid))});`)).previewSha256]))
 const activate=cid=>`select public.check_mfa_nl_reviewed_release(${cid},repeat('e',40),${literal(contracts.get(cid))},${literal(previews.get(cid))},true);`
 function start(query,signal){
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='',readySent=false;let resolveReady
  const ready=new Promise(resolve=>{resolveReady=resolve})
  child.stdout.on('data',chunk=>{stdout+=chunk;if(signal&&!readySent&&stdout.includes(signal)){readySent=true;resolveReady()}})
  child.stderr.on('data',chunk=>{stderr+=chunk})
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{if(signal&&!readySent)reject(Error(`missing lock signal: ${stderr}`));else resolve({code,stdout,stderr})})})
  child.stdin.end(query);return{ready,done}
 }
 async function blocked(name){for(let i=0;i<100;i++){if(sql(`select exists(select 1 from pg_stat_activity where application_name=${literal(name)}and wait_event_type='Lock');`)==='t')return;await new Promise(resolve=>setTimeout(resolve,20))}assert.fail(`${name} did not block`)}
 const first=start(`begin;set application_name='nl_release_first';select private_mfa_nl_history.release_lock(974,repeat('e',40));\n\\echo RELEASE_LOCKED\nselect pg_sleep(2);${activate(974)}commit;`,'RELEASE_LOCKED')
 await first.ready
 const second=start(`set application_name='nl_release_second';${activate(974)}`)
 await blocked('nl_release_second');assert.equal((await first.done).code,0)
 const denied=await second.done;assert.notEqual(denied.code,0);assert.match(denied.stderr,/inactive native candidate/)
 assert.equal(sql('select count(*)from private_mfa_nl_history.release_receipt where competition_id=974;'),'1')
 const writer=start("begin;update players set full_name='Concurrent source identity'where id=(select min(id)from players where competition_id=973);\n\\echo WRITER_LOCKED\nselect pg_sleep(2);commit;",'WRITER_LOCKED')
 await writer.ready
 const stale=start(`set application_name='nl_release_stale';${activate(973)}`)
 await blocked('nl_release_stale');assert.equal((await writer.done).code,0)
 const refused=await stale.done;assert.notEqual(refused.code,0);assert.match(refused.stderr,/unchanged native football/)
 assert.equal(sql('select not active and not exists(select 1 from private_mfa_nl_history.release_receipt where competition_id=973)from competitions where id=973;'),'t')
})
