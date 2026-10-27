import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {bootstrapCommunityCardDatabase,cloneCommunityCardDatabase,communityCloneTarget,communityCloneRestoreList} from './lib/fussball-community-disposable.mjs'

export function communityTarget(env){
 const container=env.SUPABASE_DB_CONTAINER
 const owned=container==='slff-community-cards-20261027'
 const ci=container==='supabase_db_mnzgorenjska'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_JOB==='varnost'
 assert.ok(env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST==='1'&&(owned||ci),'explicit owned community-card disposable DB required')
 return container
}
test('community-card SQL runner rejects implicit and unrelated databases',()=>{
 const env={FUSSBALL_COMMUNITY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'slff-community-cards-20261027'}
 assert.equal(communityTarget(env),env.SUPABASE_DB_CONTAINER)
 for(const patch of [{FUSSBALL_COMMUNITY_DISPOSABLE_TEST:undefined},{SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'},{SUPABASE_DB_CONTAINER:'production'}])assert.throws(()=>communityTarget({...env,...patch}),/owned/)
})
test('fresh bootstrap refuses absent consent or any other container before Docker access',async()=>{
 await assert.rejects(bootstrapCommunityCardDatabase({}),/explicit disposable/)
 await assert.rejects(bootstrapCommunityCardDatabase({FUSSBALL_COMMUNITY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}),/exact owned/)
})
test('logical clone removes only cron TOC objects and preserves app permissions',()=>{
 const toc=['2; 3079 17135 EXTENSION - pg_cron','6929; 0 0 COMMENT - EXTENSION pg_cron','6930; 0 0 ACL - SCHEMA cron supabase_admin','100; 1255 1 FUNCTION extensions grant_pg_cron_access() supabase_admin','101; 0 0 ACL public FUNCTION vote_fussball_card(bigint,bigint) supabase_admin','102; 3079 2 EXTENSION - pg_net'].join('\n')
 const kept=communityCloneRestoreList(toc)
 assert.ok(!kept.includes('EXTENSION - pg_cron'));assert.ok(!kept.includes('SCHEMA cron'))
 assert.ok(kept.includes('grant_pg_cron_access()'));assert.ok(kept.includes('ACL public FUNCTION vote_fussball_card'));assert.ok(kept.includes('EXTENSION - pg_net'))
 const env={FUSSBALL_COMMUNITY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'slff-community-cards-20261027'}
 assert.equal(communityCloneTarget(env,'postgres','community_cards_race_123_456'),env.SUPABASE_DB_CONTAINER)
 assert.throws(()=>communityCloneTarget(env,'postgres','postgres'),/community_cards_race/)
 assert.throws(()=>communityCloneTarget({...env,FUSSBALL_COMMUNITY_DISPOSABLE_TEST:undefined},'postgres','community_cards_race_123_456'),/owned/)
})
test('community-card native voting, private evidence and atomic replay', {skip:process.env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST!=='1'},()=>{
 const container=communityTarget(process.env),database=process.env.SUPABASE_TEST_DB||'postgres'
 assert.match(database,/^(postgres|community_cards_[a-z0-9_]+)$/)
 const labels=JSON.parse(execFileSync('docker',['inspect',container,'--format','{{json .Config.Labels}}'],{encoding:'utf8'}))
 if(container==='slff-community-cards-20261027')assert.equal(labels['slff.test.owner'],'community-cards-20261027')
 const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024}).trim()
 assert.equal(sql("select to_regprocedure('public.register_fussball_card_report(bigint,text,bigint,jsonb,jsonb)') is not null"),'t','new native registration RPC exists')
 sql(readFileSync(new URL('../supabase/tests/fussball-community-cards.sql',import.meta.url),'utf8'))
})

// Two real PostgreSQL sessions prove a stale worker waits for a concurrent vote
// and then rejects it. The committed fixture lives only in its throwaway clone.
test('concurrent vote and apply serialize on the native fixture and revalidate consensus',{skip:process.env.FUSSBALL_COMMUNITY_DISPOSABLE_TEST!=='1'},async()=>{
 const {spawn}=await import('node:child_process')
 const container=communityTarget(process.env),base=process.env.SUPABASE_TEST_DB||'postgres'
 const raceDb=`community_cards_race_${process.pid}_${Date.now()}`
 const exec=(q,db=raceDb)=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024}).trim()
 assert.match(base,/^(postgres|community_cards_[a-z0-9_]+)$/)
 // Keep a real original-DB client alive during clone and race. The old
 // worker-termination scheme killed this connection and could crash PostgreSQL.
 const sentinel=spawn('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',base,'-X','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']})
 let sentinelOut='',sentinelError='',sentinelReady=false
 sentinel.stderr.on('data',b=>{sentinelError+=b})
 const sentinelConnected=new Promise((resolve,reject)=>{
  sentinel.stdout.on('data',b=>{sentinelOut+=b;if(sentinelOut.includes('SOURCE_CONNECTED')){sentinelReady=true;resolve()}})
  sentinel.on('error',reject);sentinel.on('exit',code=>{if(!sentinelReady)reject(Error(`source sentinel exited ${code}: ${sentinelError}`))})
 })
 const sentinelFinished=new Promise(resolve=>sentinel.on('exit',resolve))
 sentinel.stdin.write("select 'SOURCE_CONNECTED';\n")
 await sentinelConnected
 let cleanupClone
 const q=value=>`'${String(value).replaceAll("'","''")}'`
 try{
  cleanupClone=cloneCommunityCardDatabase(process.env,base,raceDb)
  const fixture=readFileSync(new URL('../supabase/tests/fussball-community-cards.sql',import.meta.url),'utf8')
  const setup=fixture.slice(0,fixture.indexOf('-- Real auth roles:')).replace('create temporary table card_fixture','create table card_fixture').replace('create temporary table card_players','create table card_players')
  exec(setup+'\ncommit;')
  const field=k=>`(select value#>>'{}'from card_fixture where key=${q(k)})`
  const vote=(user,idx)=>`set request.jwt.claim.role='authenticated';set request.jwt.claim.sub=${q(user)};set role authenticated;select public.vote_fussball_card(${field('event')}::bigint,(select player_id from card_players where idx=${idx}));`
  exec(vote('bca00000-0000-4000-8000-000000000005',2))
  const job=JSON.parse(exec(`set request.jwt.claim.role='service_role';select public.get_fussball_card_replay_jobs(${field('cid')}::bigint,repeat('A',32)||'-G:2026/27',10,${field('mid')}::bigint)->0;`))
  const apps=JSON.parse(exec("select value from card_fixture where key='apps'"))
  Object.assign(apps[1],{red_cards:1,red_card_minute:60,minute_off:60,minutes_played:60})
  const goals=JSON.parse(exec("select value from card_fixture where key='goals'"))
  const args=['exec','-i',container,'psql','-U','supabase_admin','-d',raceDb,'-X','-qAt','-v','ON_ERROR_STOP=1']
  const first=spawn('docker',args,{stdio:['pipe','pipe','pipe']})
  let firstError='',signalled=false
  first.stderr.on('data',b=>{firstError+=b})
  const locked=new Promise((resolve,reject)=>{
   first.stdout.on('data',b=>{if(String(b).includes('CARD_LOCKED')){signalled=true;resolve()}})
   first.on('error',reject);first.on('exit',code=>{if(!signalled)reject(Error(`lock session exited ${code}: ${firstError}`))})
  })
  const finished=new Promise((resolve,reject)=>first.on('exit',code=>code===0?resolve():reject(Error(firstError))))
  first.stdin.end(`begin;select 1 from matches where id=${q(job.match_id)} for update;select 'CARD_LOCKED';select pg_sleep(0.6);${vote('bca00000-0000-4000-8000-000000000001',3)}commit;`)
  await locked
  const started=Date.now()
  const second=spawn('docker',args,{stdio:['pipe','pipe','pipe']})
  let secondError='';second.stderr.on('data',b=>{secondError+=b})
  const secondFinished=new Promise((resolve,reject)=>{second.on('error',reject);second.on('exit',resolve)})
  second.stdin.end(`set request.jwt.claim.role='service_role';select public.apply_fussball_card_report(${field('cid')}::bigint,repeat('A',32)||'-G:2026/27',${q(job.match_id)},${q(job.revision_sha256)},${q(job.resolution_sha256)},${q(JSON.stringify(apps))},${q(JSON.stringify(goals))},array[]::text[]);`)
  const code=await secondFinished;await finished
  assert.notEqual(code,0);assert.match(secondError,/consensus changed/)
  assert.ok(Date.now()-started>=350,'worker waited for competing vote lock')
  assert.equal(exec(`select statistics_status from matches where id=${q(job.match_id)}`),'pending_cards')
  assert.equal(exec(`select count(*)from appearances where match_id=${q(job.match_id)}`),'0')
 }finally{
  cleanupClone?.()
  sentinel.stdin.end("select 'SOURCE_SURVIVED';\n\\quit\n")
  assert.equal(await sentinelFinished,0,`original DB connection survived: ${sentinelError}`)
  assert.ok(sentinelOut.includes('SOURCE_SURVIVED'),'logical cloning preserves source connections')
 }
})
