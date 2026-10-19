// Owned disposable database only. Two real PostgreSQL sessions exercise lock waits.
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createHash,createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {assertFcfDisposableTest,fcfDisposableCloneDumpArgs,fcfPostgrestSchemaReady} from './lib/fcf-disposable-test.mjs'
const container=assertFcfDisposableTest()
const database=`fcf_cleanup_race_${process.pid}`,rest=`fcf_cleanup_rest_${process.pid}`
let restStarted=false
const args=['exec','-i',container,'psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1']
const run=sql=>execFileSync('docker',args,{input:sql,encoding:'utf8',maxBuffer:32*1024*1024})
const child=(sql,keepOpen=false)=>{
 const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let out='',err='',result=null
 p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b)
 const done=new Promise(resolve=>p.on('exit',code=>{result={code,out,err};resolve(result)}))
 if(keepOpen)p.stdin.write(sql+'\n');else p.stdin.end(sql)
 return {p,done,output:()=>out,result:()=>result}
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function until(predicate,message,attempts=60){for(let i=0;i<attempts;i++){if(await predicate())return;await pause(50)}throw Error(message)}
const baseline=execFileSync('docker',fcfDisposableCloneDumpArgs(),{maxBuffer:64*1024*1024}).toString()
execFileSync('docker',['exec',container,'createdb','-U','supabase_admin','-T','template0',database])
try{
 run('create schema if not exists vault;\n'+baseline.replace(/^CREATE EXTENSION IF NOT EXISTS pg_cron[^\n]*;$/gm,'').replace(/^COMMENT ON EXTENSION pg_cron[^\n]*;$/gm,''))
 // ACLs are exercised by the separate committed SQL suite; this clone isolates actual lock behavior.
 const fixture=readFileSync(new URL('../supabase/tests/fcf-historical-cleanup.sql',import.meta.url),'utf8').split('-- Mutations run in subtransactions:')[0].split('\n').filter(line=>!line.includes('select pg_temp.fcf_assert(not has_')).join('\n')
 run(fixture+'\ncommit;')
 run("insert into auth.users(id,email)values('fa000000-0000-4000-8000-000000000003','fcf-race@example.invalid');insert into profiles(id,display_name)values('fa000000-0000-4000-8000-000000000003','FCF race')on conflict(id)do nothing;")
 const main='a'.repeat(40)
 const hashes=JSON.parse(run("select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='fcf'and document->>'sourcePolicy'='es-fcf-reviewed-history-v1';").trim())
 const text=value=>`'${value.replaceAll("'","''")}'`
 const literal=value=>text(JSON.stringify(value))+'::jsonb'
 for(const scenario of[
  {name:'individual-field drift',edit:'update appearances set shirt_number=777 where id=(select min(id)from appearances where match_id=321646)',reset:'update appearances set shirt_number=null where shirt_number=777',reason:'canonical beforeimage drift'},
  {name:'new human team',edit:"insert into fantasy_teams(owner_id,name,competition_id)values('fa000000-0000-4000-8000-000000000003','FCF waiting user',783)",reset:"delete from fantasy_teams where owner_id='fa000000-0000-4000-8000-000000000003'",reason:'new fantasy team activity'},
  {name:'new deleted position vote',edit:'insert into position_votes_deleted(id,player_id)select 990003,min(id)from players where competition_id=783',reset:'delete from position_votes_deleted where id=990003',reason:'new position vote activity'},
  {name:'new incoming FK',edit:'create table public.fcf_waiting_dependency(goal_id bigint references public.goals(id)on delete cascade)',reset:'drop table public.fcf_waiting_dependency',reason:'unexpected individual-row foreign key dependency'},
 ]){
  const proof=JSON.parse(run(`with r as materialized(select public.prepare_fcf_historical_cleanup('${main}',${literal(hashes)})p)select jsonb_build_object('beforeImageText',(p->'beforeImage')::text,'beforeSha256',p->>'beforeSha256')from r;`).trim())
  const writer=child(`begin;${scenario.edit};select 'FCF_MUTATION_LOCKED';`,true)
  await until(()=>writer.output().includes('FCF_MUTATION_LOCKED'),'writer did not establish mutation lock')
  const waiter=child(`set application_name='fcf_cleanup_waiter';select public.apply_fcf_historical_cleanup('${main}',${literal(hashes)},'${proof.beforeSha256}',${text(proof.beforeImageText)});`)
  await until(()=>{if(waiter.result())throw Error('cleanup exited before waiting: '+waiter.result().err);return run("select exists(select 1 from pg_stat_activity where datname=current_database()and application_name='fcf_cleanup_waiter'and wait_event_type='Lock'and cardinality(pg_blocking_pids(pid))>0);").trim()==='t'},'cleanup never actually waited for writer')
  writer.p.stdin.end('commit;\n')
  const [a,b]=await Promise.all([writer.done,waiter.done]);assert.equal(a.code,0,a.err)
  assert.notEqual(b.code,0,'cleanup incorrectly succeeded after waiting')
  assert.ok(b.err.includes(`FCF_HISTORY: ${scenario.reason}`),b.err)
  assert.equal(run("select (select count(*)from appearances where match_id in(321646,297199,306164,306171))=126 and(select count(*)from goals where match_id in(321646,297199,306164,306171))=14 and not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(783,790,797));").trim(),'t')
  run(scenario.reset)
  console.log(`PASS real waiting cleanup rereads ${scenario.name}; all126/14 and zero installed policies retained`)
 }
 assert.throws(()=>run(`begin isolation level repeatable read;select public.prepare_fcf_historical_cleanup('${main}',${literal(hashes)});`),error=>String(error.stderr).includes('FCF_HISTORY: READ COMMITTED required'))
 console.log('PASS REPEATABLE READ refused before cleanup')
 // Exercise the real Supabase client -> HTTP JSON -> PostgREST -> TEXT RPC
 // boundary, including a numeric8.10 that JS object reserialization would lose.
 run('update player_scores set points=8.10 where round_id=28706 and player_id=(select min(player_id)from appearances where match_id=321646);')
 const secret='fcf-disposable-http-proof-secret-v1'
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'service_role',exp:Math.floor(Date.now()/1000)+600})
 const jwt=unsigned+'.'+createHmac('sha256',secret).update(unsigned).digest('base64url')
 execFileSync('docker',['run','-d','--name',rest,'--network',`container:${container}`,
  '-e',`PGRST_DB_URI=postgresql://supabase_admin@127.0.0.1:5432/${database}`,
  '-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=service_role','-e','PGRST_SERVER_PORT=31411',
  '-e',`PGRST_JWT_SECRET=${secret}`,'postgrest/postgrest@sha256:b574528fe109c8343c1247155734d03df8c34b462f342dca0ccc20244fc36ef9'])
 restStarted=true
 await until(()=>{try{return fcfPostgrestSchemaReady(execFileSync('docker',['exec',container,'curl','-s','--max-time','1','http://127.0.0.1:31411/'],{encoding:'utf8',maxBuffer:8*1024*1024}))}catch{return false}},'PostgREST RPC schema did not become ready',200)
 const bodies=[]
 const db=createClient('http://127.0.0.1:31411',jwt,{auth:{persistSession:false},global:{fetch:async(url,options)=>{
  // curl is only the network bridge into this unexposed disposable container;
  // supabase-js produces the actual request body and the real PostgREST handles it.
  bodies.push(JSON.parse(options.body))
  const output=execFileSync('docker',['exec','-i',container,'curl','-sS','--max-time','15','-w','\\n%{http_code}',
   '-X',options.method,'-H','Content-Type: application/json','-H',`Authorization: Bearer ${jwt}`,'--data-binary','@-',String(url).replace('/rest/v1/','/')],{input:options.body,encoding:'utf8',maxBuffer:32*1024*1024})
  const split=output.lastIndexOf('\n')
  return new Response(output.slice(0,split),{status:Number(output.slice(split+1)),headers:{'Content-Type':'application/json'}})
 }}})
 const prepared=await db.rpc('prepare_fcf_historical_cleanup',{p_main_sha:main,p_policy_hashes:hashes})
 if(prepared.error)console.error(execFileSync('docker',['logs',rest],{encoding:'utf8'}))
 assert.equal(prepared.error,null,JSON.stringify(prepared.error))
 const proof=prepared.data
 assert.ok(proof.beforeImageText.includes('"points": 8.10'),'SQL numeric8.10 fixture missing')
 assert.equal(createHash('sha256').update(proof.beforeImageText).digest('hex'),proof.beforeSha256)
 const input={p_main_sha:main,p_policy_hashes:hashes,p_before_sha:proof.beforeSha256,p_before_image_text:proof.beforeImageText}
 const normalized=await db.rpc('apply_fcf_historical_cleanup',{...input,p_before_image_text:JSON.stringify(JSON.parse(proof.beforeImageText))})
 assert.ok(normalized.error?.message.includes('FCF_HISTORY: reviewed complete beforeimage SHA required'),JSON.stringify(normalized.error))
 const applied=await db.rpc('apply_fcf_historical_cleanup',input)
 assert.equal(applied.error,null,JSON.stringify(applied.error))
 assert.equal(applied.data.removedAppearances,126)
 assert.equal(applied.data.removedGoals,14)
 assert.equal(bodies.at(-1).p_before_image_text,proof.beforeImageText)
 assert.ok(bodies.at(-1).p_before_image_text.includes('"points": 8.10'),'HTTP body lost numeric8.10 scale')
 console.log('PASS actual supabase-js -> HTTP PostgREST TEXT RPC preserves8.10 and exact SQLSHA; lossy object roundtrip refused, exact cleanup succeeds')
}finally{if(restStarted)execFileSync('docker',['rm','-f',rest]);execFileSync('docker',['exec',container,'dropdb','-U','supabase_admin','--force',database])}
