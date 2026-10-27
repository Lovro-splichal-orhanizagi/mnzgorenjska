// No production connection input. Run last in the hosted fresh-database job:
// the behavioral transaction rolls back; the concurrency fixture is disposable.
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { sessionSQL } from './fcf-g13-repair.mjs'
const container=process.env.SUPABASE_DB_CONTAINER
const ownedCommunity=process.env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST==='1'&&container==='slff-community-cards-20261027'
if (process.env.FCF_G13_DISPOSABLE_TEST!=='1' || !(container?.startsWith('supabase_db_')||ownedCommunity)) throw Error('Explicit disposable Supabase container and FCF_G13_DISPOSABLE_TEST=1 required')
if(ownedCommunity){
 const ownership=execFileSync('docker',['inspect','--format','{{index .Config.Labels "slff.test.owner"}} {{.HostConfig.NetworkMode}}',container],{encoding:'utf8'}).trim()
 if(ownership!=='community-cards-20261027 none')throw Error('Exact owned no-network community disposable container required')
}
const args=['exec','-i',container,'psql','-U',ownedCommunity?'supabase_admin':'postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-qAt','-v','ON_ERROR_STOP=1']
const read=name=>readFileSync(new URL(`../supabase/tests/${name}`,import.meta.url),'utf8')
const seed=`begin isolation level read committed;\n${sessionSQL()}\n${read('fcf-g13-fixture.sql')}`
const run=(sql)=>execFileSync('docker',args,{input:sql,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']})
try {
  const r=execFileSync('docker',args,{input:seed+'\n'+read('fcf-g13-repair.sql')+'\nrollback;',encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','inherit']})
  assert.ok(!r.includes('ERROR'))
  // Shared committed fixture is needed for real separate-session FK checks.
  run(seed+'\ncommit;')
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']})
  let out='',errors=''
  child.stderr.on('data',d=>errors+=d)
  const closed=new Promise(resolve=>child.once('close',resolve))
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Lock holder did not become ready')),20000)
    child.stdout.on('data',d=>{out+=d;if(out.includes('G13_LOCKS_HELD')){clearTimeout(timer);resolve()}})
    child.once('close',code=>{clearTimeout(timer);if(!out.includes('G13_LOCKS_HELD'))reject(Error(`Lock holder ${code}: ${errors}`))})
    child.once('error',reject)
  })
  child.stdin.write(`begin isolation level read committed;\n${sessionSQL()}\nselect pg_temp.fcf_g13_repair(false,null)->>'sha256';\n\\echo G13_LOCKS_HELD\n`)
  try {
    await ready
    const probes=[
      ['new match dependency','insert into goals(match_id,team_id,scorer_id) values(427258,10388,313535)'],
      ['new club dependency',"insert into klub_predstavitev(team_id,opis) values(10388,'TEST')"],
      ['FK retarget existing child','update klub_predstavitev set team_id=10388 where team_id=8372'],
      ['existing appearance statistics','update appearances set yellow_cards=yellow_cards+1 where id=(select min(id) from appearances where match_id=427263)'],
      ['new fantasy team',"insert into fantasy_teams(owner_id,name,competition_id) values('00000000-0000-4000-8000-000000000013','TEST',801)"],
      ['new historical policy',"insert into private_historical_statistics.installed_policies(competition_id,policy_id,policy_sha256,first_fantasy_played_on) select 801,id,policy_sha256,current_date+7 from private_historical_statistics.policies where id='es-fcf-segona-g1-history-2026-10-18-v1'"],
      ['historical club binding',"update private_historical_statistics.source_club_bindings set bound_team_id=10388 where provider='fcf' and source_club_id='5042'"],
      ['six target release receipt',"insert into private_fcf_six_target_release.receipts(competition_id,inventory_key,packet_sha256,packet_text,rollout_text,rollout_sha256,source_fingerprint,cleanup_before_sha256,imported_state_sha256,stage)values(801,'concurrent','test','{}','{}','test','test','test','test','imported')"],
      ['six foreign target club binding',"insert into private_fcf_six_target_release.club_bindings(competition_id,club_id,category_id,team_id,country_id,source_fingerprint)values((select min(id)from competitions where id<>801),'concurrent','test',10388,(select country_id from competitions where id=801),'test')"],
      ['DFB quarantine evidence FK',"insert into private_dfb_pending.evidence(competition_id,match_id,report_id,source_code,fixture,status,reason,raw_sha256,raw_bytes,observed_at) values(801,427263,'TEST ONLY','TEST ONLY','{}','DFB_INVALID_REPORT','TEST ONLY',repeat('a',64),decode('78','hex'),now())"],
      ['private card admission FK',"insert into private_fussball.card_admissions(competition_id,manifest,manifest_sha256,state_sha256)values(801,'{}','TEST ONLY','TEST ONLY')"],
      ['new Scout non-FK reference',"insert into scout.dnevnik(team_id,vrsta) values(10388,'isci')"],
      ['new FK DDL','create table public.g13_concurrent_fk(team_id bigint references teams)'],
    ]
    for (const [label,sql] of probes) {
      assert.throws(()=>run(`begin;set local lock_timeout='300ms';set local statement_timeout='2s';${sql};rollback;`),e=>String(e.stderr).includes('lock timeout'),label)
      console.log(`PASS blocked concurrent ${label}`)
    }
  } finally {
    child.stdin.end('rollback;\n')
    const code=await closed
    assert.equal(code,0,errors)
  }
  console.log('PASS real G13 SQL behavior and concurrent FK protection')
} catch(error) {
  console.error(error.stderr?.toString()??error.message)
  process.exitCode=1
}
