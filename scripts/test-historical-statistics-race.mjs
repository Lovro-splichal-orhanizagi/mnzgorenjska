// Disposable database copy only: prove an in-flight round edit is re-read after lock acquisition.
import {execFileSync,spawn} from 'node:child_process'
import {readFileSync} from 'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned disposable database required')
const database=`historical_round_race_${process.pid}`
const run=(sql)=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-A','-t','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'})
const snapshot=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--no-owner','--no-privileges','--exclude-schema=cron','--exclude-schema=vault'],{maxBuffer:64*1024*1024})
execFileSync('docker',['exec',container,'createdb','-U','postgres','-T','template0',database])
try {
 run('create schema if not exists vault;\n'+snapshot.toString().replace(/^CREATE EXTENSION IF NOT EXISTS pg_cron[^\n]*;$/gm,'').replace(/^COMMENT ON EXTENSION pg_cron[^\n]*;$/gm,''))
 if(process.env.HISTORICAL_RACE_MIGRATION){
  const sql=readFileSync(process.env.HISTORICAL_RACE_MIGRATION,'utf8')
  const body=sql.match(/create function public\.upsert_unavailable_historical_match[\s\S]*?end \$\$;/)?.[0]
  if(!body)throw Error('missing upsert in explicit test migration')
  run(body.replace('create function','create or replace function'))
 }
 const prepared=JSON.parse(run(`do $$declare c bigint;country bigint;r bigint;h bigint;a bigint;p record;e jsonb;begin
 select * into p from private_historical_statistics.policies where id='hr-hnlz-history-2026-10-18-v1';e:=p.document->'entries'->0;
 select id into country from public.countries where code='HR';
 insert into public.competitions(slug,name,short_name,source,source_policy,country_id,active,prvi_fantasy_krog)values('hr-prva-hnlz','Race test','Race','hns','hr-hnlz-v1',country,false,9)returning id into c;
 insert into public.rounds(competition_id,season,number,played_on,deadline_at)values(c,public.sezona_lige(c),9,current_date+7,now()+interval '7 days');
 perform public.apply_historical_statistics_policy(c,p.id,p.policy_sha256,p.document->'entries');
 insert into public.teams(name,short_name,country_id)values('HNK Gorica s.d.d.','RaceH',country)returning id into h;
 insert into public.teams(name,short_name,country_id)values('ŽNK Donat','RaceA',country)returning id into a;
 insert into public.rounds(competition_id,season,number,played_on)values(c,'2026/27',1,'2026-08-23')returning id into r;
 perform set_config('historical.race',jsonb_build_object('c',c,'r',r,'h',h,'a',a)::text,false);
 end $$;select current_setting('historical.race');`).trim().split('\n').at(-1))
 for(const scenario of [
  {name:'round identity',edit:`update public.rounds set season='2024/25'where id=${prepared.r}`,reset:`update public.rounds set season='2026/27'where id=${prepared.r}`,reason:'invalid DB fixture binding'},
  {name:'club country',edit:`update public.teams set country_id=(select id from public.countries where code='SI')where id=${prepared.h}`,reset:`update public.teams set country_id=(select id from public.countries where code='HR')where id=${prepared.h}`,reason:'invalid DB fixture binding'},
  {name:'country code',edit:`update public.countries set code='ZZ'where code='HR'`,reset:`update public.countries set code='HR'where code='ZZ'`,reason:'unreviewed source club/category/country'},
 ]) {
 const writer=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-X','-A','-t','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']})
 let writerError='';writer.stderr.on('data',x=>writerError+=x)
 const writerDone=new Promise((resolve,reject)=>writer.on('exit',code=>code===0?resolve():reject(Error(writerError))))
 const locked=new Promise(resolve=>writer.stdout.on('data',data=>{if(data.toString().includes('ROUND_EDIT_IN_FLIGHT'))resolve()}))
 writer.stdin.end(`begin;${scenario.edit};select 'ROUND_EDIT_IN_FLIGHT';select pg_sleep(2);commit;`)
 await locked
 let refusal=null
 try{run(`select public.upsert_unavailable_historical_match(${prepared.c},'114471617',p.id,p.policy_sha256,p.document->'entries'->0->>'rawSha256',jsonb_build_object('roundId',${prepared.r},'homeTeamId',${prepared.h},'awayTeamId',${prepared.a},'fixture',((p.document->'entries'->0)-array['rawSha256','reasonCode'])||jsonb_build_object('season',p.document->>'season')))from private_historical_statistics.policies p where p.id='hr-hnlz-history-2026-10-18-v1';`)}catch(error){refusal=String(error.stderr)}
 await writerDone
 if(!refusal?.includes('HISTORICAL_POLICY: '+scenario.reason))throw Error(`Stale round accepted or wrong failure: ${refusal??'upsert succeeded'}`)
 if(run('select count(*)from private_historical_statistics.markers;').trim()!=='0')throw Error('Invalid concurrent marker persisted')
 console.log(`PASS in-flight ${scenario.name} update commits before blocked upsert rereads and refuses; no marker written`)
 run(scenario.reset)
 }
}finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',database])}
