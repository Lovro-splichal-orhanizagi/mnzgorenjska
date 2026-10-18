// Committed synthetic fixture and two concurrent sessions in an explicit owned
// removable clone only. The caller removes that clone after verification.
import {execFileSync,spawn} from 'node:child_process'
import {syntheticHnsWomenManifest} from './hr-zenske-test-fixture.mjs'
import {hnsWomenReleaseSeedSql} from './hr-zenske-release-fixture.mjs'
const container=process.env.SUPABASE_DB_CONTAINER,database=process.env.SUPABASE_TEST_DB
if(!container||!database||database==='postgres'||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned removable clone required')
const psql=['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1']
const run=sql=>execFileSync('docker',psql,{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']})
run(`begin;${hnsWomenReleaseSeedSql(syntheticHnsWomenManifest())}commit;`)
const cid=Number(run("select id from competitions where slug='hr-prva-hnlz';").trim()),round=Number(run(`select id from rounds where competition_id=${cid} and season='2026/27'and number=9;`).trim())
if(!Number.isSafeInteger(cid)||!Number.isSafeInteger(round))throw Error('HNS synthetic race target missing')
const call=`select public.check_hns_women_release(document::text,manifest_sha256,true)from private_hns_women_release.prepared_packets where competition_id=${cid};`
async function race(change,expected) {
 const writer=spawn('docker',psql,{stdio:['pipe','pipe','pipe']});let error='',signal
 const ready=new Promise(resolve=>signal=resolve),done=new Promise((resolve,reject)=>writer.on('exit',code=>code===0?resolve():reject(Error(error))))
 writer.stderr.on('data',data=>error+=data);writer.stdout.on('data',data=>{if(String(data).includes('HNS_RELEASE_WRITER_LOCKED'))signal()})
 writer.stdin.end(`begin;${change};select 'HNS_RELEASE_WRITER_LOCKED';select pg_sleep(2);commit;`)
 await Promise.race([ready,done.then(()=>{throw Error('Writer ended before acquiring its lock')})])
 let refused=false
 try{run(call)}catch(error){if(!expected.test(error.stderr?.toString()??''))throw error;refused=true}finally{await done}
 if(!refused)throw Error('HNS release accepted stale state while waiting')
 if(run(`select active from competitions where id=${cid};select count(*)from private_historical_statistics.release_authorizations where competition_id=${cid};`).trim()!=='f\n0')throw Error('HNS failed gate left activation authority or active league')
}
await race(`update players set value=4.5 where competition_id=${cid}`,/actual pricing\/affordable legal15/)
console.log('PASS release waits for the price writer and rechecks its committed bad prices; no activation/authority')
run(`update players set value=case when position='GK'then 4.5 when shirt_number=3 then 12 else 5 end where competition_id=${cid};`)
await race(`update rounds set lineups_locked_at=clock_timestamp()where id=${round}`,/strictly future complete unlocked fantasy round/)
console.log('PASS release waits for the lineup writer and rechecks its committed future lock; no activation/authority')
