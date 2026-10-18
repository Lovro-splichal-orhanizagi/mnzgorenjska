// Explicit removable database clone: two independent sessions, no shared reset.
import {execFileSync,spawn} from 'node:child_process'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned disposable DB required')
const database=`hns_women_deadline_race_${process.pid}`
const run=sql=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-A','-t','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'})
const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--no-owner','--no-privileges','--exclude-schema=cron','--exclude-schema=vault','--exclude-schema=realtime'],{maxBuffer:64*1024*1024})
execFileSync('docker',['exec',container,'createdb','-U','postgres','-T','template0',database])
try{
 run('create schema if not exists vault;\n'+dump.toString().replace(/^CREATE EXTENSION IF NOT EXISTS pg_cron[^\n]*;$/gm,'').replace(/^COMMENT ON EXTENSION pg_cron[^\n]*;$/gm,''))
 const seed=JSON.parse(run(`do $$declare cid bigint;f jsonb;x jsonb;begin
 insert into competitions(slug,name,short_name,country_id,source,source_league_code,source_policy,date_only_deadline_policy,prvi_fantasy_krog)values('hr-prva-hnlz','TEST ONLY race','TEST ONLY',(select id from countries where code='HR'),'hns','114471579','hr-hnlz-v1','midnight-local-v1',9)returning id into cid;
 select jsonb_agg(document||jsonb_build_object('datum','2026-10-25','ura',null,'postponed',false))into f from private_hns_women_release.fixture_catalog where source_competition_id='114471579'and internal_round=9;
 x:=public.update_hns_women_round(cid,'114471579',9,f,repeat('a',64),clock_timestamp());
 perform set_config('test.hns_women_deadline',jsonb_build_object('competition',cid,'round',x->'roundId','deadline',x->'deadlineAt','fixtures',f)::text,false);
 end $$;select current_setting('test.hns_women_deadline');`).trim().split('\n').at(-1))
 async function race(edit,query){
  const writer=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-A','-t','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']})
  let error='';writer.stderr.on('data',x=>error+=x)
  let ready;const acquired=new Promise(resolve=>ready=resolve),done=new Promise((resolve,reject)=>writer.on('exit',code=>code===0?resolve():reject(Error(error))))
  writer.stdout.on('data',x=>{if(String(x).includes('HNS_ROUND_LOCKED'))ready()})
  writer.stdin.end(`begin;${edit};select 'HNS_ROUND_LOCKED';select pg_sleep(2);commit;`)
  await Promise.race([acquired,done.then(()=>{throw Error('Writer ended before acquiring round lock')})]);
  try{return JSON.parse(run(query).trim().split('\n').at(-1))}finally{await done}
 }
 const call=`select public.update_hns_women_round(${seed.competition},'114471579',9,'${JSON.stringify(seed.fixtures)}'::jsonb,repeat('a',64),clock_timestamp());`
 const locked=await race(`update rounds set lineups_locked_at=clock_timestamp()where id=${seed.round}`,call)
 if(locked.retained!=='locked_or_expired'||Date.parse(locked.deadlineAt)!==Date.parse(seed.deadline))throw Error('In-flight lineup lock was not respected')
 console.log('PASS in-flight lineup lock is reread; deadline and locked history retained')
 // Owner-only synthetic setup in the removable clone; production service cannot
 // manipulate the private authorization table or clear a locked timestamp.
 run(`alter table rounds disable trigger hns_women_round_deadline;update rounds set lineups_locked_at=null where id=${seed.round};alter table rounds enable trigger hns_women_round_deadline;`)
 const expired=await race(`insert into private_hns_women_release.round_authorizations select competition_id,season,number,txid_current(),played_on,clock_timestamp()+interval '1 second'from rounds where id=${seed.round};update rounds set deadline_at=(select deadline_at from private_hns_women_release.round_authorizations where competition_id=${seed.competition} and authorized_xid=txid_current())where id=${seed.round}`,call)
 if(expired.retained!=='locked_or_expired'||Date.parse(expired.deadlineAt)>=Date.now())throw Error('Expired while waiting round reopened')
 console.log('PASS deadline expires while caller waits for round lock; it cannot reopen')
}finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',database])}
