import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {bootstrapCommunityCardDatabase,cloneCommunityCardDatabase,communityCloneTarget,communityCloneRestoreList,communityTestSession,cleanupCommunityTestSessions,waitForCommunityCloneWorkers} from './lib/fussball-community-disposable.mjs'

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
test('clone cleanup failure still closes and reaps its owned source sentinel',async()=>{
 const session=communityTestSession(process.execPath,['-e',`process.stdout.write('SOURCE_');setTimeout(()=>process.stdout.write('CONNECTED\\n'),10);process.stdin.resume();process.stdin.on('end',()=>{process.stdout.write('SOURCE_SURVIVED\\n')})`],{timeoutMs:1000})
 const failure=Error('refusing to terminate database workers')
 try{
  await session.waitFor('SOURCE_CONNECTED')
  await assert.rejects(cleanupCommunityTestSessions(()=>{throw failure},[session]),error=>error===failure)
  assert.equal((await session.finished).code,0)
  assert.match(session.stdout,/SOURCE_SURVIVED/)
  assert.equal(session.child.exitCode,0)
 }finally{await session.close()}
})

test('missing marker and a stuck owned child have bounded completion',async()=>{
 const session=communityTestSession(process.execPath,['-e',`process.stdin.resume();setInterval(()=>{},1000)`],{timeoutMs:1000})
 try{
  await assert.rejects(session.waitFor('NEVER'),/NEVER/)
  assert.equal((await session.close()).signal,'SIGKILL')
 }finally{await session.close()}
})

test('clone worker drain waits passively for transient workers and refuses persistent workers with evidence',async()=>{
 let polls=0
 await waitForCommunityCloneWorkers(()=>++polls===1?[{pid:123,backend_type:'unknown worker'}]:[],{timeoutMs:100,intervalMs:1})
 assert.equal(polls,2)
 await assert.rejects(waitForCommunityCloneWorkers(()=>[{pid:456,backend_type:'unknown worker'}],{timeoutMs:5,intervalMs:1}),/refusing to terminate database workers.*456.*unknown worker/)
})

test('cleanup preserves refusal and timeout evidence when the owned sentinel cannot exit',async()=>{
 const session=communityTestSession(process.execPath,['-e',`process.stdout.write('READY');setInterval(()=>{},1000)`],{timeoutMs:1000})
 const refusal=Error('refusing to terminate database workers: worker 789')
 await session.waitFor('READY')
 await assert.rejects(cleanupCommunityTestSessions(()=>{throw refusal},[session]),error=>{
  assert.ok(error instanceof AggregateError)
  assert.equal(error.errors[0],refusal)
  assert.match(error.errors[1].message,/SIGKILL.*READY/)
  return true
 })
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
 const container=communityTarget(process.env),base=process.env.SUPABASE_TEST_DB||'postgres'
 const raceDb=`community_cards_race_${process.pid}_${Date.now()}`
 const exec=(q,db=raceDb)=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024}).trim()
 assert.match(base,/^(postgres|community_cards_[a-z0-9_]+)$/)
 // Keep a real original-DB client alive during clone and race. The old
 // worker-termination scheme killed this connection and could crash PostgreSQL.
 const sessionArgs=db=>['exec','-i','-e','PGOPTIONS=-c statement_timeout=15000 -c idle_session_timeout=30000',container,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1']
 const sentinel=communityTestSession('docker',sessionArgs(base),{closingInput:"select 'SOURCE_SURVIVED';\n\\quit\n"})
 const sessions=[sentinel]
 let cleanupClone,bodyError
 const q=value=>`'${String(value).replaceAll("'","''")}'`
 try{
  sentinel.child.stdin.write("select 'SOURCE_CONNECTED';\n")
  await sentinel.waitFor('SOURCE_CONNECTED')
  cleanupClone=await cloneCommunityCardDatabase(process.env,base,raceDb)
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
  const args=sessionArgs(raceDb)
  const first=communityTestSession('docker',args)
  sessions.push(first)
  first.child.stdin.end(`begin;select 1 from matches where id=${q(job.match_id)} for update;select 'CARD_LOCKED';select pg_sleep(0.6);${vote('bca00000-0000-4000-8000-000000000001',3)}commit;`)
  await first.waitFor('CARD_LOCKED')
  const started=Date.now()
  const second=communityTestSession('docker',args)
  sessions.push(second)
  second.child.stdin.end(`set request.jwt.claim.role='service_role';select public.apply_fussball_card_report(${field('cid')}::bigint,repeat('A',32)||'-G:2026/27',${q(job.match_id)},${q(job.revision_sha256)},${q(job.resolution_sha256)},${q(JSON.stringify(apps))},${q(JSON.stringify(goals))},array[]::text[]);`)
  const result=await second.finished,firstResult=await first.finished
  assert.equal(firstResult.code,0,first.stderr)
  assert.notEqual(result.code,0);assert.match(second.stderr,/consensus changed/)
  assert.ok(Date.now()-started>=350,'worker waited for competing vote lock')
  assert.equal(exec(`select statistics_status from matches where id=${q(job.match_id)}`),'pending_cards')
  assert.equal(exec(`select count(*)from appearances where match_id=${q(job.match_id)}`),'0')
 }catch(error){bodyError=error;throw error}finally{
  try{
   await cleanupCommunityTestSessions(cleanupClone,sessions)
   assert.equal((await sentinel.finished).code,0,`original DB connection survived: ${sentinel.stderr}`)
   assert.ok(sentinel.stdout.includes('SOURCE_SURVIVED'),'logical cloning preserves source connections')
  }catch(cleanupError){
   if(bodyError)throw new AggregateError([bodyError,cleanupError],'community race failed and cleanup failed',{cause:bodyError})
   throw cleanupError
  }
 }
})
